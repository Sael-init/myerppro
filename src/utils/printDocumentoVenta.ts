// src/utils/printDocumentoVenta.ts
// ─────────────────────────────────────────────────────────────────────────────
// Constantes de empresa
// ─────────────────────────────────────────────────────────────────────────────
const EMPRESA_RUC       = "20468985757";
const EMPRESA_NOMBRE    = "INTERCOMPANY & SEÑOR DE HUANCA S.A.C.";
const EMPRESA_GIRO      = "Importación Exportación & Comercialización de Productos Alimenticios Agroindustriales";
const EMPRESA_GIRO_EN   = "Import Exports & Agro-Industrial Product Trading Company";
const EMPRESA_DIRECCION = "AV. Circunvalacion del Club Golf Los Incas - Block A Nro. 170 Dpto. 1502 Santiago de Surco Lima - Lima";

// Mapeo código interno → código SUNAT para QR
const TIPO_DOC_SUNAT: Record<string, string> = {
  X007: "03", // Boleta
  X028: "01", // Factura
  X066: "99", // Interno
};

// Color del banner por tipo de documento
const TIPO_DOC_COLOR: Record<string, string> = {
  X007: "#2563eb", // Boleta  → azul
  X028: "#0f766e", // Factura → verde azulado
  X066: "#7c3aed", // Interno → violeta
};

// ─────────────────────────────────────────────────────────────────────────────
// QR string SUNAT
// ─────────────────────────────────────────────────────────────────────────────
function buildQrString(doc: any): string {
  const tipoDoc       = TIPO_DOC_SUNAT[doc.tipodoccomercialId] ?? "03";
  const numDocCliente = (doc.cliente?.numDocIdent ?? "0").trim();
  const soloDigitos   = numDocCliente.replace(/\D/g, "");
  const tipoDocId     = soloDigitos.length === 11 ? "6" : soloDigitos.length === 8 ? "1" : "0";
  const fecha         = new Date(doc.fecha_emision);
  const fechaStr      = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
  const igvStr        = (doc.igv   ?? 0).toFixed(6);
  const totalStr      = (doc.total ?? 0).toFixed(6);
  return `${EMPRESA_RUC}|${tipoDoc}|${doc.serie}|${doc.numero}|${igvStr}|${totalStr}|${fechaStr}|${tipoDocId}|${numDocCliente}||`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generador HTML — replica exacta de la boleta física en hoja A4
// logoUrl: archivo en /public/image/logo.png
//   → pasar `${window.location.origin}/image/logo.png` desde el componente
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlNotaCredito(doc: any, logoUrl: string, refSerieNumero: string | null = null): string {
  return generarHtmlBoleta(doc, logoUrl, { refSerieNumero, ocultarDetraccion: true });
}

export function generarHtmlBoleta(doc: any, logoUrl: string, opts?: { refSerieNumero?: string | null; ocultarDetraccion?: boolean }): string {
  const refSerieNumero = opts?.refSerieNumero ?? null;
  const qrData      = encodeURIComponent(buildQrString(doc));
  const qrImgUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}`;
  const bannerColor = TIPO_DOC_COLOR[doc.tipodoccomercialId] ?? "#2563eb";

  const fmtDate = (iso: string) => {
    try {
      const d     = new Date(iso);
      const day   = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("es-PE", { month: "long" });
      return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${d.getFullYear()}`;
    } catch { return iso; }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n ?? 0);

  const tipoDocLabel  = (doc.tipoDocumentoComercial?.descripcion ?? doc.tipodoccomercialId).toUpperCase();
  const numDocCliente = (doc.cliente?.numDocIdent ?? "0").trim();
  const soloDigitos   = numDocCliente.replace(/\D/g, "");
  const tipoDocId2    = soloDigitos.length === 11 ? "RUC" : soloDigitos.length === 8 ? "DNI" : "DOC";
  // Serie-Número: quitar ceros a la izquierda y repadear a 7 → "B004 - 0157779"
  const numeroStr = String(doc.numero ?? "").replace(/^0+/, "") || "0";
  const serieNum  = `${doc.serie} - ${numeroStr.padStart(7, "0")}`;

  // Forma de pago
  const formaPago = doc.formaPago?.descripcion ?? doc.condicion_pago ?? "-";

  // Filas de detalle
  const detalleRows = (doc.detalles ?? [])
    .map((det: any) => {
      const nombre  = (det.bien?.descripcion         ?? det.bienId).toUpperCase();
      const unidad  = (det.presentacion?.descripcion ?? det.presentacionId).toUpperCase();
      const codigo  = det.bien?.codAdmin?.toString() ?? det.bienId;
      const cant    = (det.cantidad ?? 0).toFixed(2);
      const conv    = `${(det.conversionTotal ?? det.cantidad ?? 0).toFixed(2)} kg`;
      const precio  = (det.precio ?? 0).toFixed(2);
      const afecto  = det.afectoInafecto ? fmt(det.importe ?? 0) : "0.00";
      const exoner  = !det.afectoInafecto ? fmt(det.importe ?? 0) : "0.00";
      return `
        <tr>
          <td>${cant}</td>
          <td>${unidad}</td>
          <td class="item-code">${codigo}</td>
          <td>${nombre}</td>
          <td class="num">${conv}</td>
          <td class="num">${precio}</td>
          <td class="num">${afecto}</td>
          <td class="num">${exoner}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${tipoDocLabel} ${doc.serie}-${doc.numero}</title>
  <style>
    :root{
      --navy:#12233f;
      --navy-2:#1c3a63;
      --teal:#0f6d66;
      --teal-light:#e7f3f1;
      --paper:#ffffff;
      --line:#d9dee5;
      --text:#1f2937;
      --muted:#6b7280;
      --accent:#c8963e;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:#eef1f4;}
    body{
      padding:28px;
      font-family:'Segoe UI',Arial,sans-serif;
      color:var(--text);
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }

    .btn-bar{display:flex;justify-content:flex-end;max-width:900px;margin:0 auto 10px;}
    .btn-print{background:var(--navy);color:#fff;border:none;padding:7px 20px;font-size:9pt;font-weight:700;border-radius:5px;cursor:pointer;letter-spacing:.3px;}
    .btn-print:hover{background:var(--navy-2);}

    .sheet{max-width:900px;margin:0 auto;background:var(--paper);box-shadow:0 4px 24px rgba(18,35,63,.12);border-radius:4px;overflow:hidden;}
    .strip{height:6px;background:linear-gradient(90deg,var(--navy),var(--teal),var(--accent));}

    /* HEADER */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding:36px 40px 24px;border-bottom:3px solid var(--navy);}
    .brand{display:flex;gap:16px;align-items:flex-start;}
    .brand-mark{width:56px;height:56px;border-radius:8px;background:linear-gradient(135deg,var(--navy),var(--teal));flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;letter-spacing:.5px;}
    .brand-text h1{margin:0 0 2px;font-size:18px;letter-spacing:.3px;color:var(--navy);}
    .brand-text .tagline{font-size:11.5px;color:var(--muted);font-style:italic;margin:0 0 8px;line-height:1.4;}
    .brand-text .addr{font-size:11.5px;color:var(--text);line-height:1.6;}
    .brand-text .addr b{color:var(--navy-2);}
    .doc-box{text-align:right;min-width:220px;}
    .ruc-line{font-size:12px;color:var(--muted);margin-bottom:10px;}
    .ruc-line b{color:var(--navy);font-size:13px;}
    .doc-type{background:${bannerColor};color:#fff;font-weight:700;font-size:14px;letter-spacing:1.5px;padding:9px 14px;border-radius:3px;margin-bottom:10px;display:inline-block;}
    .doc-number{font-size:20px;font-weight:700;color:var(--teal);letter-spacing:.5px;}

    /* META */
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:0 40px;padding:24px 40px;background:#f8f9fb;border-bottom:1px solid var(--line);font-size:12.5px;}
    .meta .row{display:flex;margin-bottom:8px;}
    .meta .row:last-child{margin-bottom:0;}
    .meta .label{width:110px;flex-shrink:0;color:var(--muted);font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:.4px;padding-top:1px;}
    .meta .value{font-weight:600;color:var(--text);}
    .meta-right{display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-end;}
    .fecha-pill{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;}
    .fecha-val{font-size:14px;font-weight:700;color:var(--navy);}

    /* TABLE */
    table.items{width:100%;border-collapse:collapse;margin:0;}
    table.items thead th{background:var(--navy);color:#fff;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;padding:12px 10px;text-align:left;font-weight:600;}
    table.items thead th.num{text-align:right;}
    table.items tbody td{padding:12px 10px;font-size:12.5px;border-bottom:1px solid var(--line);}
    table.items tbody td.num{text-align:right;font-variant-numeric:tabular-nums;}
    table.items tbody tr:nth-child(even){background:#fafbfc;}
    .item-code{color:var(--muted);font-size:11px;}

    /* LOWER */
    .lower{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;padding:24px 40px 8px;}
    .son-box{background:var(--teal-light);border-left:3px solid var(--teal);padding:12px 16px;border-radius:3px;font-size:12px;align-self:start;}
    .son-box .lbl{font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
    .glosa{margin-top:16px;font-size:11.5px;color:var(--muted);}
    .glosa .lbl{font-size:10px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
    .totals{border:1px solid var(--line);border-radius:4px;overflow:hidden;height:fit-content;}
    .totals .t-row{display:flex;justify-content:space-between;padding:9px 16px;font-size:12px;border-bottom:1px solid var(--line);}
    .totals .t-row span:first-child{color:var(--muted);}
    .totals .t-row span:last-child{font-weight:600;font-variant-numeric:tabular-nums;}
    .totals .t-final{background:var(--navy);color:#fff;padding:13px 16px;display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-bottom:none;}
    .totals .t-final span:last-child{color:var(--accent);font-size:16px;}

    /* FOOTER */
    .footer{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;padding:20px 40px 32px;}
    .note{font-size:10.5px;color:var(--muted);line-height:1.6;}
    .note a{color:var(--teal);}
    .obs{margin-top:14px;font-size:11px;background:#f8f9fb;border:1px solid var(--line);border-radius:4px;padding:12px 14px;}
    .obs .lbl{font-weight:700;color:var(--navy);text-transform:uppercase;font-size:9.5px;letter-spacing:.4px;margin-bottom:6px;}
    .obs div{margin-bottom:3px;color:var(--text);}
    .obs b{color:var(--navy-2);}
    .qr-img{width:120px;height:120px;border:1px solid var(--line);border-radius:4px;display:block;}

    @media print{
      html,body{background:#fff;padding:0;}
      .sheet{box-shadow:none;border-radius:0;}
      .btn-bar{display:none!important;}
    }
    @page{size:A4;margin:10mm;}
  </style>
</head>
<body>

  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <div class="sheet">
    <div class="strip"></div>

    <!-- HEADER -->
    <div class="header">
      <div class="brand">
        <div class="brand-mark">IC</div>
        <div class="brand-text">
          <h1>${EMPRESA_NOMBRE}</h1>
          <p class="tagline">${EMPRESA_GIRO}<br/><em>${EMPRESA_GIRO_EN}</em></p>
          <p class="addr">
            <b>Dirección:</b> ${EMPRESA_DIRECCION}
            ${doc.puntoVenta?.descripcion ? `<br/><b>Sucursal:</b> ${doc.puntoVenta.descripcion}` : ""}
          </p>
        </div>
      </div>
      <div class="doc-box">
        <div class="ruc-line">R.U.C. <b>${EMPRESA_RUC}</b></div>
        <div class="doc-type">${tipoDocLabel}</div>
        <div class="doc-number">${serieNum}</div>
      </div>
    </div>

    <!-- META / CLIENTE -->
    <div class="meta">
      <div>
        <div class="row"><span class="label">Señor(es)</span><span class="value">${doc.cliente?.descripcion ?? "-"}</span></div>
        <div class="row"><span class="label">Dirección</span><span class="value">${doc.cliente?.direccion ?? "-"}</span></div>
        <div class="row"><span class="label">${tipoDocId2}</span><span class="value" style="font-family:monospace">${numDocCliente}</span></div>
        <div class="row"><span class="label">Forma de pago</span><span class="value">${formaPago}</span></div>
        ${refSerieNumero ? `<div class="row"><span class="label">Doc. Referencia</span><span class="value" style="font-family:monospace">${refSerieNumero}</span></div>` : ""}
      </div>
      <div class="meta-right">
        <span class="fecha-pill">Fecha de emisión</span>
        <span class="fecha-val">${fmtDate(doc.fecha_emision)}</span>
      </div>
    </div>

    <!-- TABLA DETALLES -->
    <table class="items">
      <thead>
        <tr>
          <th>Cant.</th>
          <th>Und. Medida</th>
          <th>Código</th>
          <th>Descripción</th>
          <th class="num">Conversión</th>
          <th class="num">P. Unit.</th>
          <th class="num">Afecto</th>
          <th class="num">Exonerado</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="8" style="text-align:center;padding:20px;color:#aaa;font-style:italic">Sin detalles registrados</td></tr>`}
      </tbody>
    </table>

    <!-- LOWER: SON + TOTALES -->
    <div class="lower">
      <div>
        <div class="son-box">
          <div class="lbl">Son</div>
          ${doc.total_letras ?? ""}
        </div>
        <div class="glosa">
          <div class="lbl">Glosa</div>
          ${doc.observacion ?? "—"}
        </div>
      </div>
      <div class="totals">
        <div class="t-row"><span>Op. Gravadas</span><span>S/ ${fmt(doc.valorventa_afecto   ?? 0)}</span></div>
        <div class="t-row"><span>Op. Exoneradas</span><span>S/ ${fmt(doc.valorventa_exonerado ?? doc.valorventa_inafecto ?? 0)}</span></div>
        <div class="t-row"><span>Op. Gratuitas</span><span>S/ ${fmt(doc.valorventa_gratuito ?? 0)}</span></div>
        <div class="t-row"><span>IGV (18%)</span><span>S/ ${fmt(doc.igv ?? 0)}</span></div>
        <div class="t-final"><span>TOTAL A PAGAR</span><span>S/ ${fmt(doc.total ?? 0)}</span></div>
      </div>
    </div>

    <!-- FOOTER: NOTA + QR -->
    <div class="footer">
      <div>
        <p class="note">
          Para consultar este comprobante ingresa a<br/>
          <a href="https://xcore.pe/consulta-tu-comprobante/">https://xcore.pe/consulta-tu-comprobante/</a><br/>
          Muchas gracias por su preferencia.
        </p>
      </div>
      <img id="qr-img" class="qr-img" src="${qrImgUrl}" alt="QR SUNAT"/>
    </div>
  </div>

<script>
  window.addEventListener('load', function () {
    var img = document.getElementById('qr-img');
    if (!img) { setTimeout(function(){ window.print(); }, 500); return; }
    if (img.complete) {
      setTimeout(function(){ window.print(); }, 350);
    } else {
      img.onload  = function(){ setTimeout(function(){ window.print(); }, 250); };
      img.onerror = function(){ setTimeout(function(){ window.print(); }, 250); };
    }
  });
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Impresión interna (ticket simple): sacos / producto / precio / total
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlBoletaInterna(doc: any): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

  const fmtDate = (iso: string) => {
    try {
      const d     = new Date(iso);
      const day   = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}/${d.getFullYear()}`;
    } catch { return iso; }
  };

  const tipoDocLabel = (doc.tipoDocumentoComercial?.descripcion ?? doc.tipodoccomercialId ?? "DOCUMENTO").toUpperCase();
  const numeroStr    = String(doc.numero ?? "").replace(/^0+/, "") || "0";
  const serieNum     = `${doc.serie}-${numeroStr.padStart(7, "0")}`;
  const formaPago    = doc.formaPago?.descripcion ?? doc.condicion_pago ?? "—";

  const detalles   = doc.detalles ?? [];
  const totalSacos = detalles.reduce((sum: number, det: any) => sum + (det.cantidad ?? 0), 0);

  const detalleRows = detalles
    .map((det: any) => {
      const nombre   = (det.bien?.descripcion ?? det.bienId ?? "").toUpperCase();
      const cant     = (det.cantidad ?? 0).toFixed(2);
      const precio   = fmt(det.precio ?? 0);
      const importe  = fmt(det.importe ?? 0);
      return `
        <tr>
          <td style="text-align:center">${cant}</td>
          <td>${nombre}</td>
          <td style="text-align:right;font-family:monospace">${precio}</td>
          <td style="text-align:right;font-family:monospace;font-weight:700">${importe}</td>
        </tr>`;
    })
    .join("");

  const monedaSimbolo = doc.moneda?.simbolo ?? "S/";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${tipoDocLabel} ${serieNum} — USO INTERNO</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
    html, body { background: #d1d5db; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 14px auto;
      background: #fff;
      padding: 14mm 16mm 18mm;
      box-shadow: 0 6px 32px rgba(0,0,0,.22);
    }
    .btn-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    .btn-print {
      background: #1e3a5f;
      color: #fff;
      border: none;
      padding: 7px 20px;
      font-size: 9pt;
      font-weight: 700;
      border-radius: 5px;
      cursor: pointer;
    }
    .btn-print:hover { background: #2d5080; }

    /* ── ENCABEZADO ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2.5px solid #1e3a5f;
    }
    .empresa-nombre {
      font-size: 13pt;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e3a5f;
      line-height: 1.35;
      max-width: 58%;
    }
    .doc-box {
      text-align: center;
      border: 2px solid #1e3a5f;
      padding: 8px 18px;
      border-radius: 4px;
      min-width: 140px;
    }
    .doc-tipo {
      font-size: 12pt;
      font-weight: 900;
      color: #1e3a5f;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .doc-num {
      font-size: 10pt;
      font-family: monospace;
      font-weight: 700;
      color: #333;
      margin-top: 4px;
    }

    /* ── INFO ROW ── */
    .info-row {
      display: flex;
      gap: 28px;
      margin-bottom: 14px;
    }
    .info-item .lbl {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      letter-spacing: .3px;
    }
    .info-item .val {
      font-size: 9pt;
      font-weight: 600;
      color: #111;
      margin-top: 1px;
    }

    /* ── CLIENTE ── */
    .cliente-section {
      border: 1.5px solid #1e3a5f;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 16px;
    }
    .cliente-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 3px;
    }
    .cliente-nombre {
      font-size: 11pt;
      font-weight: 800;
      color: #1e3a5f;
    }
    .cliente-ruc {
      font-size: 8pt;
      color: #555;
      margin-top: 2px;
    }

    /* ── TABLA ── */
    .det-table {
      width: 100%;
      border-collapse: collapse;
    }
    .det-table thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    .det-table thead th {
      padding: 7px 8px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: .3px;
      border-right: 1px solid #2d5080;
    }
    .det-table thead th:last-child { border-right: none; }
    .det-table thead th:nth-child(2) { text-align: left; }
    .det-table tbody tr { border-bottom: 1px solid #e5e7eb; }
    .det-table tbody tr:nth-child(even) { background: #f8fafc; }
    .det-table tbody td {
      padding: 5px 8px;
      font-size: 9pt;
      border-right: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .det-table tbody td:last-child { border-right: none; }

    /* ── TOTAL SACOS ── */
    .sacos-row {
      border-top: 1.5px solid #9ca3af;
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      background: #f1f5f9;
    }

    /* ── SELLO ── */
    .stamp-area {
      display: flex;
      justify-content: flex-end;
      margin: 14px 0 10px;
    }

    /* ── TOTAL A PAGAR ── */
    .total-pagar {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
    }
    .total-pagar .tp-label {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: .5px;
    }
    .total-pagar .tp-amount {
      font-size: 14pt;
      font-weight: 900;
      font-family: monospace;
    }

    @media print {
      html, body { background: #fff; }
      .page { margin: 0; padding: 10mm 14mm; box-shadow: none; }
      .btn-bar { display: none !important; }
    }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
<div class="page">

  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="empresa-nombre">${EMPRESA_NOMBRE}</div>
    <div class="doc-box">
      <div class="doc-tipo">${tipoDocLabel}</div>
      <div class="doc-num">${serieNum}</div>
    </div>
  </div>

  <!-- INFO -->
  <div class="info-row">
    <div class="info-item">
      <div class="lbl">N° de Documento</div>
      <div class="val" style="font-family:monospace">${serieNum}</div>
    </div>
    <div class="info-item">
      <div class="lbl">Emisión</div>
      <div class="val">${fmtDate(doc.fecha_emision)}</div>
    </div>
    <div class="info-item">
      <div class="lbl">Condición de Pago</div>
      <div class="val">${formaPago}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="cliente-section">
    <div class="cliente-label">Cliente</div>
    <div class="cliente-nombre">${doc.cliente?.descripcion ?? "—"}</div>
    <div class="cliente-ruc">RUC/DNI: ${doc.cliente?.numDocIdent ?? "—"}</div>
  </div>

  <!-- TABLA DETALLE -->
  <table class="det-table">
    <thead>
      <tr>
        <th style="width:80px">Sacos</th>
        <th>Producto</th>
        <th style="width:95px;text-align:right">Precio</th>
        <th style="width:100px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows ||
        `<tr><td colspan="4" style="text-align:center;padding:16px;color:#aaa;font-style:italic">Sin detalles</td></tr>`}
    </tbody>
  </table>

  <!-- TOTAL SACOS -->
  <div class="sacos-row">
    <strong>Total de sacos:</strong>
    <span style="font-family:monospace;font-weight:700">${totalSacos.toFixed(2)}</span>
  </div>

  <!-- SELLO -->
  <div class="stamp-area">
    <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#1e3a5f" stroke-width="2.5" stroke-dasharray="5,3"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
      <text x="50" y="42" font-family="Arial" font-size="7.5" font-weight="bold" fill="#1e3a5f" text-anchor="middle">INTERCOMPANY &amp;</text>
      <text x="50" y="52" font-family="Arial" font-size="7" fill="#1e3a5f" text-anchor="middle">SEÑOR DE HUANCA</text>
      <text x="50" y="62" font-family="Arial" font-size="7" fill="#1e3a5f" text-anchor="middle">S.A.C.</text>
    </svg>
  </div>

  <!-- TOTAL A PAGAR -->
  <div class="total-pagar">
    <span class="tp-label">TOTAL A PAGAR</span>
    <span class="tp-amount">${monedaSimbolo} ${fmt(doc.total ?? 0)}</span>
  </div>

</div>
<script>
  window.addEventListener('load', function () {
    setTimeout(function(){ window.print(); }, 350);
  });
</script>
</body>
</html>`;
}