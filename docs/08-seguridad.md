# 08 · Seguridad y cumplimiento

> Datos contables = datos críticos. Conta los trata como **PII de empresa**: cifrados, auditados, de acceso restringido y sin posibilidad de borrado silencioso.

Contexto de integración:
- Kiboo ERP es el sistema fuente principal y se integra por ERP Gateway federado.
- Las validaciones temporales se realizan sobre `operationDate` y no sobre fecha contable.

## 1. Threat model (resumen STRIDE)

| Amenaza | Vector típico | Mitigación |
|---|---|---|
| **Spoofing** | Token robado | OAuth2/OIDC + JWT con expiración corta + refresh; MFA obligatorio para roles sensibles |
| **Tampering** | Modificación de asientos posteados | `JournalEntry` inmutable + trigger anti-UPDATE/DELETE; correcciones por reverso |
| **Repudio** | "Yo no fui" | `AuditLog` append-only con userId, IP, timestamp UTC, hash del payload |
| **Information disclosure** | Cross-tenant leak | EF Global Query Filter + tests específicos; `tenantId` validado del JWT, nunca del body |
| **DoS** | Spam de posting | Rate limit por tenant en APIM; circuit breakers; cuotas por plan |
| **Elevation of privilege** | Cambio de scope vía request | JWT firmado y validado; scopes nunca confiados al body |

## 2. AuthN — Autenticación

- **Provider**: Azure AD B2C o Auth0 (configurable).
- **Protocolo**: OAuth2 Authorization Code + PKCE para usuarios; Client Credentials para sistemas.
- **Tokens**: JWT firmados RS256, expiración 1h (access), 24h (refresh).
- **MFA**: obligatorio para roles `Admin`, `Closer`, `Auditor`. TOTP o WebAuthn.
- **Session timeout**: 30 min de inactividad en UI.
- **Sospecha**: bloqueo automático tras N intentos fallidos; alerta a admin.

## 3. AuthZ — Autorización

- **RBAC** con roles predefinidos:
  - `Admin contable`: todo
  - `Operador`: lectura + posting + asientos manuales
  - `Aprobador`: aprobaciones de cierres y manual
  - `Auditor`: lectura completa, sin escritura
  - `Integrator`: API-only (Client Credentials), scopes limitados
- **Scopes JWT** validados en cada endpoint:
  - `accounting.read`
  - `accounting.post`
  - `accounting.config.write`
  - `accounting.period.close`
  - `accounting.period.reopen` (siempre con segundo aprobador)
  - `accounting.audit.read`
- **Cell-level authorization**: usuario con rol `Operador` de la sucursal CABA no ve asientos de Rosario (filtro adicional `branchId IN user.branches`).
- **Defense in depth**: filtro EF + chequeo en handler + validación en aggregate root.

## 4. Aislamiento multi-tenant

- Toda tabla con `TenantId UNIQUEIDENTIFIER NOT NULL`.
- **Global Query Filter** en `DbContext` que añade `WHERE TenantId = @currentTenantId` a toda query de EF.
- `currentTenantId` se obtiene del JWT, **nunca del body o query**.
- Tests automatizados que intentan accesos cross-tenant y verifican 404/403.
- Para corporate: schema o database dedicada, opcional.

## 5. Cifrado

### 5.1 En tránsito
- **TLS 1.3** obligatorio. HSTS con `max-age=31536000`.
- mTLS opcional para clientes corporate.
- Certificados rotados automáticamente (Let's Encrypt o Azure Front Door).

### 5.2 En reposo
- **TDE** (Transparent Data Encryption) en SQL Server con clave en Azure Key Vault.
- **Always Encrypted** (deterministic) sobre `Company.TaxId` y similares; el motor no ve el plaintext.
- **Always Encrypted** (randomized) sobre datos bancarios.
- Storage de logs y backups → Blob Storage con SSE-CMK (clave del cliente).
- Backups WORM (Write Once Read Many) — inmutables por política de retención.

### 5.3 En uso
- Secretos en Azure Key Vault, accedidos vía Managed Identity. Cero secretos en `appsettings.json` o variables de entorno largas.
- Nunca log del payload completo de un request si contiene PII.

## 6. Auditoría

- Tabla `AuditLog` append-only con trigger anti-UPDATE/DELETE.
- Cada mutación registra:
  - `OccurredAt` UTC
  - `UserId`, `UserEmail`
  - `ClientIp`
  - `EntityType`, `EntityId`
  - `Action`
  - `Diff` (JSON con before/after, **excepto** valores cifrados)
  - `Reason` (cuando aplique, ej. reapertura)
  - `TraceId` (correlación con observabilidad)
- Retención: 10 años o lo que exija la legislación local.
- Export periódico cifrado a Blob WORM.
- UI dedicada para auditores con filtros y export.

## 7. Acciones que requieren doble aprobación

- Cierre de ejercicio fiscal.
- **Reapertura** de período cerrado (excepcional, con razón obligatoria).
- Cambios estructurales del plan de cuentas que afecten más de N asientos históricos.
- Cambios de versión de posting rules en producción (configurable).
- Modificación de configuraciones críticas (umbrales de alertas, integraciones de FX).

## 8. Validaciones de input

- Toda entrada pasa por **FluentValidation**:
  - Montos: `> 0`, máximo de 4 decimales, dentro de rango razonable (configurable).
  - Fechas de operación (`operationDate`): dentro de un período abierto.
  - Códigos de cuenta: existen y están activos.
  - Strings: longitud máxima, sanitización XSS.
- **Mass-assignment prevenido**: DTOs explícitos por endpoint, nunca bind a entidades de dominio.

## 9. Inyecciones

### 9.1 SQL Injection
- EF Core parametrizado siempre.
- Dapper sólo con parámetros nombrados, nunca `string.Format`.
- Queries dinámicas (filtros de reportes) → whitelist de columnas, builder seguro.
- Tests con payloads maliciosos en cada endpoint.

### 9.2 Code injection en posting rules
- Parser AST sandboxed (NCalc) con whitelist de funciones.
- **Nunca** Roslyn Scripting o `dynamic compile`.
- Timeout 100 ms por evaluación.
- Cap de memoria por evaluación.
- Sin acceso a I/O, reflexión, red, fs.

### 9.3 SSRF / outbound requests
- Webhooks salientes pasan por proxy con allowlist.
- Bloqueo de IPs internas (RFC1918, link-local, loopback).
- Resolución DNS validada antes de conectar.

## 10. Webhooks salientes

- Body firmado con HMAC-SHA256 (`X-Conta-Signature`).
- El secret se rota a pedido del cliente.
- Reintentos con backoff exponencial (5 intentos, hasta 1h).
- DLQ + alerta tras fallar.

## 11. Logging seguro

- **Nunca log de**: tokens, passwords, tax IDs en plaintext, datos bancarios.
- Redacción automática de campos sensibles en logs estructurados.
- Logs estructurados JSON con `traceId`, `tenantId`, `userId`.
- Retención: 90 días en App Insights, 2 años en frio (Blob).

## 12. Hardening del runtime

- **OS**: imágenes minimal (Alpine o distroless donde aplique).
- **Containers**: corren como non-root.
- **Network policies**: deny-all por default.
- **Dependencias**: scan diario (Dependabot/Snyk).
- **Imágenes**: firmadas (cosign) y verificadas en deploy.
- **Secrets scanning** en CI: pre-commit + push.

## 13. CI/CD seguro

- Pipeline:
  - Lint + tests (unit + integration).
  - **SAST** (CodeQL).
  - **Dependency scan** (Snyk / Dependabot).
  - **Container scan** (Trivy).
  - **DAST** post-deploy a staging (OWASP ZAP).
  - **Sign + push** a registry privado.
- Releases firmadas; rollback inmediato disponible.
- Production deploy requiere aprobación humana + change ticket.

## 14. Disaster Recovery

- **RPO** ≤ 5 min (PITR de SQL Server).
- **RTO** ≤ 1 hora (restore desde geo-redundant backup).
- Backups exportados diariamente a Blob WORM.
- Ejercicio de DR semestral con simulacro real (failover a región secundaria).
- Documentación del runbook accesible para SRE.

## 15. Cumplimiento normativo (referencia, no exhaustivo)

| Marco | Aplicabilidad | Tratamiento |
|---|---|---|
| **AFIP RG 4291** (AR) | Conservación de libros y documentación | Audit log 10 años, libro IVA exportable |
| **LGPD** (BR) | PII | Cifrado, derecho de acceso, retención |
| **LFPDPPP** (MX) | PII | Idem |
| **GDPR** (EU, si aplica) | PII | Idem + DPO designado |
| **SOC 2 Type II** | Confianza para clientes corporate | Roadmap de certificación post-MVP |
| **ISO 27001** | Seguridad de la información | Políticas y controles ya alineados |
| **PCI-DSS** | No aplicable (no procesamos tarjetas) | n/a |

## 16. Política de divulgación de vulnerabilidades

- Programa público con email `security@conta.example.com` y PGP key.
- SLA de respuesta: 24h acknowledge, 30d resolución para críticas.
- Bug bounty para hallazgos de alta severidad.

## 17. Owners y responsabilidades

| Rol | Responsabilidad |
|---|---|
| Tech Lead | Threat modeling continuo, ADRs de seguridad |
| SRE | Hardening de infra, DR, observabilidad |
| Security Champion (rotativo) | Code review desde lente de seguridad |
| Compliance Officer | Auditorías externas, cumplimiento normativo |
| Cliente (Admin contable) | Política de usuarios, MFA, secrets de webhooks |

## 18. Resumen de controles aplicados

- ✅ JWT + OAuth2 + scopes
- ✅ MFA para roles sensibles
- ✅ Multi-tenant aislado + tests cross-tenant
- ✅ TLS 1.3 + HSTS
- ✅ TDE + Always Encrypted en columnas sensibles
- ✅ Audit log inmutable
- ✅ Asientos inmutables + trigger anti-DELETE/UPDATE
- ✅ Doble aprobación en operaciones críticas
- ✅ Idempotencia obligatoria en escrituras
- ✅ Sandboxing de posting rules (sin code execution)
- ✅ Secrets en Key Vault con Managed Identity
- ✅ Webhooks firmados con HMAC
- ✅ Rate limit por tenant
- ✅ Backups WORM + DR semestral
