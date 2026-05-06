# 11 · Glosario

## Términos contables

| Término | Definición |
|---|---|
| **Asiento contable** | Registro de una operación con al menos una línea de debe y una de haber. |
| **Partida doble** | Principio: cada operación afecta al menos dos cuentas, y la suma de débitos = suma de créditos. |
| **Plan de cuentas** | Estructura jerárquica de cuentas que organiza la contabilidad. |
| **Libro Diario** | Registro cronológico de todos los asientos. |
| **Libro Mayor** | Registro por cuenta con todos sus movimientos y saldo acumulado. |
| **Sumas y Saldos** (Trial Balance) | Reporte que muestra la suma de débitos y créditos por cuenta a una fecha. |
| **Balance General** | Estado de situación patrimonial: Activo, Pasivo y Patrimonio Neto a una fecha. |
| **Estado de Resultados** | Estado que muestra ingresos y egresos de un período. |
| **Estado de Flujo de Efectivo** | Estado que muestra entradas y salidas de efectivo del período. |
| **Patrimonio Neto (PN)** | Activo – Pasivo. Capital + reservas + resultados acumulados. |
| **Activo Corriente** | Bienes y derechos realizables en menos de un año. |
| **Activo No Corriente** | Bienes y derechos realizables en más de un año. |
| **Pasivo Corriente** | Obligaciones a pagar en menos de un año. |
| **Pasivo No Corriente** | Obligaciones a pagar en más de un año. |
| **Cuenta de Resultado** | Ingresos y egresos. Se refunden al cierre. |
| **Refundición** | Asiento que cierra cuentas de resultado contra Resultados Acumulados. |
| **Devengamiento** | Reconocimiento de un ingreso/gasto en el período en que ocurre, no en el que se cobra/paga. |
| **Amortización** | Distribución del costo de un bien de uso a lo largo de su vida útil. |
| **Previsión** | Estimación de un gasto o pérdida futura probable (ej. deudores incobrables). |
| **Conciliación bancaria** | Proceso de igualar el saldo del mayor con el extracto bancario. |
| **Antigüedad de saldos** | Clasificación de saldos por tiempo desde su origen (0-30, 31-60, etc.). |
| **DSO** (Days Sales Outstanding) | Días promedio de cobranza. |
| **DPO** (Days Payable Outstanding) | Días promedio de pago. |
| **DIO** (Days Inventory Outstanding) | Días promedio de stock. |
| **CCC** (Cash Conversion Cycle) | DSO + DIO – DPO. |
| **EBIT** | Earnings Before Interest and Taxes. Resultado operativo. |
| **EBITDA** | EBIT + amortizaciones. |
| **ROE** | Return On Equity = Resultado / PN. |
| **ROA** | Return On Assets = Resultado / Activo. |
| **ROI** | Return On Investment. |
| **Liquidez corriente** | Activo Corriente / Pasivo Corriente. |
| **Prueba ácida** | (AC – Inventarios) / PC. |
| **CMV** | Costo de Mercaderías Vendidas. |
| **CxC** | Cuentas a cobrar (créditos por ventas). |
| **CxP** | Cuentas a pagar (proveedores). |
| **IVA Débito Fiscal** | IVA generado por ventas (a pagar al fisco). |
| **IVA Crédito Fiscal** | IVA pagado en compras (descontable). |
| **Ejercicio fiscal** | Período (típicamente anual) sobre el que se hace contabilidad y reporte. |
| **Período fiscal** | Subdivisión del ejercicio (mensual, trimestral). |
| **Cierre de ejercicio** | Proceso de finalizar el ejercicio: ajustes, refundición, congelar. |
| **Reapertura** | Acción excepcional de reabrir un ejercicio cerrado para ajustes. |
| **Remesa** | Transferencia de fondos entre sucursales de la misma empresa. |
| **Cuenta puente** | Cuenta auxiliar usada para conciliar operaciones entre dos lados (ej. remesa). |
| **Sucursal** | Unidad geográfica/operativa de una empresa. |
| **Unidad de negocio (BU)** | Línea de negocio o segmento (Retail, Mayorista, Online). |
| **Multi-moneda** | Capacidad de operar con varias monedas y convertir a la moneda funcional. |
| **Moneda funcional** | Moneda en la que se llevan las cuentas (ARS para una empresa argentina, etc.). |
| **Tipo de cambio histórico** | Tasa vigente al momento de la operación, conservada para futuros reportes. |
| **Revaluación FX** | Ajuste de saldos en moneda extranjera por variación del tipo de cambio. |

## Términos técnicos

| Término | Definición |
|---|---|
| **DDD** | Domain-Driven Design. |
| **CQRS** | Command Query Responsibility Segregation. |
| **Outbox pattern** | Patrón de consistencia entre DB y mensajería: el evento se persiste en la misma transacción. |
| **Idempotencia** | Propiedad por la cual N invocaciones tienen el mismo efecto que 1. |
| **Tenant** | Cliente lógico (empresa o estudio contable). |
| **Multi-tenant** | Arquitectura donde una sola instancia sirve a muchos tenants con aislamiento. |
| **Materialized path** | Técnica de almacenamiento de árboles donde cada nodo guarda su path completo (ej. `/1/1.1/1.1.01`). |
| **Temporal Table** | Tabla de SQL Server que mantiene historial automático de cambios. |
| **Always Encrypted** | Cifrado de columnas en SQL Server donde las claves no son visibles al motor. |
| **TDE** | Transparent Data Encryption (cifrado de datos en disco). |
| **WORM** | Write Once Read Many. Storage inmutable. |
| **PITR** | Point-In-Time Restore. |
| **JWT** | JSON Web Token (estándar para tokens de autenticación). |
| **OAuth2 / OIDC** | Estándares de autorización y autenticación. |
| **MFA** | Multi-Factor Authentication. |
| **RBAC** | Role-Based Access Control. |
| **Scope** | Permiso granular asociado a un token. |
| **HMAC** | Hash-based Message Authentication Code (para firmar webhooks). |
| **Service Bus** | Sistema de mensajería de Azure (similar a SQS / Kafka). |
| **DLQ** | Dead Letter Queue. |
| **APIM** | Azure API Management. |
| **APIM rate limit** | Límite de requests por unidad de tiempo. |
| **Key Vault** | Almacenamiento de secretos y claves de Azure. |
| **Managed Identity** | Identidad de Azure asignada a un recurso para acceder a otros sin secrets. |
| **OpenTelemetry** | Estándar abierto de observabilidad (traces, metrics, logs). |
| **App Insights** | Producto de Azure Monitor para observabilidad de apps. |
| **EF Core** | Entity Framework Core (ORM de .NET). |
| **Global Query Filter** | Filtro de EF aplicado automáticamente a todas las queries de una entidad. |
| **Dapper** | Micro-ORM de .NET, performante para queries. |
| **NCalc** | Parser de expresiones para .NET, sandboxed. |
| **FsCheck** | Property-based testing para .NET (similar a QuickCheck). |
| **Testcontainers** | Librería para correr dependencias reales (SQL Server, Redis) en contenedores durante tests. |
| **STRIDE** | Marco de threat modeling: Spoofing, Tampering, Repudio, Info disclosure, DoS, Elevation. |
| **SAST** | Static Application Security Testing. |
| **DAST** | Dynamic Application Security Testing. |
| **WAF** | Web Application Firewall. |
| **RPO** | Recovery Point Objective (cuánta data se puede perder). |
| **RTO** | Recovery Time Objective (cuánto tarda la recuperación). |
| **Posting Rule** | Regla configurable que traduce un evento externo en un asiento. |
| **Idempotency-Key** | Header HTTP que identifica una operación de forma única. |
| **Trigger** (en posting rules) | Nombre del evento que activa la regla (ej. `external.sale.created`). |
| **Dry-run** | Ejecución simulada que devuelve el resultado sin persistir. |

## Acrónimos por país

| Acrónimo | País | Significado |
|---|---|---|
| **CUIT** | AR | Clave Única de Identificación Tributaria |
| **AFIP** | AR | Administración Federal de Ingresos Públicos |
| **RG** | AR | Resolución General |
| **CFDI** | MX | Comprobante Fiscal Digital por Internet |
| **SAT** | MX | Servicio de Administración Tributaria |
| **RFC** | MX | Registro Federal de Contribuyentes |
| **CNPJ** | BR | Cadastro Nacional da Pessoa Jurídica |
| **SPED** | BR | Sistema Público de Escrituração Digital |
| **ICMS** | BR | Imposto sobre Circulação de Mercadorias e Serviços |
| **PIS** | BR | Programa de Integração Social |
| **COFINS** | BR | Contribuição para Financiamento da Seguridade Social |
| **DIAN** | CO | Dirección de Impuestos y Aduanas Nacionales |
| **SUNAT** | PE | Superintendencia Nacional de Aduanas y Administración Tributaria |
