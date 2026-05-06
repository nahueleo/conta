# 10 · UI · Mapa de pantallas y mockup

> El mockup vive en [`/mockup/index.html`](../mockup/index.html). Es un SPA estático (HTML + CSS + JS vanilla + Chart.js por CDN) con routing por hash. No requiere build ni backend.

## 1. Cómo correrlo

**Opción A — Abrir directo en Chrome:**
```
open -a "Google Chrome" mockup/index.html
```

**Opción B — Servidor estático (recomendado para que no haya restricciones de CORS / file://):**
```
cd mockup && python3 -m http.server 8000
```
Luego ir a `http://localhost:8000`.

## 2. Stack del mockup

- HTML5 + CSS3 (sin framework).
- Chart.js v4.4.1 vía CDN.
- Routing por `window.location.hash`.
- Datos mock en `data.js` (estáticos, no hay backend).
- Tema oscuro con tokens CSS.

## 3. Mapa de navegación

```
Sidebar
├── 📊 Dashboard                    #/dashboard
├── 📓 Libro Diario                 #/diario
├── 📒 Libro Mayor                  #/mayor
├── 🗂️ Plan de Cuentas              #/plan
├── ⚙️ Posting Rules                #/reglas
├── 📈 Reportes                     #/reportes
│   ├── Sumas y Saldos
│   ├── Balance General             #/reportes/balance
│   ├── Estado de Resultados
│   ├── Flujo de Efectivo           #/reportes/cashflow
│   ├── Evolución del PN            #/reportes/pn
│   ├── Antigüedad CxC              #/reportes/aged-cxc
│   ├── Antigüedad CxP              #/reportes/aged-cxp
│   ├── Conciliación bancaria       #/reportes/conciliacion
│   ├── Rentabilidad por Sucursal   #/reportes/rent-sucursal
│   ├── Rentabilidad por BU         #/reportes/rent-bu
│   ├── Análisis de gastos          #/reportes/gastos
│   ├── Presupuesto vs Real         #/reportes/presupuesto
│   ├── Reporte fiscal IVA          #/reportes/iva
├── 🔒 Cierre de Ejercicio          #/cierre
├── 🔄 Remesas                      #/remesas
└── 🛠️ Configuración                #/config
```

## 4. Pantallas

### 4.1 Dashboard
- 4 tarjetas KPI: Activo, Pasivo, PN, Resultado del mes.
- Gráfico de cashflow 12 meses (operativo / inversión / financiación).
- Top 5 cuentas del mes.
- Gráfico de Ingresos vs Egresos.
- Panel de alertas activas (críticas / warning / info).
- 4 dashboards mini por unidad de negocio (donut con ROI).

### 4.2 Libro Diario
- Filtros: rango de fechas, sucursal, BU, búsqueda libre.
- Tabla con asientos agrupados (cabecera con totales + líneas).
- Badge de origen: `EXT`, `MANUAL`, `REMITTANCE`.
- Botón "Reverso" por asiento.

### 4.3 Libro Mayor
- Selector de cuenta.
- Gráfico de evolución del saldo.
- Resumen: saldo inicial/final, totales, movimientos, última operación.
- Tabla de movimientos con saldo acumulado.

### 4.4 Plan de Cuentas
- Vista árbol jerárquica con nivel y código.
- Acciones por hover: agregar hija, mover, editar, inactivar.
- Panel de plantillas por país (AR, BR, MX, etc.).
- Alerta de impacto cuando se mueve una cuenta con histórico.

### 4.5 Posting Rules
- Tabla de reglas con código, trigger, versión, estado.
- Editor visual con columnas Debe / Haber.
- Validaciones automáticas mostradas como checks.
- Dry-run con payload JSON de ejemplo.

### 4.6 Reportes (índice + páginas individuales)
- Listado completo (tabla).
- Cada reporte tiene su propia ruta con UI específica.
- Detalle por reporte:
  - **Sumas y Saldos**: tabla de cuentas con débito, crédito, saldo agrupados por tipo.
  - **Balance General**: estructura Activo/Pasivo/PN; análisis vertical y horizontal; comparativo con período anterior.
  - **Estado de Resultados**: cascade chart + tabla con líneas estándar.
  - **Flujo de Efectivo**: switch entre método directo e indirecto; gráfico mensual.
  - **Evolución del PN**: tabla de variaciones por concepto; gráfico de stacked bar.
  - **Antigüedad CxC / CxP**: bar chart por bucket + tabla de clientes/proveedores.
  - **Conciliación bancaria**: matched / outstanding / unidentified.
  - **Rentabilidad por sucursal**: ranking, barras, KPIs por sucursal.
  - **Rentabilidad por BU**: ranking + radar chart de métricas.
  - **Análisis de gastos**: Pareto chart + drill-down.
  - **Presupuesto vs Real**: gauge / semáforo + desvíos por categoría.
  - **Reporte fiscal IVA**: subdiarios ventas/compras + determinación.

### 4.7 Cierre de Ejercicio
- Wizard 4 pasos.
- Pre-validaciones con checklist.
- Ajustes propuestos (devengamientos, amortizaciones, previsiones, FX).
- Preview del asiento de refundición.
- Confirmación con doble aprobación.

### 4.8 Remesas
- KPIs por estado.
- Listado con badges (conciliada / pendiente / observada).
- Gráfico del saldo de la cuenta puente.

### 4.9 Configuración
- Datos de empresa (incluido CUIT marcado como Always Encrypted).
- Sucursales.
- Unidades de negocio.
- Periodos fiscales.
- Usuarios y roles con 2FA.
- Panel de seguridad con controles activos.

## 5. Decisiones de diseño

- **Paleta**: dark theme con acentos azul/verde (typo financiera + sobria).
- **Tipografía**: Inter (UI) + JetBrains Mono (códigos y números).
- **Densidad**: compacta, similar a herramientas profesionales (Stripe, Linear).
- **Charts**: alturas fijas en wrapper para evitar el bug de resize infinito de Chart.js.
- **Componentes mínimos**: cards, panels, tables, alerts, tags, filters bar, tree, wizard steps.
- **Responsive**: layout adaptativo a < 1100 px (sidebar colapsa, grids 1 columna).
- **i18n-ready**: el mockup está en es-AR pero la estructura está preparada para traducir.

## 6. Componentes reutilizables

| Componente | Uso |
|---|---|
| `Card` | KPI tile |
| `Panel` | Container con título y borde |
| `Table` | Listados |
| `Tag` | Estados / badges |
| `Filters bar` | Filtros de listados |
| `Tree node` | Plan de cuentas |
| `Step` | Wizard |
| `Rule line` | Item editable de regla |
| `Chart wrap` | Container con altura fija para Chart.js |

## 7. Diferencias entre el mockup y la implementación final

El mockup es **estático**. La implementación real (Fase 5):

- Reemplaza JS vanilla por React + TypeScript + TanStack Query.
- Conecta con la API real (`fetch`/`axios` + interceptores de auth).
- Usa shadcn/ui o Mantine para componentes accesibles.
- Maneja loading states, errores, optimistic updates.
- Soporta i18n con `react-intl`.
- Pasa Lighthouse > 90 y WCAG AA.

## 8. Captura de pantallas (referencia)

Para tomar screenshots del mockup:
```
cd mockup && python3 -m http.server 8000
# luego abrir en Chrome y screenshot manual o vía Puppeteer
```

(Capturas estáticas no se incluyen en el repo; el mockup se navega vivo.)

## 9. Roadmap de UI post-mockup

- Modo claro.
- Customización de dashboard (drag & drop de tiles).
- Bookmarks de filtros frecuentes.
- Comentarios sobre asientos (colaboración).
- Historial de cambios visualizable por entidad.
- Notificaciones in-app realtime (SignalR).
