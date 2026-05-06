# 04 · Casos de uso

## Actores

| Actor | Descripción |
|---|---|
| **Admin contable** | Configura plan de cuentas, reglas, periodos, usuarios; aprueba cierres |
| **Operador** | Carga asientos manuales, consulta reportes |
| **Auditor externo** | Lectura completa, no escribe |
| **Sistema externo** | E-commerce, POS, ERP, banco; envía eventos vía API |
| **Aprobador** | Segundo aprobador para acciones críticas (cierre/reapertura) |
| **Conta scheduler** | Ejecuta jobs (revaluación FX, alertas, archivado) |

## Diagrama de casos de uso (alto nivel)

```
                 ┌──────────────────┐
                 │  Admin contable  │
                 └─────────┬────────┘
                           │
       ┌─────────┬─────────┼──────────┬─────────┬──────────┐
       │         │         │          │         │          │
   Onboard   Editar    Configurar   Cerrar   Aprobar   Gestionar
   tenant    plan      reglas       período  reapertura usuarios
   
                 ┌──────────────────┐
                 │     Operador     │
                 └─────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          Cargar       Consultar    Generar
          manual       reportes     export
          
                 ┌──────────────────┐
                 │ Sistema externo  │
                 └─────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          Postear     Postear      Dry-run
          asiento     bulk         (test)
```

---

## CU-01: Onboarding de un nuevo cliente

**Actor:** Admin contable (cliente nuevo).

**Precondiciones:** Tenant creado por la plataforma; usuario con rol `tenant.admin`.

**Flujo:**

1. Admin elige **país** y **tamaño** (micro / pyme / corporate).
2. Sistema aplica plantilla de plan de cuentas + posting rules + roles.
3. Admin completa datos legales de la empresa (CUIT/RFC/CNPJ — guardado encriptado).
4. Admin crea sucursales y unidades de negocio iniciales.
5. Admin configura monedas y proveedor de FX.
6. Sistema inicializa el ejercicio fiscal corriente con sus 12 periodos.
7. Admin invita operadores con roles predefinidos.

**Postcondición:** Tenant operativo en < 30 minutos.

**Excepciones:**
- País sin plantilla disponible → onboarding manual asistido.
- CUIT inválido → bloqueo con mensaje claro.

---

## CU-02: Editar el plan de cuentas sin romper historial

**Actor:** Admin contable.

**Precondiciones:** Existe al menos un asiento sobre la cuenta a modificar.

**Flujo:**

1. Admin abre el plan de cuentas (vista árbol).
2. Modifica el nombre, mueve la cuenta a otra rama o la divide en sub-cuentas.
3. Sistema muestra impacto: "X asientos históricos referencian esta cuenta".
4. Admin confirma.
5. Sistema crea un registro en `AccountMapping` con `validFrom = hoy`.
6. Reportes históricos siguen funcionando (consultan vía mapping).
7. Audit log registra el cambio.

**Postcondición:** Plan de cuentas actualizado; balances pasados intactos.

**Excepciones:**
- Cuenta tiene saldo distinto de cero al ser inactivada → bloqueo.

---

## CU-03: Configurar una posting rule nueva

**Actor:** Admin contable.

**Flujo:**

1. Admin abre "Posting Rules" → Nueva.
2. Define `code`, `trigger` (ej. `external.refund.created`), líneas DR/CR con expresiones.
3. Define validaciones (ej. `sum_dr == sum_cr`, `accounts_active`).
4. Ejecuta **dry-run** con un payload de ejemplo.
5. Sistema muestra el asiento simulado, sin postearlo.
6. Admin guarda. Sistema asigna `version = max+1` y la activa.

**Postcondición:** La regla queda disponible para procesar nuevos eventos del trigger correspondiente.

---

## CU-04: Postear un asiento desde sistema externo

**Actor:** Sistema externo (ej. e-commerce que reporta una venta).

**Precondiciones:**
- Sistema externo tiene API key + secret.
- Existe posting rule activa para el trigger.

**Flujo principal:**

1. Sistema externo invoca:
   ```
   POST /api/v1/journal/post
   Headers: Authorization: Bearer ..., Idempotency-Key: order-12345
   Body: { "trigger": "external.sale.created", "payload": { "total": 121000, "net": 100000, ... } }
   ```
2. APIM valida JWT, scope `accounting.post`, rate limit.
3. Function recibe la request.
4. Verifica idempotency: si ya existe → devuelve la respuesta cacheada.
5. Resuelve la posting rule activa para el trigger + tenant.
6. Evalúa expresiones (NCalc sandboxed).
7. Construye `JournalEntry` y valida partida doble + cuentas activas + período abierto.
8. Persiste en SQL + outbox event.
9. Devuelve `201 Created` con el ID del asiento.
10. Worker publica el evento → proyecciones (balance cache, alertas, webhooks).

**Postcondición:** Asiento posteado, balance actualizado, evento publicado.

**Excepciones:**
- Período cerrado → 409 Conflict.
- Cuenta inactiva → 422 Unprocessable Entity.
- Partida doble fallida → 422 + detalle.
- Idempotency key reutilizada con payload distinto → 409.

---

## CU-05: Postear bulk

**Actor:** Sistema externo.

**Flujo:**

1. POST `/api/v1/journal/post/bulk` con array de hasta N asientos.
2. Sistema procesa en lote dentro de una transacción.
3. Modos:
   - `all_or_nothing` (default): si uno falla, ninguno persiste.
   - `best_effort`: persiste los válidos, devuelve detalle de los que fallaron.

---

## CU-06: Asiento manual (con doble validación)

**Actor:** Operador → Admin (aprobación).

**Flujo:**

1. Operador abre "Nuevo asiento manual".
2. Carga fecha, descripción, líneas DR/CR.
3. Sistema valida partida doble en cliente (tiempo real) y servidor.
4. Operador envía → estado `pending_approval` (si la config exige aprobación).
5. Admin revisa y aprueba → asiento posteado.
6. Audit log registra ambos pasos.

**Variantes:**
- Empresa configura asientos manuales sin aprobación: pasa directo a `posted`.

---

## CU-07: Reverso de asiento

**Actor:** Operador / Admin.

**Flujo:**

1. Usuario localiza el asiento → click "Reverso".
2. Sistema genera asiento espejo (DR↔CR) con `Source = reversal` y `ReversedJournalEntryId`.
3. Usuario añade `Reason`.
4. Sistema postea el reverso.

**Postcondición:** El asiento original sigue intacto; el reverso lo compensa.

**Restricciones:**
- No se puede revertir un asiento de un período cerrado (excepto reapertura previa).

---

## CU-08: Remesa entre sucursales

**Actor:** Operador.

**Flujo:**

1. Operador crea remesa: origen, destino, monto, fecha.
2. Sistema postea asiento de salida (cuenta puente CR, banco origen DR negativo).
3. Estado `pending`.
4. Cuando la sucursal destino confirma → sistema postea asiento de entrada (banco destino DR, cuenta puente CR).
5. Estado `reconciled`. Saldo de cuenta puente vuelve a cero para esa remesa.

**Excepciones:**
- Remesa pendiente > N días → alerta `flagged`.

---

## CU-09: Cierre de ejercicio fiscal

**Actor:** Admin contable + Aprobador.

**Flujo:**

1. Admin abre wizard de cierre.
2. **Paso 1 — Pre-validaciones**:
   - Asientos balanceados ✓
   - Cuentas en moneda extranjera revaluadas ✓
   - Conciliaciones bancarias completadas ✓
   - Remesas conciliadas ✓
3. **Paso 2 — Ajustes propuestos** (devengamientos, amortizaciones, previsiones, FX).
4. Admin revisa y aplica.
5. **Paso 3 — Refundición**: sistema genera asiento que cierra cuentas de Resultado contra `Resultados Acumulados`.
6. **Paso 4 — Confirmación con doble aprobación**: aprobador (otro usuario con permiso) confirma.
7. Sistema marca el ejercicio como `closed` → todos los periodos pasan a sólo lectura.
8. Audit log registra todo el flujo con user IDs y timestamps.

**Postcondición:** Período cerrado, asientos congelados, próximo ejercicio listo para operar.

---

## CU-10: Reapertura de período cerrado

**Actor:** Admin + Aprobador (excepcional).

**Flujo:**

1. Admin solicita reapertura con motivo obligatorio.
2. Sistema requiere segundo aprobador.
3. Audit log: `period.reopened` con razón, ambos usuarios, timestamp.
4. Período pasa a `open`.

**Postcondición:** Se pueden postear ajustes; el cierre se vuelve a ejecutar luego.

**Política:** Reaperturas se reportan al cliente como evento crítico.

---

## CU-11: Consulta de mayor por cuenta

**Actor:** Operador / Auditor.

**Flujo:**

1. Selecciona cuenta + rango de fechas + filtros (sucursal, BU).
2. Sistema devuelve movimientos con saldo acumulado por línea.
3. Cada línea linkea al asiento origen.
4. Opción de exportar a Excel/PDF.

---

## CU-12: Generar reporte de Sumas y Saldos

**Actor:** Operador / Auditor.

**Flujo:**

1. Selecciona "Sumas y Saldos" + fecha de corte.
2. Sistema construye el reporte desde proyección o queries Dapper optimizadas.
3. Devuelve grilla y permite drill-down por cuenta → mayor.

---

## CU-13: Cashflow proyectado a 90 días

**Actor:** Admin / Operador.

**Flujo:**

1. Sistema toma:
   - Saldo de Caja y Bancos.
   - CxC con vencimiento futuro.
   - CxP con vencimiento futuro.
   - Recurrencias detectadas (sueldos, alquileres, impuestos).
2. Calcula proyección semanal.
3. Permite escenarios `+20% / -20%` en cobranzas.
4. Muestra punto de quiebre si lo hay.

---

## CU-14: Configurar y disparar alerta

**Actor:** Admin (configura) → Sistema (dispara).

**Flujo:**

1. Admin define alerta: tipo (`liquidity_threshold`), valor (1.3), severidad, canal.
2. Sistema (timer Function) evalúa cada N minutos.
3. Si la condición se cumple, dispara notificación (in-app, email, webhook, Slack/Teams).
4. Dedupe: una alerta del mismo tipo no se vuelve a disparar hasta que la condición se "resuelva".

---

## CU-15: Webhook saliente

**Actor:** Sistema externo (suscriptor).

**Flujo:**

1. Cliente registra webhook URL + secret + eventos de interés.
2. Cuando ocurre un evento (ej. `JournalEntryPosted`), Function publica:
   ```
   POST <url>
   Headers: X-Conta-Signature: hmac-sha256(secret, body)
   Body: { event: "JournalEntryPosted", entry: { ... } }
   ```
3. Si el suscriptor responde 5xx o timeout, sistema reintenta con backoff (max 5 intentos), luego DLQ.

---

## CU-16: Auditor externo accede en modo read-only

**Actor:** Auditor.

**Flujo:**

1. Admin invita al auditor con rol `auditor`.
2. Auditor accede con su cuenta + 2FA.
3. Sólo ve consultas y reportes; cero permisos de escritura.
4. Toda su actividad queda en audit log.

---

## CU-17: Recuperación tras incidente (RTO/RPO)

**Actor:** SRE.

**Flujo:**

1. SQL Server tiene PITR de 35 días.
2. Backups exportados a Blob WORM diariamente.
3. Ante incidente: restore en región secundaria.
4. RTO objetivo ≤ 1h, RPO ≤ 5min.
5. Ejercicio de DR semestral con simulacro.
