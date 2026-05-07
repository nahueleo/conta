# 12 · ERP Gateway (Anti-Corruption Layer)

> Microservicio dedicado que aísla a Conta de la API del ERP del cliente.
> Implementa el patrón **Anti-Corruption Layer (ACL)** de DDD + **Adapter** + **Gateway**.

En el MVP, el ERP principal es **Kiboo ERP** y la integración objetivo es federada.
Lineamiento temporal: no se usa fecha contable; el gateway propaga `operationDate` en eventos normalizados.

## 1. Por qué existe

Cuando Conta opera en modo **Federado** (consumiendo datos del ERP en runtime) o **Híbrido** (con sync periódico), la decisión más frecuente y peligrosa es: ¿dónde vive el código que habla con el ERP?

**Opción A — distribuido en cada servicio de Conta**: cada microservicio importa el SDK del ERP y hace sus propias llamadas. ❌ Acoplamiento masivo, código duplicado, cambio del ERP rompe todo.

**Opción B — librería compartida**: ✅ menos duplicación, pero ❌ cualquier cambio del ERP requiere redeployar todos los servicios; cache y rate limiting se ejecutan N veces.

**Opción C — microservicio Gateway** ✅ **Elegida.** Un solo lugar conoce el ERP. Conta.Core trabaja con DTOs propios. Cambio de ERP = cambia el Gateway.

## 2. Responsabilidades

### 2.1 Inbound (Conta → ERP)
- API "Conta-shaped": expone endpoints del modelo de Conta (`GetBranches`, `GetUsers`, `GetCustomerById`).
- Internamente traduce a la API del ERP (`SAP.BusinessPartners`, `Odoo.res_partner`, etc.).
- Cache propio (Redis) con TTL por entidad.
- Resilience: circuit breaker, retries con backoff, timeouts, rate limiting hacia el ERP.

### 2.2 Outbound (ERP → Conta)
- Recibe webhooks/eventos del ERP.
- Los traduce a eventos de dominio de Conta.
- Los publica en el Service Bus interno.

### 2.3 Sync periódico
- Job que reconcilia entidades clave cada N minutos / horas.
- Detecta drift (algo cambió en el ERP que no llegó por webhook).

### 2.4 Comandos hacia el ERP (opcional)
- Notificar al ERP eventos de Conta (`PeriodClosed`, `AccountChanged`).
- Pedir resincronización forzada.

## 3. Topología

```
┌──────────────────────────────────────────────┐
│  Conta.Api / Functions / Web                 │
│  (núcleo contable · NO conoce el ERP)        │
└──────────────────┬───────────────────────────┘
                   │ HTTP/gRPC interno
                   │ DTOs Conta-shaped
                   ▼
┌──────────────────────────────────────────────┐
│  Conta.ErpGateway                            │
│  ──────────────────                          │
│  AdapterRegistry · Cache · CircuitBreaker    │
│  EventTranslator · AuthClient · Telemetry    │
└────────┬───────────┬────────┬────────────────┘
         │           │        │
   ┌─────▼───┐  ┌────▼───┐  ┌─▼──────────┐
   │ SAP B1  │  │ Odoo   │  │ ERP propio │
   │ adapter │  │ adapter│  │  adapter   │
   └─────────┘  └────────┘  └────────────┘
```

## 4. Estructura interna

```
Conta.ErpGateway/
├─ Conta.ErpGateway.Api/                  ← exposición a Conta.Core
│  ├─ Endpoints/
│  │  ├─ Branches.cs                      ← GET /branches, /branches/{id}
│  │  ├─ Users.cs
│  │  ├─ Customers.cs
│  │  └─ ...
│  └─ EventReceivers/                     ← webhooks del ERP
│
├─ Conta.ErpGateway.Core/                 ← dominio del Gateway
│  ├─ Contracts/                          ← DTOs Conta-shaped (estables)
│  │  ├─ BranchDto.cs
│  │  ├─ UserDto.cs
│  │  └─ ...
│  ├─ IErpAdapter.cs                      ← contrato que cumple cada adapter
│  ├─ EventTranslator.cs                  ← ERP event → Conta event
│  └─ ResilienceDefaults.cs               ← Polly policies
│
├─ Conta.ErpGateway.Adapters.SapB1/
│  ├─ SapB1Adapter.cs                     ← implementa IErpAdapter
│  ├─ ServiceLayerClient.cs               ← cliente HTTP del SAP
│  ├─ Mappers/
│  │  ├─ BusinessPartnerToCustomer.cs
│  │  └─ ...
│  └─ Webhooks/                           ← traducción de eventos SAP
│
├─ Conta.ErpGateway.Adapters.Odoo/
├─ Conta.ErpGateway.Adapters.Dynamics365/
├─ Conta.ErpGateway.Adapters.Custom/      ← adapter genérico REST
│
├─ Conta.ErpGateway.Cache/                ← Redis abstraction
├─ Conta.ErpGateway.Telemetry/            ← OpenTelemetry config
└─ Conta.ErpGateway.Tests/
```

## 5. Contrato `IErpAdapter`

```csharp
public interface IErpAdapter {
    string Name { get; }                       // "sap-b1", "odoo", ...
    Task<HealthStatus> CheckHealthAsync();

    // Reads (con cache desde el Gateway, no desde el adapter)
    Task<IReadOnlyList<BranchDto>>     GetBranchesAsync(TenantContext ctx);
    Task<IReadOnlyList<BusinessUnitDto>> GetBusinessUnitsAsync(TenantContext ctx);
    Task<IReadOnlyList<CurrencyDto>>   GetCurrenciesAsync(TenantContext ctx);
    Task<IReadOnlyList<UserDto>>       GetUsersAsync(TenantContext ctx);
    Task<CustomerDto?>                 GetCustomerByIdAsync(TenantContext ctx, string externalId);
    Task<SupplierDto?>                 GetSupplierByIdAsync(TenantContext ctx, string externalId);

    // Webhook translation
    AccountingEvent? TranslateInboundEvent(JsonElement erpPayload);

    // Optional: outbound notifications
    Task NotifyPeriodClosedAsync(TenantContext ctx, FiscalPeriodClosedEvent evt);
}
```

## 6. Cache strategy

| Entidad | TTL | Invalidación |
|---|---|---|
| Branches | 15 min | webhook `branch.updated` |
| BusinessUnits | 15 min | webhook |
| Currencies | 1 hora | webhook |
| Users | 5 min | webhook `user.updated` / `user.deactivated` |
| Roles | 30 min | webhook |
| Customers | 5 min | webhook `customer.updated` |
| Suppliers | 5 min | webhook |

Implementación: `IDistributedCache` (Redis) con clave `tenant:{tenantId}:erp:{adapter}:{entity}:{id?}`.

## 7. Resilience

Policies por defecto (Polly):

```csharp
HttpPolicyExtensions
    .HandleTransientHttpError()
    .OrResult(r => r.StatusCode == HttpStatusCode.TooManyRequests)
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromMilliseconds(200 * Math.Pow(3, attempt)))

CircuitBreakerAsync(
    handledEventsAllowedBeforeBreaking: 5,
    durationOfBreak: TimeSpan.FromSeconds(60))

TimeoutAsync(TimeSpan.FromSeconds(3))

BulkheadAsync(maxParallelization: 100, maxQueuingActions: 50)
```

Fallback en circuit open: devolver desde cache aunque esté stale (configurable por endpoint).

Rate limit hacia el ERP: token bucket con `100 req/seg + burst 200` por adapter+tenant.

## 8. Translation de eventos

```
ERP event                              Conta event
─────────────                          ─────────────
SAP.Invoice.Added              ──►     accounting.sale.received
SAP.Invoice.Cancelled          ──►     accounting.sale.cancelled
SAP.Bill.Added                 ──►     accounting.purchase.received
SAP.IncomingPayment.Added      ──►     accounting.payment.received
SAP.OutgoingPayment.Added      ──►     accounting.payment.sent
SAP.JournalVoucher.Added       ──►     accounting.manual.received
SAP.Inventory.Transfer         ──►     accounting.inventory.transfer
SAP.User.Updated               ──►     identity.user.updated
SAP.BusinessPartner.Updated    ──►     reference.customer.updated
```

El Gateway publica los eventos de Conta en el Service Bus interno de Conta. Las posting rules consumen desde ahí. **El dominio contable nunca ve el evento del SAP en su forma original.**

## 9. Seguridad

- Auth con el ERP: OAuth2 Client Credentials, mTLS o API key (según ERP).
- Secrets en Azure Key Vault, accedidos via Managed Identity.
- Tráfico Conta ↔ Gateway: red interna + mTLS opcional.
- Webhooks entrantes del ERP: firma HMAC validada en el Gateway.
- Logs sin PII (taxIds enmascarados).
- Rate limiting protege al ERP de un Conta runaway.

## 10. Multi-tenant

El Gateway sirve a múltiples clientes simultáneamente:

- Cada tenant tiene **su propia configuración** de adapter (URL del ERP, credenciales, mapping de campos).
- Cache es **prefijado por tenant**: cero cross-tenant leak.
- Telemetría labelada por tenant.
- Un mismo cliente puede tener distintos adapters por entorno (sandbox vs prod).

## 11. Versionado del contrato

- DTOs hacia Conta.Core son contractuales y versionados (`v1`, `v2`).
- Cambios breaking → nueva versión + deprecation de 6 meses.
- Cambios aditivos no requieren bump.
- Conta.Core declara qué versión consume.

## 12. Observabilidad

Métricas clave que el Gateway expone:

| Métrica | Descripción |
|---|---|
| `erp_request_duration_ms` | Latencia por endpoint, percentiles |
| `erp_request_count` | Total de requests, etiquetado por adapter, tenant, endpoint |
| `cache_hit_ratio` | % de hits por entidad |
| `circuit_breaker_state` | open/half-open/closed |
| `dlq_depth` | Eventos en DLQ |
| `event_translation_errors` | Eventos del ERP que no se pudieron traducir |
| `rate_limit_throttled` | Requests rechazadas por rate limit |

Dashboards estándar incluidos para Datadog y App Insights.

## 13. Testing

- **Unit tests** por adapter con respuestas mockeadas del ERP.
- **Integration tests** contra ERP en sandbox (SAP Service Layer DEV, Odoo demo, etc.).
- **Contract tests** (Pact) entre Conta.Core ↔ Gateway.
- **Chaos tests**: forzar timeouts, errores 5xx, latencias altas; verificar que el circuit breaker actúa.
- **Load tests**: 1000 req/seg sostenidos con cache hit normal.

## 14. Deploy

- Servicio independiente: container en App Service / AKS.
- 3 instancias mínimo (HA).
- Auto-scale por CPU + queue depth.
- Releases independientes de Conta.Core.
- Blue/green deploy con health checks.

## 15. Cuándo NO usar el Gateway

- Modo **Greenfield** sin ERP → no hay nada que envolver, los datos viven en Conta.
- Modo **Bootstrap puro one-shot** → la importación inicial puede hacerse sin Gateway (script + endpoint `POST /install`). Pero si después se quiere sync periódico, conviene meterlo en el Gateway.

## 16. Roadmap del Gateway

| Versión | Capacidades |
|---|---|
| v1 (MVP) | Adapter SAP B1 + Custom REST · cache · resilience · webhooks inbound |
| v2 | Adapter Odoo + Dynamics 365 · sync periódico · drift detection |
| v3 | Adapter NetSuite · GraphQL hacia Conta.Core · streaming events |
| v4 | Marketplace de adapters (clientes pueden traer el suyo) |

## 17. ADRs relacionados

- **ADR-11**: ACL como microservicio dedicado (no librería).
- **ADR-12**: Cache centralizado en el Gateway, no en cada cliente.
- **ADR-13**: Eventos del ERP siempre se traducen antes de publicarse al Service Bus interno.
- **ADR-14**: Adapter pattern + plugin discovery via reflection (los adapters son DLLs separadas).
