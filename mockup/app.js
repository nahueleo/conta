// Tiny hash router + view renderer
const view = document.getElementById('view');
const routes = {
  'onboarding':             renderOnboarding,
  'dashboard':              renderDashboard,
  'diario':                 renderDiario,
  'mayor':                  renderMayor,
  'plan':                   renderPlan,
  'reglas':                 renderReglas,
  'reportes':               renderReportes,
  'reportes/balance':       renderReporteBalance,
  'reportes/cashflow':      renderReporteCashflow,
  'reportes/pn':            renderReportePN,
  'reportes/aged-cxc':      renderReporteAgedCxC,
  'reportes/aged-cxp':      renderReporteAgedCxP,
  'reportes/conciliacion':  renderReporteConciliacion,
  'reportes/rent-sucursal': renderReporteRentSucursal,
  'reportes/rent-bu':       renderReporteRentBU,
  'reportes/gastos':        renderReporteGastos,
  'reportes/presupuesto':   renderReportePresupuesto,
  'reportes/iva':           renderReporteIVA,
  'cierre':                 renderCierre,
  'remesas':                renderRemesas,
  'gateway':                renderGateway,
  'config':                 renderConfig,
};
let activeCharts = [];
function destroyCharts(){ activeCharts.forEach(c=>c.destroy()); activeCharts = []; }

function navigate() {
  const hash = location.hash.replace('#/', '') || 'dashboard';
  const route = routes[hash] ? hash : 'dashboard';
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  destroyCharts();
  view.innerHTML = '';
  routes[route]();
  view.scrollTo?.(0,0);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => { if (!location.hash) location.hash = '#/dashboard'; navigate(); });

// ───── Dashboard ─────
function renderDashboard() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <div class="page-sub">Resumen ejecutivo · Ejercicio 2026 · Abril</div>
      </div>
      <div class="toolbar">
        <button class="btn">Exportar PDF</button>
        <button class="btn-primary btn">+ Asiento manual</button>
      </div>
    </div>

    <div class="cards">
      <div class="card"><div class="label">Activo total</div><div class="value">${fmt(DATA.kpis.activo)}</div><div class="delta up">▲ 4.2% vs cierre 2025</div></div>
      <div class="card"><div class="label">Pasivo total</div><div class="value">${fmt(DATA.kpis.pasivo)}</div><div class="delta down">▲ 2.1%</div></div>
      <div class="card"><div class="label">Patrimonio neto</div><div class="value">${fmt(DATA.kpis.pn)}</div><div class="delta up">▲ 5.7%</div></div>
      <div class="card"><div class="label">Resultado del mes</div><div class="value">${fmt(DATA.kpis.resultadoMes)}</div><div class="delta up">▲ ${DATA.kpis.resultadoDelta}% vs marzo</div></div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Cashflow últimos 12 meses</h3>
        <div class="chart-wrap h-md"><canvas id="chartCashflow"></canvas></div>
      </div>
      <div class="panel">
        <h3>Top 5 cuentas del mes</h3>
        <table class="table">
          <thead><tr><th>Cuenta</th><th class="num">Monto</th></tr></thead>
          <tbody>${DATA.topCuentas.map(c => `
            <tr><td><span class="kbd">${c.code}</span> ${c.name}</td><td class="num">${fmt(c.amount)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Ingresos vs Egresos · Abril</h3>
        <div class="chart-wrap h-md"><canvas id="chartIE"></canvas></div>
      </div>
      <div class="panel">
        <h3>Alertas activas</h3>
        <div class="alerts">
          ${DATA.alerts.map(a=>`
            <div class="alert ${a.sev}">
              <div class="ico">${a.sev==='crit'?'🔴':a.sev==='warn'?'🟠':'🔵'}</div>
              <div class="body"><div class="t">${a.t}</div><div class="d">${a.d}</div></div>
              <button class="btn btn-ghost">Ver</button>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid-3">
      ${DATA.bus.map(b => `
        <div class="panel">
          <h3>Unidad: ${b.name}</h3>
          <div style="display:flex; gap:18px; align-items:center;">
            <div style="flex:1">
              <div class="label muted" style="font-size:11px">ROI</div>
              <div style="font-size:24px; font-weight:700; color:${b.color}">${b.roi}%</div>
              <div class="label muted" style="font-size:11px; margin-top:8px">Margen</div>
              <div style="font-size:18px; font-weight:600">${b.margen}%</div>
            </div>
            <div style="width:80px; height:80px; flex:0 0 80px"><canvas id="bu-${b.name}"></canvas></div>
          </div>
        </div>`).join('')}
    </div>
  `;

  // Cashflow chart
  const cf = DATA.cashflowMonthly;
  activeCharts.push(new Chart(document.getElementById('chartCashflow'), {
    type:'bar',
    data:{ labels: cf.labels, datasets:[
      { label:'Operativo',    data: cf.operativo,    backgroundColor:'#22c55e' },
      { label:'Inversión',    data: cf.inversion,    backgroundColor:'#7c3aed' },
      { label:'Financiación', data: cf.financiacion, backgroundColor:'#1f75e4' },
    ]},
    options: chartOpts({stacked:true})
  }));

  activeCharts.push(new Chart(document.getElementById('chartIE'), {
    type:'bar',
    data:{ labels: DATA.ingresoEgresoMes.labels, datasets:[
      { label:'Monto', data: DATA.ingresoEgresoMes.values,
        backgroundColor: DATA.ingresoEgresoMes.values.map(v=> v>=0 ? '#22c55e' : '#e11d48') }
    ]},
    options: chartOpts({legend:false})
  }));

  DATA.bus.forEach(b => {
    activeCharts.push(new Chart(document.getElementById('bu-'+b.name), {
      type:'doughnut',
      data:{ labels:['ROI','Resto'], datasets:[{ data:[b.roi, 100-b.roi], backgroundColor:[b.color, '#243064'], borderWidth:0 }]},
      options:{ cutout:'70%', plugins:{ legend:{display:false}, tooltip:{enabled:false} } }
    }));
  });
}

function chartOpts({stacked=false, legend=true}={}) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:legend, labels:{ color:'#a8b3df', boxWidth:12 } } },
    scales:{
      x:{ stacked, grid:{display:false}, ticks:{ color:'#8a96c7' } },
      y:{ stacked, grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8a96c7', callback:v=>fmtN(v) } }
    }
  };
}

// ───── Libro Diario ─────
let diarioState = {
  selected: new Set(),
  expanded: new Set(),
  filters: { from: '2026-04-01', to: '2026-04-30', branch: '', bu: '', source: '', q: '' },
};

function renderDiario() {
  const totalDr = DATA.diario.reduce((s,e) => s + e.lines.reduce((ss,l)=>ss+l.dr,0), 0);
  const totalCr = DATA.diario.reduce((s,e) => s + e.lines.reduce((ss,l)=>ss+l.cr,0), 0);
  const sel = diarioState.selected;

  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Libro Diario</h1>
        <div class="page-sub">Asientos del ejercicio · inmutables · cualquier corrección se hace por reverso</div>
      </div>
      <div class="toolbar">
        <button class="btn" onclick="openImportEntries()">📤 Importar</button>
        <button class="btn">Exportar Excel</button>
        <button class="btn">Exportar PDF</button>
        <button class="btn btn-primary" onclick="openJournalEntryEditor()">+ Asiento manual</button>
      </div>
    </div>

    <div class="cards">
      <div class="card"><div class="label">Total Debe</div><div class="value">${fmt(totalDr)}</div></div>
      <div class="card"><div class="label">Total Haber</div><div class="value">${fmt(totalCr)}</div></div>
      <div class="card"><div class="label">Diferencia</div><div class="value" style="color:var(--ok)">${fmt(totalDr-totalCr)}</div><div class="delta">partida doble OK</div></div>
      <div class="card"><div class="label">Asientos</div><div class="value">${DATA.diario.length}</div><div class="delta">en abril 2026</div></div>
    </div>

    <div class="filters" style="margin-top:18px">
      <input type="date" value="${diarioState.filters.from}" onchange="diarioState.filters.from=this.value"/>
      <span class="sep">→</span>
      <input type="date" value="${diarioState.filters.to}" onchange="diarioState.filters.to=this.value"/>
      <select onchange="diarioState.filters.branch=this.value">
        <option value="">Sucursal: Todas</option>
        <option>CABA</option><option>Rosario</option><option>Mendoza</option><option>Online</option>
      </select>
      <select onchange="diarioState.filters.bu=this.value">
        <option value="">BU: Todas</option>
        <option>Retail</option><option>Mayorista</option><option>Online</option><option>Servicios</option>
      </select>
      <select onchange="diarioState.filters.source=this.value">
        <option value="">Origen: Todos</option>
        <option value="EXT">Externos (API)</option>
        <option value="MANUAL">Manuales</option>
        <option value="REMITTANCE">Remesas</option>
        <option value="REVERSAL">Reversos</option>
      </select>
      <input placeholder="🔍 Buscar cuenta, descripción o referencia..." style="flex:1; min-width:280px"
             value="${diarioState.filters.q}" onchange="diarioState.filters.q=this.value"/>
      <button class="btn">Aplicar</button>
      <button class="btn btn-ghost" onclick="diarioState.filters={from:'2026-04-01',to:'2026-04-30',branch:'',bu:'',source:'',q:''}; renderDiario()">Limpiar</button>
    </div>

    ${sel.size > 0 ? `
      <div class="bulk-bar">
        <span class="count">${sel.size} asientos seleccionados</span>
        <button class="btn">📥 Exportar selección</button>
        <button class="btn">⤺ Revertir todos</button>
        <button class="btn">🏷️ Etiquetar</button>
        <button class="btn btn-ghost" style="margin-left:auto" onclick="diarioState.selected.clear(); renderDiario()">Limpiar selección</button>
      </div>` : ''}

    <div class="panel" style="padding:0">
      <table class="table">
        <thead>
          <tr>
            <th style="width:30px"><input type="checkbox" onchange="toggleAllDiario(this.checked)" ${sel.size===DATA.diario.length?'checked':''}/></th>
            <th style="width:30px"></th>
            <th>#</th><th>Fecha</th><th>Descripción</th><th>Sucursal</th><th>BU</th><th>Origen</th>
            <th class="num">Debe</th><th class="num">Haber</th>
            <th style="width:50px"></th>
          </tr>
        </thead>
        <tbody>
          ${DATA.diario.length === 0 ? `
            <tr><td colspan="11"><div class="empty-state"><div class="ico">📭</div>Sin asientos en el rango filtrado</div></td></tr>
          ` : DATA.diario.flatMap(e => {
            const sumDr = e.lines.reduce((s,l)=>s+l.dr,0);
            const sumCr = e.lines.reduce((s,l)=>s+l.cr,0);
            const checked = sel.has(e.id);
            const expanded = diarioState.expanded.has(e.id);
            const head = `<tr style="background: var(--panel-2); cursor:pointer" onclick="openJournalEntryDetail(${e.id})">
              <td onclick="event.stopPropagation()">
                <input type="checkbox" ${checked?'checked':''} onchange="toggleSelectDiario(${e.id})"/>
              </td>
              <td onclick="event.stopPropagation(); toggleExpandDiario(${e.id})" style="cursor:pointer; text-align:center">
                ${expanded?'▾':'▸'}
              </td>
              <td><span class="kbd">#${e.id}</span></td>
              <td>${e.date}</td>
              <td><strong>${e.desc}</strong>${e.src.startsWith('EXT')?`<div class="muted" style="font-size:11px">ref: ${e.src.replace('EXT:','')}</div>`:''}</td>
              <td>${e.branch}</td>
              <td>${e.bu}</td>
              <td><span class="tag ${e.src.startsWith('EXT')?'ok':e.src==='MANUAL'?'warn':'muted'}">${e.src.startsWith('EXT')?'EXT':e.src}</span></td>
              <td class="num"><strong>${fmt(sumDr)}</strong></td>
              <td class="num"><strong>${fmt(sumCr)}</strong></td>
              <td onclick="event.stopPropagation()">
                <div class="action-menu">
                  <button class="action-menu-btn" onclick="toggleActionMenu(this, event)">⋯</button>
                  <div class="action-menu-pop">
                    <a onclick="openJournalEntryDetail(${e.id})">👁️ Ver detalle</a>
                    <a onclick="openReverseEntryDialog(${e.id})">⤺ Revertir asiento</a>
                    <a onclick="openJournalEntryEditor(null, ${e.id})">📋 Duplicar como nuevo</a>
                    <a>🔍 Ir al origen</a>
                    <a>📋 Copiar referencia</a>
                    <hr/>
                    <a>📄 Imprimir voucher</a>
                    <a>📥 Exportar a Excel</a>
                    <hr/>
                    <a>📜 Audit trail</a>
                  </div>
                </div>
              </td>
            </tr>`;
            const lines = expanded ? e.lines.map(l => `<tr>
              <td></td><td></td><td></td><td></td>
              <td colspan="4" style="padding-left:24px">
                <span class="kbd">${l.acc}</span> ${l.name}
              </td>
              <td class="num" style="color:${l.dr?'var(--text)':'var(--muted)'}">${l.dr ? fmt(l.dr) : '·'}</td>
              <td class="num" style="color:${l.cr?'var(--text)':'var(--muted)'}">${l.cr ? fmt(l.cr) : '·'}</td>
              <td></td>
            </tr>`).join('') : '';
            return head + lines;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:14px; color:var(--muted); font-size:12px">
      <div>Mostrando ${DATA.diario.length} de ${DATA.diario.length} asientos</div>
      <div>
        <button class="btn btn-ghost">‹ Anterior</button>
        <span style="margin: 0 10px">página 1 de 1</span>
        <button class="btn btn-ghost">Siguiente ›</button>
      </div>
    </div>
  `;
}

function toggleSelectDiario(id) {
  if (diarioState.selected.has(id)) diarioState.selected.delete(id);
  else diarioState.selected.add(id);
  renderDiario();
}

function toggleAllDiario(checked) {
  diarioState.selected.clear();
  if (checked) DATA.diario.forEach(e => diarioState.selected.add(e.id));
  renderDiario();
}

function toggleExpandDiario(id) {
  if (diarioState.expanded.has(id)) diarioState.expanded.delete(id);
  else diarioState.expanded.add(id);
  renderDiario();
}

function toggleActionMenu(btn, ev) {
  ev.stopPropagation();
  document.querySelectorAll('.action-menu.open').forEach(m => { if (!m.contains(btn)) m.classList.remove('open'); });
  btn.parentElement.classList.toggle('open');
  setTimeout(() => {
    document.addEventListener('click', function fn() {
      btn.parentElement.classList.remove('open');
      document.removeEventListener('click', fn);
    }, { once: true });
  }, 0);
}

// ───── Libro Mayor ─────
function renderMayor() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Libro Mayor</h1>
        <div class="page-sub">Movimientos y saldo acumulado por cuenta</div>
      </div>
      <div class="toolbar"><button class="btn">Exportar PDF</button></div>
    </div>
    <div class="filters">
      <select style="min-width:280px"><option>1.1.02.001 — Banco Galicia</option><option>1.1.01.001 — Caja general</option><option>4.1.01.001 — Ventas</option></select>
      <input type="date" value="2026-01-01"/><span class="sep">→</span><input type="date" value="2026-04-30"/>
      <button class="btn btn-primary">Consultar</button>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Evolución del saldo · 1.1.02.001 Banco Galicia</h3>
        <div class="chart-wrap h-md"><canvas id="chartMayor"></canvas></div>
      </div>
      <div class="panel">
        <h3>Resumen</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div class="label muted">Saldo inicial</div><div style="font-weight:700">${fmt(1200000)}</div></div>
          <div><div class="label muted">Saldo final</div><div style="font-weight:700">${fmt(3400000)}</div></div>
          <div><div class="label muted">Total Debe</div><div style="font-weight:700; color: var(--ok)">${fmt(5800000)}</div></div>
          <div><div class="label muted">Total Haber</div><div style="font-weight:700; color: var(--danger)">${fmt(2400000)}</div></div>
          <div><div class="label muted">Movimientos</div><div style="font-weight:700">42</div></div>
          <div><div class="label muted">Última operación</div><div style="font-weight:700">2026-04-20</div></div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top: 20px; padding:0">
      <table class="table">
        <thead><tr><th>Fecha</th><th>Asiento</th><th>Descripción</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead>
        <tbody>
          ${(()=>{ let saldo=1200000; return DATA.diario.flatMap(e=>{
              return e.lines.filter(l=>l.acc==='1.1.02.001').map(l=>{
                saldo += l.dr - l.cr;
                return `<tr><td>${e.date}</td><td><span class="kbd">#${e.id}</span></td><td>${e.desc}</td>
                  <td class="num">${l.dr?fmt(l.dr):'·'}</td><td class="num">${l.cr?fmt(l.cr):'·'}</td>
                  <td class="num"><strong>${fmt(saldo)}</strong></td></tr>`;
              }).join('');
          }).join(''); })()}
        </tbody>
      </table>
    </div>
  `;

  const labels = ['Ene','Feb','Mar','Abr'];
  const balances = [1200000, 1850000, 2700000, 3400000];
  activeCharts.push(new Chart(document.getElementById('chartMayor'), {
    type:'line',
    data:{ labels, datasets:[{ label:'Saldo', data: balances, fill:true,
      borderColor:'#6c8cff', backgroundColor:'rgba(108,140,255,.18)', tension:.3, pointRadius:4 }] },
    options: chartOpts({legend:false})
  }));
}

// ───── Plan de Cuentas ─────
function renderPlan() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Plan de Cuentas</h1>
        <div class="page-sub">Editable · soporta mover, agregar, dividir; los reportes históricos se preservan vía AccountMapping</div>
      </div>
      <div class="toolbar">
        <button class="btn">Importar</button>
        <button class="btn">Exportar</button>
        <button class="btn btn-primary" onclick="openAccountEditor(null)">+ Nueva cuenta</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Estructura jerárquica</h3>
        <p class="muted" style="margin-top:0; font-size:12px">Click en una cuenta para configurarla.</p>
        <div class="tree">
          ${DATA.plan.map(n => `
            <div class="node l${n.level}" data-code="${n.code}" onclick="openAccountEditor('${n.code}')">
              <span>${n.level<=3?'📁':'📄'}</span>
              <span class="kbd">${n.code}</span>
              <span>${n.name}</span>
              <span class="balance">${fmt(n.balance)}</span>
              <span class="actions" onclick="event.stopPropagation()">
                <button class="icon-btn" title="Agregar hija" onclick="openAccountEditor(null,'${n.code}')">+</button>
                <button class="icon-btn" title="Mover" onclick="alert('Drag & drop disponible en la implementación final')">↕</button>
                <button class="icon-btn" title="Editar" onclick="openAccountEditor('${n.code}')">✎</button>
                <button class="icon-btn" title="Inactivar" onclick="alert('Confirmación + verificación de saldo cero')">×</button>
              </span>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel">
        <h3>Plantillas de plan de cuentas</h3>
        <p class="muted" style="margin-top:0">Aplicar una plantilla base no destruye lo cargado: agrega cuentas faltantes y deja el resto intacto.</p>
        <div style="display:flex; flex-direction:column; gap:8px">
          <div class="rule-line"><strong>🇦🇷 Argentina · Micro/PyME</strong><div class="muted">82 cuentas · IVA 21% · Mono y RI</div><button class="btn">Aplicar</button></div>
          <div class="rule-line"><strong>🇦🇷 Argentina · Corporativa</strong><div class="muted">220 cuentas · multi-moneda · NIIF/CONTAB</div><button class="btn">Aplicar</button></div>
          <div class="rule-line"><strong>🇧🇷 Brasil · Lucro Real</strong><div class="muted">Plan SPED · ICMS/PIS/COFINS</div><button class="btn">Aplicar</button></div>
          <div class="rule-line"><strong>🇲🇽 México · CFDI</strong><div class="muted">Catálogo SAT · ISR/IVA</div><button class="btn">Aplicar</button></div>
        </div>
        <div class="divider"></div>
        <h3>Impacto de cambios pendientes</h3>
        <div class="alert warn"><div class="ico">⚠️</div><div class="body">
          <div class="t">Vas a mover "1.1.01.002 Caja chica" bajo "1.1.01"</div>
          <div class="d">145 asientos históricos seguirán imputados al ID original; se crea un mapping vigente desde hoy.</div>
        </div></div>
        <div style="margin-top:12px; display:flex; gap:8px">
          <button class="btn btn-primary">💾 Guardar cambios</button>
          <button class="btn">Descartar</button>
        </div>
      </div>
    </div>
  `;
}

// ───── Posting Rules ─────
function renderReglas() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Posting Rules</h1>
        <div class="page-sub">Cómo se contabiliza cada operación externa · sin tocar código</div>
      </div>
      <div class="toolbar">
        <button class="btn">Importar JSON</button>
        <button class="btn btn-primary">+ Nueva regla</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel" style="padding:0">
        <table class="table">
          <thead><tr><th>Código</th><th>Trigger</th><th>Versión</th><th>Última uso</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${DATA.rules.map(r=>`
              <tr>
                <td><strong>${r.code}</strong></td>
                <td><span class="kbd">${r.trigger}</span></td>
                <td>v${r.version}</td>
                <td class="muted">${r.lastUsed}</td>
                <td>${r.enabled?'<span class="tag ok">activa</span>':'<span class="tag muted">deshabilitada</span>'}</td>
                <td><button class="btn btn-ghost">Editar</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Editor · SALE_VAT_21 (v3)</h3>
        <div class="rule-editor">
          <div class="rule-side">
            <h4>Debe</h4>
            <div class="rule-line">
              <div class="row"><label>Cuenta</label><input value="1.1.02.001"/></div>
              <div class="row"><label>Monto</label><input value="{{total}}"/></div>
              <div class="row"><label>Sucursal</label><input value="{{branchId}}"/></div>
            </div>
            <button class="btn btn-ghost">+ línea</button>
          </div>
          <div class="rule-side">
            <h4>Haber</h4>
            <div class="rule-line">
              <div class="row"><label>Cuenta</label><input value="4.1.01.001"/></div>
              <div class="row"><label>Monto</label><input value="{{net}}"/></div>
              <div class="row"><label>BU</label><input value="{{buId}}"/></div>
            </div>
            <div class="rule-line">
              <div class="row"><label>Cuenta</label><input value="2.1.05.001"/></div>
              <div class="row"><label>Monto</label><input value="{{total}} - {{net}}"/></div>
              <div class="row"><label>Etiq.</label><input value="IVA Débito Fiscal"/></div>
            </div>
            <button class="btn btn-ghost">+ línea</button>
          </div>
        </div>
        <div class="checks">
          <span>✓ Σ Debe = Σ Haber</span>
          <span>✓ Cuentas activas</span>
          <span>✓ Variables resueltas</span>
        </div>

        <div class="divider"></div>
        <h3>Dry-run con payload de ejemplo</h3>
        <pre class="code">{
  "total": 121000,
  "net":   100000,
  "branchId": "CABA",
  "buId":     "RETAIL"
}</pre>
        <div style="margin-top:10px; display:flex; gap:8px">
          <button class="btn btn-primary">▶ Probar</button>
          <button class="btn">Ver asiento simulado</button>
        </div>
      </div>
    </div>
  `;
}

// ───── Reportes ─────
function renderReportes() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Reportes</h1>
        <div class="page-sub">Reportes contables clásicos y métricas ERP operativas para dueños y gerentes</div>
      </div>
      <div class="toolbar">
        <select><option>Ejercicio 2026</option><option>Ejercicio 2025</option></select>
        <select><option>Mensual</option><option>Trimestral</option><option>Anual</option></select>
        <button class="btn" onclick="openReportConfig('trial-balance')">⚙ Config Sumas y Saldos</button>
        <button class="btn" onclick="openReportConfig('income-statement')">⚙ Config Resultados</button>
        <button class="btn">PDF</button>
        <button class="btn">Excel</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Sumas y saldos · al 30/04/2026</h3>
        <table class="table">
          <thead><tr><th>Cuenta</th><th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th></tr></thead>
          <tbody>
            ${DATA.trialBalance.map(r=>`<tr>
              <td><span class="kbd">${r.code}</span> ${r.name}</td>
              <td class="num">${fmt(r.dr)}</td>
              <td class="num">${fmt(r.cr)}</td>
              <td class="num"><strong>${fmt(r.dr - r.cr)}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Estado de Resultados · Abril 2026</h3>
        <div class="chart-wrap h-md"><canvas id="chartIS"></canvas></div>
        <div class="divider"></div>
        <table class="table">
          <tr><td>Ventas netas</td><td class="num">${fmt(1565000)}</td></tr>
          <tr><td>Costo de ventas</td><td class="num">(${fmt(540000).replace('-','')})</td></tr>
          <tr><td><strong>Margen bruto</strong></td><td class="num"><strong>${fmt(1025000)}</strong></td></tr>
          <tr><td>Gastos operativos</td><td class="num">(${fmt(625000).replace('-','')})</td></tr>
          <tr><td><strong>Resultado operativo</strong></td><td class="num"><strong>${fmt(400000)}</strong></td></tr>
          <tr><td>Impuestos</td><td class="num">(${fmt(80000).replace('-','')})</td></tr>
          <tr><td><strong>Resultado neto</strong></td><td class="num"><strong style="color:var(--ok)">${fmt(320000)}</strong></td></tr>
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Antigüedad de saldos · Cuentas a cobrar</h3>
        <div class="chart-wrap h-md"><canvas id="chartAged"></canvas></div>
      </div>
      <div class="panel">
        <h3>Cashflow proyectado · 90 días</h3>
        <div class="chart-wrap h-md"><canvas id="chartFx"></canvas></div>
        <div class="muted" style="margin-top:8px; font-size:12px">Proyección basada en CxC + CxP + recurrencias detectadas. Stress test ±20% disponible.</div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Reportes netamente contables</h3>
      <div class="grid-3" style="margin-top:0">
        ${[
          ['Balance General','Activo · Pasivo · Patrimonio Neto con análisis vertical y horizontal','reportes/balance'],
          ['Estado de Resultados','Ingresos, costos y resultado neto','reportes/pn'],
          ['Flujo de Efectivo','Directo / indirecto y saldo de caja','reportes/cashflow'],
          ['Antigüedad de saldos CxC','Buckets 0-30 / 31-60 / 61-90 / +90','reportes/aged-cxc'],
          ['Antigüedad de saldos CxP','Buckets para cuentas a pagar','reportes/aged-cxp'],
          ['Conciliación bancaria','Matching automático por importe + fecha','reportes/conciliacion'],
          ['Presupuesto vs Real','Desvíos por centro de costo y cuenta','reportes/presupuesto'],
          ['Reporte fiscal IVA','Compras y ventas del período','reportes/iva'],
        ].map(([t,d,r])=>`
          <div class="rule-line"><strong>${t}</strong><div class="muted" style="font-size:12px">${d}</div>
            <a href="#/${r}" class="btn" style="margin-top:8px; display:inline-block; text-decoration:none">Abrir →</a></div>`).join('')}
      </div>
    </div>

    <div class="panel" style="margin-top:24px">
      <h3>Reportes ERP y operativos</h3>
      <div class="grid-3" style="margin-top:0">
        ${[
          ['Margen por producto / servicio','Costos variables, márgenes y contribución',''],
          ['Análisis de clientes','Ticket promedio, frecuencia y concentración',''],
          ['Punto de equilibrio','Ventas mínimas necesarias para cubrir costos fijos',''],
          ['Tendencias de ventas','Crecimiento histórico y proyección simple',''],
          ['Eficiencia operativa','Ingresos por empleado y costos de operación',''],
          ['Gastos por categoría','Comparación de partidas de costo',''],
          ['ROI por proyecto / inversión','Retorno y payback estimado',''],
          ['Benchmarks sectoriales','Comparativo con métricas del mercado',''],
          ['Simulador de decisiones','Impacto de precio y volumen en utilidades',''],
          ['Rentabilidad por Sucursal','Margen y contribución por ubicación','reportes/rent-sucursal'],
          ['Rentabilidad por BU','Margen y eficiencia por unidad de negocio','reportes/rent-bu'],
        ].map(([t,d,r])=>`
          <div class="rule-line"><strong>${t}</strong><div class="muted" style="font-size:12px">${d}</div>
            ${r ? `<a href="#/${r}" class="btn" style="margin-top:8px; display:inline-block; text-decoration:none">Abrir →</a>` : `<button class="btn btn-ghost" style="margin-top:8px; opacity:.7; cursor: default">Próximo</button>`}</div>`).join('')}
      </div>
    </div>
  `;

  activeCharts.push(new Chart(document.getElementById('chartIS'), {
    type:'bar',
    data:{ labels:['Ventas','Costo','Mg.bruto','Gtos.op','Res.op','Imp.','Res.neto'],
      datasets:[{ data:[1565000,-540000,1025000,-625000,400000,-80000,320000],
        backgroundColor:['#4dd4ac','#ef4444','#6c8cff','#ef4444','#6c8cff','#ef4444','#22c55e']}] },
    options: chartOpts({legend:false})
  }));

  activeCharts.push(new Chart(document.getElementById('chartAged'), {
    type:'bar',
    data:{ labels: DATA.agedReceivables.labels, datasets:[{
      data: DATA.agedReceivables.values,
      backgroundColor:['#22c55e','#f5a524','#ef4444','#7f1d1d']
    }]},
    options: chartOpts({legend:false})
  }));

  activeCharts.push(new Chart(document.getElementById('chartFx'), {
    type:'line',
    data:{ labels: ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8','Sem 9','Sem 10','Sem 11','Sem 12','Sem 13'],
      datasets:[
        { label:'Cobranzas estimadas', data:[200,250,180,300,220,260,280,310,290,330,310,340,360].map(x=>x*1000),
          borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.15)', fill:true, tension:.3 },
        { label:'Pagos estimados', data:[-180,-220,-150,-260,-190,-230,-240,-270,-250,-300,-280,-310,-330].map(x=>x*1000),
          borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.12)', fill:true, tension:.3 },
      ]},
    options: chartOpts()
  }));
}

// ───── Cierre ─────
function renderCierre() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cierre de Ejercicio</h1>
        <div class="page-sub">Wizard guiado · genera asientos automáticos · requiere doble aprobación</div>
      </div>
    </div>
    <div class="steps">
      <div class="step done">1 · Pre-validaciones</div>
      <div class="step active">2 · Ajustes de cierre</div>
      <div class="step">3 · Refundición</div>
      <div class="step">4 · Confirmación</div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Pre-validaciones</h3>
        <ul class="checklist">
          <li>✅ Todos los asientos del período están balanceados</li>
          <li>✅ No hay cuentas en moneda extranjera sin revaluar</li>
          <li>⚠️ <span>2 conciliaciones bancarias pendientes</span> <button class="btn btn-ghost">Ver</button></li>
          <li>✅ Todas las remesas inter-sucursales están conciliadas</li>
          <li>✅ Todas las facturas tienen comprobante asociado</li>
          <li>✅ El plan de cuentas no tiene cambios pendientes</li>
        </ul>
      </div>
      <div class="panel">
        <h3>Ajustes propuestos</h3>
        <table class="table">
          <thead><tr><th>Tipo</th><th>Descripción</th><th class="num">Importe</th></tr></thead>
          <tbody>
            <tr><td><span class="tag ok">Devengamiento</span></td><td>Alquiler abril a diciembre</td><td class="num">${fmt(85000)}</td></tr>
            <tr><td><span class="tag ok">Amortización</span></td><td>Bienes de uso anual</td><td class="num">${fmt(180000)}</td></tr>
            <tr><td><span class="tag warn">Previsión</span></td><td>Deudores incobrables</td><td class="num">${fmt(45000)}</td></tr>
            <tr><td><span class="tag warn">Revaluación FX</span></td><td>USD a 1180 / ARS</td><td class="num">${fmt(120000)}</td></tr>
          </tbody>
        </table>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end">
          <button class="btn">← Atrás</button>
          <button class="btn btn-primary">Aplicar y continuar →</button>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Asiento de refundición (preview)</h3>
      <pre class="code">JE-CLOSE-2026 · 31/12/2026 · "Refundición de cuentas de resultado"
  4.1.01.001 Ventas                   DR 1.100.000
  4.1.02.001 Ventas online            DR   420.000
  4.2.01.001 Otros ingresos           DR    45.000
  5.1.01.001 Costo de mercadería              CR   540.000
  5.2.01.001 Insumos                          CR    42.000
  5.3.01.001 Sueldos y jornales               CR   380.000
  5.4.01.001 Alquileres                       CR    85.000
  5.5.01.001 Impuestos                        CR   160.000
  5.9.01.001 Otros gastos                     CR    80.000
  3.2.01.001 Resultados acumulados            CR   278.000</pre>
    </div>
  `;
}

// ───── Remesas ─────
function renderRemesas() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Remesas inter-sucursales</h1>
        <div class="page-sub">Cuenta puente · conciliación automática</div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary">+ Nueva remesa</button>
      </div>
    </div>

    <div class="cards">
      <div class="card"><div class="label">Total mes</div><div class="value">${fmt(475000)}</div></div>
      <div class="card"><div class="label">Conciliadas</div><div class="value">2</div></div>
      <div class="card"><div class="label">Pendientes</div><div class="value">1</div></div>
      <div class="card"><div class="label">Observadas</div><div class="value">1</div></div>
    </div>

    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>ID</th><th>Fecha</th><th>Origen</th><th>Destino</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${DATA.remesas.map(r=>`<tr>
            <td><span class="kbd">${r.id}</span></td><td>${r.date}</td><td>${r.from}</td><td>${r.to}</td>
            <td class="num">${fmt(r.amount)}</td>
            <td>${r.status==='conciliada'?'<span class="tag ok">conciliada</span>':r.status==='pendiente'?'<span class="tag warn">pendiente</span>':'<span class="tag crit">observada</span>'}</td>
            <td><button class="btn btn-ghost">Detalle</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top: 20px">
      <h3>Saldo de la cuenta puente · 1.1.99.001</h3>
      <p class="muted">Saldo objetivo: <strong>${fmt(0)}</strong>. Cualquier saldo distinto de 0 indica una remesa sin conciliar.</p>
      <div class="chart-wrap h-sm"><canvas id="chartPuente"></canvas></div>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartPuente'), {
    type:'line',
    data:{ labels:['18-04','19-04','20-04','21-04','22-04','23-04','24-04','25-04','26-04','27-04','28-04','29-04','30-04'],
      datasets:[{ label:'Saldo cuenta puente', data:[0,0,0,0,150000,150000,150000,150000,150000,150000,185000,185000,185000],
        borderColor:'#f5a524', backgroundColor:'rgba(245,165,36,.18)', fill:true, tension:.2, pointRadius:3 }] },
    options: chartOpts({legend:false})
  }));
}

// ───── Configuración ─────
function renderConfig() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Configuración</h1>
        <div class="page-sub">Empresa · Sucursales · Unidades de negocio · Monedas · Periodos · Usuarios y roles</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Empresa</h3>
        <table class="table">
          <tr><td>Razón social</td><td><strong>ACME S.A.</strong></td></tr>
          <tr><td>CUIT</td><td><span class="kbd">30-71234567-9</span> 🔒 (Always Encrypted)</td></tr>
          <tr><td>Domicilio fiscal</td><td>Av. Corrientes 1234, CABA</td></tr>
          <tr><td>Régimen</td><td>Responsable Inscripto</td></tr>
          <tr><td>Moneda funcional</td><td>ARS (multi-currency activo)</td></tr>
          <tr><td>Inicio de ejercicio</td><td>1 de enero</td></tr>
        </table>
        <button class="btn">Editar</button>
      </div>

      <div class="panel">
        <h3>Sucursales</h3>
        <table class="table">
          <tr><td>CABA</td><td>Casa central</td><td><span class="tag ok">activa</span></td></tr>
          <tr><td>Rosario</td><td>Sucursal</td><td><span class="tag ok">activa</span></td></tr>
          <tr><td>Mendoza</td><td>Sucursal</td><td><span class="tag ok">activa</span></td></tr>
          <tr><td>Online</td><td>Canal digital</td><td><span class="tag ok">activa</span></td></tr>
        </table>
        <button class="btn btn-primary">+ Nueva sucursal</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Unidades de negocio</h3>
        <table class="table">
          <tr><td>Retail</td><td>Punto de venta físico</td></tr>
          <tr><td>Mayorista</td><td>B2B</td></tr>
          <tr><td>Online</td><td>E-commerce</td></tr>
          <tr><td>Servicios</td><td>Consultoría</td></tr>
        </table>
      </div>
      <div class="panel">
        <h3>Periodos fiscales</h3>
        <table class="table">
          <tr><td>2026</td><td>01/01 – 31/12</td><td><span class="tag ok">abierto</span></td></tr>
          <tr><td>2025</td><td>01/01 – 31/12</td><td><span class="tag muted">cerrado</span></td></tr>
          <tr><td>2024</td><td>01/01 – 31/12</td><td><span class="tag muted">cerrado</span></td></tr>
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h3>Usuarios y roles</h3>
        <table class="table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Sucursal</th><th>2FA</th></tr></thead>
          <tbody>
            <tr><td>leonardo.mercado@acme.com</td><td><span class="tag warn">Admin contable</span></td><td>Todas</td><td><span class="tag ok">on</span></td></tr>
            <tr><td>maria.lopez@acme.com</td><td><span class="tag muted">Operador</span></td><td>CABA</td><td><span class="tag ok">on</span></td></tr>
            <tr><td>auditor@externo.com</td><td><span class="tag muted">Auditor (read-only)</span></td><td>Todas</td><td><span class="tag ok">on</span></td></tr>
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h3>Seguridad</h3>
        <ul class="checklist">
          <li>🔒 Datos sensibles cifrados en reposo (Always Encrypted)</li>
          <li>🔒 Backups diarios cifrados a storage WORM</li>
          <li>🔒 2FA obligatorio para roles con permiso de cierre</li>
          <li>🔒 Audit log inmutable (append-only)</li>
          <li>🔒 Cambios al plan de cuentas requieren doble aprobación</li>
          <li>🔒 Reapertura de período requiere doble aprobación</li>
        </ul>
      </div>
    </div>
  `;
}

// ───── helpers compartidos ─────
function pageHeader(title, sub, toolbar='', reportKey=null) {
  return `<div class="page-header">
    <div>
      <h1 class="page-title">${title}</h1>
      <div class="page-sub">${sub}</div>
    </div>
    <div class="toolbar">
      <a href="#/reportes" class="btn">← Reportes</a>
      ${toolbar}
      ${reportKey ? `<button class="btn" onclick="openReportConfig('${reportKey}')">⚙ Configurar</button>` : ''}
      <button class="btn">PDF</button><button class="btn">Excel</button>
    </div>
  </div>`;
}

// ───── Reportes individuales ─────

function renderReporteBalance() {
  const A = [
    ['1.1','Activo Corriente', 9100000, 8400000],
    ['1.1.01','Caja y bancos', 5800000, 4900000],
    ['1.1.03','Créditos por ventas', 1800000, 1700000],
    ['1.1.04','Inventario', 1500000, 1800000],
    ['1.2','Activo No Corriente', 5130500, 5310500],
    ['1.2.01','Bienes de uso', 5130500, 5310500],
  ];
  const P = [
    ['2.1','Pasivo Corriente', 3120000, 2900000],
    ['2.1.01','Proveedores', 1800000, 1700000],
    ['2.1.03','Sueldos a pagar', 300000, 280000],
    ['2.1.05','IVA Débito Fiscal', 940000, 850000],
    ['2.1.04','Cargas sociales', 80000, 70000],
    ['2.2','Pasivo No Corriente', 2000000, 2200000],
  ];
  const PN = [
    ['3.1','Capital social', 5000000, 5000000],
    ['3.2','Resultados acumulados', 4110500, 3610500],
  ];
  const totalA = 14230500, totalP = 5120000, totalPN = 9110500;
  const totalAprev = 13710500, totalPprev = 5100000, totalPNprev = 8610500;

  const renderSection = (title, rows, total, totalPrev) => `
    <div class="panel">
      <h3>${title}</h3>
      <table class="table">
        <thead><tr><th>Cuenta</th><th class="num">Actual</th><th class="num">% vert.</th><th class="num">Anterior</th><th class="num">Δ horiz.</th></tr></thead>
        <tbody>
          ${rows.map(([c,n,v,p])=>`<tr>
            <td><span class="kbd">${c}</span> ${n}</td>
            <td class="num">${fmt(v)}</td>
            <td class="num muted">${(v/total*100).toFixed(1)}%</td>
            <td class="num muted">${fmt(p)}</td>
            <td class="num">${((v-p)/p*100).toFixed(1)}%</td></tr>`).join('')}
          <tr style="background:var(--panel-2); font-weight:600">
            <td>Total ${title}</td>
            <td class="num">${fmt(total)}</td><td></td>
            <td class="num">${fmt(totalPrev)}</td>
            <td class="num">${((total-totalPrev)/totalPrev*100).toFixed(1)}%</td></tr>
        </tbody>
      </table>
    </div>`;

  view.innerHTML = `
    ${pageHeader('Balance General', 'Estado de situación patrimonial al 30/04/2026 · comparativo con 31/12/2025',
      `<select><option>vs 31/12/2025</option><option>vs 30/04/2025</option></select>`, 'balance')}
    <div class="filters">
      <input type="date" value="2026-04-30"/>
      <span class="sep">vs</span>
      <input type="date" value="2025-12-31"/>
      <select><option>Análisis: Vertical + Horizontal</option><option>Sólo Vertical</option></select>
      <button class="btn btn-primary">Actualizar</button>
    </div>
    <div class="cards">
      <div class="card"><div class="label">Activo total</div><div class="value">${fmt(totalA)}</div><div class="delta up">▲ ${((totalA-totalAprev)/totalAprev*100).toFixed(1)}%</div></div>
      <div class="card"><div class="label">Pasivo total</div><div class="value">${fmt(totalP)}</div><div class="delta down">▲ ${((totalP-totalPprev)/totalPprev*100).toFixed(1)}%</div></div>
      <div class="card"><div class="label">Patrimonio neto</div><div class="value">${fmt(totalPN)}</div><div class="delta up">▲ ${((totalPN-totalPNprev)/totalPNprev*100).toFixed(1)}%</div></div>
      <div class="card"><div class="label">Liquidez corriente</div><div class="value">${(9100000/3120000).toFixed(2)}×</div><div class="delta">umbral 1.30×</div></div>
    </div>
    <div class="grid-2">
      ${renderSection('ACTIVO', A, totalA, totalAprev)}
      ${renderSection('PASIVO', P, totalP, totalPprev)}
    </div>
    ${renderSection('PATRIMONIO NETO', PN, totalPN, totalPNprev)}
    <div class="panel" style="margin-top:20px">
      <h3>Composición</h3>
      <div class="chart-wrap h-md"><canvas id="chartBalanceComp"></canvas></div>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartBalanceComp'), {
    type:'bar',
    data:{ labels:['Activo Cte.','Activo No Cte.','Pasivo Cte.','Pasivo No Cte.','Capital','Res. Acum.'],
      datasets:[
        { label:'Actual',   data:[9100000,5130500,3120000,2000000,5000000,4110500], backgroundColor:'#6c8cff' },
        { label:'Anterior', data:[8400000,5310500,2900000,2200000,5000000,3610500], backgroundColor:'#243064' },
      ]},
    options: chartOpts()
  }));
}

function renderReporteCashflow() {
  const cf = DATA.cashflowDirecto;
  view.innerHTML = `
    ${pageHeader('Estado de Flujo de Efectivo', 'Ene–Abr 2026 · Método configurable',
      `<select id="cfMethod"><option value="direct">Método Directo</option><option value="indirect">Método Indirecto</option></select>`, 'cashflow')}
    <div class="cards">
      <div class="card"><div class="label">Saldo inicial</div><div class="value">${fmt(2400000)}</div></div>
      <div class="card"><div class="label">Variación neta</div><div class="value">${fmt(90000)}</div><div class="delta up">▲ vs presupuesto</div></div>
      <div class="card"><div class="label">Saldo final</div><div class="value">${fmt(2490000)}</div></div>
      <div class="card"><div class="label">Liquidez disponible</div><div class="value">${fmt(2490000)}</div><div class="delta">colchón 30 días</div></div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>Concepto</th><th class="num">Ene</th><th class="num">Feb</th><th class="num">Mar</th><th class="num">Abr</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${cf.map(r=>{
            const total = r.jan+r.feb+r.mar+r.abr;
            const cls = r.grand?'background:var(--panel-2); font-weight:700; color:var(--accent)':r.total?'background:var(--bg-2); font-weight:600':'';
            return `<tr style="${cls}">
              <td>${r.concept}</td>
              <td class="num">${fmt(r.jan*1000)}</td><td class="num">${fmt(r.feb*1000)}</td>
              <td class="num">${fmt(r.mar*1000)}</td><td class="num">${fmt(r.abr*1000)}</td>
              <td class="num"><strong>${fmt(total*1000)}</strong></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="grid-2">
      <div class="panel">
        <h3>Composición por categoría · acumulado</h3>
        <div class="chart-wrap h-md"><canvas id="chartCFCat"></canvas></div>
      </div>
      <div class="panel">
        <h3>Evolución del efectivo</h3>
        <div class="chart-wrap h-md"><canvas id="chartCFEvo"></canvas></div>
      </div>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartCFCat'), {
    type:'doughnut',
    data:{ labels:['Operativo','Inversión','Financiero'],
      datasets:[{ data:[190000,-100000,0], backgroundColor:['#22c55e','#f5a524','#6c8cff'] }]},
    options:{ plugins:{ legend:{labels:{color:'#a8b3df'}} }, responsive:true, maintainAspectRatio:false }
  }));
  activeCharts.push(new Chart(document.getElementById('chartCFEvo'), {
    type:'line',
    data:{ labels:['Ene','Feb','Mar','Abr'],
      datasets:[{ label:'Saldo de efectivo', data:[2360000,2400000,2370000,2490000],
        borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.15)', fill:true, tension:.3 }]},
    options: chartOpts({legend:false})
  }));
}

function renderReportePN() {
  view.innerHTML = `
    ${pageHeader('Estado de Evolución del Patrimonio Neto','Variaciones del PN entre ejercicios','','pn')}
    <div class="panel" style="padding:0">
      <table class="table">
        <thead><tr><th>Concepto</th><th class="num">Capital</th><th class="num">Reservas</th><th class="num">Res. acum.</th><th class="num">Res. ejerc.</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${DATA.evolucionPN.map(r=>{
            const isSaldo = r.ejercicio.startsWith('Saldo');
            const cls = isSaldo?'background:var(--panel-2); font-weight:700':'';
            return `<tr style="${cls}">
              <td>${r.ejercicio}</td>
              <td class="num">${r.capital?fmt(r.capital*1000):'·'}</td>
              <td class="num">${r.reservas?fmt(r.reservas*1000):'·'}</td>
              <td class="num">${r.resAcum?fmt(r.resAcum*1000):'·'}</td>
              <td class="num">${r.resEjer?fmt(r.resEjer*1000):'·'}</td>
              <td class="num"><strong>${r.total?fmt(r.total*1000):'·'}</strong></td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="panel" style="margin-top:20px">
      <h3>Evolución gráfica</h3>
      <div class="chart-wrap h-md"><canvas id="chartPN"></canvas></div>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartPN'), {
    type:'bar',
    data:{ labels:['Saldo 2024','Resultado 25','Dividendos','Reservas','Saldo 2025','Result Abr 26','Saldo Abr 26'],
      datasets:[
        { label:'Capital',     data:[5000000,0,0,0,5000000,0,5000000], backgroundColor:'#6c8cff', stack:'a' },
        { label:'Reservas',    data:[ 800000,0,0,200000,1000000,0,1000000], backgroundColor:'#4dd4ac', stack:'a' },
        { label:'Res. acum.',  data:[2900000,0,-300000,-200000,2400000,0,3500000], backgroundColor:'#f5a524', stack:'a' },
        { label:'Res. ejerc.', data:[      0,1100000,0,0,1100000,320000,610000], backgroundColor:'#22c55e', stack:'a' },
      ]},
    options: chartOpts({stacked:true})
  }));
}

function renderAged(title, dataset, detail, isCxC) {
  view.innerHTML = `
    ${pageHeader(title, isCxC?'Cuentas a cobrar por antigüedad al 30/04/2026':'Cuentas a pagar por antigüedad al 30/04/2026','', isCxC?'aged-cxc':'aged-cxp')}
    <div class="cards">
      ${dataset.labels.map((l,i)=>`<div class="card"><div class="label">${l} días</div><div class="value">${fmt(dataset.values[i])}</div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <h3>Distribución por bucket</h3>
        <div class="chart-wrap h-md"><canvas id="chartAgedDist"></canvas></div>
      </div>
      <div class="panel">
        <h3>Top ${isCxC?'clientes deudores':'proveedores'}</h3>
        <table class="table">
          <thead><tr><th>${isCxC?'Cliente':'Proveedor'}</th><th class="num">Total</th></tr></thead>
          <tbody>
            ${detail.map(r=>`<tr><td>${isCxC?r.customer:r.supplier}</td><td class="num">${fmt(r.total)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>${isCxC?'Cliente':'Proveedor'}</th><th class="num">0-30</th><th class="num">31-60</th><th class="num">61-90</th><th class="num">+90</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${detail.map(r=>`<tr>
            <td>${isCxC?r.customer:r.supplier}</td>
            <td class="num">${fmt(r.b1)}</td>
            <td class="num">${fmt(r.b2)}</td>
            <td class="num" style="color:${r.b3>0?'var(--warn)':''}">${fmt(r.b3)}</td>
            <td class="num" style="color:${r.b4>0?'var(--danger)':''}">${fmt(r.b4)}</td>
            <td class="num"><strong>${fmt(r.total)}</strong></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartAgedDist'), {
    type:'bar',
    data:{ labels: dataset.labels, datasets:[{ data: dataset.values,
      backgroundColor:['#22c55e','#f5a524','#ef4444','#7f1d1d'] }]},
    options: chartOpts({legend:false})
  }));
}
function renderReporteAgedCxC() { renderAged('Antigüedad de saldos · Cuentas a cobrar', DATA.agedReceivables, DATA.agedCxCDetail, true); }
function renderReporteAgedCxP() { renderAged('Antigüedad de saldos · Cuentas a pagar',  DATA.agedPayables,    DATA.agedCxPDetail, false); }

function renderReporteConciliacion() {
  const c = DATA.conciliacion;
  view.innerHTML = `
    ${pageHeader('Conciliación bancaria', 'Cuenta 1.1.02.001 Banco Galicia · período abril 2026',
      `<button class="btn">📤 Subir extracto</button>`, 'conciliacion')}
    <div class="cards">
      <div class="card"><div class="label">Saldo según mayor</div><div class="value">${fmt(3400000)}</div></div>
      <div class="card"><div class="label">Saldo según banco</div><div class="value">${fmt(3417300)}</div></div>
      <div class="card"><div class="label">Diferencia</div><div class="value" style="color:var(--warn)">${fmt(17300)}</div><div class="delta">3 partidas</div></div>
      <div class="card"><div class="label">Match automático</div><div class="value">${c.matched.length}/${c.matched.length+c.outstanding.length+c.unidentified.length}</div><div class="delta up">${Math.round(c.matched.length/(c.matched.length+c.outstanding.length+c.unidentified.length)*100)}%</div></div>
    </div>

    <div class="grid-3">
      <div class="panel">
        <h3>✅ Matched (${c.matched.length})</h3>
        <table class="table">
          ${c.matched.map(m=>`<tr><td>${m.fecha}<br><span class="muted" style="font-size:11px">${m.concepto}</span></td><td class="num">${fmt(m.monto)}</td></tr>`).join('')}
        </table>
      </div>
      <div class="panel">
        <h3>⚠️ En mayor, no en banco (${c.outstanding.length})</h3>
        <table class="table">
          ${c.outstanding.map(m=>`<tr><td>${m.fecha}<br><span class="muted" style="font-size:11px">${m.concepto}</span></td><td class="num">${fmt(m.monto)}</td></tr>`).join('')}
        </table>
        <p class="muted" style="font-size:12px; margin-top:10px">Cheques aún no presentados al cobro.</p>
      </div>
      <div class="panel">
        <h3>🔴 En banco, no en mayor (${c.unidentified.length})</h3>
        <table class="table">
          ${c.unidentified.map(m=>`<tr><td>${m.fecha}<br><span class="muted" style="font-size:11px">${m.concepto}</span></td><td class="num">${fmt(m.monto)}</td><td><button class="btn btn-ghost">Imputar</button></td></tr>`).join('')}
        </table>
        <p class="muted" style="font-size:12px; margin-top:10px">Pendientes de generar asiento. El sistema sugiere cuenta para cada uno.</p>
      </div>
    </div>
  `;
}

function renderReporteRentSucursal() {
  view.innerHTML = `
    ${pageHeader('Rentabilidad por Sucursal', 'Ene–Abr 2026 · ranking + benchmark interno','','rent-sucursal')}
    <div class="cards">
      ${DATA.rentSucursal.map(s=>`
        <div class="card">
          <div class="label">${s.branch} · #${s.ranking}</div>
          <div class="value">${s.margen}%</div>
          <div class="delta">Margen sobre ventas</div>
        </div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <h3>Resultado por sucursal</h3>
        <div class="chart-wrap h-md"><canvas id="chartRentSuc"></canvas></div>
      </div>
      <div class="panel">
        <h3>Margen %</h3>
        <div class="chart-wrap h-md"><canvas id="chartRentSucMg"></canvas></div>
      </div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>Sucursal</th><th class="num">Ventas</th><th class="num">Costos</th><th class="num">Gastos</th><th class="num">Resultado</th><th class="num">Margen</th><th>Ranking</th></tr></thead>
        <tbody>
          ${DATA.rentSucursal.map(s=>`<tr>
            <td><strong>${s.branch}</strong></td>
            <td class="num">${fmt(s.ventas*1000)}</td>
            <td class="num">${fmt(s.costos*1000)}</td>
            <td class="num">${fmt(s.gastos*1000)}</td>
            <td class="num"><strong>${fmt(s.resultado*1000)}</strong></td>
            <td class="num">${s.margen}%</td>
            <td>${s.ranking===1?'🥇':s.ranking===2?'🥈':s.ranking===3?'🥉':`#${s.ranking}`}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartRentSuc'), {
    type:'bar',
    data:{ labels: DATA.rentSucursal.map(s=>s.branch),
      datasets:[
        { label:'Ventas', data: DATA.rentSucursal.map(s=>s.ventas*1000), backgroundColor:'#6c8cff' },
        { label:'Resultado', data: DATA.rentSucursal.map(s=>s.resultado*1000), backgroundColor:'#22c55e' },
      ]},
    options: chartOpts()
  }));
  activeCharts.push(new Chart(document.getElementById('chartRentSucMg'), {
    type:'bar',
    data:{ labels: DATA.rentSucursal.map(s=>s.branch),
      datasets:[{ data: DATA.rentSucursal.map(s=>s.margen),
        backgroundColor: DATA.rentSucursal.map(s=> s.margen>=20?'#22c55e':s.margen>=10?'#f5a524':'#ef4444') }]},
    options: chartOpts({legend:false})
  }));
}

function renderReporteRentBU() {
  view.innerHTML = `
    ${pageHeader('Rentabilidad por Unidad de Negocio', 'Margen, contribución y eficiencia · Ene–Abr 2026','','rent-bu')}
    <div class="cards">
      ${DATA.rentBU.map(s=>`
        <div class="card">
          <div class="label">${s.bu}</div>
          <div class="value">${s.margen}%</div>
          <div class="delta">Contrib. ${fmt(s.contribucion*1000)}</div>
        </div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <h3>Comparativo de métricas</h3>
        <div class="chart-wrap h-md"><canvas id="chartBuRadar"></canvas></div>
      </div>
      <div class="panel">
        <h3>Estructura ventas vs costos</h3>
        <div class="chart-wrap h-md"><canvas id="chartBuStack"></canvas></div>
      </div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>Unidad</th><th class="num">Ventas</th><th class="num">Costos directos</th><th class="num">Gastos asignados</th><th class="num">Contribución</th><th class="num">Margen</th></tr></thead>
        <tbody>
          ${DATA.rentBU.map(b=>`<tr>
            <td><strong>${b.bu}</strong></td>
            <td class="num">${fmt(b.ventas*1000)}</td>
            <td class="num">${fmt(b.costos*1000)}</td>
            <td class="num">${fmt(b.gastos*1000)}</td>
            <td class="num"><strong>${fmt(b.contribucion*1000)}</strong></td>
            <td class="num">${b.margen}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartBuRadar'), {
    type:'radar',
    data:{ labels:['Ventas','Margen','Contribución','Eficiencia'],
      datasets: DATA.rentBU.map((b,i)=>({
        label: b.bu,
        data: [b.ventas/100, b.margen, b.contribucion/30, (b.contribucion/b.ventas)*100],
        backgroundColor: ['rgba(108,140,255,.2)','rgba(77,212,172,.2)','rgba(245,165,36,.2)','rgba(239,68,68,.2)'][i],
        borderColor: ['#6c8cff','#4dd4ac','#f5a524','#ef4444'][i],
      }))},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#a8b3df'}} },
      scales:{ r:{ pointLabels:{ color:'#a8b3df' }, ticks:{ display:false }, grid:{ color:'rgba(255,255,255,.08)' } } } }
  }));
  activeCharts.push(new Chart(document.getElementById('chartBuStack'), {
    type:'bar',
    data:{ labels: DATA.rentBU.map(b=>b.bu),
      datasets:[
        { label:'Costos directos', data: DATA.rentBU.map(b=>b.costos*1000), backgroundColor:'#ef4444', stack:'a' },
        { label:'Gastos',          data: DATA.rentBU.map(b=>b.gastos*1000), backgroundColor:'#f5a524', stack:'a' },
        { label:'Contribución',    data: DATA.rentBU.map(b=>b.contribucion*1000), backgroundColor:'#22c55e', stack:'a' },
      ]},
    options: chartOpts({stacked:true})
  }));
}

function renderReporteGastos() {
  const total = DATA.gastosBreakdown.reduce((s,g)=>s+g.monto,0);
  let acum = 0;
  const pareto = DATA.gastosBreakdown.map(g=>{ acum += g.porc; return acum; });
  view.innerHTML = `
    ${pageHeader('Análisis de gastos', 'Pareto · drill-down al asiento · detección de outliers','','gastos')}
    <div class="cards">
      <div class="card"><div class="label">Total gastos</div><div class="value">${fmt(total)}</div></div>
      <div class="card"><div class="label">Categorías</div><div class="value">${DATA.gastosBreakdown.length}</div></div>
      <div class="card"><div class="label">80% concentrado en</div><div class="value">2 categorías</div><div class="delta">CMV + Sueldos</div></div>
      <div class="card"><div class="label">Outliers detectados</div><div class="value" style="color:var(--warn)">1</div><div class="delta">Servicios +43% σ</div></div>
    </div>
    <div class="panel" style="margin-top:20px">
      <h3>Pareto · 80/20</h3>
      <div class="chart-wrap h-md"><canvas id="chartPareto"></canvas></div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th>Categoría</th><th class="num">Monto</th><th class="num">% sobre total</th><th class="num">Variación vs mes ant.</th><th></th></tr></thead>
        <tbody>
          ${DATA.gastosBreakdown.map(g=>`<tr>
            <td>${g.categoria}</td>
            <td class="num">${fmt(g.monto)}</td>
            <td class="num">${g.porc}%</td>
            <td class="num" style="color:${g.var.startsWith('+')?'var(--warn)':g.var.startsWith('-')?'var(--ok)':'var(--muted)'}">${g.var}</td>
            <td><button class="btn btn-ghost">Ver asientos →</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartPareto'), {
    type:'bar',
    data:{ labels: DATA.gastosBreakdown.map(g=>g.categoria),
      datasets:[
        { type:'bar',  label:'Monto', data: DATA.gastosBreakdown.map(g=>g.monto), backgroundColor:'#6c8cff', yAxisID:'y' },
        { type:'line', label:'% acumulado', data: pareto, borderColor:'#f5a524', backgroundColor:'transparent', yAxisID:'y1', tension:.2 },
      ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:'#a8b3df'}} },
      scales:{
        x:{ grid:{display:false}, ticks:{ color:'#8a96c7' } },
        y:{ ticks:{color:'#8a96c7', callback:v=>fmtN(v)}, grid:{color:'rgba(255,255,255,.05)'} },
        y1:{ position:'right', min:0, max:100, ticks:{color:'#f5a524', callback:v=>v+'%'}, grid:{display:false} }
      }
    }
  }));
}

function renderReportePresupuesto() {
  view.innerHTML = `
    ${pageHeader('Presupuesto vs Real', 'Abril 2026 · semáforo de desvíos por categoría',
      `<select><option>Mensual</option><option>Trimestral</option><option>YTD</option></select>`, 'presupuesto')}
    <div class="cards">
      <div class="card"><div class="label">Real / Presupuestado</div><div class="value">105.7%</div><div class="delta up">▲ favorable</div></div>
      <div class="card"><div class="label">Categorías OK</div><div class="value" style="color:var(--ok)">5</div></div>
      <div class="card"><div class="label">Atención</div><div class="value" style="color:var(--warn)">1</div></div>
      <div class="card"><div class="label">Crítico</div><div class="value" style="color:var(--danger)">1</div><div class="delta">Impuestos +14%</div></div>
    </div>
    <div class="panel" style="margin-top:20px">
      <h3>Desvíos por categoría</h3>
      <div class="chart-wrap h-md"><canvas id="chartPresup"></canvas></div>
    </div>
    <div class="panel" style="margin-top:20px; padding:0">
      <table class="table">
        <thead><tr><th></th><th>Categoría</th><th class="num">Presupuestado</th><th class="num">Real</th><th class="num">Desvío</th><th class="num">%</th></tr></thead>
        <tbody>
          ${DATA.presupuesto.map(p=>{
            const dot = p.sem==='ok'?'<span class="tag ok">●</span>':p.sem==='warn'?'<span class="tag warn">●</span>':'<span class="tag crit">●</span>';
            return `<tr>
              <td>${dot}</td>
              <td>${p.categoria}</td>
              <td class="num">${fmt(p.presupuestado)}</td>
              <td class="num">${fmt(p.real)}</td>
              <td class="num" style="color:${p.desvio>=0?'var(--ok)':'var(--danger)'}">${fmt(p.desvio)}</td>
              <td class="num">${p.porc}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  activeCharts.push(new Chart(document.getElementById('chartPresup'), {
    type:'bar',
    data:{ labels: DATA.presupuesto.map(p=>p.categoria),
      datasets:[
        { label:'Presupuestado', data: DATA.presupuesto.map(p=>Math.abs(p.presupuestado)), backgroundColor:'#243064' },
        { label:'Real',          data: DATA.presupuesto.map(p=>Math.abs(p.real)), backgroundColor:'#6c8cff' },
      ]},
    options: chartOpts()
  }));
}

function renderReporteIVA() {
  const totalNV = DATA.ivaVentas.reduce((s,r)=>s+r.neto,0);
  const totalIV = DATA.ivaVentas.reduce((s,r)=>s+r.iva,0);
  const totalTV = DATA.ivaVentas.reduce((s,r)=>s+r.total,0);
  const totalNC = DATA.ivaCompras.reduce((s,r)=>s+r.neto,0);
  const totalIC = DATA.ivaCompras.reduce((s,r)=>s+r.iva,0);
  const totalTC = DATA.ivaCompras.reduce((s,r)=>s+r.total,0);
  const saldo = totalIV - totalIC;
  view.innerHTML = `
    ${pageHeader('Reporte fiscal IVA', 'Abril 2026 · subdiarios + determinación',
      `<button class="btn">Export CITI (AR)</button>`, 'iva')}
    <div class="cards">
      <div class="card"><div class="label">Débito Fiscal</div><div class="value">${fmt(totalIV)}</div></div>
      <div class="card"><div class="label">Crédito Fiscal</div><div class="value">${fmt(totalIC)}</div></div>
      <div class="card"><div class="label">Saldo a ${saldo>0?'pagar':'favor'}</div><div class="value" style="color:${saldo>0?'var(--danger)':'var(--ok)'}">${fmt(Math.abs(saldo))}</div></div>
      <div class="card"><div class="label">Vencimiento</div><div class="value">22/05</div><div class="delta">en 22 días</div></div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Libro IVA Ventas</h3>
      <table class="table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Comprobante</th><th>Cliente</th><th class="num">Neto</th><th class="num">IVA</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${DATA.ivaVentas.map(r=>`<tr>
            <td>${r.fecha}</td><td><span class="tag muted">${r.tipo}</span></td>
            <td><span class="kbd">${r.nro}</span></td><td>${r.cliente}</td>
            <td class="num">${fmt(r.neto)}</td><td class="num">${fmt(r.iva)}</td><td class="num">${fmt(r.total)}</td></tr>`).join('')}
          <tr style="background:var(--panel-2); font-weight:700">
            <td colspan="4">Totales</td>
            <td class="num">${fmt(totalNV)}</td>
            <td class="num">${fmt(totalIV)}</td>
            <td class="num">${fmt(totalTV)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Libro IVA Compras</h3>
      <table class="table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Comprobante</th><th>Proveedor</th><th class="num">Neto</th><th class="num">IVA</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${DATA.ivaCompras.map(r=>`<tr>
            <td>${r.fecha}</td><td><span class="tag muted">${r.tipo}</span></td>
            <td><span class="kbd">${r.nro}</span></td><td>${r.proveedor}</td>
            <td class="num">${fmt(r.neto)}</td><td class="num">${fmt(r.iva)}</td><td class="num">${fmt(r.total)}</td></tr>`).join('')}
          <tr style="background:var(--panel-2); font-weight:700">
            <td colspan="4">Totales</td>
            <td class="num">${fmt(totalNC)}</td>
            <td class="num">${fmt(totalIC)}</td>
            <td class="num">${fmt(totalTC)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Determinación del impuesto</h3>
      <table class="table">
        <tr><td>Débito fiscal del período</td><td class="num">${fmt(totalIV)}</td></tr>
        <tr><td>(–) Crédito fiscal del período</td><td class="num">(${fmt(totalIC)})</td></tr>
        <tr style="background:var(--panel-2); font-weight:700">
          <td>Saldo a ${saldo>0?'pagar':'favor'}</td>
          <td class="num" style="color:${saldo>0?'var(--danger)':'var(--ok)'}">${fmt(Math.abs(saldo))}</td></tr>
      </table>
    </div>
  `;
}

// ───── Modal helpers ─────
function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html;
  overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(o=>o.remove());
  document.body.style.overflow = '';
}
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tabName));
}

// ───── Editor de Cuenta ─────
function openAccountEditor(code, parentCode) {
  const isNew = !code;
  const acc = isNew
    ? { code: '', name: '', level: 4, type: 'asset', nature: 'debit', isControl: false, requiresBranch: false,
        requiresBusinessUnit: false, allowsManualEntry: true, currency: '', isActive: true, balance: 0,
        parentCode: parentCode || '' }
    : DATA.plan.find(p => p.code === code);

  // Inferir tipo según primer dígito del code
  const inferType = (c) => {
    const d = c?.[0];
    return ({ '1':'asset','2':'liability','3':'equity','4':'income','5':'expense' }[d]) || 'asset';
  };
  const accType = isNew ? inferType(parentCode) : inferType(acc.code);
  const accNature = ['asset','expense'].includes(accType) ? 'debit' : 'credit';

  const usageCount = isNew ? 0 : Math.floor(Math.random() * 200);

  openModal(`
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <h2>${isNew ? 'Nueva cuenta' : 'Editar cuenta'}</h2>
          <div class="muted">${isNew ? 'Configurar una nueva cuenta del plan' : `<span class="kbd">${acc.code}</span> · ${acc.name}`}</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button class="tab active" data-tab="basic"   onclick="switchTab('basic')">Datos básicos</button>
          <button class="tab"        data-tab="rules"   onclick="switchTab('rules')">Reglas de imputación</button>
          <button class="tab"        data-tab="advanced"onclick="switchTab('advanced')">Avanzado</button>
          ${!isNew ? `<button class="tab" data-tab="usage" onclick="switchTab('usage')">Uso e historial</button>`:''}
        </div>

        <!-- TAB: BÁSICO -->
        <div class="tab-content active" data-tab="basic">
          <div class="form-section">
            <h4>Identificación</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Código <span class="req">*</span></label>
                <input type="text" class="code" value="${isNew ? (parentCode ? parentCode+'.001' : '') : acc.code}" placeholder="1.1.01.001"/>
                <span class="hint">Notación jerárquica con puntos (ej. 1.1.01.001)</span>
              </div>
              <div class="form-group">
                <label>Nombre <span class="req">*</span></label>
                <input type="text" value="${acc.name||''}" placeholder="Ej. Banco Galicia Cuenta Corriente"/>
                <span class="hint">Nombre que verán contadores y reportes</span>
              </div>
            </div>
            <div class="form-grid" style="margin-top:14px">
              <div class="form-group">
                <label>Cuenta padre</label>
                <select>
                  <option value="">— Raíz —</option>
                  ${DATA.plan.filter(p=>p.level<4).map(p=>`
                    <option ${(isNew?parentCode:acc.code?.split('.').slice(0,-1).join('.'))===p.code?'selected':''} value="${p.code}">${p.code} · ${p.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Nivel</label>
                <input type="number" value="${acc.level}" min="1" max="5" disabled style="opacity:.6"/>
                <span class="hint">Calculado automáticamente del padre</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Naturaleza contable</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Tipo <span class="req">*</span></label>
                <select>
                  <option value="asset"     ${accType==='asset'?'selected':''}>Activo</option>
                  <option value="liability" ${accType==='liability'?'selected':''}>Pasivo</option>
                  <option value="equity"    ${accType==='equity'?'selected':''}>Patrimonio Neto</option>
                  <option value="income"    ${accType==='income'?'selected':''}>Ingreso</option>
                  <option value="expense"   ${accType==='expense'?'selected':''}>Egreso</option>
                </select>
              </div>
              <div class="form-group">
                <label>Saldo natural</label>
                <select>
                  <option value="debit"  ${accNature==='debit'?'selected':''}>Deudor (DR)</option>
                  <option value="credit" ${accNature==='credit'?'selected':''}>Acreedor (CR)</option>
                </select>
                <span class="hint">Inferido del tipo; editable en casos especiales</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Moneda</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Moneda</label>
                <select>
                  <option value="">Funcional (ARS)</option>
                  <option value="USD">USD · Dólar</option>
                  <option value="EUR">EUR · Euro</option>
                  <option value="BRL">BRL · Real</option>
                </select>
                <span class="hint">Si es distinta a la funcional, se revalúa en cada cierre.</span>
              </div>
              <div class="form-group">
                <label>Estado</label>
                <select>
                  <option value="true"  ${acc.isActive!==false?'selected':''}>Activa</option>
                  <option value="false" ${acc.isActive===false?'selected':''}>Inactiva</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: REGLAS DE IMPUTACIÓN -->
        <div class="tab-content" data-tab="rules">
          <div class="form-section">
            <h4>Reglas de uso</h4>
            <div style="display:flex; flex-direction:column; gap: 10px">
              <label class="toggle">
                <input type="checkbox" ${acc.allowsManualEntry!==false?'checked':''}/>
                <div class="info">
                  <div class="t">Permite asientos manuales</div>
                  <div class="d">Los operadores pueden imputar directo a esta cuenta desde la UI</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox" ${acc.isControl?'checked':''}/>
                <div class="info">
                  <div class="t">Cuenta de control (resumen)</div>
                  <div class="d">No admite asientos directos; agrupa cuentas hijas para reportes</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox" ${acc.requiresBranch?'checked':''}/>
                <div class="info">
                  <div class="t">Requiere sucursal</div>
                  <div class="d">Toda línea de asiento sobre esta cuenta debe especificar la sucursal</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox" ${acc.requiresBusinessUnit?'checked':''}/>
                <div class="info">
                  <div class="t">Requiere unidad de negocio</div>
                  <div class="d">Idem para BU; útil en cuentas de Ingresos / Egresos</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox"/>
                <div class="info">
                  <div class="t">Requiere centro de costo</div>
                  <div class="d">Para análisis de costos por proyecto o departamento</div>
                </div>
              </label>
            </div>
          </div>

          <div class="form-section">
            <h4>Etiquetas para reportes</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Mapeo regulatorio (AR)</label>
                <select>
                  <option value="">— Ninguno —</option>
                  <option>Activo Corriente · Caja y Bancos</option>
                  <option>Activo Corriente · Créditos por Ventas</option>
                  <option>Pasivo Corriente · Cargas Fiscales</option>
                  <option>Resultados · Ventas Netas</option>
                </select>
                <span class="hint">Mapea al rubro estándar de los EECC argentinos</span>
              </div>
              <div class="form-group">
                <label>Categoría de cashflow</label>
                <select>
                  <option value="">— No aplica —</option>
                  <option>Operativa</option>
                  <option>Inversión</option>
                  <option>Financiación</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Posting Rules que la usan</h4>
            <table class="table" style="background:var(--bg-2); border-radius:8px">
              <tr><td><span class="kbd">SALE_VAT_21</span></td><td>v3</td><td><span class="tag ok">DR / línea 1</span></td></tr>
              <tr><td><span class="kbd">PAYMENT_RCV</span></td><td>v2</td><td><span class="tag ok">DR / línea 1</span></td></tr>
              <tr><td><span class="kbd">FX_REVALUATION</span></td><td>v2</td><td><span class="tag warn">DR/CR según signo</span></td></tr>
            </table>
            <p class="muted" style="font-size:12px; margin-top:8px">Cambiar el código de esta cuenta crea un AccountMapping; las reglas seguirán funcionando sin re-deploy.</p>
          </div>
        </div>

        <!-- TAB: AVANZADO -->
        <div class="tab-content" data-tab="advanced">
          <div class="form-section">
            <h4>Conciliación</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Tipo de conciliación</label>
                <select>
                  <option value="none">— Ninguna —</option>
                  <option value="bank">Bancaria (extracto)</option>
                  <option value="customer">Por cliente (CxC)</option>
                  <option value="supplier">Por proveedor (CxP)</option>
                  <option value="bridge">Cuenta puente (remesa)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Plazo máximo a conciliar</label>
                <input type="number" value="7"/>
                <span class="hint">Días desde la fecha del movimiento. Tras vencer, dispara alerta.</span>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Alertas asociadas</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Saldo mínimo (alerta si baja)</label>
                <input type="text" placeholder="ej. 500.000"/>
              </div>
              <div class="form-group">
                <label>Saldo máximo (alerta si supera)</label>
                <input type="text" placeholder="opcional"/>
              </div>
              <div class="form-group">
                <label>Anomalías estadísticas</label>
                <select>
                  <option>Activado · 3σ sobre la media histórica</option>
                  <option>Activado · 2σ (más sensible)</option>
                  <option>Desactivado</option>
                </select>
              </div>
              <div class="form-group">
                <label>Cierre de período</label>
                <select>
                  <option>Se refunde al cierre (Resultado)</option>
                  <option>Saldo persiste al siguiente ejercicio</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Visibilidad y permisos</h4>
            <div style="display:flex; flex-direction:column; gap: 10px">
              <label class="toggle">
                <input type="checkbox" checked/>
                <div class="info">
                  <div class="t">Visible para todos los roles</div>
                  <div class="d">Si se desactiva, sólo Admin contable y Auditor podrán verla</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox"/>
                <div class="info">
                  <div class="t">Restringir por sucursal</div>
                  <div class="d">Sólo usuarios con acceso a esta sucursal verán los movimientos</div>
                </div>
              </label>
              <label class="toggle">
                <input type="checkbox"/>
                <div class="info">
                  <div class="t">Modificaciones requieren doble aprobación</div>
                  <div class="d">Cualquier cambio sobre esta cuenta necesita un segundo aprobador</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- TAB: USO E HISTORIAL -->
        ${!isNew ? `
        <div class="tab-content" data-tab="usage">
          <div class="cards" style="grid-template-columns: repeat(3,1fr)">
            <div class="card"><div class="label">Saldo actual</div><div class="value">${fmt(acc.balance)}</div></div>
            <div class="card"><div class="label">Movimientos del año</div><div class="value">${usageCount}</div></div>
            <div class="card"><div class="label">Última operación</div><div class="value" style="font-size:14px">2026-04-20</div></div>
          </div>

          <div class="form-section" style="margin-top:18px">
            <h4>Historial de cambios (Temporal Table)</h4>
            <table class="table">
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Cambio</th></tr></thead>
              <tbody>
                <tr><td>2026-03-15</td><td>maria.lopez</td><td>Habilitó "requiere sucursal"</td></tr>
                <tr><td>2026-01-08</td><td>leonardo.mercado</td><td>Cambió moneda funcional → USD</td></tr>
                <tr><td>2025-12-01</td><td>sistema</td><td>Refundición de cierre 2025</td></tr>
                <tr><td>2025-06-22</td><td>leonardo.mercado</td><td>Renombró "Banco Galicia" → "Banco Galicia CC"</td></tr>
              </tbody>
            </table>
          </div>

          <div class="form-section">
            <h4>Mappings vigentes (AccountMapping)</h4>
            <p class="muted" style="font-size:12px">Reportes históricos siguen funcionando aunque renombres o muevas la cuenta.</p>
            <table class="table">
              <thead><tr><th>Desde</th><th>Hasta</th><th>Mapeada a</th><th>Vigencia</th></tr></thead>
              <tbody>
                <tr><td><span class="kbd">${acc.code}</span></td><td>—</td><td><em>actual</em></td><td>desde 2026-01-08</td></tr>
                <tr><td><span class="kbd">1.1.02.000</span></td><td><span class="kbd">${acc.code}</span></td><td>esta cuenta</td><td>2024-01-01 → 2026-01-07</td></tr>
              </tbody>
            </table>
          </div>
        </div>` : ''}
      </div>

      <div class="modal-footer">
        ${!isNew ? `<button class="btn btn-danger" style="margin-right:auto" onclick="alert('Requiere saldo cero + confirmación + audit log')">Inactivar cuenta</button>`:''}
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="closeModal(); alert('${isNew?'Cuenta creada':'Cambios guardados'} · audit log registrado')">${isNew?'Crear cuenta':'Guardar cambios'}</button>
      </div>
    </div>
  `);
}

// ───── Configuración por reporte ─────
const REPORT_META = {
  'balance':          { title: 'Balance General',                desc: 'Estado de situación patrimonial' },
  'trial-balance':    { title: 'Sumas y Saldos',                 desc: 'Trial Balance por cuenta' },
  'income-statement': { title: 'Estado de Resultados',           desc: 'Ingresos y egresos del período' },
  'cashflow':         { title: 'Estado de Flujo de Efectivo',    desc: 'Métodos directo / indirecto' },
  'pn':               { title: 'Evolución del Patrimonio Neto',  desc: 'Variaciones del PN entre ejercicios' },
  'aged-cxc':         { title: 'Antigüedad de saldos · CxC',     desc: 'Cuentas a cobrar por bucket de días' },
  'aged-cxp':         { title: 'Antigüedad de saldos · CxP',     desc: 'Cuentas a pagar por bucket de días' },
  'conciliacion':     { title: 'Conciliación bancaria',          desc: 'Matching extracto vs mayor' },
  'rent-sucursal':    { title: 'Rentabilidad por Sucursal',      desc: 'Ranking + benchmark' },
  'rent-bu':          { title: 'Rentabilidad por BU',            desc: 'Margen y contribución' },
  'gastos':           { title: 'Análisis de gastos',             desc: 'Pareto + outliers' },
  'presupuesto':      { title: 'Presupuesto vs Real',            desc: 'Desvíos con semáforo' },
  'iva':              { title: 'Reporte fiscal IVA',             desc: 'Subdiarios + determinación' },
};

function openReportConfig(reportKey) {
  const meta = REPORT_META[reportKey] || { title: 'Reporte', desc: '' };
  openModal(`
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 880px">
      <div class="modal-header">
        <div>
          <h2>⚙ Configuración · ${meta.title}</h2>
          <div class="muted">${meta.desc}</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button class="tab active" data-tab="general"   onclick="switchTab('general')">General</button>
          <button class="tab"        data-tab="filtros"   onclick="switchTab('filtros')">Filtros</button>
          <button class="tab"        data-tab="visual"    onclick="switchTab('visual')">Visualización</button>
          <button class="tab"        data-tab="specific"  onclick="switchTab('specific')">Específico</button>
          <button class="tab"        data-tab="schedule"  onclick="switchTab('schedule')">Programación</button>
          <button class="tab"        data-tab="distrib"   onclick="switchTab('distrib')">Distribución</button>
          <button class="tab"        data-tab="permisos"  onclick="switchTab('permisos')">Permisos</button>
          <button class="tab"        data-tab="templates" onclick="switchTab('templates')">Plantillas</button>
        </div>

        ${tabGeneral(reportKey, meta)}
        ${tabFiltros(reportKey)}
        ${tabVisual(reportKey)}
        ${tabSpecific(reportKey)}
        ${tabSchedule(reportKey)}
        ${tabDistrib(reportKey)}
        ${tabPermisos(reportKey)}
        ${tabTemplates(reportKey)}
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" style="margin-right:auto">Restaurar valores por defecto</button>
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn" onclick="alert('Guardado como nueva plantilla')">Guardar como plantilla</button>
        <button class="btn btn-primary" onclick="closeModal(); alert('Configuración guardada')">Aplicar</button>
      </div>
    </div>
  `);
}

// ───── Tabs comunes ─────
function tabGeneral(key, meta) {
  return `
    <div class="tab-content active" data-tab="general">
      <div class="form-section">
        <h4>Identificación de la vista</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Nombre de la vista</label>
            <input type="text" value="${meta.title} · vista por defecto"/>
            <span class="hint">El usuario puede tener múltiples vistas guardadas del mismo reporte</span>
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <input type="text" placeholder="Ej. Mensual al CFO con comparativo"/>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Presentación</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Idioma</label>
            <select>
              <option>Español (AR)</option><option>Português (BR)</option>
              <option>Español (MX)</option><option>English (US)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Moneda de presentación</label>
            <select>
              <option>Funcional (ARS)</option><option>USD</option><option>EUR</option><option>BRL</option>
            </select>
            <span class="hint">Si difiere de la funcional, se aplica conversión al tipo de cambio del corte</span>
          </div>
          <div class="form-group">
            <label>Decimales</label>
            <select><option>0 (sin decimales)</option><option>2</option><option>4</option></select>
          </div>
          <div class="form-group">
            <label>Formato de números</label>
            <select><option>1.234.567,89</option><option>1,234,567.89</option><option>1 234 567.89</option></select>
          </div>
          <div class="form-group">
            <label>Mostrar valores en</label>
            <select><option>Unidades</option><option>Miles</option><option>Millones</option></select>
          </div>
          <div class="form-group">
            <label>Signos de pasivo/egreso</label>
            <select><option>Negativos en rojo</option><option>Entre paréntesis (1.234)</option><option>Sin signo</option></select>
          </div>
        </div>
      </div>
    </div>`;
}

function tabFiltros(key) {
  return `
    <div class="tab-content" data-tab="filtros">
      <div class="form-section">
        <h4>Período</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Tipo de período</label>
            <select id="periodType">
              <option>Período fiscal</option><option>Rango de fechas</option>
              <option>Mes en curso</option><option>Mes anterior</option>
              <option>Trimestre actual</option><option>YTD</option>
              <option>Últimos N días</option><option>Últimos N meses</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fecha de corte</label>
            <input type="date" value="2026-04-30"/>
            <span class="hint">Solo aplica si "Tipo de período" = Rango o corte único</span>
          </div>
          <div class="form-group">
            <label>Fecha desde</label>
            <input type="date" value="2026-01-01"/>
          </div>
          <div class="form-group">
            <label>Fecha hasta</label>
            <input type="date" value="2026-04-30"/>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Comparativos</h4>
        <div style="display:flex; flex-direction:column; gap:10px">
          <label class="toggle">
            <input type="checkbox" checked/>
            <div class="info"><div class="t">Comparar con período anterior</div><div class="d">Mismo rango del período inmediatamente anterior</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Comparar con mismo período año anterior (YoY)</div><div class="d">Año contra año</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Comparar con presupuesto</div><div class="d">Si hay presupuesto cargado</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Mostrar variación absoluta y porcentual</div><div class="d">Δ y Δ% por línea</div></div>
          </label>
        </div>
      </div>

      <div class="form-section">
        <h4>Dimensiones</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Empresa</label>
            <select><option>ACME S.A. (actual)</option><option>Todas las empresas (consolidado)</option></select>
          </div>
          <div class="form-group">
            <label>Sucursal</label>
            <select><option>Todas</option><option>CABA</option><option>Rosario</option><option>Mendoza</option><option>Online</option><option>Selección múltiple…</option></select>
          </div>
          <div class="form-group">
            <label>Unidad de negocio</label>
            <select><option>Todas</option><option>Retail</option><option>Mayorista</option><option>Online</option><option>Servicios</option></select>
          </div>
          <div class="form-group">
            <label>Centro de costo</label>
            <select><option>Todos</option><option>Selección múltiple…</option></select>
          </div>
          <div class="form-group">
            <label>Moneda de origen</label>
            <select><option>Todas</option><option>Sólo funcional</option><option>Sólo extranjera</option></select>
          </div>
          <div class="form-group">
            <label>Origen del asiento</label>
            <select><option>Todos</option><option>Sólo automáticos (EXT)</option><option>Sólo manuales</option><option>Excluir reversos</option></select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Filtros de cuentas</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Rango de cuentas</label>
            <input type="text" placeholder="Ej. 1.1.* o 1.1.01.001 - 1.1.05.999"/>
            <span class="hint">Glob o rango por código</span>
          </div>
          <div class="form-group">
            <label>Excluir cuentas</label>
            <input type="text" placeholder="Códigos separados por coma"/>
          </div>
          <div class="form-group">
            <label>Mostrar cuentas con saldo</label>
            <select><option>Todas</option><option>Sólo con saldo distinto de cero</option><option>Sólo con movimientos en el período</option></select>
          </div>
          <div class="form-group">
            <label>Etiqueta / tag</label>
            <input type="text" placeholder="Ej. estratégica, regulatoria"/>
          </div>
        </div>
      </div>
    </div>`;
}

function tabVisual(key) {
  const showStacked = ['cashflow','pn','rent-bu','rent-sucursal','presupuesto','gastos'].includes(key);
  return `
    <div class="tab-content" data-tab="visual">
      <div class="form-section">
        <h4>Gráficos</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Tipo de gráfico principal</label>
            <select>
              <option>Barras verticales</option><option>Barras horizontales</option>
              <option>Línea</option><option>Área</option>
              ${showStacked?'<option>Barras apiladas</option>':''}
              <option>Donut</option><option>Pie</option><option>Radar</option>
              <option>Combo (barras + línea)</option>
              <option>Sin gráfico</option>
            </select>
          </div>
          <div class="form-group">
            <label>Paleta de colores</label>
            <select><option>Default</option><option>Daltónica</option><option>Monocromática</option><option>Corporativa (logo)</option></select>
          </div>
          <div class="form-group">
            <label>Etiquetas en barras</label>
            <select><option>Sin etiquetas</option><option>Sólo valores</option><option>Valores + %</option></select>
          </div>
          <div class="form-group">
            <label>Línea de promedio</label>
            <select><option>No</option><option>Sí, móvil 3 períodos</option><option>Sí, móvil 6 períodos</option></select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Tablas</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Densidad</label>
            <select><option>Compacta</option><option>Normal</option><option>Espaciada</option></select>
          </div>
          <div class="form-group">
            <label>Filas por página</label>
            <select><option>50</option><option>100</option><option>500</option><option>Todas</option></select>
          </div>
          <div class="form-group">
            <label>Subtotales</label>
            <select><option>Sí, por nivel jerárquico</option><option>Sólo total final</option><option>Por categoría</option></select>
          </div>
          <div class="form-group">
            <label>Sticky header</label>
            <select><option>Sí</option><option>No</option></select>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:14px">
          <label class="toggle">
            <input type="checkbox" checked/>
            <div class="info"><div class="t">Permitir drill-down al asiento</div><div class="d">Click en una fila navega al Libro Mayor o al asiento origen</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox" checked/>
            <div class="info"><div class="t">Mostrar análisis vertical (% sobre total)</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox" checked/>
            <div class="info"><div class="t">Mostrar análisis horizontal (Δ vs período comparativo)</div></div>
          </label>
        </div>
      </div>
    </div>`;
}

// ───── Tab específico (varía por reporte) ─────
function tabSpecific(key) {
  const body = SPECIFIC_TABS[key]?.() || `<p class="muted">Este reporte no tiene configuración específica adicional.</p>`;
  return `<div class="tab-content" data-tab="specific"><div class="form-section">${body}</div></div>`;
}

const SPECIFIC_TABS = {
  'balance': () => `
    <h4>Balance General · opciones específicas</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Niveles a mostrar</label>
        <select><option>Hasta nivel 2 (rubros)</option><option>Hasta nivel 3</option><option>Hasta nivel 4 (detalle)</option><option>Todos</option></select>
      </div>
      <div class="form-group">
        <label>Reagrupar como</label>
        <select><option>Estándar AR (RT 9)</option><option>NIIF / IFRS</option><option>US GAAP</option><option>Personalizado</option></select>
      </div>
      <div class="form-group">
        <label>Tratamiento del resultado del ejercicio</label>
        <select><option>Mostrar separado en PN</option><option>Sumar a Resultados acumulados</option></select>
      </div>
      <div class="form-group">
        <label>Capital de trabajo</label>
        <select><option>Mostrar (AC – PC)</option><option>Ocultar</option></select>
      </div>
      <div class="form-group">
        <label>Ratios automáticos</label>
        <select><option>Liquidez + Endeudamiento + Solvencia</option><option>Sólo liquidez</option><option>Personalizado…</option></select>
      </div>
      <div class="form-group">
        <label>Notas a los EECC</label>
        <select><option>No incluir</option><option>Adjuntar al final</option><option>Documento separado</option></select>
      </div>
    </div>`,

  'trial-balance': () => `
    <h4>Sumas y Saldos · opciones específicas</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Niveles a mostrar</label>
        <select><option>Sólo cuentas hoja (imputables)</option><option>Hasta nivel 3</option><option>Todos</option></select>
      </div>
      <div class="form-group">
        <label>Columnas</label>
        <select><option>Saldo inicial · Debe · Haber · Saldo final</option><option>Sólo Debe / Haber / Saldo</option><option>Sólo saldo final</option></select>
      </div>
      <div class="form-group">
        <label>Cuentas con saldo cero</label>
        <select><option>Ocultar</option><option>Mostrar</option></select>
      </div>
      <div class="form-group">
        <label>Validar partida doble</label>
        <select><option>Sí, mostrar diferencia si la hay</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Agrupar por</label>
        <select><option>Tipo (Activo/Pasivo/PN/Ing/Egr)</option><option>Sucursal</option><option>BU</option><option>Sin agrupar</option></select>
      </div>
    </div>`,

  'income-statement': () => `
    <h4>Estado de Resultados · opciones específicas</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Estructura</label>
        <select><option>Por naturaleza</option><option>Por función (CMV / Gastos op / etc.)</option><option>Multi-step</option></select>
      </div>
      <div class="form-group">
        <label>Mostrar EBITDA</label>
        <select><option>Sí, calculado automáticamente</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Margen sobre ventas en cada línea</label>
        <select><option>Sí</option><option>No</option><option>Sólo en líneas clave</option></select>
      </div>
      <div class="form-group">
        <label>Apertura por</label>
        <select><option>Empresa total</option><option>Por sucursal</option><option>Por BU</option><option>Matriz sucursal × BU</option></select>
      </div>
      <div class="form-group">
        <label>Tratamiento de Otros Resultados Integrales (ORI)</label>
        <select><option>Incluir</option><option>Excluir</option><option>Mostrar separado</option></select>
      </div>
    </div>`,

  'cashflow': () => `
    <h4>Flujo de Efectivo · opciones específicas</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Método</label>
        <select><option>Directo</option><option>Indirecto</option><option>Ambos lado a lado</option></select>
      </div>
      <div class="form-group">
        <label>Granularidad temporal</label>
        <select><option>Mensual</option><option>Semanal</option><option>Diaria</option><option>Trimestral</option></select>
      </div>
      <div class="form-group">
        <label>Cuentas consideradas como "efectivo"</label>
        <input type="text" value="1.1.01.*, 1.1.02.*"/>
        <span class="hint">Caja, bancos y equivalentes</span>
      </div>
      <div class="form-group">
        <label>Categorización de partidas</label>
        <select><option>Por categoría de cuenta (recomendado)</option><option>Por posting rule</option><option>Manual</option></select>
      </div>
      <div class="form-group">
        <label>Conciliar con Estado de Resultados</label>
        <select><option>Sí, mostrar puente al Resultado neto (indirecto)</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Proyección a futuro</label>
        <select><option>Sin proyección</option><option>30 días</option><option>60 días</option><option>90 días</option><option>180 días</option></select>
      </div>
      <div class="form-group">
        <label>Stress test</label>
        <select><option>No</option><option>±10%</option><option>±20%</option><option>Personalizado…</option></select>
      </div>
      <div class="form-group">
        <label>Recurrencias detectadas</label>
        <select><option>Auto-detectar (sueldos, alquiler, impuestos)</option><option>Manual</option><option>No usar</option></select>
      </div>
    </div>`,

  'pn': () => `
    <h4>Evolución del PN · opciones específicas</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Ejercicios a comparar</label>
        <select><option>Últimos 2 cierres</option><option>Últimos 3 cierres</option><option>Personalizado…</option></select>
      </div>
      <div class="form-group">
        <label>Conceptos a desglosar</label>
        <select multiple size="5" style="height:auto">
          <option selected>Capital social</option>
          <option selected>Reservas legales</option>
          <option selected>Otras reservas</option>
          <option selected>Resultados acumulados</option>
          <option selected>Resultado del ejercicio</option>
          <option>Aportes irrevocables</option>
          <option>Otros resultados integrales</option>
        </select>
      </div>
      <div class="form-group">
        <label>Movimientos a mostrar</label>
        <select multiple size="5" style="height:auto">
          <option selected>Distribución de dividendos</option>
          <option selected>Pase a reservas</option>
          <option selected>Aportes/retiros de capital</option>
          <option selected>Resultado del ejercicio</option>
        </select>
      </div>
    </div>`,

  'aged-cxc': () => `
    <h4>Antigüedad CxC · buckets configurables</h4>
    <div class="form-grid">
      <div class="form-group"><label>Bucket 1 (días)</label><input type="text" value="0-30"/></div>
      <div class="form-group"><label>Bucket 2</label><input type="text" value="31-60"/></div>
      <div class="form-group"><label>Bucket 3</label><input type="text" value="61-90"/></div>
      <div class="form-group"><label>Bucket 4</label><input type="text" value="91-180"/></div>
      <div class="form-group"><label>Bucket 5</label><input type="text" value="180+"/></div>
      <div class="form-group">
        <label>Base de cálculo</label>
        <select><option>Fecha de vencimiento</option><option>Fecha de emisión</option></select>
      </div>
      <div class="form-group">
        <label>Monto mínimo a mostrar</label>
        <input type="text" placeholder="Ej. 10.000"/>
        <span class="hint">Cuentas con saldo menor se agrupan en "Otros"</span>
      </div>
      <div class="form-group">
        <label>Top N clientes</label>
        <select><option>10</option><option>20</option><option>50</option><option>Todos</option></select>
      </div>
      <div class="form-group">
        <label>Highlight automático</label>
        <select><option>Marcar +90 días en rojo</option><option>Marcar +60</option><option>Sin highlight</option></select>
      </div>
      <div class="form-group">
        <label>Considerar previsión por incobrables</label>
        <select><option>Sí, restar</option><option>No</option></select>
      </div>
    </div>`,

  'aged-cxp': () => `
    <h4>Antigüedad CxP · buckets configurables</h4>
    <div class="form-grid">
      <div class="form-group"><label>Bucket 1</label><input type="text" value="0-30"/></div>
      <div class="form-group"><label>Bucket 2</label><input type="text" value="31-60"/></div>
      <div class="form-group"><label>Bucket 3</label><input type="text" value="61-90"/></div>
      <div class="form-group"><label>Bucket 4</label><input type="text" value="91-180"/></div>
      <div class="form-group"><label>Bucket 5</label><input type="text" value="180+"/></div>
      <div class="form-group">
        <label>Base de cálculo</label>
        <select><option>Fecha de vencimiento</option><option>Fecha de emisión</option></select>
      </div>
      <div class="form-group">
        <label>Alerta por vencimientos próximos</label>
        <select><option>Sí, ≤ 5 días</option><option>Sí, ≤ 7 días</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Agrupar por</label>
        <select><option>Proveedor</option><option>Tipo (impositivo / comercial / sueldos)</option></select>
      </div>
    </div>`,

  'conciliacion': () => `
    <h4>Conciliación bancaria · matching</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Cuenta a conciliar</label>
        <select><option>1.1.02.001 Banco Galicia</option><option>1.1.02.002 Banco Macro</option><option>1.1.02.003 MercadoPago</option></select>
      </div>
      <div class="form-group">
        <label>Formato de extracto</label>
        <select><option>CSV (delimitador: ;)</option><option>OFX</option><option>API (open banking)</option><option>QIF</option></select>
      </div>
      <div class="form-group">
        <label>Tolerancia de fecha (matching)</label>
        <select><option>0 días (exacto)</option><option>±1 día</option><option>±3 días</option><option>±7 días</option></select>
      </div>
      <div class="form-group">
        <label>Tolerancia de monto</label>
        <select><option>Exacto</option><option>±1 unidad (centavos)</option><option>±0.5%</option></select>
      </div>
      <div class="form-group">
        <label>Estrategia de matching</label>
        <select><option>1-a-1 estricto</option><option>Permite agrupar (N → 1)</option><option>Permite split (1 → N)</option></select>
      </div>
      <div class="form-group">
        <label>Generar asientos automáticos para</label>
        <select><option>Comisiones e intereses bancarios</option><option>Todos los movimientos no identificados</option><option>Ninguno (manual)</option></select>
      </div>
      <div class="form-group">
        <label>Cuenta para diferencias menores</label>
        <select><option>5.9.99.001 Diferencia de redondeo</option><option>5.9.98.001 Otros gastos</option></select>
      </div>
      <div class="form-group">
        <label>Auto-conciliar al subir extracto</label>
        <select><option>Sí, todo lo matcheable</option><option>Sólo previsualizar</option></select>
      </div>
    </div>`,

  'rent-sucursal': () => `
    <h4>Rentabilidad por Sucursal</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Métricas a mostrar</label>
        <select multiple size="6" style="height:auto">
          <option selected>Ventas</option><option selected>Costos directos</option>
          <option selected>Margen bruto</option><option selected>Gastos operativos</option>
          <option selected>Resultado operativo</option><option selected>Margen %</option>
          <option>EBITDA</option><option>ROI</option>
          <option>Cantidad de transacciones</option><option>Ticket promedio</option>
        </select>
      </div>
      <div class="form-group">
        <label>Asignación de gastos comunes</label>
        <select><option>Por % de ventas</option><option>Por dotación de personal</option><option>Por superficie</option><option>Manual</option><option>No asignar</option></select>
      </div>
      <div class="form-group">
        <label>Comparativo</label>
        <select><option>Período anterior</option><option>YoY</option><option>vs Presupuesto</option><option>vs Promedio empresa</option><option>vs Mejor sucursal</option></select>
      </div>
      <div class="form-group">
        <label>Ranking visible</label>
        <select><option>Sí, con medallas</option><option>Sí, sólo posición</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Sucursales en pérdida</label>
        <select><option>Marcar en rojo</option><option>Alerta automática</option><option>Sin destacar</option></select>
      </div>
    </div>`,

  'rent-bu': () => `
    <h4>Rentabilidad por Unidad de Negocio</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Modelo de costos</label>
        <select><option>Costos directos identificables</option><option>Costeo total absorbente</option><option>Costeo variable</option><option>ABC (Activity-Based)</option></select>
      </div>
      <div class="form-group">
        <label>Asignación de gastos compartidos</label>
        <select><option>Por % de ventas</option><option>Por contribución marginal</option><option>Por driver definido por BU</option><option>No asignar</option></select>
      </div>
      <div class="form-group">
        <label>Mostrar contribución marginal</label>
        <select><option>Sí</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Métricas en radar chart</label>
        <select multiple size="5" style="height:auto">
          <option selected>Ventas</option><option selected>Margen</option>
          <option selected>Contribución</option><option selected>Eficiencia</option>
          <option>Crecimiento</option><option>Estabilidad</option>
        </select>
      </div>
    </div>`,

  'gastos': () => `
    <h4>Análisis de gastos</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Nivel de agrupación</label>
        <select><option>Por categoría (rubro)</option><option>Por cuenta hoja</option><option>Por proveedor</option><option>Por centro de costo</option></select>
      </div>
      <div class="form-group">
        <label>Umbral Pareto</label>
        <select><option>80/20</option><option>90/10</option><option>70/30</option><option>Personalizado</option></select>
      </div>
      <div class="form-group">
        <label>Detección de outliers</label>
        <select><option>Activado · 3σ</option><option>Activado · 2σ</option><option>IQR · 1.5×</option><option>Desactivado</option></select>
      </div>
      <div class="form-group">
        <label>Ventana histórica para baseline</label>
        <select><option>Últimos 6 meses</option><option>Últimos 12 meses</option><option>Mismo mes año anterior</option></select>
      </div>
      <div class="form-group">
        <label>Excluir gastos extraordinarios</label>
        <select><option>Sí (definidos por etiqueta)</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Comparar vs presupuesto</label>
        <select><option>Sí</option><option>No</option></select>
      </div>
    </div>`,

  'presupuesto': () => `
    <h4>Presupuesto vs Real</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>Versión de presupuesto</label>
        <select><option>Original (anual)</option><option>Forecast Q1</option><option>Forecast Q2</option><option>Rolling forecast</option></select>
      </div>
      <div class="form-group">
        <label>Granularidad</label>
        <select><option>Mensual</option><option>Trimestral</option><option>Anual (YTD)</option></select>
      </div>
      <div class="form-group">
        <label>Umbral verde (OK)</label>
        <input type="text" value="±5%"/>
      </div>
      <div class="form-group">
        <label>Umbral amarillo (Atención)</label>
        <input type="text" value="±15%"/>
      </div>
      <div class="form-group">
        <label>Umbral rojo (Crítico)</label>
        <input type="text" value=">15%"/>
      </div>
      <div class="form-group">
        <label>Tratamiento del signo</label>
        <select><option>Positivo siempre = bueno (auto-invertir egresos)</option><option>Real / Presupuesto literal</option></select>
      </div>
      <div class="form-group">
        <label>Mostrar forecast del cierre</label>
        <select><option>Sí, basado en tendencia</option><option>No</option></select>
      </div>
      <div class="form-group">
        <label>Apertura</label>
        <select><option>Por categoría</option><option>Por BU</option><option>Por sucursal</option><option>Matriz</option></select>
      </div>
    </div>`,

  'iva': () => `
    <h4>Reporte fiscal IVA</h4>
    <div class="form-grid">
      <div class="form-group">
        <label>País / regulación</label>
        <select><option>Argentina (AFIP RG 1361 / CITI)</option><option>Brasil (SPED)</option><option>México (CFDI / SAT)</option><option>Colombia (DIAN)</option></select>
      </div>
      <div class="form-group">
        <label>Período fiscal</label>
        <select><option>Mensual</option><option>Bimestral (monotributo)</option><option>Cuatrimestral</option></select>
      </div>
      <div class="form-group">
        <label>Tipos de comprobante</label>
        <select multiple size="5" style="height:auto">
          <option selected>Factura A</option><option selected>Factura B</option><option selected>Factura C</option>
          <option selected>Nota de Crédito A/B/C</option><option selected>Nota de Débito A/B/C</option>
          <option>Comprobante M</option><option>Recibo</option><option>Liquidación</option>
        </select>
      </div>
      <div class="form-group">
        <label>Alícuotas a discriminar</label>
        <select multiple size="4" style="height:auto">
          <option selected>21%</option><option selected>10.5%</option>
          <option selected>27%</option><option>5%</option><option>2.5%</option><option>Exento</option>
        </select>
      </div>
      <div class="form-group">
        <label>Percepciones / retenciones</label>
        <select><option>Incluir desglose</option><option>Sólo total</option><option>Excluir</option></select>
      </div>
      <div class="form-group">
        <label>Formato de export</label>
        <select><option>CITI Ventas (TXT)</option><option>CITI Compras (TXT)</option><option>Sicore</option><option>Excel libro IVA</option></select>
      </div>
      <div class="form-group">
        <label>Validaciones AFIP automáticas</label>
        <select><option>Activadas (CUIT, CAE, importes)</option><option>Sólo aviso</option><option>Desactivadas</option></select>
      </div>
      <div class="form-group">
        <label>Conciliar con asientos contables</label>
        <select><option>Sí, mostrar diferencias</option><option>No</option></select>
      </div>
    </div>`,
};

function tabSchedule(key) {
  return `
    <div class="tab-content" data-tab="schedule">
      <div class="form-section">
        <h4>Programación automática</h4>
        <label class="toggle">
          <input type="checkbox" id="schedEnabled"/>
          <div class="info">
            <div class="t">Generar este reporte automáticamente</div>
            <div class="d">Si se activa, el reporte se genera y distribuye según la programación.</div>
          </div>
        </label>

        <div class="form-grid" style="margin-top:14px">
          <div class="form-group">
            <label>Frecuencia</label>
            <select>
              <option>Diaria</option><option>Semanal</option>
              <option selected>Mensual</option>
              <option>Trimestral</option><option>Anual</option>
              <option>Al cierre de período</option>
              <option>Cron personalizado</option>
            </select>
          </div>
          <div class="form-group">
            <label>Día / hora</label>
            <input type="text" value="Día 5 del mes a las 09:00"/>
          </div>
          <div class="form-group">
            <label>Cron expression (avanzado)</label>
            <input type="text" class="code" value="0 9 5 * *" placeholder="0 9 5 * *"/>
            <span class="hint">Notación cron estándar (UTC)</span>
          </div>
          <div class="form-group">
            <label>Zona horaria</label>
            <select><option>America/Argentina/Buenos_Aires</option><option>America/Sao_Paulo</option><option>UTC</option></select>
          </div>
          <div class="form-group">
            <label>Si falla la generación</label>
            <select><option>Reintentar 3 veces y notificar</option><option>Sólo notificar</option><option>Silencioso</option></select>
          </div>
          <div class="form-group">
            <label>Snapshot histórico</label>
            <select><option>Guardar copia inmutable de cada ejecución</option><option>Sólo última versión</option><option>No guardar</option></select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Próximas ejecuciones</h4>
        <table class="table">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Destinatarios</th></tr></thead>
          <tbody>
            <tr><td>2026-05-05</td><td>09:00</td><td><span class="tag ok">Programada</span></td><td>3</td></tr>
            <tr><td>2026-06-05</td><td>09:00</td><td><span class="tag ok">Programada</span></td><td>3</td></tr>
            <tr><td>2026-07-05</td><td>09:00</td><td><span class="tag ok">Programada</span></td><td>3</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function tabDistrib(key) {
  return `
    <div class="tab-content" data-tab="distrib">
      <div class="form-section">
        <h4>Formato de salida</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Formatos a generar</label>
            <select multiple size="5" style="height:auto">
              <option selected>PDF</option><option selected>Excel (.xlsx)</option>
              <option>CSV</option><option>JSON</option><option>HTML email</option><option>Markdown</option>
            </select>
          </div>
          <div class="form-group">
            <label>Plantilla de PDF</label>
            <select><option>Default</option><option>Corporate (con logo)</option><option>Minimalista</option><option>Personalizada…</option></select>
          </div>
          <div class="form-group">
            <label>Tamaño de página</label>
            <select><option>A4 vertical</option><option>A4 horizontal</option><option>Carta</option><option>Legal</option></select>
          </div>
          <div class="form-group">
            <label>Marca de agua</label>
            <select><option>Sin marca</option><option>"Borrador"</option><option>"Confidencial"</option><option>Personalizada</option></select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Destinatarios</h4>
        <label class="toggle">
          <input type="checkbox" checked/>
          <div class="info"><div class="t">Email</div><div class="d">cfo@acme.com, contador@acme.com, +2 más</div></div>
        </label>
        <label class="toggle">
          <input type="checkbox"/>
          <div class="info"><div class="t">Slack</div><div class="d">Canal #finanzas</div></div>
        </label>
        <label class="toggle">
          <input type="checkbox"/>
          <div class="info"><div class="t">Teams</div><div class="d">Canal Finanzas General</div></div>
        </label>
        <label class="toggle">
          <input type="checkbox"/>
          <div class="info"><div class="t">Webhook</div><div class="d">https://api.acme.com/reports/inbox (firmado HMAC)</div></div>
        </label>
        <label class="toggle">
          <input type="checkbox"/>
          <div class="info"><div class="t">Drive / SharePoint</div><div class="d">Subir a /Finanzas/Reportes/{año}/{mes}/</div></div>
        </label>

        <div class="form-grid" style="margin-top:14px">
          <div class="form-group">
            <label>Asunto del email</label>
            <input type="text" value="${key} · {{period}} · ACME S.A."/>
            <span class="hint">Variables: {{period}}, {{date}}, {{company}}</span>
          </div>
          <div class="form-group">
            <label>Cuerpo del email</label>
            <textarea rows="3">Adjuntamos el reporte correspondiente al período {{period}}.</textarea>
          </div>
        </div>
      </div>
    </div>`;
}

function tabPermisos(key) {
  return `
    <div class="tab-content" data-tab="permisos">
      <div class="form-section">
        <h4>Quién puede ver este reporte</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Roles permitidos</label>
            <select multiple size="5" style="height:auto">
              <option selected>Admin contable</option>
              <option selected>Aprobador</option>
              <option selected>Auditor (read-only)</option>
              <option>Operador</option>
              <option>Integrator (API)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Usuarios específicos adicionales</label>
            <input type="text" placeholder="email@empresa.com, ..."/>
          </div>
          <div class="form-group">
            <label>Restringir por sucursal</label>
            <select><option>No restringir</option><option>Sólo sucursal del usuario</option><option>Selección manual</option></select>
          </div>
          <div class="form-group">
            <label>Restringir por BU</label>
            <select><option>No restringir</option><option>Sólo BU del usuario</option><option>Selección manual</option></select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>Datos sensibles</h4>
        <div style="display:flex; flex-direction:column; gap:10px">
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Enmascarar datos sensibles</div><div class="d">Tax IDs, datos bancarios, etc. aparecen como ***</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox" checked/>
            <div class="info"><div class="t">Marca de auditoría visible</div><div class="d">Quién y cuándo ejecutó el reporte aparece en el footer</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Requerir 2FA para descargar</div><div class="d">Sólo cuando el reporte se exporta</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox"/>
            <div class="info"><div class="t">Marca de agua con email del usuario</div><div class="d">Disuasivo de filtraciones</div></div>
          </label>
        </div>
      </div>
    </div>`;
}

function tabTemplates(key) {
  return `
    <div class="tab-content" data-tab="templates">
      <div class="form-section">
        <h4>Plantillas guardadas (saved views)</h4>
        <p class="muted" style="font-size:12px; margin-top:0">Cada usuario puede tener múltiples vistas del mismo reporte con configuraciones distintas.</p>
        <table class="table">
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Owner</th><th>Programado</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Default · ${key}</strong></td>
              <td class="muted">Configuración base del sistema</td>
              <td>sistema</td>
              <td><span class="tag muted">no</span></td>
              <td><button class="btn btn-ghost">Aplicar</button></td>
            </tr>
            <tr>
              <td><strong>${key} · Mensual al CFO</strong></td>
              <td class="muted">Con comparativo YoY y formato corporate</td>
              <td>leonardo.mercado</td>
              <td><span class="tag ok">día 5 mensual</span></td>
              <td><button class="btn btn-ghost">Aplicar</button> <button class="btn btn-ghost">Editar</button></td>
            </tr>
            <tr>
              <td><strong>${key} · Auditor externo</strong></td>
              <td class="muted">Read-only sin destinatarios automáticos</td>
              <td>contador@acme</td>
              <td><span class="tag muted">no</span></td>
              <td><button class="btn btn-ghost">Aplicar</button></td>
            </tr>
            <tr>
              <td><strong>${key} · Junta directiva</strong></td>
              <td class="muted">Trimestral con análisis ejecutivo</td>
              <td>cfo@acme</td>
              <td><span class="tag ok">trimestral</span></td>
              <td><button class="btn btn-ghost">Aplicar</button></td>
            </tr>
          </tbody>
        </table>
        <button class="btn" style="margin-top:12px">+ Nueva plantilla a partir de esta config</button>
      </div>

      <div class="form-section">
        <h4>Compartir esta plantilla</h4>
        <div class="form-grid">
          <div class="form-group">
            <label>Visibilidad</label>
            <select><option>Privada (sólo yo)</option><option>Equipo (admin contable + aprobadores)</option><option>Toda la empresa</option></select>
          </div>
          <div class="form-group">
            <label>Permitir editar</label>
            <select><option>Sólo el owner</option><option>Owner + admin</option><option>Cualquiera con acceso</option></select>
          </div>
        </div>
      </div>
    </div>`;
}

// ───── ONBOARDING WIZARD ─────
let onboardingState = {
  step: 1,
  mode: null,         // 'greenfield' | 'bootstrap' | 'federated'
  adapters: {
    company:       'local',
    branches:      'hybrid',
    businessUnits: 'hybrid',
    currencies:    'hybrid',
    users:         'federated',
    roles:         'federated',
    customers:     'federated',
    suppliers:     'federated',
  },
  erpPayload: {
    erp: 'SAP Business One',
    tenant: 'tenant-acme-2026',
    company: { legalName: 'ACME S.A.', taxId: '30-71234567-9', country: 'AR', regime: 'Responsable Inscripto' },
    branches: [
      { code:'CABA',    name:'Casa central CABA',    city:'Buenos Aires', country:'AR' },
      { code:'ROS',     name:'Sucursal Rosario',      city:'Rosario',      country:'AR' },
      { code:'MZA',     name:'Sucursal Mendoza',      city:'Mendoza',      country:'AR' },
      { code:'ONLINE',  name:'Canal Online',          city:'-',            country:'AR' },
    ],
    businessUnits: [
      { code:'RETAIL',  name:'Retail' },
      { code:'WHOLE',   name:'Mayorista' },
      { code:'ONLINE',  name:'Online' },
      { code:'SERV',    name:'Servicios' },
    ],
    currencies: [
      { code:'ARS', name:'Peso Argentino', isFunctional:true },
      { code:'USD', name:'Dólar' },
      { code:'BRL', name:'Real Brasileño' },
    ],
    users: [
      { email:'leonardo.mercado@acme.com', name:'Leonardo Mercado', role:'admin' },
      { email:'maria.lopez@acme.com',      name:'María López',      role:'operador' },
      { email:'cfo@acme.com',              name:'Carlos Fernández', role:'aprobador' },
      { email:'auditor@externo.com',       name:'Auditor Externo',  role:'auditor' },
    ],
    eventsCatalog: [
      { event:'erp.invoice.created',       count:'~1.200/mes', suggested:'SALE_VAT_21' },
      { event:'erp.invoice.exempt',        count:'~80/mes',    suggested:'SALE_EXEMPT' },
      { event:'erp.bill.received',         count:'~400/mes',   suggested:'PURCHASE_VAT_21' },
      { event:'erp.payment.received',      count:'~900/mes',   suggested:'PAYMENT_RCV' },
      { event:'erp.payment.sent',          count:'~350/mes',   suggested:'PAYMENT_OUT' },
      { event:'erp.payroll.run',           count:'1/mes',      suggested:'PAYROLL_RUN' },
      { event:'erp.inventory.adjustment',  count:'~50/mes',    suggested:'INVENTORY_ADJ' },
      { event:'erp.fx.revaluation',        count:'1/mes',      suggested:'FX_REVALUATION' },
    ],
  },
};

function setOnboardingStep(step) {
  if (step < 1 || step > 7) return;
  onboardingState.step = step;
  renderOnboarding();
}

function setOnboardingMode(mode) {
  onboardingState.mode = mode;
  // adapter defaults por modo
  if (mode === 'greenfield') {
    onboardingState.adapters = { company:'local', branches:'local', businessUnits:'local', currencies:'local',
      users:'local', roles:'local', customers:'local', suppliers:'local' };
  } else if (mode === 'bootstrap') {
    onboardingState.adapters = { company:'local', branches:'hybrid', businessUnits:'hybrid', currencies:'hybrid',
      users:'hybrid', roles:'hybrid', customers:'hybrid', suppliers:'hybrid' };
  } else if (mode === 'federated') {
    onboardingState.adapters = { company:'federated', branches:'federated', businessUnits:'federated', currencies:'federated',
      users:'federated', roles:'federated', customers:'federated', suppliers:'federated' };
  }
  renderOnboarding();
}

function setAdapter(entity, value) {
  onboardingState.adapters[entity] = value;
  renderOnboarding();
}

function renderOnboarding() {
  const s = onboardingState.step;
  const stepName = ['','Modo de instalación','Datos de empresa','Estructura organizacional','Plan de cuentas','Posting Rules','Identidad y permisos','Verificación'][s];

  view.innerHTML = `
    <div class="wizard-shell">
      <div class="page-header">
        <div>
          <h1 class="page-title">🚀 Onboarding · ${stepName}</h1>
          <div class="page-sub">Configurar la contabilidad de un nuevo cliente · paso ${s} de 7</div>
        </div>
        <div class="toolbar">
          <button class="btn">Guardar borrador</button>
          ${s>1?`<button class="btn" onclick="setOnboardingStep(${s-1})">← Atrás</button>`:''}
          ${s<7?`<button class="btn btn-primary" onclick="setOnboardingStep(${s+1})">Siguiente →</button>`:`<button class="btn btn-primary" onclick="alert('Onboarding completado · cliente operativo')">✓ Finalizar</button>`}
        </div>
      </div>

      <div class="wizard-steps">
        ${[1,2,3,4,5,6,7].map(i => {
          const labels = ['Modo','Empresa','Organización','Plan cuentas','Posting Rules','Identidad','Verificación'];
          const cls = i===s ? 'active' : i<s ? 'done' : '';
          return `<div class="wstep ${cls}" onclick="setOnboardingStep(${i})" style="cursor:pointer">
            <span class="num">${i<s?'✓':i}</span>${labels[i-1]}</div>`;
        }).join('')}
      </div>

      ${s===1 ? renderStep1Mode() : ''}
      ${s===2 ? renderStep2Company() : ''}
      ${s===3 ? renderStep3Org() : ''}
      ${s===4 ? renderStep4COA() : ''}
      ${s===5 ? renderStep5Rules() : ''}
      ${s===6 ? renderStep6Identity() : ''}
      ${s===7 ? renderStep7Verify() : ''}
    </div>
  `;
}

// ── PASO 1: Modo de instalación
function renderStep1Mode() {
  const m = onboardingState.mode;
  return `
    <div class="panel">
      <h3>¿Cómo querés inicializar Conta?</h3>
      <p class="muted" style="margin-top:0">Elegí el modo que mejor se adapta al cliente. Podés cambiar adapters individuales en el siguiente paso.</p>

      <div class="mode-grid">
        <div class="mode-card ${m==='greenfield'?'selected':''}" onclick="setOnboardingMode('greenfield')">
          <div class="mode-icon">🌱</div>
          <h3>Greenfield</h3>
          <div class="tagline">Cliente nuevo, sin sistemas previos</div>
          <ul>
            <li>Carga manual o template por país</li>
            <li>Conta es la fuente de verdad de todo</li>
            <li>Usuarios y roles locales</li>
            <li>Ideal para microempresas y PyMEs</li>
            <li>Onboarding en ~30 min</li>
          </ul>
        </div>

        <div class="mode-card ${m==='bootstrap'?'selected':''}" onclick="setOnboardingMode('bootstrap')">
          <div class="mode-icon">📦</div>
          <h3>Bootstrap desde ERP <span class="recommended">Recomendado</span></h3>
          <div class="tagline">El ERP envía los datos iniciales una sola vez</div>
          <ul>
            <li>ERP dispara <span class="kbd">accounting.install</span> con seed</li>
            <li>Conta importa empresa, BU, sucursales, usuarios</li>
            <li>Datos editables localmente luego del bootstrap</li>
            <li>Sync periódico opcional</li>
            <li>Ideal para empresas medianas y grandes</li>
          </ul>
        </div>

        <div class="mode-card ${m==='federated'?'selected':''}" onclick="setOnboardingMode('federated')">
          <div class="mode-icon">🔗</div>
          <h3>Federado</h3>
          <div class="tagline">Conta consume del ERP en runtime</div>
          <ul>
            <li>Conta no almacena BU, sucursales ni usuarios</li>
            <li>Cada query consulta al ERP (con cache)</li>
            <li>OIDC federado: una sola identidad</li>
            <li>Cero divergencia, máxima consistencia</li>
            <li>Ideal para corporaciones con ERP mature</li>
          </ul>
        </div>
      </div>

      ${m === 'bootstrap' ? `
        <div class="panel" style="margin-top:20px; background: var(--bg-2)">
          <h3>📥 Payload recibido del ERP</h3>
          <p class="muted" style="font-size:12px">El ERP envió este evento <span class="kbd">accounting.install</span>. Vamos a procesarlo en los siguientes pasos.</p>
          <pre class="code">POST /api/v1/install
Source: ${onboardingState.erpPayload.erp}
Idempotency-Key: ${onboardingState.erpPayload.tenant}
{
  "tenant":  "${onboardingState.erpPayload.tenant}",
  "company": { "legalName": "${onboardingState.erpPayload.company.legalName}", ... },
  "branches":      [ ${onboardingState.erpPayload.branches.length} items ],
  "businessUnits": [ ${onboardingState.erpPayload.businessUnits.length} items ],
  "currencies":    [ ${onboardingState.erpPayload.currencies.length} items ],
  "users":         [ ${onboardingState.erpPayload.users.length} items ],
  "eventsCatalog": [ ${onboardingState.erpPayload.eventsCatalog.length} triggers detectados ]
}</pre>
        </div>` : ''}

      ${m === 'federated' ? `
        <div class="panel" style="margin-top:20px; background: var(--bg-2)">
          <h3>🔗 Conexión federada</h3>
          <div class="form-grid">
            <div class="form-group"><label>Endpoint base del ERP</label><input type="text" value="https://erp.acme.com/api/v1"/></div>
            <div class="form-group"><label>Auth</label><select><option>OAuth2 Client Credentials</option><option>API Key</option><option>mTLS</option></select></div>
            <div class="form-group"><label>Cache TTL para datos federados</label><select><option>5 min</option><option>15 min</option><option>1 h</option></select></div>
            <div class="form-group"><label>Modo de fallback</label><select><option>Cache en memoria si ERP no responde</option><option>Devolver error</option></select></div>
          </div>
          <button class="btn" style="margin-top:12px">Probar conexión</button>
        </div>` : ''}

      <div class="alert info" style="margin-top:20px">
        <div class="ico">💡</div>
        <div class="body">
          <div class="t">No tenés que elegir uno solo</div>
          <div class="d">En el siguiente paso vas a poder elegir adapter por entidad: por ejemplo, traer las sucursales en modo Hybrid pero los usuarios en modo Federado.</div>
        </div>
      </div>
    </div>`;
}

// ── PASO 2: Datos de empresa
function renderStep2Company() {
  const c = onboardingState.erpPayload.company;
  const fromErp = onboardingState.mode !== 'greenfield';
  return `
    <div class="grid-2">
      <div class="panel">
        <h3>Datos legales</h3>
        ${fromErp ? `<div class="alert info"><div class="ico">📥</div><div class="body"><div class="t">Pre-cargado desde ERP</div><div class="d">Editable. Cambios quedan en Conta y se notifican al ERP.</div></div></div>` : ''}
        <div class="form-grid full">
          <div class="form-group"><label>Razón social <span class="req">*</span></label><input type="text" value="${c.legalName}"/></div>
          <div class="form-group"><label>Nombre fantasía</label><input type="text" value="ACME"/></div>
          <div class="form-group"><label>Tax ID (CUIT) <span class="req">*</span></label><input type="text" class="code" value="${c.taxId}"/><span class="hint">Se almacena con Always Encrypted</span></div>
          <div class="form-group"><label>Régimen fiscal</label><select><option>${c.regime}</option><option>Monotributo</option><option>Exento</option></select></div>
          <div class="form-group"><label>País sede <span class="req">*</span></label><select><option>🇦🇷 Argentina</option><option>🇧🇷 Brasil</option><option>🇲🇽 México</option></select></div>
          <div class="form-group"><label>Domicilio fiscal</label><input type="text" value="Av. Corrientes 1234, CABA"/></div>
        </div>
      </div>

      <div class="panel">
        <h3>Configuración contable inicial</h3>
        <div class="form-grid full">
          <div class="form-group"><label>Moneda funcional <span class="req">*</span></label><select><option>ARS · Peso Argentino</option><option>USD</option><option>BRL</option></select><span class="hint">Moneda en la que se llevan los EECC</span></div>
          <div class="form-group"><label>Inicio del ejercicio fiscal</label><select><option>1 de enero (anual)</option><option>1 de julio</option><option>Personalizado</option></select></div>
          <div class="form-group"><label>Granularidad de períodos</label><select><option>Mensual (12)</option><option>Trimestral (4)</option><option>Cuatrimestral (3)</option></select></div>
          <div class="form-group"><label>Plantilla de plan de cuentas sugerida</label><select><option>🇦🇷 Argentina · PyME (RT 9) — recomendada</option><option>🇦🇷 Argentina · Corporativa (NIIF)</option><option>Vacío (cargar desde cero)</option></select></div>
          <div class="form-group"><label>Proveedor de tipos de cambio</label><select><option>BCRA (oficial)</option><option>Manual</option><option>fixer.io</option></select></div>
          <div class="form-group"><label>Doble aprobación en cierres</label><select><option>Activada (recomendada)</option><option>Desactivada</option></select></div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top: 20px">
      <h3>🔌 Cómo van a coexistir Conta y el ERP</h3>
      <div class="flow-diagram">${getFlowDiagram()}</div>
    </div>`;
}

function getFlowDiagram() {
  const m = onboardingState.mode;
  if (m === 'greenfield') return `
ERP: <none>                             Conta (fuente de verdad)
                                          ┌──────────────┐
                                          │ Empresa      │
                                          │ BU/Sucursal  │
                                          │ Usuarios     │
                                          │ Plan cuentas │
                                          │ Asientos     │
                                          └──────────────┘`;
  if (m === 'bootstrap') return `
ERP                                       Conta
┌─────────────────┐  install (one-shot)   ┌──────────────────────┐
│ Empresa         │ ─────────────────────►│ Empresa (copia)      │
│ BU/Sucursal     │ ─────────────────────►│ BU/Sucursal (copia)  │
│ Usuarios/Roles  │ ─────────────────────►│ Usuarios (copia)     │
└─────────────────┘                       │ Plan cuentas (LOCAL) │
                                          │ Posting Rules (LOCAL)│
                                          │ Asientos (LOCAL)     │
ERP eventos de negocio:                   └──────────────────────┘
  invoice.created  ─────────────────────► postea via Posting Rule
  payment.received ─────────────────────► postea via Posting Rule
  payroll.run      ─────────────────────► postea via Posting Rule

Sync periódico opcional (si datos cambian en ERP):
  ERP webhook 'branch.updated' ─────────► Conta actualiza copia`;

  if (m === 'federated') return `
ERP (fuente de verdad)                    Conta
┌─────────────────┐                       ┌──────────────────────┐
│ Empresa         │ ◄─── consultas ──────│ FederatedAdapter     │
│ BU/Sucursal     │ ◄─── runtime ────────│ (cache 5min)         │
│ Usuarios/Roles  │ ◄─── OIDC SSO ───────│ JWT compartido       │
└─────────────────┘                       │                      │
                                          │ Plan cuentas (LOCAL) │
                                          │ Posting Rules (LOCAL)│
ERP eventos de negocio:                   │ Asientos (LOCAL)     │
  invoice.created  ─────────────────────► postea via Posting Rule
  payment.received ─────────────────────► (Conta NO duplica nada)`;
  return 'Seleccioná un modo en el paso 1.';
}

// ── PASO 3: Estructura organizacional + adapter por entidad
function renderStep3Org() {
  const p = onboardingState.erpPayload;
  const adapterRow = (key, icon, label, desc, available='all') => `
    <div class="adapter-row">
      <div class="entity"><span class="icon">${icon}</span>${label}</div>
      <div class="desc">${desc}</div>
      <select onchange="setAdapter('${key}', this.value)" value="${onboardingState.adapters[key]}">
        ${available==='no-fed' ? '' : `<option value="federated" ${onboardingState.adapters[key]==='federated'?'selected':''}>🔗 Federado (consume del ERP)</option>`}
        <option value="hybrid"     ${onboardingState.adapters[key]==='hybrid'?'selected':''}>🔄 Híbrido (copia + sync)</option>
        <option value="local"      ${onboardingState.adapters[key]==='local'?'selected':''}>💾 Local (sólo Conta)</option>
      </select>
    </div>`;

  return `
    <div class="panel">
      <h3>Adapter por entidad</h3>
      <p class="muted" style="margin-top:0">Definí cómo Conta va a manejar cada tipo de dato. Lo contable (asientos, plan de cuentas, periodos) siempre vive en Conta.</p>

      ${adapterRow('company', '🏢', 'Empresa', 'Datos legales: razón social, CUIT, domicilio')}
      ${adapterRow('branches', '🏪', 'Sucursales', 'Casas / canales / puntos de venta', 'all')}
      ${adapterRow('businessUnits', '📊', 'Unidades de negocio', 'Líneas de negocio (Retail, Mayorista, Online)', 'all')}
      ${adapterRow('currencies', '💱', 'Monedas', 'Catálogo y tipos de cambio')}
      ${adapterRow('users', '👤', 'Usuarios', 'Cuentas de acceso al sistema')}
      ${adapterRow('roles', '🔐', 'Roles y permisos', 'Mapeo de roles ERP → roles Conta')}
      ${adapterRow('customers', '👥', 'Clientes (CxC)', 'Maestro de clientes para conciliación')}
      ${adapterRow('suppliers', '🚚', 'Proveedores (CxP)', 'Maestro de proveedores')}

      <div class="alert info" style="margin-top:14px">
        <div class="ico">💡</div>
        <div class="body">
          <div class="t">Tip: combinaciones más comunes</div>
          <div class="d">Empresa <em>local</em> + Sucursales/BU <em>híbrido</em> + Usuarios/Roles <em>federado</em>. Te permite editar la estructura organizacional desde Conta sin perder identidad unificada.</div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>Sucursales recibidas del ERP <span class="muted" style="font-weight:400; font-size:13px">(${p.branches.length})</span></h3>
        <p class="muted" style="font-size:12px; margin-top:0">Modo: <strong>${onboardingState.adapters.branches}</strong></p>
        <table class="table">
          <thead><tr><th></th><th>Código ERP</th><th>Nombre</th><th>Ciudad</th><th>Importar</th></tr></thead>
          <tbody>
            ${p.branches.map(b=>`<tr>
              <td>🏪</td>
              <td><span class="kbd">${b.code}</span></td>
              <td>${b.name}</td>
              <td class="muted">${b.city}</td>
              <td><label class="toggle" style="padding:4px 8px"><input type="checkbox" checked/></label></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Unidades de negocio <span class="muted" style="font-weight:400; font-size:13px">(${p.businessUnits.length})</span></h3>
        <p class="muted" style="font-size:12px; margin-top:0">Modo: <strong>${onboardingState.adapters.businessUnits}</strong></p>
        <table class="table">
          <thead><tr><th></th><th>Código ERP</th><th>Nombre</th><th>Importar</th></tr></thead>
          <tbody>
            ${p.businessUnits.map(b=>`<tr>
              <td>📊</td>
              <td><span class="kbd">${b.code}</span></td>
              <td>${b.name}</td>
              <td><label class="toggle" style="padding:4px 8px"><input type="checkbox" checked/></label></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Monedas <span class="muted" style="font-weight:400; font-size:13px">(${p.currencies.length})</span></h3>
      <table class="table">
        <thead><tr><th>Código</th><th>Nombre</th><th>Funcional</th><th>Tipo de cambio</th><th>Importar</th></tr></thead>
        <tbody>
          ${p.currencies.map(c=>`<tr>
            <td><span class="kbd">${c.code}</span></td>
            <td>${c.name}</td>
            <td>${c.isFunctional?'<span class="tag ok">funcional</span>':'<span class="tag muted">extranjera</span>'}</td>
            <td class="muted">BCRA · sync diario</td>
            <td><label class="toggle" style="padding:4px 8px"><input type="checkbox" checked/></label></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── PASO 4: Plan de cuentas
function renderStep4COA() {
  return `
    <div class="grid-2">
      <div class="panel">
        <h3>Plantilla base</h3>
        <p class="muted" style="margin-top:0">El ERP no envía plan de cuentas (es contable, no operativo). Elegí una plantilla que se adapte al cliente.</p>
        <div style="display:flex; flex-direction:column; gap:8px">
          <label class="toggle"><input type="radio" name="coa" checked/>
            <div class="info"><div class="t">🇦🇷 Argentina · PyME (RT 9)</div><div class="d">82 cuentas · IVA 21% · Mono y RI</div></div></label>
          <label class="toggle"><input type="radio" name="coa"/>
            <div class="info"><div class="t">🇦🇷 Argentina · Corporativa (NIIF/CONTAB)</div><div class="d">220 cuentas · multi-moneda · ORI</div></div></label>
          <label class="toggle"><input type="radio" name="coa"/>
            <div class="info"><div class="t">🇧🇷 Brasil · Lucro Real (SPED)</div><div class="d">ICMS / PIS / COFINS · IRPJ / CSLL</div></div></label>
          <label class="toggle"><input type="radio" name="coa"/>
            <div class="info"><div class="t">🇲🇽 México · CFDI / SAT</div><div class="d">Catálogo SAT · ISR/IVA</div></div></label>
          <label class="toggle"><input type="radio" name="coa"/>
            <div class="info"><div class="t">⚪ Vacío</div><div class="d">Cargar desde cero o importar CSV</div></div></label>
        </div>
        <button class="btn" style="margin-top:12px">📤 Importar desde CSV / Excel</button>
      </div>

      <div class="panel">
        <h3>Mapeo automático con datos del ERP</h3>
        <p class="muted" style="margin-top:0">Conta puede sugerir asignaciones inferidas del catálogo del ERP.</p>
        <table class="table">
          <thead><tr><th>Concepto ERP</th><th>Cuenta sugerida</th><th>Confianza</th></tr></thead>
          <tbody>
            <tr><td>Cuenta bancaria #001 (Galicia)</td><td><span class="kbd">1.1.02.001</span> Banco Galicia</td><td><span class="tag ok">98%</span></td></tr>
            <tr><td>Cuenta bancaria #002 (Macro)</td><td><span class="kbd">1.1.02.002</span> Banco Macro</td><td><span class="tag ok">95%</span></td></tr>
            <tr><td>MercadoPago wallet</td><td><span class="kbd">1.1.02.003</span> MercadoPago</td><td><span class="tag ok">92%</span></td></tr>
            <tr><td>Categoría "Sueldos"</td><td><span class="kbd">5.3.01.001</span> Sueldos y jornales</td><td><span class="tag ok">90%</span></td></tr>
            <tr><td>Categoría "Marketing digital"</td><td>⚠️ Sin sugerencia</td><td><span class="tag warn">manual</span></td></tr>
            <tr><td>Tipo de cliente "Mayorista"</td><td><span class="kbd">4.1.01.002</span> Ventas mayorista</td><td><span class="tag ok">85%</span></td></tr>
          </tbody>
        </table>
        <button class="btn btn-primary" style="margin-top:12px">Aplicar sugerencias</button>
        <button class="btn" style="margin-top:12px; margin-left:8px">Revisar manualmente</button>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Preview del plan de cuentas inicial</h3>
      <div class="tree" style="max-height: 280px; overflow-y: auto">
        <div class="node l1"><span>📁</span><span class="kbd">1</span><span>ACTIVO</span></div>
        <div class="node l2"><span>📁</span><span class="kbd">1.1</span><span>Activo Corriente</span></div>
        <div class="node l3"><span>📁</span><span class="kbd">1.1.01</span><span>Caja y bancos</span></div>
        <div class="node l4"><span>📄</span><span class="kbd">1.1.01.001</span><span>Caja general</span></div>
        <div class="node l4"><span>📄</span><span class="kbd">1.1.02.001</span><span>Banco Galicia</span><span class="bus-tag synced">desde ERP</span></div>
        <div class="node l4"><span>📄</span><span class="kbd">1.1.02.002</span><span>Banco Macro</span><span class="bus-tag synced">desde ERP</span></div>
        <div class="node l4"><span>📄</span><span class="kbd">1.1.02.003</span><span>MercadoPago</span><span class="bus-tag synced">desde ERP</span></div>
        <div class="node l1"><span>📁</span><span class="kbd">2</span><span>PASIVO</span></div>
        <div class="node l1"><span>📁</span><span class="kbd">3</span><span>PATRIMONIO NETO</span></div>
        <div class="node l1"><span>📁</span><span class="kbd">4</span><span>INGRESOS</span></div>
        <div class="node l1"><span>📁</span><span class="kbd">5</span><span>EGRESOS</span></div>
      </div>
      <p class="muted" style="font-size:12px; margin-top:10px">82 cuentas serán creadas · 6 mapeadas desde ERP · podrás editarlas en cualquier momento.</p>
    </div>`;
}

// ── PASO 5: Posting Rules
function renderStep5Rules() {
  const p = onboardingState.erpPayload;
  return `
    <div class="panel">
      <h3>Mapeo de eventos del ERP → Posting Rules</h3>
      <p class="muted" style="margin-top:0">El ERP detectó estos eventos en su catálogo. Conta sugiere una regla por cada uno; podés editarla, deshabilitarla o crear nuevas.</p>
      <table class="table">
        <thead><tr><th>Evento ERP</th><th>Volumen estimado</th><th>Regla sugerida</th><th>Ajustar</th><th>Estado</th></tr></thead>
        <tbody>
          ${p.eventsCatalog.map(e=>`<tr>
            <td><span class="kbd">${e.event}</span></td>
            <td class="muted">${e.count}</td>
            <td><span class="kbd">${e.suggested}</span></td>
            <td><button class="btn btn-ghost">Editar</button> <button class="btn btn-ghost">Dry-run</button></td>
            <td><label class="toggle" style="padding:4px 8px"><input type="checkbox" checked/></label></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>🧪 Test de integración</h3>
        <p class="muted" style="margin-top:0">Antes de habilitar el flujo en producción, ejecutamos un dry-run con datos reales del ERP.</p>
        <div style="display:flex; flex-direction:column; gap:8px">
          <div class="health-row"><div class="name">✓ erp.invoice.created</div><div class="meta">10/10 dry-runs balanceados</div></div>
          <div class="health-row"><div class="name">✓ erp.bill.received</div><div class="meta">10/10 dry-runs balanceados</div></div>
          <div class="health-row"><div class="name">⚠️ erp.payment.received</div><div class="meta">9/10 OK · 1 con cuenta no encontrada</div></div>
          <div class="health-row"><div class="name">✓ erp.payroll.run</div><div class="meta">3/3 dry-runs balanceados</div></div>
        </div>
        <button class="btn btn-primary" style="margin-top:12px">▶ Ejecutar dry-run masivo</button>
      </div>

      <div class="panel">
        <h3>🔁 Backfill histórico</h3>
        <p class="muted" style="margin-top:0">Si el ERP tiene operaciones anteriores, podés contabilizarlas retroactivamente.</p>
        <div class="form-grid full">
          <div class="form-group">
            <label>Período a importar</label>
            <select><option>Sólo desde hoy en adelante (recomendado)</option><option>Últimos 3 meses</option><option>Ejercicio en curso</option><option>Todo el histórico</option></select>
          </div>
          <div class="form-group">
            <label>Modo de procesamiento</label>
            <select><option>Asíncrono (background)</option><option>Síncrono (espera completar)</option></select>
            <span class="hint">Backfill de 1 año = ~14k asientos · ~3 minutos</span>
          </div>
          <div class="form-group">
            <label>Si hay errores</label>
            <select><option>Continuar y reportar al final</option><option>Detener al primer error</option></select>
          </div>
        </div>
      </div>
    </div>`;
}

// ── PASO 6: Identidad y permisos
function renderStep6Identity() {
  const p = onboardingState.erpPayload;
  const fed = onboardingState.adapters.users === 'federated';
  return `
    <div class="panel">
      <h3>Estrategia de identidad</h3>
      <div class="mode-grid">
        <div class="mode-card ${fed?'selected':''}" onclick="setAdapter('users','federated')">
          <div class="mode-icon">🔗</div>
          <h3>Federada (SSO con ERP)</h3>
          <ul>
            <li>Mismo login que el ERP</li>
            <li>OIDC / SAML</li>
            <li>Roles ERP → roles Conta vía mapping</li>
            <li>Cero usuarios duplicados</li>
          </ul>
        </div>
        <div class="mode-card ${onboardingState.adapters.users==='hybrid'?'selected':''}" onclick="setAdapter('users','hybrid')">
          <div class="mode-icon">🔄</div>
          <h3>Híbrida</h3>
          <ul>
            <li>Importa usuarios del ERP</li>
            <li>Permite agregar usuarios sólo de Conta</li>
            <li>Sync de altas/bajas via webhook</li>
          </ul>
        </div>
        <div class="mode-card ${onboardingState.adapters.users==='local'?'selected':''}" onclick="setAdapter('users','local')">
          <div class="mode-icon">💾</div>
          <h3>Local</h3>
          <ul>
            <li>Usuarios sólo en Conta</li>
            <li>Login independiente</li>
            <li>Útil si Conta tiene acceso para auditores externos</li>
          </ul>
        </div>
      </div>
    </div>

    ${fed ? `
    <div class="panel" style="margin-top:20px">
      <h3>Configuración OIDC del ERP</h3>
      <div class="form-grid">
        <div class="form-group"><label>Issuer URL</label><input type="text" value="https://auth.acme-erp.com/realms/acme"/></div>
        <div class="form-group"><label>Client ID</label><input type="text" class="code" value="conta-prod"/></div>
        <div class="form-group"><label>Client Secret</label><input type="text" class="code" value="●●●●●●●●●●●●"/></div>
        <div class="form-group"><label>Scopes</label><input type="text" value="openid profile email roles"/></div>
        <div class="form-group"><label>Claim de roles</label><input type="text" class="code" value="resource_access.acme.roles"/></div>
        <div class="form-group"><label>Claim de tenant</label><input type="text" class="code" value="tenant_id"/></div>
      </div>
      <button class="btn" style="margin-top:12px">Probar conexión OIDC</button>
    </div>` : ''}

    <div class="panel" style="margin-top:20px">
      <h3>Mapeo de roles ERP → Conta</h3>
      <table class="table">
        <thead><tr><th>Rol ERP</th><th>Rol Conta</th><th>Permisos Conta</th></tr></thead>
        <tbody>
          <tr><td><span class="kbd">erp.cfo</span></td><td><select><option>Admin contable</option></select></td><td class="muted">Todos</td></tr>
          <tr><td><span class="kbd">erp.accountant</span></td><td><select><option>Aprobador</option><option>Admin contable</option></select></td><td class="muted">Read + post + close</td></tr>
          <tr><td><span class="kbd">erp.operator</span></td><td><select><option>Operador</option></select></td><td class="muted">Read + post (sin close)</td></tr>
          <tr><td><span class="kbd">erp.viewer</span></td><td><select><option>Auditor</option></select></td><td class="muted">Read-only</td></tr>
          <tr><td><span class="kbd">erp.support</span></td><td><select><option>— Sin acceso a Conta —</option></select></td><td class="muted">N/A</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Usuarios iniciales (${p.users.length})</h3>
      <table class="table">
        <thead><tr><th>Email</th><th>Nombre</th><th>Rol Conta</th><th>2FA</th><th>Acceso</th></tr></thead>
        <tbody>
          ${p.users.map(u=>`<tr>
            <td>${u.email}</td><td>${u.name}</td>
            <td>${u.role==='admin'?'<span class="tag warn">Admin contable</span>':u.role==='aprobador'?'<span class="tag warn">Aprobador</span>':u.role==='auditor'?'<span class="tag muted">Auditor</span>':'<span class="tag muted">Operador</span>'}</td>
            <td>${u.role==='admin'||u.role==='aprobador'?'<span class="tag ok">obligatorio</span>':'<span class="tag muted">opcional</span>'}</td>
            <td><label class="toggle" style="padding:4px 8px"><input type="checkbox" checked/></label></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── PASO 7: Verificación e instalación
function renderStep7Verify() {
  const m = onboardingState.mode;
  const a = onboardingState.adapters;
  const p = onboardingState.erpPayload;
  return `
    <div class="grid-2">
      <div class="panel">
        <h3>📋 Resumen de la instalación</h3>
        <table class="table">
          <tr><td>Modo</td><td><strong>${m==='greenfield'?'🌱 Greenfield':m==='bootstrap'?'📦 Bootstrap desde ERP':'🔗 Federado'}</strong></td></tr>
          <tr><td>Empresa</td><td>${p.company.legalName}</td></tr>
          <tr><td>País / régimen</td><td>${p.company.country} · ${p.company.regime}</td></tr>
          <tr><td>Moneda funcional</td><td>ARS</td></tr>
          <tr><td>Ejercicio inicial</td><td>2026 (1 ene → 31 dic)</td></tr>
          <tr><td>Plan de cuentas</td><td>AR · PyME (82 cuentas)</td></tr>
          <tr><td>Sucursales</td><td>${p.branches.length} · adapter: <strong>${a.branches}</strong></td></tr>
          <tr><td>Unidades de negocio</td><td>${p.businessUnits.length} · adapter: <strong>${a.businessUnits}</strong></td></tr>
          <tr><td>Monedas</td><td>${p.currencies.length}</td></tr>
          <tr><td>Usuarios</td><td>${p.users.length} · adapter: <strong>${a.users}</strong></td></tr>
          <tr><td>Posting Rules</td><td>${p.eventsCatalog.length} reglas creadas</td></tr>
          <tr><td>Backfill histórico</td><td>desactivado</td></tr>
        </table>
      </div>

      <div class="panel">
        <h3>✅ Checks pre-instalación</h3>
        <ul class="checklist">
          <li>✅ Datos legales completos</li>
          <li>✅ Plan de cuentas con balance teórico OK</li>
          <li>✅ Plantilla de país aplicada</li>
          <li>✅ ${p.eventsCatalog.length} posting rules con dry-run exitoso</li>
          <li>✅ Adapters configurados sin conflictos</li>
          <li>✅ Conexión con ERP validada (latencia 42 ms)</li>
          <li>✅ OIDC issuer responde correctamente</li>
          <li>⚠️ 1 evento con cuenta sin mapeo (revisar: erp.refund.partial)</li>
        </ul>
        <div class="alert info">
          <div class="ico">💡</div>
          <div class="body">
            <div class="t">El warning no bloquea la instalación</div>
            <div class="d">El evento sin mapeo se enviará a una cola de pendientes y podrás resolverlo cuando aparezca el primero.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>🚀 Ejecutar instalación</h3>
      <p class="muted" style="margin-top:0">Esto va a crear el tenant en Conta y dejar el sistema listo para recibir eventos del ERP. La operación es atómica: si algo falla, se revierte todo.</p>

      <div class="progress" style="margin-bottom: 12px">
        <div class="progress-bar"><div class="fill" style="width: 0%"></div></div>
        <div class="progress-text">listo para iniciar</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px">
        <div class="health-row"><div class="name">1. Crear tenant + company</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">2. Aplicar plantilla de plan de cuentas (82)</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">3. Inicializar fiscal year + 12 períodos</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">4. Importar sucursales (${p.branches.length})</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">5. Importar BU (${p.businessUnits.length})</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">6. Importar monedas (${p.currencies.length}) + sync FX</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">7. Crear roles y mapear usuarios (${p.users.length})</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">8. Activar Posting Rules (${p.eventsCatalog.length})</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">9. Suscribir webhooks bidireccionales con ERP</div><div class="meta muted">esperando</div></div>
        <div class="health-row"><div class="name">10. Smoke test end-to-end</div><div class="meta muted">esperando</div></div>
      </div>

      <div style="margin-top: 16px; display:flex; gap:8px">
        <button class="btn btn-primary" onclick="simulateInstall()">▶ Ejecutar instalación</button>
        <button class="btn">📥 Descargar configuración (JSON)</button>
        <button class="btn">📧 Enviar resumen al cliente</button>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>🔮 Después de la instalación</h3>
      <div class="grid-3" style="margin-top:0">
        <div class="rule-line"><strong>Eventos en vivo</strong><div class="muted" style="font-size:12px">Los eventos del ERP se procesan en tiempo real vía Service Bus. Idempotencia garantizada.</div></div>
        <div class="rule-line"><strong>Sync periódico</strong><div class="muted" style="font-size:12px">Si elegiste híbrido, datos como sucursales se sincronizan cada 1h o por webhook.</div></div>
        <div class="rule-line"><strong>Soporte 24/7</strong><div class="muted" style="font-size:12px">Cualquier divergencia se detecta y se notifica al admin contable.</div></div>
      </div>
    </div>`;
}

function simulateInstall() {
  const fill = document.querySelector('.progress .fill');
  const text = document.querySelector('.progress .progress-text');
  const rows = document.querySelectorAll('.health-row');
  let i = 0;
  const interval = setInterval(()=>{
    if (i < rows.length) {
      rows[i].querySelector('.meta').innerHTML = '<span class="tag ok">completado</span>';
      i++;
      const pct = Math.round((i/rows.length)*100);
      fill.style.width = pct + '%';
      text.textContent = `${pct}% · paso ${i} de ${rows.length}`;
      if (i < rows.length) {
        rows[i].querySelector('.meta').innerHTML = '<span class="tag warn">en curso...</span>';
      }
    } else {
      clearInterval(interval);
      text.textContent = '✅ Instalación completada';
      setTimeout(()=>alert('🎉 Onboarding completado · cliente operativo · primer evento del ERP esperando ser procesado.'), 300);
    }
  }, 350);
}

// ───── ERP GATEWAY ─────
function renderGateway() {
  view.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔌 ERP Gateway</h1>
        <div class="page-sub">Anti-Corruption Layer · microservicio que aísla a Conta de la API del ERP</div>
      </div>
      <div class="toolbar">
        <button class="btn">🔄 Forzar resync</button>
        <button class="btn">📊 Métricas en Datadog</button>
        <button class="btn btn-primary">⚙ Configurar</button>
      </div>
    </div>

    <div class="cards">
      <div class="card"><div class="label">Estado</div><div class="value" style="color:var(--ok)">● Healthy</div><div class="delta">3 instancias activas</div></div>
      <div class="card"><div class="label">Latencia p95</div><div class="value">42 <span style="font-size:14px">ms</span></div><div class="delta up">−8 ms vs ayer</div></div>
      <div class="card"><div class="label">Cache hit rate</div><div class="value">94.2%</div><div class="delta up">▲ 1.3 pp</div></div>
      <div class="card"><div class="label">Eventos / min</div><div class="value">${fmtN(127)}</div><div class="delta">last hour</div></div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>Topología actual</h3>
        <pre class="code" style="font-size:11px; line-height:1.6">┌─────────────────────────────────────┐
│  Conta.Api / Functions / Web        │
│  (sólo conoce DTOs Conta-shaped)    │
└─────────────────┬───────────────────┘
                  │ HTTP/gRPC interno
                  ▼
┌─────────────────────────────────────┐
│  Conta.ErpGateway        v2.4.1     │
│  ─────────────────────────────────  │
│  ▸ AdapterRegistry (multi-ERP)      │
│  ▸ Cache (Redis cluster)            │
│  ▸ CircuitBreaker (Polly)           │
│  ▸ EventTranslator                  │
│  ▸ AuthClient (OIDC)                │
│  ▸ TelemetryEnricher                │
└──────┬───────────┬─────────┬────────┘
       │           │         │
   ┌───▼───┐   ┌───▼──┐   ┌──▼────────┐
   │SAP B1 │   │ Odoo │   │ ERP propio│
   │adapter│   │adapter│  │  adapter  │
   └───────┘   └──────┘   └───────────┘</pre>
      </div>

      <div class="panel">
        <h3>Adapters instalados</h3>
        <table class="table">
          <thead><tr><th>ERP</th><th>Versión</th><th>Tenants</th><th>Estado</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>SAP Business One</strong></td>
              <td><span class="kbd">v10 SP02</span></td>
              <td>1 (ACME S.A.)</td>
              <td><span class="tag ok">activo</span></td>
            </tr>
            <tr>
              <td><strong>Odoo</strong></td>
              <td><span class="kbd">v17.0</span></td>
              <td>0</td>
              <td><span class="tag muted">disponible</span></td>
            </tr>
            <tr>
              <td><strong>Microsoft Dynamics 365</strong></td>
              <td><span class="kbd">2024 wave 1</span></td>
              <td>0</td>
              <td><span class="tag muted">disponible</span></td>
            </tr>
            <tr>
              <td><strong>Oracle NetSuite</strong></td>
              <td>—</td>
              <td>0</td>
              <td><span class="tag warn">en desarrollo</span></td>
            </tr>
            <tr>
              <td><strong>Custom REST adapter</strong></td>
              <td><span class="kbd">v1.0</span></td>
              <td>0</td>
              <td><span class="tag muted">disponible</span></td>
            </tr>
          </tbody>
        </table>
        <p class="muted" style="font-size:12px; margin-top:8px">Los adapters son plugins. Agregar uno nuevo no requiere modificar Conta.Core.</p>
      </div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>Salud de endpoints federados (ACME · SAP B1)</h3>
        <table class="table">
          <thead><tr><th>Recurso</th><th>Adapter</th><th class="num">p95</th><th>Cache TTL</th><th>Hit rate</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>🏪 Branches</td><td>SAP·BusinessPartner+Branches</td><td class="num">28ms</td><td>15 min</td><td>97%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>📊 BusinessUnits</td><td>SAP·CostCenters</td><td class="num">31ms</td><td>15 min</td><td>96%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>👤 Users</td><td>SAP·Users</td><td class="num">52ms</td><td>5 min</td><td>89%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>🔐 Roles</td><td>SAP·UserGroups</td><td class="num">35ms</td><td>30 min</td><td>99%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>👥 Customers</td><td>SAP·BusinessPartners</td><td class="num">68ms</td><td>5 min</td><td>92%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>🚚 Suppliers</td><td>SAP·BusinessPartners</td><td class="num">61ms</td><td>5 min</td><td>91%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>💱 Currencies</td><td>SAP·Currencies</td><td class="num">12ms</td><td>1 h</td><td>99.8%</td><td><span class="tag ok">OK</span></td></tr>
            <tr><td>📦 Items / Productos</td><td>SAP·Items</td><td class="num">88ms</td><td>10 min</td><td>83%</td><td><span class="tag warn">degraded</span></td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Resilience policy</h3>
        <div class="form-grid full">
          <div class="form-group">
            <label>Timeout por request</label>
            <input type="text" value="3 segundos"/>
          </div>
          <div class="form-group">
            <label>Reintentos (backoff exponencial)</label>
            <input type="text" value="3 (200ms, 600ms, 1800ms)"/>
          </div>
          <div class="form-group">
            <label>Circuit breaker · trip threshold</label>
            <input type="text" value="5 fallas en 30s"/>
          </div>
          <div class="form-group">
            <label>Circuit breaker · half-open</label>
            <input type="text" value="60s"/>
          </div>
          <div class="form-group">
            <label>Fallback en circuit open</label>
            <select><option>Devolver desde cache (stale OK)</option><option>Devolver error 503</option></select>
          </div>
          <div class="form-group">
            <label>Rate limit hacia el ERP</label>
            <input type="text" value="100 req/seg · burst 200"/>
          </div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Tráfico de eventos · últimas 24h</h3>
      <div class="chart-wrap h-md"><canvas id="chartGwTraffic"></canvas></div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>Eventos del ERP procesados</h3>
        <table class="table">
          <thead><tr><th>Evento ERP</th><th>Conta event</th><th class="num">Hoy</th><th class="num">Errores</th></tr></thead>
          <tbody>
            <tr><td><span class="kbd">SAP.Invoice.Added</span></td><td><span class="kbd">accounting.sale.received</span></td><td class="num">42</td><td class="num" style="color:var(--ok)">0</td></tr>
            <tr><td><span class="kbd">SAP.Invoice.Cancelled</span></td><td><span class="kbd">accounting.sale.cancelled</span></td><td class="num">3</td><td class="num" style="color:var(--ok)">0</td></tr>
            <tr><td><span class="kbd">SAP.Bill.Added</span></td><td><span class="kbd">accounting.purchase.received</span></td><td class="num">18</td><td class="num" style="color:var(--ok)">0</td></tr>
            <tr><td><span class="kbd">SAP.IncomingPayment.Added</span></td><td><span class="kbd">accounting.payment.received</span></td><td class="num">35</td><td class="num" style="color:var(--ok)">0</td></tr>
            <tr><td><span class="kbd">SAP.OutgoingPayment.Added</span></td><td><span class="kbd">accounting.payment.sent</span></td><td class="num">14</td><td class="num" style="color:var(--ok)">0</td></tr>
            <tr><td><span class="kbd">SAP.JournalVoucher.Added</span></td><td><span class="kbd">accounting.manual.received</span></td><td class="num">2</td><td class="num" style="color:var(--warn)">1</td></tr>
            <tr><td><span class="kbd">SAP.Inventory.Transfer</span></td><td><span class="kbd">accounting.inventory.transfer</span></td><td class="num">7</td><td class="num" style="color:var(--ok)">0</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Dead Letter Queue</h3>
        <p class="muted" style="margin-top:0">Eventos que fallaron tras todos los reintentos. Requieren intervención manual.</p>
        <table class="table">
          <thead><tr><th>Llegada</th><th>Evento</th><th>Razón</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td>09:42</td>
              <td><span class="kbd">SAP.JournalVoucher.Added</span> #JV-9821</td>
              <td>Cuenta <span class="kbd">5.9.99.999</span> no existe</td>
              <td><button class="btn btn-ghost">Ver</button> <button class="btn btn-ghost">Reprocesar</button></td>
            </tr>
            <tr>
              <td>ayer 23:15</td>
              <td><span class="kbd">SAP.IncomingPayment.Added</span> #IP-4421</td>
              <td>Posting rule sin mapping para tipo "transfer"</td>
              <td><button class="btn btn-ghost">Ver</button> <button class="btn btn-ghost">Reprocesar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid-2" style="margin-top:20px">
      <div class="panel">
        <h3>Mapeo de campos · SAP BusinessPartner → Conta Customer</h3>
        <p class="muted" style="margin-top:0; font-size:12px">El adapter SAP traduce el modelo del ERP al modelo de Conta antes de devolverlo.</p>
        <table class="table">
          <thead><tr><th>Campo SAP</th><th></th><th>Campo Conta</th><th>Transformación</th></tr></thead>
          <tbody>
            <tr><td><span class="kbd">CardCode</span></td><td>→</td><td><span class="kbd">externalId</span></td><td class="muted">passthrough</td></tr>
            <tr><td><span class="kbd">CardName</span></td><td>→</td><td><span class="kbd">name</span></td><td class="muted">trim + uppercase</td></tr>
            <tr><td><span class="kbd">FederalTaxID</span></td><td>→</td><td><span class="kbd">taxId</span></td><td class="muted">stripDashes</td></tr>
            <tr><td><span class="kbd">Currency</span></td><td>→</td><td><span class="kbd">currencyCode</span></td><td class="muted">map ISO4217</td></tr>
            <tr><td><span class="kbd">CreditLine</span></td><td>→</td><td><span class="kbd">creditLimit</span></td><td class="muted">decimal cast</td></tr>
            <tr><td><span class="kbd">PayTermsGrpCode</span></td><td>→</td><td><span class="kbd">paymentTerms</span></td><td class="muted">lookup table</td></tr>
            <tr><td>—</td><td></td><td><span class="kbd">aging</span></td><td class="muted">calculated by Conta</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h3>Configuración de conexión · ACME / SAP B1</h3>
        <div class="form-grid full">
          <div class="form-group">
            <label>Service Layer URL</label>
            <input type="text" value="https://sap-acme.local:50000/b1s/v1"/>
          </div>
          <div class="form-group">
            <label>Company DB</label>
            <input type="text" class="code" value="SBO_ACME_PROD"/>
          </div>
          <div class="form-group">
            <label>Auth</label>
            <select><option>OAuth2 client credentials</option><option>Basic + cookie session</option><option>mTLS</option></select>
          </div>
          <div class="form-group">
            <label>Pool size</label>
            <input type="number" value="20"/>
          </div>
          <div class="form-group">
            <label>Health check interval</label>
            <select><option>30 segundos</option><option>1 minuto</option><option>5 minutos</option></select>
          </div>
          <div class="form-group">
            <label>Drift detection (sync periódico)</label>
            <select><option>Cada 1h</option><option>Cada 6h</option><option>Solo por webhook</option></select>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:12px">Probar conexión</button>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h3>Versionado y compatibilidad</h3>
      <div class="grid-3" style="margin-top:0">
        <div class="rule-line">
          <strong>Conta espera contrato v2</strong>
          <div class="muted" style="font-size:12px">DTOs estables · breaking changes requieren v3 con deprecation 6 meses</div>
        </div>
        <div class="rule-line">
          <strong>Adapter SAP B1 v2.4.1</strong>
          <div class="muted" style="font-size:12px">Compatible con Service Layer v10 · monitoreado en CI</div>
        </div>
        <div class="rule-line">
          <strong>Cambio de ERP = sólo cambia el Gateway</strong>
          <div class="muted" style="font-size:12px">Conta.Core no se entera · cero riesgo en el dominio contable</div>
        </div>
      </div>
    </div>

    <div class="alert info" style="margin-top:20px">
      <div class="ico">💡</div>
      <div class="body">
        <div class="t">Por qué un microservicio aparte y no una librería en Conta</div>
        <div class="d">1) Deploy independiente: actualizar el adapter SAP no requiere redeployar el dominio contable. 2) Cache centralizado: si tres servicios de Conta piden la misma sucursal, el ERP recibe una sola request. 3) Multi-tenant ready: el mismo Gateway sirve a N clientes con N adapters. 4) Observabilidad del boundary en un solo lugar.</div>
      </div>
    </div>
  `;

  // Chart de tráfico
  const labels = Array.from({length:24}, (_,i)=>String(i).padStart(2,'0')+'h');
  const events = [22,18,12,8,5,4,6,15,42,68,89,112,124,135,121,108,98,76,54,42,38,29,25,24];
  const cacheHits = events.map(e => Math.floor(e*0.94));
  const erpCalls  = events.map((e,i) => e - cacheHits[i]);
  activeCharts.push(new Chart(document.getElementById('chartGwTraffic'), {
    type:'bar',
    data:{ labels, datasets:[
      { label:'Cache hits', data: cacheHits, backgroundColor:'#4dd4ac', stack:'a' },
      { label:'Llamadas al ERP', data: erpCalls, backgroundColor:'#6c8cff', stack:'a' },
    ]},
    options: chartOpts({stacked:true})
  }));
}

// ───── Editor de Asiento Manual ─────
let entryDraft = {
  date: '2026-04-30',
  description: '',
  reference: '',
  branch: '',
  businessUnit: '',
  currency: 'ARS',
  fxRate: 1,
  lines: [
    { id:1, account:'', accountName:'', desc:'', dr:0, cr:0, branch:'', bu:'' },
    { id:2, account:'', accountName:'', desc:'', dr:0, cr:0, branch:'', bu:'' },
  ],
  notes: '',
  requireApproval: false,
};

const ACCOUNTS_LOOKUP = [
  { code:'1.1.01.001', name:'Caja general',           type:'asset' },
  { code:'1.1.01.002', name:'Caja chica',             type:'asset' },
  { code:'1.1.02.001', name:'Banco Galicia',          type:'asset' },
  { code:'1.1.02.002', name:'Banco Macro Rosario',    type:'asset' },
  { code:'1.1.02.003', name:'MercadoPago',            type:'asset' },
  { code:'1.1.03.001', name:'Deudores por venta',     type:'asset' },
  { code:'1.1.05.001', name:'IVA Crédito Fiscal',     type:'asset' },
  { code:'1.1.99.001', name:'Cuenta puente remesa',   type:'asset' },
  { code:'2.1.01.001', name:'Proveedores',            type:'liability' },
  { code:'2.1.03.001', name:'Sueldos a pagar',        type:'liability' },
  { code:'2.1.04.001', name:'Cargas sociales',        type:'liability' },
  { code:'2.1.05.001', name:'IVA Débito Fiscal',      type:'liability' },
  { code:'3.1.01.001', name:'Capital social',         type:'equity' },
  { code:'3.2.01.001', name:'Resultados acumulados',  type:'equity' },
  { code:'4.1.01.001', name:'Ventas',                 type:'income' },
  { code:'4.1.02.001', name:'Ventas online',          type:'income' },
  { code:'4.2.01.001', name:'Otros ingresos',         type:'income' },
  { code:'5.1.01.001', name:'Costo de mercadería',    type:'expense' },
  { code:'5.2.01.001', name:'Insumos',                type:'expense' },
  { code:'5.3.01.001', name:'Sueldos y jornales',     type:'expense' },
  { code:'5.4.01.001', name:'Alquileres',             type:'expense' },
  { code:'5.5.01.001', name:'Impuestos',              type:'expense' },
];

function openJournalEntryEditor(editId, duplicateFromId) {
  // reset draft (or load from existing entry if duplicating)
  if (duplicateFromId) {
    const e = DATA.diario.find(x => x.id === duplicateFromId);
    entryDraft = {
      date: '2026-04-30',
      description: '(Copia de) ' + e.desc,
      reference: '',
      branch: e.branch,
      businessUnit: e.bu,
      currency: 'ARS',
      fxRate: 1,
      lines: e.lines.map((l, i) => ({ id: i+1, account: l.acc, accountName: l.name, desc: '', dr: l.dr, cr: l.cr, branch: e.branch, bu: e.bu })),
      notes: '', requireApproval: false,
    };
  } else {
    entryDraft = {
      date: '2026-04-30', description: '', reference: '',
      branch: '', businessUnit: '', currency: 'ARS', fxRate: 1,
      lines: [
        { id:1, account:'', accountName:'', desc:'', dr:0, cr:0, branch:'', bu:'' },
        { id:2, account:'', accountName:'', desc:'', dr:0, cr:0, branch:'', bu:'' },
      ],
      notes: '', requireApproval: false,
    };
  }
  renderEntryEditor();
}

function renderEntryEditor() {
  const totalDr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.dr) || 0), 0);
  const totalCr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.cr) || 0), 0);
  const diff = totalDr - totalCr;
  const balanced = Math.abs(diff) < 0.01 && totalDr > 0;
  const hasErrors = entryDraft.lines.some(l => !l.account) || !entryDraft.description || !balanced;

  openModal(`
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 1080px">
      <div class="modal-header">
        <div>
          <h2>${entryDraft.description ? '✏️ '+entryDraft.description : '📝 Nuevo asiento manual'}</h2>
          <div class="muted">Partida doble validada en tiempo real · audit log automático · workflow de aprobación opcional</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <!-- HEADER -->
        <div class="form-section">
          <h4>Cabecera del asiento</h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Fecha <span class="req">*</span></label>
              <input type="date" value="${entryDraft.date}" onchange="entryDraft.date=this.value"/>
              <span class="hint">Debe estar dentro de un período abierto</span>
            </div>
            <div class="form-group">
              <label>Descripción <span class="req">*</span></label>
              <input type="text" value="${entryDraft.description}" placeholder="Ej. Provisión sueldos abril"
                     onchange="entryDraft.description=this.value; renderEntryEditorSummary()"/>
            </div>
            <div class="form-group">
              <label>Referencia externa</label>
              <input type="text" value="${entryDraft.reference}" placeholder="Ej. Recibo #4521" onchange="entryDraft.reference=this.value"/>
              <span class="hint">Opcional · útil para conciliar después</span>
            </div>
            <div class="form-group">
              <label>Sucursal por defecto</label>
              <select onchange="entryDraft.branch=this.value">
                <option value="">— Por línea —</option>
                <option ${entryDraft.branch==='CABA'?'selected':''}>CABA</option>
                <option ${entryDraft.branch==='Rosario'?'selected':''}>Rosario</option>
                <option ${entryDraft.branch==='Mendoza'?'selected':''}>Mendoza</option>
                <option ${entryDraft.branch==='Online'?'selected':''}>Online</option>
              </select>
            </div>
            <div class="form-group">
              <label>BU por defecto</label>
              <select onchange="entryDraft.businessUnit=this.value">
                <option value="">— Por línea —</option>
                <option ${entryDraft.businessUnit==='Retail'?'selected':''}>Retail</option>
                <option ${entryDraft.businessUnit==='Mayorista'?'selected':''}>Mayorista</option>
                <option ${entryDraft.businessUnit==='Online'?'selected':''}>Online</option>
                <option ${entryDraft.businessUnit==='Servicios'?'selected':''}>Servicios</option>
              </select>
            </div>
            <div class="form-group">
              <label>Moneda</label>
              <select onchange="entryDraft.currency=this.value">
                <option ${entryDraft.currency==='ARS'?'selected':''}>ARS · Funcional</option>
                <option ${entryDraft.currency==='USD'?'selected':''}>USD</option>
                <option ${entryDraft.currency==='EUR'?'selected':''}>EUR</option>
              </select>
            </div>
          </div>
        </div>

        <!-- LINES -->
        <div class="form-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
            <h4 style="margin:0">Líneas del asiento</h4>
            <div style="display:flex; gap:8px">
              <button class="btn btn-ghost" onclick="entryAddLine('dr')">+ Línea Debe</button>
              <button class="btn btn-ghost" onclick="entryAddLine('cr')">+ Línea Haber</button>
              <button class="btn btn-ghost" onclick="entryBalanceWith('cr')" title="Auto-balancear con saldo en haber">⚖ Auto-balancear</button>
            </div>
          </div>

          <table class="je-lines">
            <thead>
              <tr>
                <th></th>
                <th class="row-num">#</th>
                <th>Cuenta</th>
                <th>Descripción</th>
                <th style="width:90px">Sucursal</th>
                <th style="width:90px">BU</th>
                <th class="num" style="width:130px">Debe</th>
                <th class="num" style="width:130px">Haber</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${entryDraft.lines.map((l, idx) => `
                <tr>
                  <td class="row-handle" title="arrastrar para reordenar">⋮⋮</td>
                  <td class="row-num">${idx+1}</td>
                  <td>
                    <select onchange="entrySetAccount(${l.id}, this.value)">
                      <option value="">— Seleccionar —</option>
                      ${ACCOUNTS_LOOKUP.map(a => `<option value="${a.code}|${a.name}" ${l.account===a.code?'selected':''}>${a.code} · ${a.name}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <input type="text" value="${l.desc||''}" placeholder="(opcional)"
                           onchange="entrySetField(${l.id},'desc',this.value)"/>
                  </td>
                  <td>
                    <select onchange="entrySetField(${l.id},'branch',this.value)">
                      <option value="">—</option>
                      <option ${l.branch==='CABA'?'selected':''}>CABA</option>
                      <option ${l.branch==='Rosario'?'selected':''}>Rosario</option>
                      <option ${l.branch==='Mendoza'?'selected':''}>Mendoza</option>
                      <option ${l.branch==='Online'?'selected':''}>Online</option>
                    </select>
                  </td>
                  <td>
                    <select onchange="entrySetField(${l.id},'bu',this.value)">
                      <option value="">—</option>
                      <option ${l.bu==='Retail'?'selected':''}>Retail</option>
                      <option ${l.bu==='Mayorista'?'selected':''}>Mayorista</option>
                      <option ${l.bu==='Online'?'selected':''}>Online</option>
                      <option ${l.bu==='Servicios'?'selected':''}>Servicios</option>
                    </select>
                  </td>
                  <td class="num">
                    <input type="number" class="amount" value="${l.dr||''}" step="0.01" placeholder="0.00"
                           oninput="entrySetAmount(${l.id},'dr',this.value)"
                           ${l.cr?'disabled style="opacity:.4"':''}/>
                  </td>
                  <td class="num">
                    <input type="number" class="amount" value="${l.cr||''}" step="0.01" placeholder="0.00"
                           oninput="entrySetAmount(${l.id},'cr',this.value)"
                           ${l.dr?'disabled style="opacity:.4"':''}/>
                  </td>
                  <td class="row-action">
                    <button onclick="entryRemoveLine(${l.id})" title="Eliminar línea" ${entryDraft.lines.length<=2?'disabled style="opacity:.3; cursor:not-allowed"':''}>✕</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>

          <div class="je-summary" id="jeSummary">
            <div class="item">Total Debe<div class="v">${fmt(totalDr)}</div></div>
            <div class="item">Total Haber<div class="v">${fmt(totalCr)}</div></div>
            <div class="item">Diferencia<div class="v ${balanced?'ok':'warn'}">${fmt(diff)}</div></div>
            <div class="status">${balanced?'<span style="color:var(--ok)" title="Partida doble OK">✓</span>':'<span style="color:var(--warn)" title="Asiento desbalanceado">⚠</span>'}</div>
          </div>
        </div>

        <!-- VALIDATIONS -->
        <div class="form-section">
          <h4>Validaciones automáticas</h4>
          <ul class="checklist">
            <li>${balanced ? '✅' : '❌'} Suma de Debe = Suma de Haber</li>
            <li>${entryDraft.description ? '✅' : '❌'} Descripción presente</li>
            <li>${entryDraft.lines.every(l => l.account) ? '✅' : '⚠️'} Todas las líneas tienen cuenta</li>
            <li>${entryDraft.lines.length >= 2 ? '✅' : '❌'} Al menos 2 líneas</li>
            <li>✅ Período fiscal abierto (${entryDraft.date})</li>
            <li>✅ Cuentas referenciadas activas</li>
            <li>✅ Tipo de cambio disponible para ${entryDraft.currency}</li>
          </ul>
        </div>

        <!-- ADVANCED -->
        <div class="form-section">
          <h4>Opciones avanzadas</h4>
          <div class="form-grid full">
            <div class="form-group">
              <label>Notas internas (no aparecen en reportes)</label>
              <textarea rows="2" onchange="entryDraft.notes=this.value">${entryDraft.notes}</textarea>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px">
            <label class="toggle">
              <input type="checkbox" ${entryDraft.requireApproval?'checked':''} onchange="entryDraft.requireApproval=this.checked"/>
              <div class="info">
                <div class="t">Requiere aprobación de un segundo usuario</div>
                <div class="d">El asiento queda en estado "pendiente" hasta que un Aprobador lo confirme</div>
              </div>
            </label>
            <label class="toggle">
              <input type="checkbox"/>
              <div class="info">
                <div class="t">Adjuntar comprobante</div>
                <div class="d">Recibo, factura, autorización (PDF, JPG, PNG · máx 10MB)</div>
              </div>
            </label>
            <label class="toggle">
              <input type="checkbox"/>
              <div class="info">
                <div class="t">Crear como recurrente</div>
                <div class="d">Se repite automáticamente cada mes (ej. provisiones, alquileres)</div>
              </div>
            </label>
            <label class="toggle">
              <input type="checkbox"/>
              <div class="info">
                <div class="t">Generar reverso automático</div>
                <div class="d">Para asientos de ajuste que se revierten en el período siguiente (típico cierre)</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" style="margin-right:auto" onclick="alert('Plantilla guardada para próximas veces')">⭐ Guardar como plantilla</button>
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn">💾 Guardar borrador</button>
        <button class="btn" onclick="entryDryRun()">🧪 Dry-run</button>
        <button class="btn btn-primary" ${hasErrors?'disabled style="opacity:.4; cursor:not-allowed"':''} onclick="entryPost()">${entryDraft.requireApproval?'Enviar a aprobación →':'✓ Postear'}</button>
      </div>
    </div>
  `);
}

function entryAddLine(side) {
  const newId = Math.max(0, ...entryDraft.lines.map(l=>l.id)) + 1;
  entryDraft.lines.push({ id:newId, account:'', accountName:'', desc:'', dr:0, cr:0, branch:'', bu:'' });
  renderEntryEditor();
}
function entryRemoveLine(id) {
  if (entryDraft.lines.length <= 2) return;
  entryDraft.lines = entryDraft.lines.filter(l => l.id !== id);
  renderEntryEditor();
}
function entrySetAccount(id, val) {
  const line = entryDraft.lines.find(l => l.id === id);
  if (!val) { line.account = ''; line.accountName = ''; renderEntryEditor(); return; }
  const [code, name] = val.split('|');
  line.account = code; line.accountName = name;
  renderEntryEditor();
}
function entrySetField(id, field, val) {
  const line = entryDraft.lines.find(l => l.id === id);
  line[field] = val;
}
function entrySetAmount(id, side, val) {
  const line = entryDraft.lines.find(l => l.id === id);
  const num = parseFloat(val) || 0;
  if (side === 'dr') { line.dr = num; if (num > 0) line.cr = 0; }
  else               { line.cr = num; if (num > 0) line.dr = 0; }
  renderEntryEditorSummary();
}
function renderEntryEditorSummary() {
  // Live update only the summary block
  const totalDr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.dr) || 0), 0);
  const totalCr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.cr) || 0), 0);
  const diff = totalDr - totalCr;
  const balanced = Math.abs(diff) < 0.01 && totalDr > 0;
  const sum = document.getElementById('jeSummary');
  if (sum) {
    sum.innerHTML = `
      <div class="item">Total Debe<div class="v">${fmt(totalDr)}</div></div>
      <div class="item">Total Haber<div class="v">${fmt(totalCr)}</div></div>
      <div class="item">Diferencia<div class="v ${balanced?'ok':'warn'}">${fmt(diff)}</div></div>
      <div class="status">${balanced?'<span style="color:var(--ok)">✓</span>':'<span style="color:var(--warn)">⚠</span>'}</div>`;
  }
}
function entryBalanceWith(side) {
  const totalDr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.dr) || 0), 0);
  const totalCr = entryDraft.lines.reduce((s,l) => s + (parseFloat(l.cr) || 0), 0);
  const diff = Math.abs(totalDr - totalCr);
  if (diff < 0.01) { alert('Ya está balanceado'); return; }
  // last empty line gets the diff
  const empty = entryDraft.lines.find(l => !l.dr && !l.cr);
  if (empty) {
    if (totalDr > totalCr) empty.cr = diff; else empty.dr = diff;
  } else {
    const newId = Math.max(...entryDraft.lines.map(l=>l.id)) + 1;
    entryDraft.lines.push({ id:newId, account:'', accountName:'', desc:'(balance)', dr: totalDr<totalCr?diff:0, cr: totalDr>totalCr?diff:0, branch:'', bu:'' });
  }
  renderEntryEditor();
}
function entryDryRun() {
  alert('🧪 Dry-run\n\nValidaciones: OK\nPeríodo: abierto\nCuentas: activas\nPartida doble: balanceada\n\nNo se persiste; revisá el preview en la cabecera.');
}
function entryPost() {
  closeModal();
  const msg = entryDraft.requireApproval
    ? `Asiento enviado a aprobación.\nID temporal: JE-PEND-9921\nNotificación enviada a aprobadores.`
    : `✓ Asiento posteado\nID: JE-2026-001241\nAudit log registrado.\nProyecciones de saldo y dashboards actualizándose...`;
  alert(msg);
}

// ───── Detalle de Asiento ─────
function openJournalEntryDetail(id) {
  const e = DATA.diario.find(x => x.id === id);
  if (!e) return;
  const sumDr = e.lines.reduce((s,l)=>s+l.dr,0);
  const sumCr = e.lines.reduce((s,l)=>s+l.cr,0);
  const isExternal = e.src.startsWith('EXT');

  openModal(`
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 920px">
      <div class="modal-header">
        <div>
          <h2>📓 Asiento <span class="kbd">#${e.id}</span></h2>
          <div class="muted">${e.desc} · ${e.date}</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button class="tab active" data-tab="resumen"  onclick="switchTab('resumen')">Resumen</button>
          <button class="tab"        data-tab="lineas"   onclick="switchTab('lineas')">Líneas (${e.lines.length})</button>
          <button class="tab"        data-tab="origen"   onclick="switchTab('origen')">Origen</button>
          <button class="tab"        data-tab="audit"    onclick="switchTab('audit')">Audit trail</button>
          <button class="tab"        data-tab="rel"      onclick="switchTab('rel')">Relacionados</button>
        </div>

        <!-- RESUMEN -->
        <div class="tab-content active" data-tab="resumen">
          <div class="cards" style="grid-template-columns: repeat(4,1fr)">
            <div class="card"><div class="label">Total Debe</div><div class="value">${fmt(sumDr)}</div></div>
            <div class="card"><div class="label">Total Haber</div><div class="value">${fmt(sumCr)}</div></div>
            <div class="card"><div class="label">Líneas</div><div class="value">${e.lines.length}</div></div>
            <div class="card"><div class="label">Estado</div><div class="value" style="color:var(--ok); font-size:18px">● Posteado</div></div>
          </div>

          <div class="form-section" style="margin-top:18px">
            <h4>Cabecera</h4>
            <table class="table">
              <tr><td>ID interno</td><td><span class="kbd">JE-2026-${String(e.id).padStart(6,'0')}</span></td></tr>
              <tr><td>Fecha del asiento</td><td>${e.date}</td></tr>
              <tr><td>Período fiscal</td><td>2026 · Abril (abierto)</td></tr>
              <tr><td>Posteado</td><td>${e.date} 14:23:11 UTC · por <strong>${isExternal?'sistema':'leonardo.mercado'}</strong></td></tr>
              <tr><td>Origen</td><td><span class="tag ${isExternal?'ok':e.src==='MANUAL'?'warn':'muted'}">${e.src}</span></td></tr>
              ${isExternal?`<tr><td>Posting Rule</td><td><span class="kbd">SALE_VAT_21</span> · v3</td></tr>`:''}
              <tr><td>Sucursal</td><td>${e.branch}</td></tr>
              <tr><td>Unidad de negocio</td><td>${e.bu}</td></tr>
              <tr><td>Moneda</td><td>ARS · funcional · sin conversión</td></tr>
              <tr><td>Idempotency Key</td><td><span class="kbd">order-${e.id}</span></td></tr>
            </table>
          </div>
        </div>

        <!-- LÍNEAS -->
        <div class="tab-content" data-tab="lineas">
          <table class="table">
            <thead><tr><th>#</th><th>Cuenta</th><th>Descripción</th><th>Sucursal</th><th>BU</th><th class="num">Debe</th><th class="num">Haber</th></tr></thead>
            <tbody>
              ${e.lines.map((l,i)=>`<tr>
                <td>${i+1}</td>
                <td><span class="kbd">${l.acc}</span> ${l.name}</td>
                <td class="muted">${l.desc||'—'}</td>
                <td>${e.branch}</td>
                <td>${e.bu}</td>
                <td class="num"${l.dr?'':' style="color:var(--muted)"'}>${l.dr?fmt(l.dr):'·'}</td>
                <td class="num"${l.cr?'':' style="color:var(--muted)"'}>${l.cr?fmt(l.cr):'·'}</td>
              </tr>`).join('')}
              <tr style="background:var(--panel-2); font-weight:700">
                <td colspan="5">Totales</td>
                <td class="num">${fmt(sumDr)}</td>
                <td class="num">${fmt(sumCr)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ORIGEN -->
        <div class="tab-content" data-tab="origen">
          ${isExternal?`
            <div class="form-section">
              <h4>Evento original</h4>
              <table class="table">
                <tr><td>Trigger</td><td><span class="kbd">${e.src.replace('EXT:','')}</span></td></tr>
                <tr><td>Sistema fuente</td><td>SAP Business One · vía ERP Gateway</td></tr>
                <tr><td>Recibido en</td><td>${e.date} 14:23:09 UTC</td></tr>
                <tr><td>Posteado en</td><td>${e.date} 14:23:11 UTC <span class="muted">(2 ms procesamiento)</span></td></tr>
                <tr><td>Posting Rule aplicada</td><td><span class="kbd">SALE_VAT_21</span> versión 3</td></tr>
              </table>
            </div>
            <div class="form-section">
              <h4>Payload del evento</h4>
              <pre class="code">{
  "trigger": "${e.src.replace('EXT:','')}",
  "sourceReference": "INV-0001-00045",
  "entryDate": "${e.date}",
  "branch": "${e.branch}",
  "businessUnit": "${e.bu}",
  "currency": "ARS",
  "payload": {
    "total":  ${sumDr},
    "net":    ${sumCr - 21000},
    "vat":    21000,
    "customerRef": "CUST-2034",
    "items": 3
  }
}</pre>
            </div>
            <button class="btn">📥 Descargar payload completo</button>
            <button class="btn">🔍 Ver en Gateway</button>
          `:`
            <div class="form-section">
              <h4>Asiento manual</h4>
              <p>Este asiento fue creado manualmente desde la UI.</p>
              <table class="table">
                <tr><td>Creado por</td><td>leonardo.mercado@acme.com</td></tr>
                <tr><td>Aprobado por</td><td>cfo@acme.com (a las 14:35)</td></tr>
                <tr><td>Notas internas</td><td class="muted">Provisión sueldos abril según planilla #4521</td></tr>
                <tr><td>Comprobante adjunto</td><td>📎 planilla-sueldos-abr-2026.pdf · 142 KB</td></tr>
              </table>
            </div>
          `}
        </div>

        <!-- AUDIT TRAIL -->
        <div class="tab-content" data-tab="audit">
          <ul class="timeline">
            <li class="ok">
              <div class="meta">${e.date} · 14:23:11 UTC · IP 200.45.123.42</div>
              <div class="body"><strong>${isExternal?'sistema (gateway)':'leonardo.mercado'}</strong> posteó el asiento</div>
            </li>
            ${isExternal?`
            <li>
              <div class="meta">${e.date} · 14:23:10 UTC</div>
              <div class="body">Posting Rule <span class="kbd">SALE_VAT_21 v3</span> evaluó y generó las líneas</div>
            </li>
            <li>
              <div class="meta">${e.date} · 14:23:09 UTC</div>
              <div class="body">Evento <span class="kbd">${e.src.replace('EXT:','')}</span> recibido vía ERP Gateway</div>
            </li>`:`
            <li class="ok">
              <div class="meta">${e.date} · 14:35:02 UTC</div>
              <div class="body"><strong>cfo@acme.com</strong> aprobó el asiento</div>
            </li>
            <li class="warn">
              <div class="meta">${e.date} · 14:20:45 UTC</div>
              <div class="body"><strong>leonardo.mercado</strong> creó el borrador</div>
            </li>`}
          </ul>
          <p class="muted" style="font-size:12px; margin-top:14px">📜 El asiento es inmutable. Cualquier corrección se hace por reverso, que también queda en el audit log.</p>
        </div>

        <!-- RELACIONADOS -->
        <div class="tab-content" data-tab="rel">
          <h4>Asientos relacionados</h4>
          <p class="muted">Sin asientos relacionados.</p>
          <ul style="list-style:none; padding:0">
            <li class="rule-line"><strong>Reversos</strong><div class="muted" style="font-size:12px">Ninguno</div></li>
            <li class="rule-line"><strong>Asientos del mismo origen</strong><div class="muted" style="font-size:12px">Ninguno</div></li>
            <li class="rule-line"><strong>Asientos del cierre que afectan a estas cuentas</strong><div class="muted" style="font-size:12px">JE-CLOSE-2025 · refundición de cuentas de resultado</div></li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" onclick="closeModal(); openJournalEntryEditor(null,${id})">📋 Duplicar como nuevo</button>
        <button class="btn">📄 Imprimir voucher</button>
        <button class="btn">📥 Exportar</button>
        <button class="btn btn-danger" onclick="closeModal(); openReverseEntryDialog(${id})">⤺ Revertir asiento</button>
        <button class="btn btn-primary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `);
}

// ───── Reverso de Asiento ─────
function openReverseEntryDialog(id) {
  const e = DATA.diario.find(x => x.id === id);
  if (!e) return;
  const sumDr = e.lines.reduce((s,l)=>s+l.dr,0);

  openModal(`
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 760px">
      <div class="modal-header">
        <div>
          <h2>⤺ Revertir asiento <span class="kbd">#${e.id}</span></h2>
          <div class="muted">Genera un asiento espejo que compensa el original. El original NO se modifica.</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <div class="alert info">
          <div class="ico">ℹ️</div>
          <div class="body">
            <div class="t">El asiento original se conserva intacto</div>
            <div class="d">Se va a crear un nuevo asiento con débitos y créditos invertidos. Ambos asientos quedan vinculados en el audit log y en el detalle.</div>
          </div>
        </div>

        <div class="form-section">
          <h4>Asiento original</h4>
          <table class="table">
            <tr><td>ID</td><td><span class="kbd">#${e.id}</span></td></tr>
            <tr><td>Fecha</td><td>${e.date}</td></tr>
            <tr><td>Descripción</td><td>${e.desc}</td></tr>
            <tr><td>Total</td><td>${fmt(sumDr)}</td></tr>
            <tr><td>Origen</td><td><span class="tag ${e.src.startsWith('EXT')?'ok':e.src==='MANUAL'?'warn':'muted'}">${e.src}</span></td></tr>
          </table>
        </div>

        <div class="form-section">
          <h4>Configurar el reverso</h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Fecha del reverso <span class="req">*</span></label>
              <input type="date" value="2026-04-30"/>
              <span class="hint">Debe estar en un período abierto</span>
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <input type="text" value="Reverso de #${e.id} · ${e.desc}"/>
            </div>
          </div>
          <div class="form-grid full" style="margin-top:10px">
            <div class="form-group">
              <label>Razón del reverso <span class="req">*</span></label>
              <textarea rows="3" placeholder="Ej. Imputación errónea: el monto correspondía a otra sucursal..."></textarea>
              <span class="hint">Obligatorio · queda en el audit log de ambos asientos</span>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <select>
                <option>Corrección de error</option>
                <option>Anulación de operación</option>
                <option>Ajuste de período</option>
                <option>Re-imputación de cuenta</option>
                <option>Otra (especificar en notas)</option>
              </select>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px">
            <label class="toggle">
              <input type="checkbox" checked/>
              <div class="info"><div class="t">Notificar al originador</div><div class="d">Email a quien posteó el asiento original</div></div>
            </label>
            <label class="toggle">
              <input type="checkbox"/>
              <div class="info"><div class="t">Crear asiento corregido a continuación</div><div class="d">Después de revertir, abre el editor con un nuevo asiento ya pre-cargado</div></div>
            </label>
            <label class="toggle">
              <input type="checkbox"/>
              <div class="info"><div class="t">Requiere aprobación del CFO</div><div class="d">Para reversos de asientos > $100.000 (recomendado)</div></div>
            </label>
          </div>
        </div>

        <div class="form-section">
          <h4>Preview del asiento espejo que se va a crear</h4>
          <table class="table">
            <thead><tr><th>Cuenta</th><th class="num">Debe</th><th class="num">Haber</th></tr></thead>
            <tbody>
              ${e.lines.map(l => `<tr>
                <td><span class="kbd">${l.acc}</span> ${l.name}</td>
                <td class="num">${l.cr?fmt(l.cr):'·'}</td>
                <td class="num">${l.dr?fmt(l.dr):'·'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <p class="muted" style="font-size:12px; margin-top:8px">📌 Los Debe del original pasan a Haber y viceversa.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="closeModal(); alert('⤺ Reverso creado · JE-REV-${e.id} vinculado al original ${e.id} · audit log actualizado')">⤺ Crear reverso</button>
      </div>
    </div>
  `);
}

// ───── Importación masiva ─────
function openImportEntries() {
  openModal(`
    <div class="modal" onclick="event.stopPropagation()" style="max-width: 880px">
      <div class="modal-header">
        <div>
          <h2>📤 Importar asientos</h2>
          <div class="muted">Carga masiva desde Excel, CSV o evento bulk</div>
        </div>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button class="tab active" data-tab="csv"   onclick="switchTab('csv')">CSV / Excel</button>
          <button class="tab"        data-tab="api"   onclick="switchTab('api')">API bulk</button>
          <button class="tab"        data-tab="recur" onclick="switchTab('recur')">Recurrencias</button>
        </div>

        <div class="tab-content active" data-tab="csv">
          <div class="form-section">
            <h4>Subir archivo</h4>
            <div class="empty-state" style="cursor:pointer">
              <div class="ico">📁</div>
              <div><strong>Arrastrá un archivo aquí o clic para seleccionar</strong></div>
              <div class="muted" style="font-size:12px; margin-top:6px">CSV (UTF-8, separador ';' o ',') · Excel (.xlsx) · máx 5MB · hasta 1000 asientos</div>
              <button class="btn btn-primary" style="margin-top:12px">Seleccionar archivo</button>
            </div>
          </div>

          <div class="form-section">
            <h4>Plantilla esperada</h4>
            <p class="muted" style="margin-top:0">Una fila por <em>línea</em> de asiento. Asientos se agrupan por <span class="kbd">entry_id</span>.</p>
            <pre class="code">entry_id,date,description,line_seq,account,debit,credit,branch,bu,reference
1,2026-04-15,Venta factura 0045,1,1.1.02.001,121000,,CABA,RETAIL,INV-0045
1,2026-04-15,Venta factura 0045,2,4.1.01.001,,100000,CABA,RETAIL,INV-0045
1,2026-04-15,Venta factura 0045,3,2.1.05.001,,21000,CABA,RETAIL,INV-0045
2,2026-04-15,Compra insumos,1,5.2.01.001,42000,,CABA,RETAIL,
2,2026-04-15,Compra insumos,2,1.1.05.001,8820,,CABA,RETAIL,
2,2026-04-15,Compra insumos,3,2.1.01.001,,50820,CABA,RETAIL,</pre>
            <button class="btn">📥 Descargar plantilla CSV</button>
            <button class="btn">📥 Descargar plantilla Excel</button>
          </div>

          <div class="form-section">
            <h4>Opciones</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Modo de procesamiento</label>
                <select>
                  <option>All-or-nothing (transacción atómica)</option>
                  <option>Best-effort (importa lo válido, reporta errores)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Si la fecha está en período cerrado</label>
                <select>
                  <option>Rechazar (recomendado)</option>
                  <option>Mover al primer período abierto</option>
                </select>
              </div>
              <div class="form-group">
                <label>Si una cuenta no existe</label>
                <select>
                  <option>Rechazar el asiento</option>
                  <option>Crear cuenta automáticamente (no recomendado)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Idempotency Key</label>
                <select>
                  <option>Auto (hash del archivo)</option>
                  <option>Tomar de columna 'reference'</option>
                  <option>No usar (no recomendado)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Vista previa (tras subir el archivo)</h4>
            <div class="empty-state" style="padding:24px">Esperando archivo...</div>
          </div>
        </div>

        <div class="tab-content" data-tab="api">
          <p>Para integraciones programáticas, usá <span class="kbd">POST /api/v1/journal/post/bulk</span></p>
          <pre class="code">curl -X POST https://api.conta.example.com/v1/journal/post/bulk \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Idempotency-Key: import-2026-05-06-batch-1" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "all_or_nothing",
    "entries": [
      {
        "entryDate": "2026-04-15",
        "description": "Venta factura 0045",
        "branch": "CABA", "businessUnit": "RETAIL",
        "lines": [
          { "account": "1.1.02.001", "debit":  121000 },
          { "account": "4.1.01.001", "credit": 100000 },
          { "account": "2.1.05.001", "credit":  21000 }
        ]
      }
    ]
  }'</pre>
          <p class="muted" style="font-size:12px">Hasta 1000 asientos por request · idempotente · respuesta detallada con errores por índice</p>
        </div>

        <div class="tab-content" data-tab="recur">
          <h4>Asientos recurrentes activos</h4>
          <table class="table">
            <thead><tr><th>Plantilla</th><th>Frecuencia</th><th>Próxima ejecución</th><th></th></tr></thead>
            <tbody>
              <tr><td>Provisión sueldos</td><td>Mensual · día 30</td><td>2026-05-30</td><td><button class="btn btn-ghost">Editar</button></td></tr>
              <tr><td>Alquiler oficina CABA</td><td>Mensual · día 5</td><td>2026-05-05</td><td><button class="btn btn-ghost">Editar</button></td></tr>
              <tr><td>Servicios (luz, agua, gas)</td><td>Mensual · día 10</td><td>2026-05-10</td><td><button class="btn btn-ghost">Editar</button></td></tr>
              <tr><td>Amortización bienes de uso</td><td>Mensual · último día</td><td>2026-05-31</td><td><button class="btn btn-ghost">Editar</button></td></tr>
            </tbody>
          </table>
          <button class="btn btn-primary" style="margin-top:12px">+ Nueva recurrencia</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn">🧪 Validar sin importar</button>
        <button class="btn btn-primary">📥 Importar</button>
      </div>
    </div>
  `);
}
