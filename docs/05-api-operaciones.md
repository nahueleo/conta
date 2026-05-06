# 05 · API y operaciones disponibles

Base URL: `https://api.conta.example.com/v1`

Toda la API es REST + JSON. Documentación OpenAPI servida en `/openapi.json` y portal interactivo en `/docs`.

## 1. Convenciones generales

### 1.1 Autenticación

```
Authorization: Bearer <jwt-token>
```

JWT con claims:
- `sub` (user ID)
- `tenant_id`
- `company_id` (puede ser un array)
- `scopes` (array de permisos)
- `mfa` (true/false)

### 1.2 Headers requeridos

| Header | Obligatorio | Uso |
|---|---|---|
| `Authorization` | sí | JWT |
| `X-Tenant-Id` | sí | Validado contra el JWT |
| `X-Company-Id` | sí | La empresa sobre la que opera la request |
| `Idempotency-Key` | sí en endpoints de escritura | UUID único por intento de operación |
| `X-Correlation-Id` | recomendado | Trace ID para correlacionar logs |
| `Accept-Language` | opcional | `es-AR`, `pt-BR`, `en-US` |

### 1.3 Códigos de estado

| Código | Cuándo |
|---|---|
| 200 | OK |
| 201 | Creado (POST exitoso) |
| 202 | Aceptado (procesamiento async) |
| 204 | OK sin body |
| 400 | Request mal formada |
| 401 | No autenticado |
| 403 | Sin permiso |
| 404 | No encontrado |
| 409 | Conflicto (idempotency, period closed) |
| 422 | Validación de negocio fallida |
| 429 | Rate limit |
| 500 | Error interno |
| 503 | Mantenimiento |

### 1.4 Formato de error

```json
{
  "type": "https://conta.example.com/errors/period-closed",
  "title": "El período fiscal está cerrado",
  "status": 409,
  "detail": "No se puede postear con fecha 2025-12-15 porque el ejercicio 2025 está cerrado.",
  "instance": "/api/v1/journal/post",
  "traceId": "00-abc...-def-01",
  "errors": [
    { "field": "entryDate", "code": "PeriodClosed", "message": "..." }
  ]
}
```

### 1.5 Paginación

```
GET /api/v1/journal?from=2026-04-01&to=2026-04-30&page=1&pageSize=50
```

Respuesta:
```json
{
  "items": [ ... ],
  "page": 1,
  "pageSize": 50,
  "total": 1234,
  "totalPages": 25
}
```

### 1.6 Idempotencia

Toda escritura acepta `Idempotency-Key`. Sistema almacena la respuesta por 24h. Reenvío con misma key → misma respuesta.

Si la key ya existe pero el body es distinto → `409 IdempotencyKeyConflict`.

---

## 2. Endpoints

### 2.1 Contabilización

#### POST `/journal/post`

Postea un asiento desde un sistema externo o por API directa.

**Permisos:** `accounting.post`

**Body:**
```json
{
  "trigger": "external.sale.created",
  "entryDate": "2026-04-15",
  "description": "Venta factura A-0001-00045",
  "sourceReference": "INV-0001-00045",
  "branch": "CABA",
  "businessUnit": "RETAIL",
  "currency": "ARS",
  "payload": {
    "total": 121000,
    "net": 100000,
    "vat": 21000
  }
}
```

**Variante: asiento explícito (sin posting rule)**
```json
{
  "trigger": "manual",
  "entryDate": "2026-04-15",
  "description": "Ajuste manual",
  "lines": [
    { "account": "1.1.02.001", "debit": 100, "branch": "CABA" },
    { "account": "4.1.01.001", "credit": 100 }
  ]
}
```

**Respuesta 201:**
```json
{
  "id": "JE-2026-001234",
  "uid": "8f3...",
  "totalDebit": 121000,
  "totalCredit": 121000,
  "lines": [ ... ],
  "postedAt": "2026-04-15T14:23:11Z"
}
```

**Errores comunes:** 409 PeriodClosed, 422 UnbalancedEntry, 422 AccountInactive, 422 RuleNotFound.

#### POST `/journal/post/bulk`

Lote de hasta 1000 asientos.

```json
{
  "mode": "all_or_nothing",   // o "best_effort"
  "entries": [ { ... }, { ... } ]
}
```

**Respuesta:**
```json
{
  "succeeded": 998,
  "failed": 2,
  "results": [
    { "index": 0, "status": "ok", "id": "JE-2026-001235" },
    { "index": 5, "status": "error", "code": "AccountInactive", "message": "..." }
  ]
}
```

#### POST `/journal/{id}/reverse`

```json
{ "reason": "Corrección de imputación errónea" }
```

#### POST `/journal/dry-run`

Simula sin postear. Devuelve el asiento que se generaría.

```json
{
  "trigger": "external.sale.created",
  "payload": { "total": 121000, "net": 100000 }
}
```

#### POST `/journal/manual`

Asiento manual con flujo de aprobación si la config lo requiere.

---

### 2.2 Consultas

#### GET `/journal`
Filtros: `from`, `to`, `branch`, `businessUnit`, `account`, `source`, `q` (texto libre), `page`, `pageSize`.

#### GET `/journal/{id}`
Detalle completo con líneas y origen.

#### GET `/journal/{id}/audit`
Trace de auditoría del asiento.

#### GET `/ledger`
Mayor por cuenta:
```
GET /ledger?account=1.1.02.001&from=2026-01-01&to=2026-04-30&branch=CABA
```

Respuesta con saldo acumulado por línea.

---

### 2.3 Plan de cuentas

| Método | Path | Descripción |
|---|---|---|
| GET | `/chart-of-accounts` | Árbol completo o flat (`?flat=true`) |
| GET | `/chart-of-accounts/{code}` | Una cuenta |
| POST | `/chart-of-accounts` | Crear |
| PUT | `/chart-of-accounts/{code}` | Editar metadata |
| POST | `/chart-of-accounts/{code}/move` | Mover bajo otro padre (crea AccountMapping) |
| POST | `/chart-of-accounts/{code}/split` | Dividir en sub-cuentas |
| POST | `/chart-of-accounts/{code}/deactivate` | Inactivar (sólo si saldo = 0) |
| POST | `/chart-of-accounts/templates/apply` | Aplicar plantilla por país |

---

### 2.4 Posting Rules

| Método | Path | Descripción |
|---|---|---|
| GET | `/posting-rules` | Lista con paginación |
| GET | `/posting-rules/{code}` | Última versión activa |
| GET | `/posting-rules/{code}/versions` | Historial |
| POST | `/posting-rules` | Crear nueva regla (versión 1) |
| PUT | `/posting-rules/{code}` | Crea versión nueva |
| POST | `/posting-rules/{code}/enable` | |
| POST | `/posting-rules/{code}/disable` | |
| POST | `/posting-rules/{code}/dry-run` | Simula con payload |

---

### 2.5 Sucursales y Unidades de negocio

| Método | Path |
|---|---|
| GET / POST | `/branches` |
| PUT / DELETE | `/branches/{code}` |
| GET / POST | `/business-units` |
| PUT / DELETE | `/business-units/{code}` |

---

### 2.6 Monedas y tipos de cambio

| Método | Path | Descripción |
|---|---|---|
| GET | `/currencies` | |
| POST | `/currencies` | Habilitar moneda |
| GET | `/exchange-rates?base=USD&quote=ARS&date=2026-04-15` | |
| POST | `/exchange-rates` | Cargar manual |
| POST | `/exchange-rates/sync` | Forzar sync con proveedor |

---

### 2.7 Periodos fiscales

| Método | Path | Descripción |
|---|---|---|
| GET | `/fiscal-years` | |
| GET | `/fiscal-years/{year}/periods` | |
| POST | `/fiscal-years/{year}/close/start` | Inicia wizard |
| POST | `/fiscal-years/{year}/close/validate` | Pre-validaciones |
| POST | `/fiscal-years/{year}/close/adjust` | Aplicar ajustes |
| POST | `/fiscal-years/{year}/close/confirm` | Cierra (requiere segundo aprobador) |
| POST | `/fiscal-years/{year}/reopen` | Reabre (requiere segundo aprobador + razón) |

---

### 2.8 Remesas

| Método | Path |
|---|---|
| GET / POST | `/remittances` |
| POST | `/remittances/{id}/confirm-receipt` |
| POST | `/remittances/{id}/flag` |

---

### 2.9 Reportes

| Path | Descripción |
|---|---|
| GET `/reports/trial-balance?asOf=...` | Sumas y Saldos |
| GET `/reports/balance-sheet?asOf=...&compareWith=...` | Balance General |
| GET `/reports/income-statement?from=...&to=...` | Estado de Resultados |
| GET `/reports/cashflow?from=...&to=...&method=direct\|indirect` | Flujo de efectivo |
| GET `/reports/equity-evolution?fromYear=...&toYear=...` | Evolución del PN |
| GET `/reports/aged-receivables?asOf=...` | Antigüedad CxC |
| GET `/reports/aged-payables?asOf=...` | Antigüedad CxP |
| GET `/reports/profitability/branch?period=...` | Rentabilidad por sucursal |
| GET `/reports/profitability/business-unit?period=...` | Rentabilidad por BU |
| GET `/reports/expenses/breakdown?from=...&to=...` | Análisis de gastos |
| GET `/reports/budget-vs-actual?period=...` | Presupuesto vs Real |
| GET `/reports/vat?period=...` | Reporte fiscal IVA |
| GET `/reports/bank-reconciliation?accountId=...&period=...` | Conciliación |

Cada reporte acepta `format=json|csv|xlsx|pdf` (default JSON).

---

### 2.10 Dashboards / KPIs

| Path | Descripción |
|---|---|
| GET `/dashboards/exec` | KPIs principales (activo, pasivo, PN, resultado) |
| GET `/dashboards/ratios?asOf=...` | Liquidez, ROE, ROA, endeudamiento |
| GET `/dashboards/forecast/cashflow?days=90` | Cashflow proyectado |
| GET `/dashboards/anomalies?period=...` | Asientos sospechosos |

---

### 2.11 Alertas

| Método | Path | Descripción |
|---|---|---|
| GET | `/alerts/rules` | Reglas configuradas |
| POST | `/alerts/rules` | Crear |
| PUT | `/alerts/rules/{id}` | |
| GET | `/alerts/active` | Alertas vigentes |
| POST | `/alerts/{id}/ack` | Ack manual |

---

### 2.12 Webhooks

| Método | Path | Descripción |
|---|---|---|
| GET / POST | `/webhooks` | Suscripciones |
| POST | `/webhooks/{id}/test` | Disparar evento de prueba |

Eventos disponibles:
- `JournalEntryPosted`
- `JournalEntryReversed`
- `PeriodClosed`
- `PeriodReopened`
- `AlertTriggered`
- `AccountChanged`
- `PostingRuleVersionPublished`

Firma HMAC-SHA256 sobre el body con el secret.

---

### 2.13 Usuarios y roles

| Método | Path |
|---|---|
| GET / POST | `/users` |
| POST | `/users/{id}/roles` |
| GET | `/roles` |
| GET | `/roles/{name}/permissions` |

---

### 2.14 Auditoría

| Método | Path | Descripción |
|---|---|---|
| GET | `/audit?from=...&to=...&entity=...&user=...` | Audit log con filtros |
| GET | `/audit/{id}` | Detalle |

---

## 3. Rate limits (sugeridos)

| Plan | Reads | Writes (posting) |
|---|---|---|
| Micro | 60 rpm | 10 rps |
| PyME | 600 rpm | 50 rps |
| Corporate | 6.000 rpm | 500 rps |

Burst del 2x permitido en ventana de 10 segundos.

## 4. Versionado

- Path versioning: `/v1/...`, `/v2/...`.
- Cambios breaking incrementan major.
- Cambios aditivos no requieren nueva versión.
- Deprecación: header `Sunset` con fecha; ventana mínima de 6 meses.

## 5. SDK oficiales

Generados desde OpenAPI con Kiota / NSwag:
- C# (.NET)
- TypeScript / Node
- Python
- Java
- Go

## 6. Sandbox

Entorno `sandbox.api.conta.example.com` con:
- Tenant pre-poblado.
- 100 asientos de ejemplo.
- Reset diario.
- Idempotency keys aceptadas pero no persistidas más allá del día.
