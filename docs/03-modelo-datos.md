# 03 · Modelo de datos

Convenciones:
- PK = Primary Key, FK = Foreign Key, UQ = Unique, IX = Index
- Toda tabla tiene `TenantId UNIQUEIDENTIFIER NOT NULL` y un Global Query Filter en EF.
- Toda tabla tiene `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` (excepto las inmutables).
- Tablas inmutables: `JournalEntry`, `JournalEntryLine`, `AuditLog`.
- Temporal Tables (system-versioned) en: `Account`, `PostingRule`, `Configuration`, `Branch`, `BusinessUnit`.

## 1. Diagrama de entidades

```
Tenant ──< Company ──< FiscalYear ──< FiscalPeriod
              │
              ├──< Currency ──< ExchangeRate
              │
              ├──< Branch
              ├──< BusinessUnit
              │
              ├──< Account (jerárquico, materialized path)
              │
              ├──< PostingRule ──< PostingRuleLine
              │
              ├──< JournalEntry (inmutable)
              │       └──< JournalEntryLine (FK a Account, Branch, BU)
              │
              ├──< Remittance
              ├──< Configuration (key/value por scope)
              ├──< User ──< UserRole ──< Role ──< RolePermission
              ├──< IdempotencyKey
              ├──< OutboxMessage
              ├──< AuditLog (append-only)
              └──< AccountMapping (versionado para preservar historial)
```

## 2. Catálogo de tablas

### 2.1 `Tenant`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| Id | UNIQUEIDENTIFIER | PK | |
| Name | NVARCHAR(200) | NOT NULL | |
| Plan | NVARCHAR(50) | | `micro` / `pyme` / `corporate` |
| IsolationMode | NVARCHAR(20) | | `logical` / `schema` / `database` |
| Region | NVARCHAR(20) | | `eastus` / `brazilsouth` / etc. |
| Status | NVARCHAR(20) | | `active` / `suspended` / `archived` |
| CreatedAt | DATETIME2 | | |

### 2.2 `Company`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| Id | UNIQUEIDENTIFIER | PK | |
| TenantId | UNIQUEIDENTIFIER | FK | |
| LegalName | NVARCHAR(200) | NOT NULL | |
| TaxId | NVARCHAR(50) | UQ + Always Encrypted | CUIT/CNPJ/RFC |
| Country | CHAR(2) | NOT NULL | ISO 3166-1 |
| FiscalYearStart | INT | | Mes (1-12) |
| FunctionalCurrency | CHAR(3) | FK Currency | ISO 4217 |
| TaxRegime | NVARCHAR(50) | | `RI`, `Mono`, `LucroReal`, etc. |

IX: `(TenantId)`.

### 2.3 `FiscalYear`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| CompanyId | UNIQUEIDENTIFIER | FK |
| Year | INT | |
| StartDate | DATE | |
| EndDate | DATE | |
| Status | NVARCHAR(20) | `open` / `closing` / `closed` / `archived` |
| ClosedAt | DATETIME2 | |
| ClosedBy | NVARCHAR(100) | |

UQ: `(CompanyId, Year)`. IX: `(CompanyId, Status)`.

### 2.4 `FiscalPeriod`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| FiscalYearId | UNIQUEIDENTIFIER | FK |
| Number | INT | 1-12 |
| StartDate | DATE | |
| EndDate | DATE | |
| Status | NVARCHAR(20) | `open` / `closed` |

### 2.5 `Currency`

| Columna | Tipo | Descripción |
|---|---|---|
| Code | CHAR(3) | PK (compuesto con TenantId) |
| Name | NVARCHAR(100) | |
| Decimals | TINYINT | |
| Symbol | NVARCHAR(5) | |

### 2.6 `ExchangeRate`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | BIGINT IDENTITY | PK |
| BaseCurrency | CHAR(3) | |
| QuoteCurrency | CHAR(3) | |
| Rate | DECIMAL(28,12) | |
| AsOfDate | DATE | |
| Source | NVARCHAR(50) | `BCRA`, `ECB`, `manual` |

UQ: `(TenantId, BaseCurrency, QuoteCurrency, AsOfDate)`. IX descendente por `AsOfDate`.

### 2.7 `Branch`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| CompanyId | UNIQUEIDENTIFIER | FK |
| Code | NVARCHAR(20) | |
| Name | NVARCHAR(150) | |
| IsActive | BIT | |
| Address | NVARCHAR(300) | |

UQ: `(CompanyId, Code)`. Temporal table.

### 2.8 `BusinessUnit`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| CompanyId | UNIQUEIDENTIFIER | FK |
| Code | NVARCHAR(20) | |
| Name | NVARCHAR(150) | |
| IsActive | BIT | |

UQ: `(CompanyId, Code)`. Temporal table.

### 2.9 `Account` (plan de cuentas)

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| CompanyId | UNIQUEIDENTIFIER | FK |
| Code | NVARCHAR(50) | `1.1.01.001` |
| Path | NVARCHAR(500) | materialized path (`/1/1.1/1.1.01/1.1.01.001`) |
| Name | NVARCHAR(200) | |
| ParentId | UNIQUEIDENTIFIER | FK (self) |
| Level | TINYINT | 1..5 |
| Type | NVARCHAR(20) | `asset` / `liability` / `equity` / `income` / `expense` |
| Nature | NVARCHAR(20) | `debit` / `credit` (saldo natural) |
| IsControl | BIT | Si es nodo de control (no admite asientos directos) |
| RequiresBranch | BIT | Si los asientos sobre esta cuenta deben llevar Branch |
| RequiresBusinessUnit | BIT | Idem BU |
| AllowsManualEntry | BIT | |
| Currency | CHAR(3) | NULL = funcional |
| IsActive | BIT | |

UQ: `(CompanyId, Code)`. IX: `(CompanyId, Path)`, `(CompanyId, Type, IsActive)`. Temporal table.

### 2.10 `AccountMapping` (preserva historial al reestructurar)

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| OldAccountId | UNIQUEIDENTIFIER | |
| NewAccountId | UNIQUEIDENTIFIER | |
| ValidFrom | DATE | |
| ValidTo | DATE | NULL si vigente |
| Reason | NVARCHAR(300) | |

Permite que reportes históricos sigan funcionando si se renombra/mueve una cuenta.

### 2.11 `PostingRule`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| CompanyId | UNIQUEIDENTIFIER | FK |
| Code | NVARCHAR(50) | `SALE_VAT_21` |
| Trigger | NVARCHAR(100) | `external.sale.created` |
| Version | INT | Auto-incrementado por code |
| IsEnabled | BIT | |
| ValidFrom | DATETIME2 | |
| ValidTo | DATETIME2 | NULL si vigente |
| Description | NVARCHAR(500) | |
| Validations | NVARCHAR(MAX) | JSON: `["sum_dr == sum_cr","all_accounts_active"]` |

UQ: `(CompanyId, Code, Version)`.

### 2.12 `PostingRuleLine`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| PostingRuleId | UNIQUEIDENTIFIER | FK |
| Sequence | INT | Orden |
| Side | CHAR(2) | `DR` / `CR` |
| AccountExpression | NVARCHAR(100) | `1.1.02.001` o `{{accountByBranch}}` |
| AmountExpression | NVARCHAR(500) | `{{total}} - {{net}}` |
| BranchExpression | NVARCHAR(100) | NULL si no aplica |
| BusinessUnitExpression | NVARCHAR(100) | |
| Label | NVARCHAR(200) | |

### 2.13 `JournalEntry` ⛔ inmutable

| Columna | Tipo | Descripción |
|---|---|---|
| Id | BIGINT IDENTITY | PK (entero por performance) |
| Uid | UNIQUEIDENTIFIER | UQ, exposed externamente |
| CompanyId | UNIQUEIDENTIFIER | FK |
| FiscalPeriodId | UNIQUEIDENTIFIER | FK |
| OperationDate | DATE | Fecha de operación proveniente del evento de negocio |
| PostedAt | DATETIME2 | |
| PostedBy | NVARCHAR(100) | |
| Description | NVARCHAR(500) | |
| Source | NVARCHAR(50) | `manual` / `external.sale.created` / `remittance` / `closing` / `reversal` |
| SourceReference | NVARCHAR(200) | ID externo (factura, payment, etc.) |
| IdempotencyKey | NVARCHAR(100) | |
| PostingRuleId | UNIQUEIDENTIFIER | NULL si manual |
| PostingRuleVersion | INT | |
| ReversedJournalEntryId | BIGINT | NULL si no es reverso |
| ReversalReason | NVARCHAR(500) | |
| TotalDebit | DECIMAL(20,4) | Denormalizado para reportes |
| TotalCredit | DECIMAL(20,4) | |

Trigger SQL `INSTEAD OF UPDATE, DELETE` que lanza error.

UQ: `(CompanyId, IdempotencyKey)` (parcial, donde IdempotencyKey IS NOT NULL).
IX: `(CompanyId, OperationDate)`, `(CompanyId, FiscalPeriodId)`, `(CompanyId, Source, SourceReference)`.

### 2.14 `JournalEntryLine` ⛔ inmutable

| Columna | Tipo | Descripción |
|---|---|---|
| Id | BIGINT IDENTITY | PK |
| JournalEntryId | BIGINT | FK |
| Sequence | INT | |
| AccountId | UNIQUEIDENTIFIER | FK |
| BranchId | UNIQUEIDENTIFIER | NULL si no aplica |
| BusinessUnitId | UNIQUEIDENTIFIER | NULL si no aplica |
| Debit | DECIMAL(20,4) | |
| Credit | DECIMAL(20,4) | |
| CurrencyCode | CHAR(3) | |
| FunctionalAmount | DECIMAL(20,4) | Convertido a moneda funcional |
| ExchangeRate | DECIMAL(28,12) | Tipo de cambio aplicado |
| Description | NVARCHAR(500) | |

Constraint: `(Debit > 0 AND Credit = 0) OR (Debit = 0 AND Credit > 0)`.

IX: `(AccountId, JournalEntryId)`, `(BranchId)`, `(BusinessUnitId)`.

### 2.15 `Remittance`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| Code | NVARCHAR(20) | `R-0091` |
| FromBranchId | UNIQUEIDENTIFIER | FK |
| ToBranchId | UNIQUEIDENTIFIER | FK |
| Amount | DECIMAL(20,4) | |
| CurrencyCode | CHAR(3) | |
| SentAt | DATETIME2 | |
| ReceivedAt | DATETIME2 | NULL si no recibida |
| Status | NVARCHAR(20) | `pending` / `reconciled` / `flagged` |
| SendJournalEntryId | BIGINT | FK al asiento de salida |
| ReceiveJournalEntryId | BIGINT | FK al asiento de entrada |

### 2.16 `User`, `Role`, `Permission`

```
User(Id, TenantId, Email, DisplayName, IsActive, MfaEnabled, LastLoginAt)
UserRole(UserId, RoleId, CompanyId, BranchId NULL)
Role(Id, Name, Description)  -- ej: 'Admin', 'Operador', 'Auditor'
RolePermission(RoleId, Permission)  -- ej: 'accounting.read'
```

Permisos predefinidos:
- `accounting.read`
- `accounting.post`
- `accounting.config.write`
- `accounting.period.close`
- `accounting.period.reopen` (siempre con segundo aprobador)
- `accounting.audit.read`

### 2.17 `IdempotencyKey`

| Columna | Tipo | Descripción |
|---|---|---|
| Key | NVARCHAR(100) | PK |
| TenantId | UNIQUEIDENTIFIER | |
| Endpoint | NVARCHAR(200) | |
| RequestHash | NVARCHAR(64) | SHA-256 del body |
| ResponseStatus | INT | |
| ResponseBody | NVARCHAR(MAX) | |
| ExpiresAt | DATETIME2 | |

TTL: 24h. Job de limpieza diario.

### 2.18 `OutboxMessage`

| Columna | Tipo | Descripción |
|---|---|---|
| Id | BIGINT IDENTITY | PK |
| OccurredAt | DATETIME2 | |
| Type | NVARCHAR(200) | `JournalEntryPosted` |
| Payload | NVARCHAR(MAX) | JSON |
| ProcessedAt | DATETIME2 | NULL hasta publicar |

Patrón outbox: el evento se persiste en la misma transacción que el cambio de dominio. Un worker lo publica a Service Bus.

### 2.19 `AuditLog` ⛔ append-only

| Columna | Tipo | Descripción |
|---|---|---|
| Id | BIGINT IDENTITY | PK |
| OccurredAt | DATETIME2 | |
| TenantId | UNIQUEIDENTIFIER | |
| UserId | UNIQUEIDENTIFIER | |
| UserEmail | NVARCHAR(200) | |
| ClientIp | NVARCHAR(45) | IPv4/IPv6 |
| EntityType | NVARCHAR(100) | `JournalEntry`, `Account`, `PostingRule`... |
| EntityId | NVARCHAR(100) | |
| Action | NVARCHAR(50) | `created`, `updated`, `closed`, `reopened`, ... |
| Diff | NVARCHAR(MAX) | JSON con before/after |
| Reason | NVARCHAR(500) | |

Trigger anti-DELETE/UPDATE.

### 2.20 `Configuration`

Key/value por scope. Ej: thresholds de alertas, integraciones, etc.

| Columna | Tipo | Descripción |
|---|---|---|
| Id | UNIQUEIDENTIFIER | PK |
| Scope | NVARCHAR(50) | `tenant` / `company` / `branch` |
| ScopeId | UNIQUEIDENTIFIER | |
| Key | NVARCHAR(100) | `liquidity.threshold` |
| Value | NVARCHAR(MAX) | |
| ValueType | NVARCHAR(20) | `number` / `string` / `json` / `boolean` |

UQ: `(Scope, ScopeId, Key)`. Temporal table.

### 2.21 Tablas de proyección (read models)

Mantenidas por subscriber del evento `JournalEntryPosted`:

- `BalanceByAccount(CompanyId, AccountId, SnapshotDate, Debit, Credit, Balance)` — saldo por cuenta a fecha de snapshot diario.
- `BalanceByBranchBU(CompanyId, BranchId, BusinessUnitId, AccountType, Period, Amount)` — agregaciones para dashboards.
- `OpenReceivables(CompanyId, CustomerRef, AmountDue, DueDate, AgingBucket)` — para CxC y antigüedad.

## 3. Estrategia de índices

| Caso | Índice |
|---|---|
| Mayor por cuenta y rango de fechas | `JournalEntryLine(AccountId)` + `JournalEntry(OperationDate)` |
| Buscar por origen externo | `JournalEntry(CompanyId, Source, SourceReference)` |
| Idempotencia | UQ `(CompanyId, IdempotencyKey)` parcial |
| Reportes por sucursal/BU | filtered IX `(CompanyId, BranchId, BusinessUnitId)` |
| Reportes por período | `(CompanyId, FiscalPeriodId, OperationDate)` |
| Plan de cuentas subárbol | `(CompanyId, Path)` con `Path LIKE '/1/1.1/%'` |

## 4. Particionamiento

Para tenants grandes (> 10M asientos/año):

- Particionar `JournalEntryLine` por `OperationDate` (año o trimestre).
- Switch-out automático de particiones cerradas → archivo histórico.

## 5. Consideraciones de cifrado

- **Always Encrypted (deterministic)** para `Company.TaxId`.
- **Always Encrypted (randomized)** para datos bancarios si se almacenan.
- Claves en Azure Key Vault, fuera del alcance de DBAs.
- Backups cifrados con TDE + clave en Key Vault.
- Storage WORM para exports diarios.

## 6. Datos semilla por tenant nuevo

Al onboarding, se ejecuta un script que:

1. Crea 1 `Company` con plantilla de país.
2. Crea ~80-220 `Account` según template.
3. Crea ~10-15 `PostingRule` estándar (ventas, compras, cobranzas, pagos, IVA, sueldos, FX).
4. Crea ~5 `Role` con permisos predefinidos.
5. Crea 1 `Branch` "Casa central" y 1 `BusinessUnit` "General".
6. Inicializa `FiscalYear` actual con sus 12 `FiscalPeriod`.
