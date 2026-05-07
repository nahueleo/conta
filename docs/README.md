# Conta · Servicio de Contabilidad

Plataforma de contabilidad multi-tenant, multi-empresa, multi-sucursal y multi-moneda.
Apta para microempresas y corporaciones, configurable sin tocar código, con APIs elásticas para integrarse con **Kiboo ERP** en modo federado y contabilizar operaciones en tiempo real.

> **Estado:** propuesta de proyecto · v1.0 · 2026-05

---

## Índice de documentación

| # | Documento | Contenido |
|---|-----------|-----------|
| 0 | **README.md** (este) | Resumen ejecutivo + índice |
| 1 | [01-vision-alcance.md](./01-vision-alcance.md) | Visión, objetivos, alcance, fuera de alcance, supuestos |
| 2 | [02-arquitectura.md](./02-arquitectura.md) | Stack, topología, principios, decisiones de diseño |
| 3 | [03-modelo-datos.md](./03-modelo-datos.md) | Entidades, tablas, columnas, relaciones, índices |
| 4 | [04-casos-de-uso.md](./04-casos-de-uso.md) | Actores y casos de uso end-to-end |
| 5 | [05-api-operaciones.md](./05-api-operaciones.md) | Endpoints REST, payloads, códigos, idempotencia |
| 6 | [06-posting-rules.md](./06-posting-rules.md) | Motor de reglas configurables |
| 7 | [07-reportes-kpis.md](./07-reportes-kpis.md) | Reportes, KPIs, alertas, proyecciones |
| 8 | [08-seguridad.md](./08-seguridad.md) | Threat model, controles, cumplimiento |
| 9 | [09-plan-desarrollo.md](./09-plan-desarrollo.md) | Fases, entregables, equipo, riesgos |
| 10 | [10-ui-mockup.md](./10-ui-mockup.md) | Mapa de pantallas + cómo correr el mockup |
| 11 | [11-glosario.md](./11-glosario.md) | Términos contables y técnicos |
| 12 | [12-erp-gateway.md](./12-erp-gateway.md) | ERP Gateway (Anti-Corruption Layer) — wrapper para integración federada |

---

## Resumen ejecutivo

### Alineación Kiboo ERP (obligatoria)

- Kiboo ERP es el sistema fuente principal para maestros y eventos.
- Conta opera integración federada mediante ERP Gateway (ACL + adapters).
- No se utiliza el concepto de fecha contable; se usan `operationDate` (evento) y `snapshotDate` (reportes de corte).

### Problema

Hoy las empresas conviven con planillas Excel, ERPs caros con onboarding de meses o software contable rígido que no acompaña el ritmo del negocio. La realidad es que los ingresos de operaciones no nacen en el sistema contable: nacen en e-commerce, POS, facturación electrónica, RRHH, bancos, etc. Conectarlos manualmente es lento, propenso a errores y opaco.

### Propuesta

**Conta** es un microservicio de contabilidad de doble entrada, en .NET 9 con SQL Server, expuesto como APIs elásticas (Azure Functions) para procesar operaciones provenientes de Kiboo ERP en tiempo real. La forma de contabilizar cada operación se define como **Posting Rules configurables** — sin desplegar código.

### Diferenciales

| | Conta | ERP tradicional | Excel/Spreadsheet |
|---|---|---|---|
| Tiempo de onboarding | minutos (plantillas por país) | meses | inmediato pero frágil |
| Configuración por código | no | parcial | n/a |
| API-first | ✓ | parcial | ✗ |
| Auditoría inmutable | ✓ (libro diario INSERT-only) | parcial | ✗ |
| Multi-sucursal y BU | ✓ nativo | ✓ | manual |
| Reportes y KPIs en vivo | ✓ | parcial | ✗ |
| Costo TCO | bajo | alto | hidden cost (errores) |

### Capacidades clave

- **Contabilización elástica**: APIs idempotentes que escalan a picos (cierre de mes, Black Friday, payroll).
- **Plan de cuentas flexible**: plantillas por país + edición sin romper historial (mediante mappings versionados).
- **Períodos fiscales y cierres** asistidos: pre-validaciones, ajustes, refundición automática, doble aprobación.
- **Sucursales, unidades de negocio y remesas** como dimensiones de primera clase.
- **Reportes contables y de gestión**: desde sumas y saldos hasta cashflow proyectado a 90 días.
- **Indicadores y alertas**: liquidez, rentabilidad, vencimientos, anomalías en asientos.
- **Multi-tenant**: lógico por defecto, físico para clientes grandes.
- **Seguridad por diseño**: cifrado en reposo (Always Encrypted), auditoría append-only, RBAC granular.

### Métricas de éxito (al cierre del MVP)

| Métrica | Objetivo MVP |
|---|---|
| Onboarding self-service | < 30 min para una PyME |
| Throughput de contabilización | 1.000 asientos/seg sostenidos |
| Latencia p95 endpoint de posting | < 150 ms |
| Disponibilidad | 99.9% |
| Tiempo de cierre mensual | reducción 50% vs proceso manual |
| Cobertura de tests dominio | > 90% |

### Roadmap macro

```
M1-M2  Núcleo contable (dominio, partida doble, plan de cuentas)
M3     Contabilización elástica (Functions, posting rules)
M4     Períodos, sucursales, remesas
M5     Reportes y dashboards
M6     UI + hardening + go-live piloto
```

Detalle completo en [09-plan-desarrollo.md](./09-plan-desarrollo.md).

---

## Cómo navegar este repo

```
conta/
├── docs/         ← especificaciones (este directorio)
├── mockup/       ← UI navegable (HTML estático + Chart.js)
└── README.md     (futuro · código fuente)
```

Para ver la UI: abrir [mockup/index.html](../mockup/index.html) en cualquier navegador moderno.
Detalles en [10-ui-mockup.md](./10-ui-mockup.md).
