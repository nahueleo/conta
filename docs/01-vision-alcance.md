# 01 · Visión, objetivos y alcance

## 1. Visión

Convertir la contabilidad en un **servicio invisible y confiable** para cualquier sistema de negocio: si una operación ocurre (venta, compra, cobro, pago, ajuste), se contabiliza automáticamente, en tiempo real, con auditoría completa y reportes en vivo.

## 2. Misión del MVP

Entregar un servicio de contabilidad de doble entrada, multi-tenant, configurable y elástico, que permita a una empresa:

1. Configurar su contabilidad en menos de 30 minutos a partir de plantillas.
2. Contabilizar todas sus operaciones de negocio vía API.
3. Operar sucursales y unidades de negocio sin contabilidades separadas.
4. Cerrar períodos fiscales con asistencia automatizada.
5. Obtener reportes contables y de gestión en vivo, con KPIs y alertas.

## 3. Objetivos

### Funcionales

- Soportar partida doble validada por dominio (no por base).
- ABM completo de plan de cuentas, posting rules, sucursales, BU, monedas, periodos.
- Asientos manuales y automáticos (vía rules), con reverso.
- Cierre y reapertura de períodos fiscales, con doble aprobación.
- Multi-empresa y multi-tenant.
- Multi-moneda con tipos de cambio históricos y revaluación.
- Remesas inter-sucursales con cuenta puente.
- Reportes: Diario, Mayor, Sumas y Saldos, Balance General, Estado de Resultados, Flujo de Efectivo (directo e indirecto), Antigüedad de saldos, Conciliación bancaria.
- KPIs y alertas configurables.

### No funcionales

- Disponibilidad 99.9% mensual.
- Latencia p95 de posting < 150 ms (single entry).
- Throughput sostenido ≥ 1.000 asientos/seg.
- Idempotencia obligatoria en endpoints de escritura.
- Recovery Point Objective (RPO) ≤ 5 min, RTO ≤ 1 h.
- Auditoría inmutable de cada cambio.
- Cifrado en reposo (datos sensibles) y en tránsito (TLS 1.3).

## 4. Alcance del MVP (sí entra)

| Capacidad | Detalle |
|---|---|
| Plan de cuentas | Templates por país (AR, BR, MX, US) y por tamaño (micro, PyME, corporativa); jerarquía hasta 5 niveles |
| Asientos contables | Manuales, automáticos vía posting rules, reversos |
| Multi-tenant | Lógico (TenantId + Global Query Filter); opción de schema dedicado por cliente grande |
| Multi-empresa | Una empresa por tenant; estructura preparada para consolidación futura |
| Multi-sucursal y BU | Dimensiones obligatorias/opcionales por cuenta |
| Multi-moneda | Tipos de cambio históricos, revaluación mensual configurable |
| Periodos fiscales | Anuales con periodos mensuales; cierre asistido |
| APIs | REST sync (ASP.NET Core) + asíncronas (Azure Functions + Service Bus) |
| Webhooks | Salida hacia consumidores externos en eventos clave |
| Reportes | Listado en [07-reportes-kpis.md](./07-reportes-kpis.md) |
| KPIs / Alertas | Dashboard ejecutivo + motor de alertas configurables |
| UI | SPA web (React + TypeScript) — descripta en [10-ui-mockup.md](./10-ui-mockup.md) |
| Seguridad | RBAC, JWT, Always Encrypted, audit log, doble aprobación |

## 5. Fuera de alcance del MVP (no entra)

- Facturación electrónica integrada con AFIP/SAT/DIAN/SUNAT (roadmap fase 2).
- Open banking / conciliación automática vía PSD2 (roadmap fase 2).
- Consolidación intercompany con eliminación de operaciones internas (roadmap fase 3).
- App móvil nativa (responsive web sí).
- Liquidación de impuestos automática.
- Inventario y costos detallados (Conta recibe el resultado de costeo desde el sistema externo).
- Payroll (Conta recibe el asiento; el cálculo lo hace otro sistema).
- IA generativa para sugerencias de imputación (roadmap fase 4).

## 6. Supuestos

1. Cada cliente tiene un **sistema fuente** (POS, ERP, e-commerce) que dispara eventos.
2. Los eventos llegan en JSON con un **payload contractual** estable por tipo de operación.
3. Cada cliente acepta operar con **plan de cuentas y posting rules predefinidos**, modificables.
4. La empresa cliente **autoriza** los cambios sensibles (cierre, reapertura, plan de cuentas) con un segundo aprobador.
5. Los tipos de cambio se obtienen de un proveedor externo configurado (BCRA, Banco Central, ECB, fixer.io).

## 7. Restricciones

- Stack obligado: **.NET 9 + SQL Server + Azure**.
- Datos financieros tratados como **PII de empresa**: nunca salen de la región contratada.
- Cumplimiento de RG AFIP (AR), LGPD (BR), LFPDPPP (MX) según aplique al cliente.

## 8. Audiencias

| Audiencia | Caso de uso |
|---|---|
| Microempresa / PyME | Onboarding self-service, plantilla por país, sin staff contable in-house |
| Empresa mediana | Posting rules custom, sucursales, BU, reportes de gestión |
| Empresa grande | Multi-empresa, multi-moneda, schema dedicado, integración con BI |
| Estudio contable | Multi-tenant: gestiona N empresas con un solo login |
| Auditor externo | Acceso read-only con scopes acotados; audit log inmutable |
| Sistemas integradores | API-first, idempotente, dry-run, OpenAPI público |

## 9. Éxito

El proyecto será exitoso si:

1. Un cliente piloto contabiliza ≥ 1 mes completo de operación de forma desatendida.
2. Tiempo de cierre mensual cae al menos 50% vs su proceso anterior.
3. Cero discrepancias entre el sistema fuente y los reportes de Conta.
4. NPS ≥ 50 entre los primeros 10 clientes.
