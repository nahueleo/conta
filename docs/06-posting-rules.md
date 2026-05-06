# 06 · Motor de Posting Rules

## 1. Idea central

Las posting rules permiten que los **sistemas externos** (POS, e-commerce, payroll, ERP) envíen un evento con un **payload de negocio**, y que Conta lo traduzca a un **asiento contable** sin necesidad de código.

Una regla = "cuando recibo el evento `X` con el payload `P`, posteo este asiento con estas líneas".

Beneficio: el contador o el integrador modifica reglas desde la UI; deploy cero.

## 2. Estructura de una regla

```jsonc
{
  "code": "SALE_VAT_21",
  "trigger": "external.sale.created",
  "version": 3,
  "isEnabled": true,
  "validFrom": "2026-01-01",
  "description": "Venta nacional con IVA 21%",
  "validations": [
    "sum_dr == sum_cr",
    "all_accounts_active",
    "branch_is_required_when_account_requires_it"
  ],
  "lines": [
    {
      "side": "DR",
      "account": "1.1.02.001",
      "amount": "{{total}}",
      "branch": "{{branchId}}",
      "label": "Cobro venta"
    },
    {
      "side": "CR",
      "account": "4.1.01.001",
      "amount": "{{net}}",
      "businessUnit": "{{buId}}",
      "label": "Ventas netas"
    },
    {
      "side": "CR",
      "account": "2.1.05.001",
      "amount": "{{total}} - {{net}}",
      "label": "IVA Débito Fiscal"
    }
  ]
}
```

## 3. Triggers soportados

| Trigger | Origen | Payload típico |
|---|---|---|
| `external.sale.created` | E-commerce / POS | `total`, `net`, `vat`, `customerRef` |
| `external.sale.refund` | E-commerce | `total`, `originalSaleRef` |
| `external.purchase.created` | ERP / facturación | `total`, `net`, `vat`, `supplierRef` |
| `external.payment.received` | Banco / pasarela | `amount`, `currency`, `customerRef` |
| `external.payment.sent` | Banco / pagos | `amount`, `currency`, `supplierRef` |
| `external.inventory.adjust` | WMS | `amount`, `direction` |
| `external.payroll.run` | RRHH | `gross`, `taxes`, `netPay` |
| `external.fx.revaluation` | Sistema | `accountId`, `oldRate`, `newRate` |
| `manual` | UI | Asiento construido manualmente |
| `cron.monthly` | Scheduler | `period` |
| `cron.yearly` | Scheduler | `year` |

Custom triggers: cualquier string `external.<custom>.<event>` puede definirse.

## 4. Lenguaje de expresiones

Las expresiones usan **NCalc** (parser sandboxed) sobre el payload del evento.

### 4.1 Variables disponibles

- `{{<key>}}` → cualquier campo del payload (`total`, `net`, ...).
- `{{branchId}}`, `{{buId}}` → si vienen en el payload o headers.
- `{{tenantId}}`, `{{companyId}}`, `{{userId}}` → contexto.
- `{{today}}`, `{{now}}` → fecha actual (UTC).

### 4.2 Operadores y funciones

- Aritmética: `+ - * /` con precisión decimal (`Decimal` en .NET).
- Lógica: `AND OR NOT` para validaciones.
- Funciones: `Round(x, decimals)`, `Abs(x)`, `Min(a,b)`, `Max(a,b)`, `If(cond, a, b)`.
- Lookup de cuenta por código: `Account('1.1.02.001')`.
- Lookup configurable: `LookupAccount('SALES_BY_BRANCH', branchId)` — busca en una tabla `AccountLookup` (key→accountCode).

### 4.3 Sandbox

- **Sin acceso a I/O**: ni red, ni filesystem.
- **Sin reflexión**.
- **Timeout** de evaluación: 100 ms.
- **Memory cap** por evaluación.
- **No `eval` ni dynamic compile** (NUNCA usar `Roslyn.Scripting` directo) — sólo el parser AST.

## 5. Validaciones built-in

| Nombre | Significado |
|---|---|
| `sum_dr == sum_cr` | Partida doble |
| `all_accounts_active` | Todas las cuentas referenciadas están activas |
| `branch_is_required_when_account_requires_it` | Si la cuenta exige Branch, la línea lo provee |
| `business_unit_is_required_when_account_requires_it` | Idem BU |
| `period_is_open` | El periodo de `entryDate` está abierto |
| `currency_is_active` | La moneda existe y está habilitada |
| `amount_positive` | Todos los montos son > 0 |

Validaciones custom: el admin puede agregar expresiones booleanas en el array `validations`.

## 6. Versionado y vigencia

- Cada cambio crea **nueva versión**, no edita la existente.
- `validFrom` / `validTo` definen vigencia.
- Asientos posteados llevan `postingRuleId` + `postingRuleVersion` → reproducibilidad.
- Reverso de un asiento usa la misma versión que el original.

## 7. Selección de versión vigente

Algoritmo al recibir un evento:
1. Buscar reglas habilitadas con `trigger` y `tenantId`/`companyId` que matcheen.
2. Filtrar por `validFrom <= entryDate <= validTo` (o `validTo IS NULL`).
3. Si hay más de una match → elegir la más específica (companyId > tenantId), luego la de mayor versión.
4. Si no hay match → error `RuleNotFound`.

## 8. Dry-run

```
POST /api/v1/posting-rules/SALE_VAT_21/dry-run
{
  "entryDate": "2026-04-15",
  "branch": "CABA",
  "businessUnit": "RETAIL",
  "payload": { "total": 121000, "net": 100000 }
}
```

**Respuesta:**
```json
{
  "would_post": true,
  "entry": {
    "description": "Venta factura ...",
    "lines": [
      { "account": "1.1.02.001", "debit": 121000 },
      { "account": "4.1.01.001", "credit": 100000 },
      { "account": "2.1.05.001", "credit": 21000 }
    ]
  },
  "validations": {
    "sum_dr == sum_cr": true,
    "all_accounts_active": true
  }
}
```

## 9. Reglas estándar incluidas (por país)

### Argentina
- `SALE_VAT_21`, `SALE_VAT_10_5`, `SALE_VAT_27`, `SALE_EXEMPT`
- `PURCHASE_VAT_21`, `PURCHASE_VAT_10_5`
- `PAYMENT_RCV`, `PAYMENT_OUT`, `PAYMENT_TRANSFER`
- `PAYROLL_RUN` (sueldos brutos, retenciones, neto a pagar, cargas sociales)
- `FX_REVALUATION`
- `BANK_FEE`
- `INTEREST_EARNED`, `INTEREST_PAID`

### Brasil
- Variantes con ICMS, PIS, COFINS, IRPJ, CSLL.

### México
- Variantes con IVA 16% / 8% frontera, IEPS, ISR, retenciones CFDI.

### USA
- `SALE_TAXABLE` (sales tax por jurisdicción), `SALE_EXEMPT`.

## 10. Buenas prácticas para integradores

1. **Idempotency keys estables**: usar el ID de la operación origen (`order-12345`).
2. **Validar payloads** antes de enviar.
3. **Probar dry-run** en staging antes de habilitar la regla en producción.
4. **Suscribirse a webhooks** para confirmar el posting end-to-end.
5. **No depender del orden** entre eventos: cada uno es independiente.

## 11. Casos edge

### 11.1 Operación que afecta período cerrado
- La API responde 409 `PeriodClosed`.
- Si la operación es legítima (factura tardía), el flujo es: reabrir período → postear → cerrar.

### 11.2 Cuenta dejó de existir
- Si la cuenta referenciada por la regla fue inactivada → error `AccountInactive`.
- Resolución: editar la regla para usar otra cuenta, o reactivar la cuenta.

### 11.3 Diferencia de redondeo en multi-moneda
- Generar línea adicional automática `5.9.99.001 Diferencia de redondeo` por la diferencia.
- Configurable en `Configuration` con threshold (ej. < 0.01).

### 11.4 Regla devuelve asiento desbalanceado
- Bloqueo. La regla es defectuosa. Audit log registra el intento.

## 12. Limitaciones conocidas

- Las reglas no pueden hacer side-effects fuera de generar el asiento (no envían mails, no llaman APIs).
- Las reglas no consultan la base de datos para tomar decisiones (excepto el lookup de cuenta provisto).
- Para lógica compleja (inventario perpetuo, costeo PEPS), se delega al sistema fuente; Conta sólo recibe el resultado.
