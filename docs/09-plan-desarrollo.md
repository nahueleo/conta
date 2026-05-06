# 09 · Plan de desarrollo

## 1. Visión del plan

- **Duración total MVP:** 6 meses (26 semanas).
- **Equipo base:** 5–7 personas (ver §6).
- **Filosofía:** modular monolith con API-first; entregar valor end-to-end por fase.
- **Quality bars:** tests unitarios + integración con Testcontainers, > 80% cobertura del dominio.
- **Cadencia:** sprints quincenales, demos al final de cada fase.

## 2. Fases

### Fase 0 — Setup (semanas 1-2)

**Objetivos:** infraestructura, repos, pipelines, threat model.

**Entregables:**
- Mono-repo con esqueleto de solución (`Domain`, `Application`, `Infrastructure`, `Api`, `Functions`, `Web`, tests).
- IaC (Bicep/Terraform): SQL, Service Bus, Functions, App Service, APIM, Key Vault, App Insights.
- CI/CD pipelines: lint, tests, SAST, DAST, container scan.
- Threat model formal (STRIDE).
- Política de branching, code review, conventional commits.
- Backlog inicial en Jira/Linear.

**Definition of Done:**
- `dotnet build && dotnet test` verde en CI.
- Deploy a `dev` automático en cada push a `main`.

### Fase 1 — Núcleo contable (semanas 3-8)

**Objetivos:** dominio, plan de cuentas, asientos manuales, multi-tenant, multi-moneda.

**Entregables:**
- Modelos de dominio: `Account`, `JournalEntry`, `JournalEntryLine`, `Currency`, `ExchangeRate`, `FiscalYear/Period`.
- Partida doble validada con FsCheck (property-based testing).
- Plan de cuentas con CRUD + plantillas semilla (AR, BR, MX, US × micro/PyME/corp).
- Asientos manuales + reverso.
- Multi-tenant con Global Query Filter + tests cross-tenant.
- Multi-moneda con conversión a moneda funcional.
- Endpoint `/journal/manual`, `/journal/{id}/reverse`, `/chart-of-accounts`.

**DoD:**
- Postear y revertir asiento desde Postman.
- Tests de integración con Testcontainers (SQL Server real) verdes.
- 90% cobertura en `Conta.Domain`.

### Fase 2 — Contabilización elástica (semanas 9-12)

**Objetivos:** APIs públicas para sistemas externos.

**Entregables:**
- Posting Rules engine (parser NCalc sandboxed).
- Reglas estándar AR (~12 reglas).
- Azure Functions: `PostJournalEntry`, `BulkPosting`, dry-run.
- Idempotency keys con persistencia.
- Subscriber de Service Bus para eventos externos.
- Outbox pattern para domain events.
- Pruebas de carga con k6: meta 1000 asientos/seg.

**DoD:**
- Sistema externo posteando vía API.
- Idempotency funcionando: replay devuelve la misma respuesta.
- Throughput sostenido validado en staging.

### Fase 3 — Periodos, sucursales y remesas (semanas 13-16)

**Objetivos:** completar dimensiones de negocio.

**Entregables:**
- Wizard de cierre con pre-validaciones, ajustes, refundición.
- Reapertura con doble aprobación.
- Sucursales y BU como dimensiones obligatorias/opcionales.
- Remesas con cuenta puente y conciliación.
- Audit log con UI dedicada para auditores.

**DoD:**
- Cierre completo de un ejercicio en demo.
- Remesa enviada y conciliada.
- Auditor accede en read-only y ve histórico completo.

### Fase 4 — Reportes y dashboards (semanas 17-22)

**Objetivos:** capacidad de análisis y decisión.

**Entregables:**
- Reportes core: Sumas y Saldos, Balance, Resultados, Cashflow (directo e indirecto), Antigüedad.
- Reportes de gestión: Rentabilidad por sucursal/BU, Análisis de gastos, Conciliación bancaria, IVA.
- Cashflow proyectado a 90 días.
- Motor de KPIs y alertas.
- Cache de balances vivos en Redis.
- Export PDF (QuestPDF) y Excel (ClosedXML).

**DoD:**
- Cada reporte exportable en JSON/CSV/PDF/XLSX.
- Dashboard ejecutivo con datos reales del piloto.
- Alertas disparándose y dedupeando correctamente.

### Fase 5 — UI (semanas 17-24, en paralelo con 4)

**Objetivos:** interfaz web completa.

**Entregables:**
- React 18 + TypeScript + Vite + shadcn/ui.
- Auth con MSAL (PKCE).
- Pantallas: Dashboard, Diario, Mayor, Plan de Cuentas, Posting Rules, Reportes, Cierre, Remesas, Configuración.
- Charts con Recharts/ECharts.
- Diseño responsive.
- i18n (es-AR, pt-BR, en-US).

**DoD:**
- Navegación end-to-end funcional contra API.
- Lighthouse > 90 en performance.
- Accessibility > 90 (WCAG AA).

### Fase 6 — Hardening y go-live (semanas 23-26)

**Objetivos:** dejar listo para producción.

**Entregables:**
- Pen-test interno + fixes.
- Load test con datos del cliente piloto.
- Documentación operativa: runbooks, on-call, escalación.
- DR drill (failover real).
- Onboarding self-service para nuevos tenants.
- Portal de developers con OpenAPI + tutoriales.
- Go-live con cliente piloto.

**DoD:**
- Cliente piloto operando 1 ciclo completo (mes contable).
- Cero discrepancias entre sistema fuente y reportes.
- SRE en condiciones de operar el servicio.

## 3. Cronograma resumido

```
Sem  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26
F0  ▓▓
F1        ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓
F2                          ▓▓ ▓▓ ▓▓ ▓▓
F3                                       ▓▓ ▓▓ ▓▓ ▓▓
F4                                                   ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓
F5                                                   ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓
F6                                                                        ▓▓ ▓▓ ▓▓ ▓▓
```

## 4. Hitos y demos

| Hito | Cuándo | Demo |
|---|---|---|
| H1 — Esqueleto | Sem 2 | CI/CD verde, deploy a dev |
| H2 — Asiento manual | Sem 8 | Cargar asiento, ver mayor |
| H3 — API externa | Sem 12 | E-commerce postea vía API |
| H4 — Cierre asistido | Sem 16 | Cerrar ejercicio en demo |
| H5 — Reportes | Sem 22 | Balance, Resultados, Cashflow |
| H6 — UI completa | Sem 24 | Recorrido full por la web |
| H7 — Go-live | Sem 26 | Cliente piloto en producción |

## 5. Hitos por capacidad funcional

| Capacidad | Disponible en |
|---|---|
| Asiento manual + reverso | F1 |
| Plan de cuentas editable | F1 |
| Multi-moneda | F1 |
| API pública para sistemas externos | F2 |
| Posting Rules con dry-run | F2 |
| Sucursales y BU | F3 |
| Cierre y reapertura | F3 |
| Remesas | F3 |
| Reportes core | F4 |
| KPIs y alertas | F4 |
| UI web | F5 |
| Self-service onboarding | F6 |

## 6. Equipo recomendado

| Rol | Cantidad | Foco |
|---|---|---|
| Tech Lead | 1 | Arquitectura, ADRs, code review |
| Backend Engineers (.NET) | 2-3 | Dominio, APIs, Functions |
| Frontend Engineer (React) | 1 | UI, charts, i18n |
| QA Engineer | 1 | E2E, load test, exploratory |
| SRE / DevOps | 1 (compartido) | Infra, CI/CD, observabilidad |
| Product Owner | 1 | Backlog, comunicación con piloto |
| Domain Expert (contador) | 1 (advisor) | Validación funcional, compliance |
| Security Champion | rotativo | Threat model, code review desde lente de seguridad |

**Total:** 5-7 FTE + advisors.

## 7. Backlog estimado (high-level por fase)

- F0: ~20 issues
- F1: ~80 issues
- F2: ~50 issues
- F3: ~40 issues
- F4: ~70 issues
- F5: ~60 issues
- F6: ~30 issues

Total ≈ 350 issues. Se ajustará en grooming.

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Complejidad del dominio contable subestimada | Alta | Alto | Domain expert advisor; revisar con cliente piloto en cada fase |
| Multi-tenant rompe en producción | Media | Crítico | Tests automatizados cross-tenant + revisión periódica |
| Performance de reportes en grandes volúmenes | Media | Alto | Proyecciones precomputadas + Dapper + carga en background |
| Posting rules se vuelven una "DSL" demasiado expresiva | Media | Medio | Mantener limitaciones claras (sandbox, sin I/O); roadmap de macros, no de scripting libre |
| Adopción de cliente piloto lenta | Media | Medio | Onboarding asistido; soporte dedicado el primer mes |
| Cambios regulatorios mid-flight (AFIP, SAT) | Baja | Alto | Configuración por país en data, no en código |
| Vendor lock-in (Azure) | Media | Medio | Capa de abstracción para Service Bus / Storage / Functions |
| Talento .NET especializado | Media | Medio | Contratación temprana; dual-skill con backend en general |

## 9. Métricas de seguimiento del proyecto

| Métrica | Frecuencia | Owner |
|---|---|---|
| Velocity por sprint | Quincenal | PO |
| Cobertura de tests | Cada release | TL |
| MTTR (mean time to recovery) en dev | Semanal | SRE |
| Performance p95 endpoints clave | Continua | SRE |
| Bugs escapados a producción | Por sprint | QA |
| Issues de seguridad abiertos / cerrados | Semanal | Security Champion |
| Satisfacción del piloto (NPS) | Mensual | PO |

## 10. Roadmap post-MVP (mirada a 12-18 meses)

- **Q3** post-MVP: facturación electrónica integrada (AFIP, SAT, DIAN, SUNAT).
- **Q4** post-MVP: open banking (PSD2 / Belvo) para conciliación automática.
- **Año 2 Q1**: consolidación intercompany.
- **Año 2 Q2**: módulo de presupuesto y forecasting con ML.
- **Año 2 Q3**: AI: detección de anomalías, sugerencias de imputación, OCR de comprobantes.
- **Año 2 Q4**: marketplace de plantillas (rules + chart of accounts) por industria.

## 11. Presupuesto orientativo (placeholder)

| Concepto | 6 meses |
|---|---|
| Equipo (5-7 FTE) | $$$$ |
| Infraestructura Azure (dev + stg + prd) | $$ |
| Licencias/SaaS (App Insights, GitHub Copilot, etc.) | $ |
| Pen-test externo + auditoría | $ |
| Compliance (legal/contador) | $ |

Detalle en spreadsheet aparte (no incluido en este doc).

## 12. Salidas del proyecto

- Servicio en producción operando con cliente piloto.
- Documentación técnica viva (estos docs).
- OpenAPI portal público.
- Runbooks operativos.
- Plantillas por país.
- Plan de roadmap aprobado para fase 2.
