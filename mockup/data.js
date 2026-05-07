// Mock data for the Conta mockup. Static; no backend.
const fmt = (n) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n);
const fmtN = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);

const DATA = {
  kpis: {
    activo: 14230500, pasivo: 5120000, pn: 9110500, resultadoMes: 320450, resultadoDelta: 12.4,
    liquidez: 1.10, pruebaAcida: 0.82, ROE: 0.142, ROA: 0.061,
  },
  cashflowMonthly: {
    labels: ['May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr'],
    operativo: [120,145,180,160,190,210,205,240,260,250,280,310].map(x=>x*1000),
    inversion: [-30,-20,-50,-15,-40,-25,-30,-60,-20,-15,-25,-35].map(x=>x*1000),
    financiacion: [10,5,-20,15,0,-10,5,30,-10,5,0,-5].map(x=>x*1000),
  },
  ingresoEgresoMes: {
    labels: ['Ventas','Servicios','Otros ing.','Costos','Sueldos','Alquiler','Impuestos','Otros gtos.'],
    values: [1200000, 320000, 45000, -540000, -380000, -85000, -160000, -80000]
  },
  topCuentas: [
    { code:'1.1.02.001', name:'Banco Galicia',          amount: 3400000 },
    { code:'1.1.01.001', name:'Caja general',           amount: 1240000 },
    { code:'4.1.01.001', name:'Ventas',                 amount: 1100000 },
    { code:'5.1.01.001', name:'Costo de mercadería',    amount:  540000 },
    { code:'2.1.05.001', name:'IVA Débito Fiscal',      amount:  231000 },
  ],
  bus: [
    { name: 'Retail',     roi: 14, margen: 32, color:'#6c8cff' },
    { name: 'Mayorista',  roi:  9, margen: 18, color:'#4dd4ac' },
    { name: 'Online',     roi: 22, margen: 41, color:'#f5a524' },
    { name: 'Servicios',  roi: 11, margen: 25, color:'#ef4444' },
  ],
  alerts: [
    { sev:'crit', t:'Liquidez corriente cayó a 1.10× (umbral 1.30×)', d:'Sucursal CABA y Online concentran la baja' },
    { sev:'warn', t:'Sucursal CABA: gastos 18% por encima del presupuesto', d:'Mes corriente · revisar imputaciones' },
    { sev:'warn', t:'3 facturas de proveedores vencen en 5 días', d:'Total $ 480.000 · CxP 31-60' },
    { sev:'info', t:'Cierre próximo: 5 días', d:'Tenés 2 conciliaciones bancarias pendientes' },
  ],

  // Libro Diario
  diario: [
    { id:1234, date:'2026-04-15', desc:'Venta factura A-0001-00045', branch:'CABA', bu:'Retail', src:'EXT:sale.created', lines:[
      { acc:'1.1.02.001', name:'Banco Galicia',     dr:121000, cr:0 },
      { acc:'4.1.01.001', name:'Ventas',            dr:0, cr:100000 },
      { acc:'2.1.05.001', name:'IVA Débito Fiscal', dr:0, cr: 21000 },
    ]},
    { id:1235, date:'2026-04-15', desc:'Compra insumos prov. 1234', branch:'CABA', bu:'Retail', src:'EXT:purchase.created', lines:[
      { acc:'5.2.01.001', name:'Insumos',           dr:42000, cr:0 },
      { acc:'1.1.05.001', name:'IVA Crédito Fiscal',dr: 8820, cr:0 },
      { acc:'2.1.01.001', name:'Proveedores',       dr:0, cr:50820 },
    ]},
    { id:1236, date:'2026-04-16', desc:'Cobranza factura A-0001-00040', branch:'Rosario', bu:'Mayorista', src:'EXT:payment.received', lines:[
      { acc:'1.1.02.001', name:'Banco Galicia',     dr:75000, cr:0 },
      { acc:'1.1.03.001', name:'Deudores por venta',dr:0, cr:75000 },
    ]},
    { id:1237, date:'2026-04-17', desc:'Sueldos abril', branch:'CABA', bu:'Servicios', src:'MANUAL', lines:[
      { acc:'5.3.01.001', name:'Sueldos y jornales', dr:380000, cr:0 },
      { acc:'2.1.03.001', name:'Sueldos a pagar',    dr:0, cr:300000 },
      { acc:'2.1.04.001', name:'Cargas sociales',    dr:0, cr: 80000 },
    ]},
    { id:1238, date:'2026-04-18', desc:'Remesa CABA → Rosario', branch:'CABA', bu:'-', src:'REMITTANCE', lines:[
      { acc:'1.1.99.001', name:'Cuenta puente remesa', dr:0, cr:200000 },
      { acc:'1.1.02.001', name:'Banco Galicia',        dr:0, cr:0 },
    ]},
    { id:1239, date:'2026-04-18', desc:'Remesa CABA → Rosario (recepción)', branch:'Rosario', bu:'-', src:'REMITTANCE', lines:[
      { acc:'1.1.02.002', name:'Banco Macro Rosario',  dr:200000, cr:0 },
      { acc:'1.1.99.001', name:'Cuenta puente remesa', dr:0, cr:200000 },
    ]},
    { id:1240, date:'2026-04-20', desc:'Venta online plataforma', branch:'Online', bu:'Online', src:'EXT:sale.created', lines:[
      { acc:'1.1.02.003', name:'MercadoPago',        dr:60500, cr:0 },
      { acc:'4.1.02.001', name:'Ventas online',      dr:0, cr:50000 },
      { acc:'2.1.05.001', name:'IVA Débito Fiscal',  dr:0, cr:10500 },
    ]},
  ],

  // Plan de cuentas
  plan: [
    { code:'1', name:'ACTIVO', level:1, balance:14230500 },
      { code:'1.1', name:'Activo Corriente', level:2, balance:9100000 },
        { code:'1.1.01', name:'Caja y bancos', level:3, balance:5800000 },
          { code:'1.1.01.001', name:'Caja general', level:4, balance:230500 },
          { code:'1.1.01.002', name:'Caja chica', level:4, balance:12000 },
          { code:'1.1.02.001', name:'Banco Galicia', level:4, balance:3400000 },
          { code:'1.1.02.002', name:'Banco Macro Rosario', level:4, balance:1900000 },
          { code:'1.1.02.003', name:'MercadoPago', level:4, balance:257500 },
        { code:'1.1.03', name:'Créditos por ventas', level:3, balance:1800000 },
          { code:'1.1.03.001', name:'Deudores por venta', level:4, balance:1800000 },
        { code:'1.1.04', name:'Inventario', level:3, balance:1500000 },
      { code:'1.2', name:'Activo No Corriente', level:2, balance:5130500 },
        { code:'1.2.01.001', name:'Bienes de uso', level:4, balance:5130500 },
    { code:'2', name:'PASIVO', level:1, balance:5120000 },
      { code:'2.1', name:'Pasivo Corriente', level:2, balance:3120000 },
        { code:'2.1.01.001', name:'Proveedores', level:4, balance:1800000 },
        { code:'2.1.03.001', name:'Sueldos a pagar', level:4, balance:300000 },
        { code:'2.1.04.001', name:'Cargas sociales', level:4, balance:80000 },
        { code:'2.1.05.001', name:'IVA Débito Fiscal', level:4, balance:940000 },
      { code:'2.2', name:'Pasivo No Corriente', level:2, balance:2000000 },
    { code:'3', name:'PATRIMONIO NETO', level:1, balance:9110500 },
      { code:'3.1.01.001', name:'Capital social', level:4, balance:5000000 },
      { code:'3.2.01.001', name:'Resultados acumulados', level:4, balance:4110500 },
    { code:'4', name:'INGRESOS', level:1, balance:1565000 },
      { code:'4.1.01.001', name:'Ventas', level:4, balance:1100000 },
      { code:'4.1.02.001', name:'Ventas online', level:4, balance:420000 },
      { code:'4.2.01.001', name:'Otros ingresos', level:4, balance:45000 },
    { code:'5', name:'EGRESOS', level:1, balance:1245000 },
      { code:'5.1.01.001', name:'Costo de mercadería', level:4, balance:540000 },
      { code:'5.2.01.001', name:'Insumos', level:4, balance:42000 },
      { code:'5.3.01.001', name:'Sueldos y jornales', level:4, balance:380000 },
      { code:'5.4.01.001', name:'Alquileres', level:4, balance:85000 },
      { code:'5.5.01.001', name:'Impuestos', level:4, balance:160000 },
      { code:'5.9.01.001', name:'Otros gastos', level:4, balance:80000 },
  ],

  // Posting Rules
  rules: [
    { code:'SALE_VAT_21',     trigger:'external.sale.created',    enabled:true,  version:3, lastUsed:'hoy' },
    { code:'SALE_EXEMPT',     trigger:'external.sale.created',    enabled:true,  version:1, lastUsed:'ayer' },
    { code:'PURCHASE_VAT_21', trigger:'external.purchase.created',enabled:true,  version:5, lastUsed:'hoy' },
    { code:'PAYMENT_RCV',     trigger:'external.payment.received',enabled:true,  version:2, lastUsed:'hoy' },
    { code:'PAYMENT_OUT',     trigger:'external.payment.sent',    enabled:true,  version:2, lastUsed:'hoy' },
    { code:'INVENTORY_ADJ',   trigger:'external.inventory.adjust',enabled:false, version:1, lastUsed:'2 sem' },
    { code:'PAYROLL_RUN',     trigger:'manual',                   enabled:true,  version:4, lastUsed:'mes' },
    { code:'FX_REVALUATION',  trigger:'cron.monthly',             enabled:true,  version:2, lastUsed:'mes' },
  ],

  remesas: [
    { id:'R-0091', date:'2026-04-18', from:'CABA',    to:'Rosario',   amount:200000, status:'conciliada' },
    { id:'R-0092', date:'2026-04-22', from:'CABA',    to:'Mendoza',   amount:150000, status:'pendiente' },
    { id:'R-0093', date:'2026-04-25', from:'Online',  to:'CABA',      amount: 90000, status:'conciliada' },
    { id:'R-0094', date:'2026-04-28', from:'Mendoza', to:'CABA',      amount: 35000, status:'observada' },
  ],

  trialBalance: [
    { code:'1.1.01.001', name:'Caja general',         dr:520000, cr:289500 },
    { code:'1.1.02.001', name:'Banco Galicia',        dr:5800000, cr:2400000 },
    { code:'1.1.03.001', name:'Deudores por venta',   dr:2700000, cr: 900000 },
    { code:'2.1.01.001', name:'Proveedores',          dr:1200000, cr:3000000 },
    { code:'2.1.05.001', name:'IVA Débito Fiscal',    dr: 100000, cr:1040000 },
    { code:'3.1.01.001', name:'Capital social',       dr:0,       cr:5000000 },
    { code:'4.1.01.001', name:'Ventas',               dr:0,       cr:1100000 },
    { code:'5.3.01.001', name:'Sueldos y jornales',   dr:380000,  cr:0 },
  ],

  balanceAnalitico: [
    { code:'1.1.02.001', name:'Banco Galicia',       type:'Activo',     sector:'Operación',      dr:5800000, cr:2400000 },
    { code:'1.1.03.001', name:'Deudores por venta',  type:'Activo',     sector:'Comercial',      dr:2700000, cr: 900000 },
    { code:'2.1.01.001', name:'Proveedores',         type:'Pasivo',     sector:'Abastecimiento', dr:1200000, cr:3000000 },
    { code:'2.1.05.001', name:'IVA Débito Fiscal',   type:'Pasivo',     sector:'Fiscal',         dr: 100000, cr:1040000 },
    { code:'4.1.01.001', name:'Ventas',              type:'Ingresos',   sector:'Comercial',      dr:      0, cr:1100000 },
    { code:'5.3.01.001', name:'Sueldos y jornales',  type:'Egresos',    sector:'Operación',      dr: 380000, cr:      0 },
  ],

  balanceAnaliticoSector: [
    { sector:'Operación',      balance: 3780000 },
    { sector:'Comercial',      balance:  700000 },
    { sector:'Abastecimiento', balance:-1800000 },
    { sector:'Fiscal',         balance: -940000 },
  ],

  sectores: [
    { code:'SEC-OPS',  name:'Operación',      use:'Tesorería, sueldos, caja', active:true },
    { code:'SEC-COM',  name:'Comercial',      use:'Ventas, cobranzas y clientes', active:true },
    { code:'SEC-ABS',  name:'Abastecimiento', use:'Compras y proveedores', active:true },
    { code:'SEC-FISC', name:'Fiscal',         use:'IVA, impuestos y percepciones', active:true },
  ],

  cuentasPorTipoSector: [
    { type:'Ingresos', sector:'Comercial',      account:'4.1.01.001', accountName:'Ventas',             rule:'Default ventas locales' },
    { type:'Ingresos', sector:'Operación',      account:'4.1.02.001', accountName:'Ventas online',      rule:'Canal digital' },
    { type:'Egresos',  sector:'Abastecimiento', account:'5.1.01.001', accountName:'Costo de mercadería',rule:'Compras de stock' },
    { type:'Egresos',  sector:'Operación',      account:'5.3.01.001', accountName:'Sueldos y jornales', rule:'Nómina mensual' },
    { type:'Pasivo',   sector:'Fiscal',         account:'2.1.05.001', accountName:'IVA Débito Fiscal',  rule:'Determinación fiscal' },
    { type:'Activo',   sector:'Operación',      account:'1.1.02.001', accountName:'Banco Galicia',      rule:'Cuenta bancaria principal' },
  ],

  agedReceivables: {
    labels: ['0-30','31-60','61-90','+90'],
    values: [1200000, 380000, 150000, 70000],
  },
  agedPayables: {
    labels: ['0-30','31-60','61-90','+90'],
    values: [950000, 480000, 220000, 150000],
  },
  agedCxCDetail: [
    { customer:'Distribuidora Norte SA',  total:540000, b1:300000, b2:140000, b3:60000, b4:40000 },
    { customer:'Logística del Sur SRL',   total:420000, b1:280000, b2:100000, b3:40000, b4:0 },
    { customer:'Tecno-Insumos SA',        total:330000, b1:200000, b2: 80000, b3:30000, b4:20000 },
    { customer:'Comercial La Plata',      total:230000, b1:180000, b2: 30000, b3:20000, b4:0 },
    { customer:'Mayorista Central',       total:180000, b1:120000, b2: 30000, b3: 0,    b4:30000 },
    { customer:'Otros (28 clientes)',     total: 70000, b1: 70000, b2:0,      b3:0,     b4:0 },
  ],
  agedCxPDetail: [
    { supplier:'Importadora Andina',      total:480000, b1:200000, b2:180000, b3:60000, b4:40000 },
    { supplier:'Transporte Bahía',        total:320000, b1:240000, b2: 50000, b3:30000, b4:0 },
    { supplier:'Servicios MR',            total:280000, b1:180000, b2: 70000, b3:30000, b4:0 },
    { supplier:'Sueldos y cargas',        total:380000, b1:380000, b2:0,      b3:0,     b4:0 },
    { supplier:'AFIP IVA',                total:240000, b1:240000, b2:0,      b3:0,     b4:0 },
    { supplier:'Otros (15)',              total:100000, b1: 60000, b2: 30000, b3:10000, b4:0 },
  ],

  cashflowDirecto: [
    { concept:'Cobranzas a clientes',          jan: 1200, feb: 1350, mar: 1280, abr: 1420 },
    { concept:'(–) Pagos a proveedores',       jan:-680,  feb:-720,  mar:-700,  abr:-740 },
    { concept:'(–) Pagos al personal',         jan:-380,  feb:-380,  mar:-380,  abr:-380 },
    { concept:'(–) Pagos de impuestos',        jan:-180,  feb:-160,  mar:-200,  abr:-160 },
    { concept:'Flujo operativo',               jan:-40,   feb: 90,   mar: 0,    abr: 140, total:true },
    { concept:'(–) Inversiones en bienes',     jan: 0,    feb:-50,   mar:-30,   abr:-20 },
    { concept:'Flujo de inversión',            jan: 0,    feb:-50,   mar:-30,   abr:-20, total:true },
    { concept:'Préstamos tomados',             jan: 0,    feb: 0,    mar: 0,    abr: 0 },
    { concept:'Flujo financiero',              jan: 0,    feb: 0,    mar: 0,    abr: 0, total:true },
    { concept:'Variación neta de efectivo',    jan:-40,   feb: 40,   mar:-30,   abr: 120, grand:true },
  ],

  evolucionPN: [
    { ejercicio:'Saldo al 31/12/2024',  capital:5000, reservas: 800, resAcum:2900, resEjer:0,    total:8700 },
    { ejercicio:'Resultado 2025',       capital:0,    reservas:0,    resAcum:0,    resEjer:1100, total:1100 },
    { ejercicio:'Distribución dividendos', capital:0, reservas:0,    resAcum:-300, resEjer:0,    total:-300 },
    { ejercicio:'Pase a reservas',      capital:0,    reservas:200,  resAcum:-200, resEjer:0,    total:0 },
    { ejercicio:'Saldo al 31/12/2025',  capital:5000, reservas:1000, resAcum:2400, resEjer:1100, total:9500 },
    { ejercicio:'Resultado abril 2026', capital:0,    reservas:0,    resAcum:0,    resEjer:320,  total:320 },
    { ejercicio:'Saldo al 30/04/2026',  capital:5000, reservas:1000, resAcum:3500, resEjer:610,  total:10110 },
  ],

  rentSucursal: [
    { branch:'CABA',     ventas: 5800, costos: 2300, gastos: 1900, resultado: 1600, margen: 27.6, ranking:1 },
    { branch:'Online',   ventas: 2400, costos:  900, gastos:  650, resultado:  850, margen: 35.4, ranking:2 },
    { branch:'Rosario',  ventas: 3200, costos: 1500, gastos: 1100, resultado:  600, margen: 18.8, ranking:3 },
    { branch:'Mendoza',  ventas: 1400, costos:  800, gastos:  500, resultado:  100, margen:  7.1, ranking:4 },
  ],

  rentBU: [
    { bu:'Retail',     ventas:6200, costos:2700, gastos:1900, contribucion:1600, margen:25.8 },
    { bu:'Mayorista',  ventas:3800, costos:2100, gastos:1300, contribucion: 400, margen:10.5 },
    { bu:'Online',     ventas:2400, costos: 900, gastos: 650, contribucion: 850, margen:35.4 },
    { bu:'Servicios',  ventas: 800, costos: 200, gastos: 350, contribucion: 250, margen:31.3 },
  ],

  gastosBreakdown: [
    { categoria:'Sueldos y cargas',  monto:380000, porc:30.5, var:'+5%' },
    { categoria:'Costo mercadería',  monto:540000, porc:43.4, var:'+12%' },
    { categoria:'Alquiler',          monto: 85000, porc: 6.8, var: '0%' },
    { categoria:'Impuestos',         monto:160000, porc:12.9, var:'+8%' },
    { categoria:'Servicios',         monto: 42000, porc: 3.4, var:'+3%' },
    { categoria:'Insumos',           monto: 28000, porc: 2.2, var:'-2%' },
    { categoria:'Mantenimiento',     monto:  8000, porc: 0.6, var:'+1%' },
    { categoria:'Otros',             monto:  2000, porc: 0.2, var: '0%' },
  ],

  presupuesto: [
    { categoria:'Ventas',           presupuestado:1500000, real:1565000, desvio:65000,  porc:  4.3, sem:'ok' },
    { categoria:'Costo mercadería', presupuestado:-500000, real:-540000, desvio:-40000, porc: -8.0, sem:'warn' },
    { categoria:'Sueldos',          presupuestado:-380000, real:-380000, desvio: 0,     porc:  0.0, sem:'ok' },
    { categoria:'Alquiler',         presupuestado: -85000, real: -85000, desvio: 0,     porc:  0.0, sem:'ok' },
    { categoria:'Impuestos',        presupuestado:-140000, real:-160000, desvio:-20000, porc:-14.3, sem:'crit' },
    { categoria:'Servicios',        presupuestado: -50000, real: -42000, desvio:  8000, porc: 16.0, sem:'ok' },
    { categoria:'Otros gastos',     presupuestado: -80000, real: -78000, desvio:  2000, porc:  2.5, sem:'ok' },
    { categoria:'Resultado neto',   presupuestado: 265000, real: 280000, desvio: 15000, porc:  5.7, sem:'ok' },
  ],

  ivaVentas: [
    { fecha:'2026-04-15', tipo:'A', nro:'0001-00045', cliente:'Distribuidora Norte', neto:100000, iva:21000, total:121000 },
    { fecha:'2026-04-16', tipo:'A', nro:'0001-00046', cliente:'Tecno Insumos',       neto: 80000, iva:16800, total: 96800 },
    { fecha:'2026-04-18', tipo:'B', nro:'0002-00120', cliente:'Consumidor Final',    neto: 12000, iva: 2520, total: 14520 },
    { fecha:'2026-04-20', tipo:'A', nro:'0001-00047', cliente:'Mayorista Central',   neto:150000, iva:31500, total:181500 },
    { fecha:'2026-04-22', tipo:'A', nro:'0001-00048', cliente:'Logística Sur',       neto: 90000, iva:18900, total:108900 },
  ],
  ivaCompras: [
    { fecha:'2026-04-12', tipo:'A', nro:'0010-01234', proveedor:'Importadora Andina', neto: 42000, iva: 8820, total: 50820 },
    { fecha:'2026-04-15', tipo:'A', nro:'0007-00567', proveedor:'Servicios MR',       neto: 28000, iva: 5880, total: 33880 },
    { fecha:'2026-04-18', tipo:'A', nro:'0001-00890', proveedor:'Transporte Bahía',   neto: 35000, iva: 7350, total: 42350 },
  ],

  conciliacion: {
    matched: [
      { fecha:'2026-04-15', concepto:'Pago factura A-0001-00045', monto: 121000 },
      { fecha:'2026-04-16', concepto:'Cobro cliente XYZ',         monto:  75000 },
      { fecha:'2026-04-18', concepto:'Transferencia recibida',    monto: 200000 },
    ],
    outstanding: [ // en mayor, no en banco
      { fecha:'2026-04-28', concepto:'Cheque emitido N° 0345', monto:-45000 },
      { fecha:'2026-04-29', concepto:'Cheque emitido N° 0346', monto:-22000 },
    ],
    unidentified: [ // en banco, no en mayor
      { fecha:'2026-04-30', concepto:'Comisión mantenimiento',   monto: -1200 },
      { fecha:'2026-04-30', concepto:'Crédito sin identificar',  monto: 18500 },
    ],
  },
};
