# 07 · Reportes, KPIs y alertas

## 1. Catálogo completo de reportes

### 1.1 Reportes contables clásicos

| Reporte | Descripción | Frecuencia | Endpoint |
|---|---|---|---|
| **Libro Diario** | Listado cronológico de todos los asientos | A demanda | `GET /journal` |
| **Libro Mayor** | Movimientos y saldo acumulado por cuenta | A demanda | `GET /ledger?account=...` |
| **Sumas y Saldos** (Trial Balance) | Suma de débitos/créditos y saldo por cuenta a una fecha | Mensual / a demanda | `GET /reports/trial-balance` |
| **Balance General** | Activo, Pasivo, PN; análisis vertical y horizontal | Mensual / cierre | `GET /reports/balance-sheet` |
| **Estado de Resultados** | Ingresos – Egresos por categoría; comparativos | Mensual / cierre | `GET /reports/income-statement` |
| **Estado de Flujo de Efectivo** | Métodos directo e indirecto | Mensual | `GET /reports/cashflow` |
| **Estado de Evolución del PN** | Variaciones del Patrimonio Neto entre ejercicios | Anual | `GET /reports/equity-evolution` |
| **Notas a los EECC** | Notas configurables que acompañan los EECC | Anual | `GET /reports/notes` |

### 1.2 Reportes operativos / de gestión

| Reporte | Descripción | Endpoint |
|---|---|---|
| **Antigüedad CxC** | Buckets 0-30 / 31-60 / 61-90 / +90 | `GET /reports/aged-receivables` |
| **Antigüedad CxP** | Idem para cuentas a pagar | `GET /reports/aged-payables` |
| **Conciliación bancaria** | Matching automático por importe + fecha entre extracto y mayor | `GET /reports/bank-reconciliation` |
| **Rentabilidad por sucursal** | Ranking, comparativos, drilldown | `GET /reports/profitability/branch` |
| **Rentabilidad por BU** | Margen bruto, operativo, contribución | `GET /reports/profitability/business-unit` |
| **Análisis de gastos** | Por categoría con drill-down al asiento | `GET /reports/expenses/breakdown` |
| **Remesas inter-sucursales** | Cuenta puente y conciliación | `GET /reports/remittances` |
| **Reporte fiscal IVA** | Compras y ventas del período + libro IVA | `GET /reports/vat` |
| **Presupuesto vs Real** | Desvíos por categoría y BU | `GET /reports/budget-vs-actual` |

### 1.3 Reportes prospectivos

| Reporte | Descripción | Endpoint |
|---|---|---|
| **Cashflow proyectado 30/60/90/180 días** | Basado en CxC + CxP + recurrencias | `GET /dashboards/forecast/cashflow` |
| **Capacidad de inversión disponible** | Efectivo disponible neto de obligaciones próximas | `GET /dashboards/investment-capacity` |
| **Análisis de escenarios** | What-if sobre cobranzas y pagos | `GET /dashboards/scenarios` |
| **Benchmark interno** | Comparativo entre sucursales/BU | `GET /dashboards/benchmark` |

### 1.4 Formatos de exportación

Cada reporte acepta query param `?format=...`:
- `json` (default)
- `csv`
- `xlsx` (ClosedXML)
- `pdf` (QuestPDF) — con header/footer corporate, paginación, totales por página

## 2. Detalle por reporte

### 2.1 Sumas y Saldos

**Inputs:** fecha de corte, sucursal opcional, BU opcional.
**Output:** lista de cuentas con `débito`, `crédito`, `saldo`, agrupadas por tipo (Activo/Pasivo/PN/Ingresos/Egresos).

Estructura de respuesta:
```json
{
  "asOf": "2026-04-30",
  "currency": "ARS",
  "groups": [
    {
      "type": "asset",
      "totalDebit": 14_500_000,
      "totalCredit": 270_000,
      "totalBalance": 14_230_000,
      "rows": [
        { "code": "1.1.01.001", "name": "Caja", "debit": 520000, "credit": 289500, "balance": 230500 },
        ...
      ]
    },
    ...
  ],
  "grandTotal": { "debit": ..., "credit": ..., "balance": 0 }
}
```

### 2.2 Balance General

**Estructura:**
- Activo (Corriente / No corriente)
- Pasivo (Corriente / No corriente)
- Patrimonio Neto

**Análisis vertical:** % de cada cuenta sobre el total del lado.
**Análisis horizontal:** variación vs período anterior.
**Soporta comparativo** con otra fecha (ej. cierre 2025 vs 2026).

### 2.3 Estado de Resultados

**Líneas estándar:**
1. Ventas netas
2. (-) Costo de mercaderías vendidas
3. = Margen bruto
4. (-) Gastos operativos (sueldos, alquileres, servicios, etc.)
5. = Resultado operativo (EBIT)
6. (+/-) Resultados financieros
7. = Resultado antes de impuestos
8. (-) Impuestos
9. = Resultado neto

**Variantes:** por sucursal, por BU, consolidado.

### 2.4 Flujo de Efectivo

#### Método directo
- Cobranzas a clientes
- Pagos a proveedores
- Pagos al personal
- Pagos de impuestos
- = Flujo operativo
- Compras de activos / Ventas
- = Flujo de inversión
- Préstamos tomados / cancelados / dividendos
- = Flujo financiero
- Σ = Variación de efectivo

#### Método indirecto
- Resultado neto del período
- (+/-) Ajustes (amortizaciones, previsiones, otros no monetarios)
- (+/-) Variaciones del capital de trabajo
- = Flujo operativo

### 2.5 Antigüedad de saldos

- Buckets configurables (default: 0-30 / 31-60 / 61-90 / +90).
- Drill-down a la cuenta del cliente/proveedor.
- Heatmap de morosidad por cliente.

### 2.6 Conciliación bancaria

- Carga de extracto bancario (CSV / OFX / API).
- Matching automático por `(monto, fecha ± N días)`.
- Resultados:
  - Matched: ✓
  - Outstanding (en mayor, no en banco): asiento sin acreditar.
  - Unidentified (en banco, no en mayor): pendiente de imputar.
- Genera asientos de ajuste sugeridos (intereses, comisiones).

### 2.7 Rentabilidad por sucursal / BU

- Ingresos – Costos directos – Gastos asignados = Resultado.
- Ratios: margen bruto, margen operativo, contribución %.
- Ranking + comparativo período anterior + benchmark interno (mejor sucursal).

### 2.8 Análisis de gastos

- Pareto: top 10 categorías que representan el 80%.
- Tendencia mensual.
- Outliers detectados estadísticamente (gasto que se desvía > N σ de la media).
- Drill-down hasta el asiento.

### 2.9 Reporte fiscal IVA

- Libro IVA Ventas (subdiario).
- Libro IVA Compras.
- Determinación: débito fiscal – crédito fiscal = saldo a favor / a pagar.
- Export al formato del fisco (CITI AR, SPED BR, CFDI MX).

### 2.10 Presupuesto vs Real

- Carga de presupuesto por mes/cuenta/BU.
- Cálculo de desvío absoluto y relativo.
- Semáforo: verde < 5%, amarillo 5-15%, rojo > 15%.
- Forecast revisado en base a la tendencia.

### 2.11 Cashflow proyectado

Algoritmo:
1. Saldo actual de Caja y Bancos.
2. + Cobranzas estimadas: CxC con vencimiento futuro × tasa histórica de cobro a tiempo.
3. – Pagos comprometidos: CxP con vencimiento futuro.
4. – Recurrencias detectadas: pagos que ocurren todos los meses (sueldos, alquileres, impuestos).
5. + Ingresos recurrentes (suscripciones).
6. = Flujo neto semanal.

Stress testing: ±20% en cobranzas y pagos para mostrar un rango.

## 3. KPIs / Indicadores

### 3.1 Liquidez

| Indicador | Fórmula | Bandera |
|---|---|---|
| Liquidez corriente | Activo Corriente / Pasivo Corriente | Verde > 1.5, Amarillo 1.0-1.5, Rojo < 1.0 |
| Prueba ácida | (AC – Inventarios) / PC | Verde > 1.0 |
| Capital de trabajo | AC – PC | Negativo = rojo |
| Ciclo de conversión de efectivo | DSO + DIO − DPO (días) | Menor mejor |

### 3.2 Rentabilidad

| Indicador | Fórmula |
|---|---|
| Margen bruto | (Ventas − CMV) / Ventas |
| Margen operativo | EBIT / Ventas |
| Margen neto | Resultado Neto / Ventas |
| ROE | Resultado Neto / Patrimonio Neto |
| ROA | Resultado Neto / Activo total |
| ROI por BU | Resultado BU / Inversión BU |

### 3.3 Endeudamiento

| Indicador | Fórmula |
|---|---|
| Endeudamiento total | Pasivo / Activo |
| Deuda / PN | Pasivo / Patrimonio Neto |
| Cobertura de intereses | EBIT / Intereses |
| Solvencia | Activo / Pasivo |

### 3.4 Eficiencia operativa

| Indicador | Fórmula |
|---|---|
| Rotación de inventario | CMV / Inventario promedio |
| DSO (Days Sales Outstanding) | CxC × 365 / Ventas |
| DPO (Days Payable Outstanding) | CxP × 365 / Compras |
| DIO (Days Inventory Outstanding) | Inv. × 365 / CMV |
| Rotación de activos | Ventas / Activo total |

### 3.5 Crecimiento

| Indicador | Fórmula |
|---|---|
| Ventas YoY | (Ventas año / Ventas año previo) − 1 |
| EBITDA YoY | idem |
| Crecimiento gastos | idem (alerta si crece más que ventas) |

## 4. Motor de alertas

### 4.1 Alertas predefinidas

| Alerta | Trigger | Severidad | Canal default |
|---|---|---|---|
| Liquidez baja | Liquidez corriente < umbral | crítica | email + Slack |
| Vencimientos próximos | CxP que vencen en ≤ N días | media | in-app + email |
| Cobranzas vencidas | CxC con +30 días sin cobrar | media | in-app |
| Gasto fuera de presupuesto | > 110% del presupuestado | media | in-app |
| Asiento sospechoso | Monto > N σ de la media histórica de la cuenta | alta | email |
| Sucursal con margen negativo | 2 meses consecutivos | alta | email |
| Cuenta inactiva con movimiento | Posibles errores de imputación | media | in-app |
| Cierre próximo | 5 días antes del cierre con ítems pendientes | informativa | in-app |
| Brecha cambiaria | FX se movió > X% sin revaluación | alta | email |
| Conciliación bancaria atrasada | Sin conciliar > 7 días | media | in-app |
| Remesa pendiente | Remesa sin conciliar > 5 días | media | in-app |
| Doble factura | Mismo SourceReference duplicado | alta | email |
| Tendencia de pérdida | Resultado neto negativo 2 meses seguidos | alta | email + Slack |

### 4.2 Configuración de alerta

```json
{
  "code": "liquidity_low",
  "name": "Liquidez baja",
  "expression": "ratio('current_liquidity') < threshold",
  "threshold": 1.3,
  "severity": "critical",
  "channels": ["email:cfo@acme.com", "slack:#finance", "webhook:https://..."],
  "dedupe": "until_resolved",
  "evaluationInterval": "PT15M"
}
```

### 4.3 Anti-fatiga

- Dedupe: misma alerta no se repite hasta que se "resuelve" (la condición pasa a falsa).
- Snooze: el usuario puede silenciar por N horas.
- Digest diario para alertas de severidad baja.

## 5. Dashboards estándar

### 5.1 Dashboard Ejecutivo (CFO)
- KPIs financieros principales (Activo, Pasivo, PN, Resultado, ROE, ROA, Liquidez).
- Cashflow 12m + proyección 90d.
- Alertas activas críticas.
- Top 5 cuentas con mayor variación.

### 5.2 Dashboard Operativo (Contador)
- Pendientes (conciliaciones, ajustes, asientos en aprobación).
- Cierres próximos.
- Errores recientes (asientos con observaciones).
- Anomalías estadísticas.

### 5.3 Dashboard por Sucursal
- KPIs de la sucursal: ventas, costos, margen.
- Comparativo con otras sucursales.
- Cashflow propio.
- Remesas pendientes.

### 5.4 Dashboard por BU
- Ingresos, costos directos, contribución.
- Rentabilidad histórica.
- Comparativo con presupuesto.

## 6. Decisiones de implementación

- **Lecturas pesadas → Dapper + queries optimizadas**, no EF Core.
- **Proyecciones precomputadas** en `BalanceByAccount` mantenidas por subscriber del evento `JournalEntryPosted`.
- **Cache (Redis) para KPIs vivos**: TTL 60s, invalidación por evento.
- **Sumas y Saldos > 100k cuentas**: streaming + paginación.
- **Exports grandes**: encolados en background; notificación cuando están listos.
