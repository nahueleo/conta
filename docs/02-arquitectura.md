# 02 · Arquitectura

## 1. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | **.NET 9** + C# 13 | Versión actual con AOT opcional, mejoras de perf |
| API síncrona | **ASP.NET Core Minimal APIs** + FastEndpoints | Bajo overhead, código declarativo |
| API elástica | **Azure Functions v4** (isolated, .NET 9) | Auto-scale serverless, costo por invocación |
| Mensajería | **Azure Service Bus** (topics + sessions) | Orden por sesión (cuenta/sucursal), DLQ nativa |
| ORM | **EF Core 9** (escritura) + **Dapper** (lectura masiva) | EF para dominio; Dapper para reportes pesados |
| DB | **SQL Server 2022** | Always Encrypted, Temporal Tables, JSON nativo |
| Cache | **Redis** (StackExchange.Redis) | Plan de cuentas, configs, balances vivos |
| AuthN/Z | **OAuth2 / OIDC** (Azure AD B2C o Auth0) + JWT | Estándar de la industria |
| API Gateway | **Azure API Management** | Rate limit, throttling, claves por cliente, WAF |
| Observabilidad | **OpenTelemetry** → Azure Monitor / App Insights, **Serilog** | Trazas end-to-end |
| IaC | **Bicep** o **Terraform** | Reproducible y versionado |
| CI/CD | GitHub Actions o Azure DevOps | Pipeline con seguridad SAST + DAST |
| Frontend | **React 18 + TypeScript + Vite** + shadcn/ui o Mantine | Stack moderno, productivo |
| Charts | Recharts o ECharts | Composables, tema-aware |

## 2. Topología de despliegue

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Azure API Management (APIM)                    │
│  - Rate limit por tenant y endpoint                             │
│  - JWT validation + scopes                                      │
│  - WAF + geofencing                                             │
└─────────┬───────────────────────────────────┬───────────────────┘
          │                                   │
   ┌──────▼─────────┐                ┌────────▼────────────┐
   │ Accounting.Api │                │ Accounting.Functions│
   │ (App Service)  │                │ (Functions Premium) │
   │  - ABM         │                │  - PostJournalEntry │
   │  - Reportes    │                │  - BulkPosting      │
   │  - Consultas   │                │  - ClosePeriod      │
   │  - Webhooks    │                │  - FxRevaluation    │
   └──────┬─────────┘                └────────┬────────────┘
          │                                   │
          └───────────┬───────────────────────┘
                      │
          ┌───────────▼────────────┐
          │  Accounting.Core       │   ← Dominio (DDD)
          │  (NuGet interno)       │
          └───────────┬────────────┘
                      │
   ┌──────────────────┼────────────────────────┐
   │                  │                        │
┌──▼────────┐  ┌──────▼──────┐         ┌───────▼────────┐
│SQL Server │  │  Redis      │         │ Service Bus    │
│ (HA pair) │  │  (cache)    │         │ (events + DLQ) │
└───────────┘  └─────────────┘         └────────────────┘

Servicios laterales: Key Vault · Blob Storage (WORM) · App Insights

Integración externa principal: Kiboo ERP mediante `Conta.ErpGateway` en modo federado.
```

## 3. Solución (proyectos)

```
Conta.sln
├─ src/
│  ├─ Conta.Domain/                ← Entidades, ValueObjects, DomainEvents
│  ├─ Conta.Application/           ← Casos de uso, CQRS handlers, DTOs
│  ├─ Conta.Infrastructure/        ← EF Core, repositorios, integraciones
│  ├─ Conta.Api/                   ← Minimal APIs, autenticación
│  ├─ Conta.Functions/             ← Azure Functions (HTTP + Service Bus + Timer)
│  ├─ Conta.Shared/                ← Contratos compartidos (eventos, errores)
│  └─ Conta.Web/                   ← SPA React (vite)
└─ tests/
   ├─ Conta.Domain.UnitTests/      ← FsCheck para invariantes contables
   ├─ Conta.Application.UnitTests/
   ├─ Conta.Integration.Tests/     ← Testcontainers (SQL Server real)
   └─ Conta.E2E.Tests/             ← Flujo completo desde API
```

## 4. Principios de diseño no-negociables

### 4.1 Libro diario inmutable
Una vez posteado un `JournalEntry`, no se edita ni borra. Las correcciones se hacen mediante **asiento reverso**.

- Tabla `JournalEntry` + `JournalEntryLine` con trigger SQL que rechaza UPDATE/DELETE.
- Para auditar el "porqué" de una corrección, el reverso lleva `ReversedJournalEntryId` y `ReversalReason`.

### 4.2 Partida doble por construcción
Validado en el constructor de `JournalEntry`:

```csharp
public JournalEntry Post(IEnumerable<JournalEntryLine> lines) {
    var sumDr = lines.Sum(l => l.Debit);
    var sumCr = lines.Sum(l => l.Credit);
    if (sumDr != sumCr) throw new UnbalancedJournalEntryException();
    if (sumDr == 0)     throw new EmptyJournalEntryException();
    // ...
}
```

### 4.3 Idempotencia obligatoria
Todo endpoint de escritura acepta `Idempotency-Key`. Se persiste hash + resultado por 24h. Reenvíos devuelven el mismo resultado.

### 4.4 Multi-tenant aislado
Cada tabla tiene `TenantId`. EF Global Query Filter rechaza queries cross-tenant. Tests específicos validan el aislamiento.

### 4.5 Posting rules como datos
Las reglas de contabilización viven en `PostingRule` (tabla) y se versionan. Cambios no requieren deploy.

### 4.6 Periodos cerrados son sólo lectura
Una vez cerrado, ningún asiento puede afectar un período. Reapertura requiere doble aprobación + audit log.

### 4.7 Integración federada con Kiboo ERP
Conta.Core no consume SDKs ni contratos del ERP directamente. Todo acceso a Kiboo ERP ocurre por `Conta.ErpGateway` (ACL), con contratos Conta-shaped estables.

## 5. Modelo de procesos

### 5.1 Flujo síncrono (CRUD)
```
Cliente → APIM → Accounting.Api → Accounting.Application → EF Core → SQL Server
                                          │
                                          └─→ Redis (invalidación)
```

### 5.2 Flujo de contabilización elástica
```
Sistema externo
     │
     ▼
APIM → Accounting.Functions.PostJournalEntry (HTTP trigger)
     │
     ├─ Idempotency check (SQL)
     ├─ Validación dominio (Conta.Core)
     ├─ Posting Rules engine
     ├─ Persist JournalEntry (EF Core)
     ├─ Publish domain event → Service Bus
     └─ Return 201 + Location
                                         │
                                         ▼
                          Accounting.Functions.PostingProjections
                                         │
                                         ├─ Update balance cache (Redis)
                                         ├─ Update materialized views
                                         └─ Trigger alert engine
```

### 5.3 Flujo asíncrono (eventos externos)
```
Sistema externo → Service Bus topic → Function (subscriber) → Posting Rules → JournalEntry
```

## 6. Decisiones arquitectónicas (ADRs resumidos)

| # | Decisión | Razón |
|---|---|---|
| ADR-01 | Modular monolith → microservicios "cuando duela" | Reduce overhead inicial, permite evolución |
| ADR-02 | EF Core para escritura, Dapper para lectura | Mejor de los dos mundos: dominio expresivo + perf en reportes |
| ADR-03 | Asientos inmutables con trigger anti-UPDATE | Base de la auditoría legal |
| ADR-04 | Idempotency key por header, persistido 24h | Resiliencia frente a reintentos |
| ADR-05 | Multi-tenant lógico por defecto, físico opt-in | Simple para PyMEs, escalable para corporaciones |
| ADR-06 | Materialized path en plan de cuentas | Consultas de subárbol en O(log N), simple |
| ADR-07 | Posting rules como datos versionados | Cambios sin deploy, historial reproducible |
| ADR-08 | Always Encrypted en columnas sensibles | DBAs no ven CUIT/datos bancarios |
| ADR-09 | Outbox pattern para domain events | Consistencia entre DB y mensajería |
| ADR-10 | OpenTelemetry desde día 1 | Observabilidad sin retrofit |

## 7. Capacidad y escalabilidad

| Componente | Estrategia de escala |
|---|---|
| Accounting.Functions | Auto-scale por instancia (premium plan) |
| Accounting.Api | Horizontal scale en App Service |
| SQL Server | Read replicas para reportes; partitioning por tenant grande |
| Redis | Cluster con sharding por tenant |
| Service Bus | Particionado por sesión (account_id o branch_id) |

## 8. Resiliencia

- **Outbox pattern**: eventos de dominio se persisten en SQL en la misma transacción del asiento; un worker los publica a Service Bus.
- **Retry con backoff exponencial** en consumidores.
- **Dead-letter queue** + alerting cuando un mensaje falla N veces.
- **Circuit breaker** (Polly) en llamadas a servicios externos (FX rates).
- **Health checks** (Kubernetes-style) en cada servicio.
- **Backups**: PITR de SQL Server (35 días) + export diario cifrado a Blob WORM.

## 9. Observabilidad

| Señal | Herramienta | Uso |
|---|---|---|
| Trazas distribuidas | OpenTelemetry → App Insights | Correlación end-to-end por `traceId` |
| Métricas | App Insights + dashboards | RED (Rate, Errors, Duration) por endpoint |
| Logs estructurados | Serilog → App Insights | JSON con `tenantId`, `userId`, `entryId` |
| Auditoría funcional | Tabla `AuditLog` (append-only) | Quién hizo qué, cuándo, sobre qué |
| Alertas operativas | App Insights alerts | Disponibilidad, p95, error rate, queue depth |
| Alertas funcionales | Conta.AlertEngine | KPIs financieros (liquidez, vencimientos, etc.) |

## 10. Extensibilidad

- **Webhooks salientes**: clientes pueden suscribirse a eventos (`JournalEntryPosted`, `PeriodClosed`, etc.).
- **Plugin de Posting Rules**: parser configurable (NCalc); en el futuro permite scripting sandboxed.
- **API pública con OpenAPI**: clientes generan SDK en su lenguaje.
- **Eventos en Service Bus**: integraciones bidireccionales con BI, ERP, etc.
