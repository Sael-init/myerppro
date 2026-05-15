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
  const refSerieNumero    = opts?.refSerieNumero    ?? null;
  const ocultarDetraccion = opts?.ocultarDetraccion ?? false;
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
  const tieneDetrac   = doc.detraccion === true;

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
          <td style="text-align:center">${cant}</td>
          <td style="text-align:center">${unidad}</td>
          <td style="text-align:center;font-family:monospace">${codigo}</td>
          <td>${nombre}</td>
          <td style="text-align:right;font-family:monospace">${conv}</td>
          <td style="text-align:right;font-family:monospace">${precio}</td>
          <td style="text-align:right;font-family:monospace">${afecto}</td>
          <td style="text-align:right;font-family:monospace">${exoner}</td>
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
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }

    /* ── FONDO Y PÁGINA A4 ──────────────────────────────────────── */
    html, body { background: #d1d5db; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5pt;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 14px auto;
      background: #fff;
      padding: 11mm 13mm 15mm;
      box-shadow: 0 6px 32px rgba(0,0,0,.22);
    }

    /* ── BARRA BOTÓN IMPRIMIR ───────────────────────────────────── */
    .btn-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
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
      letter-spacing: .3px;
    }
    .btn-print:hover { background: #2d5080; }

    /* ── ENCABEZADO ─────────────────────────────────────────────── */
    .header { display: flex; border: 1px solid #9ca3af; }

    .h-left {
      flex: 1;
      padding: 10px 14px 8px;
      border-right: 1px solid #9ca3af;
    }
    .logos {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 7px;
    }
    .logos img { height: 50px; object-fit: contain; }
    .logos .sep { width: 1px; height: 40px; background: #d1d5db; }

    .emp-nombre {
      font-weight: 700;
      font-size: 8.8pt;
      text-transform: uppercase;
      line-height: 1.35;
    }
    .emp-giro {
      font-size: 6.8pt;
      color: #555;
      font-style: italic;
      margin-top: 2px;
      line-height: 1.45;
    }
    .emp-addr {
      font-size: 6.8pt;
      color: #333;
      margin-top: 4px;
      line-height: 1.4;
    }
    .emp-addr strong { font-weight: 700; }

    .h-right {
      width: 188px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      text-align: center;
    }
    .h-right .ruc {
      font-weight: 700;
      font-size: 9pt;
      padding: 8px 6px 5px;
      border-bottom: 1px solid #9ca3af;
      letter-spacing: .2px;
    }
    .h-right .doc-tipo {
      background: ${bannerColor};
      color: #fff;
      font-weight: 700;
      font-size: 8.8pt;
      text-transform: uppercase;
      letter-spacing: .4px;
      padding: 7px 6px;
      border-bottom: 1px solid #9ca3af;
    }
    .h-right .doc-num {
      font-weight: 700;
      font-size: 10pt;
      font-family: monospace;
      letter-spacing: .8px;
      padding: 8px 6px;
    }

    /* ── DATOS CLIENTE ──────────────────────────────────────────── */
    .cliente {
      border: 1px solid #9ca3af;
      border-top: none;
      padding: 6px 12px 5px;
    }
    .c-row {
      display: grid;
      align-items: baseline;
      margin-bottom: 2.5px;
    }
    .c-4 { grid-template-columns: 85px 1fr 95px 1fr; }
    .c-2 { grid-template-columns: 85px 1fr; }
    .lbl  { font-weight: 700; font-size: 7.5pt; text-transform: uppercase; }
    .val  { font-size: 8pt; }
    .val-bold { font-size: 8pt; font-weight: 700; }
    .r   { text-align: right; padding-right: 8px; }

    /* ── TABLA DETALLES ─────────────────────────────────────────── */
    .det-wrap { border: 1px solid #9ca3af; border-top: none; }
    .det-wrap table { width: 100%; border-collapse: collapse; }

    .det-wrap thead tr { background: #1e3a5f; color: #fff; }
    .det-wrap thead th {
      padding: 5px 4px;
      font-size: 6.8pt;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      border-right: 1px solid #2d5080;
      letter-spacing: .25px;
      white-space: nowrap;
    }
    .det-wrap thead th:last-child { border-right: none; }

    .det-wrap tbody tr { border-bottom: 1px solid #e5e7eb; }
    .det-wrap tbody tr:nth-child(even) { background: #f8fafc; }
    .det-wrap tbody td {
      padding: 3.5px 5px;
      font-size: 7.8pt;
      border-right: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .det-wrap tbody td:last-child { border-right: none; }

    /* ── FOOTER ─────────────────────────────────────────────────── */
    .footer { border: 1px solid #9ca3af; border-top: none; }

    .son-row {
      padding: 5px 12px;
      font-size: 8pt;
      border-bottom: 1px solid #e5e7eb;
    }
    .glosa-row {
      padding: 4px 12px;
      font-size: 8pt;
      border-bottom: 1px solid #e5e7eb;
      min-height: 20px;
    }
    .bottom-row { display: flex; }

    .nota-col {
      flex: 1;
      padding: 8px 12px;
      border-right: 1px solid #e5e7eb;
      font-size: 6.8pt;
      color: #555;
      font-style: italic;
      line-height: 1.55;
    }

    .totales-col { width: 222px; border-right: 1px solid #e5e7eb; }
    .totales-col table { width: 100%; border-collapse: collapse; }
    .totales-col td {
      padding: 3px 8px;
      font-size: 8pt;
      border-bottom: 1px solid #f0f0f0;
    }
    .totales-col td:last-child {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      white-space: nowrap;
    }
    .total-final td {
      background: #1e3a5f !important;
      color: #fff !important;
      font-weight: 700;
      font-size: 8.8pt;
      padding: 5px 8px;
    }

    .qr-col {
      width: 138px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }
    .qr-col img { width: 126px; height: 126px; }

    /* ── OBSERVACIONES ──────────────────────────────────────────── */
    .obs-box {
      border: 1px solid #9ca3af;
      border-top: none;
      padding: 7px 12px;
    }
    .obs-title { font-weight: 700; font-size: 9pt; margin-bottom: 5px; }
    .obs-item  { font-size: 8pt; margin-bottom: 2px; }
    .obs-item strong { font-weight: 700; }

    /* ── PRINT MEDIA ────────────────────────────────────────────── */
    @media print {
      html, body { background: #fff; }
      .page { margin: 0; padding: 8mm 12mm 12mm; box-shadow: none; }
      .btn-bar { display: none !important; }
    }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
<div class="page">

  <!-- BOTÓN IMPRIMIR -->
  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="h-left">
      <div class="logos">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo"/>` : ""}
      </div>
      <div class="emp-nombre">${EMPRESA_NOMBRE}</div>
      <div class="emp-giro">
        ${EMPRESA_GIRO}<br/>
        <em>${EMPRESA_GIRO_EN}</em>
      </div>
      <div class="emp-addr">
        <strong>Direccion:</strong> ${EMPRESA_DIRECCION}
      </div>
      ${doc.puntoVenta?.descripcion
        ? `<div class="emp-addr"><strong>Sucursal:</strong> ${doc.puntoVenta.descripcion}</div>`
        : ""}
    </div>
    <div class="h-right">
      <div class="ruc">R.U.C N° ${EMPRESA_RUC}</div>
      <div class="doc-tipo">${tipoDocLabel}</div>
      <div class="doc-num">${serieNum}</div>
    </div>
  </div>

  <!-- DATOS CLIENTE -->
  <div class="cliente">
    <div class="c-row c-4">
      <span class="lbl">Señor(es):</span>
      <span class="val-bold" style="grid-column:span 3">${doc.cliente?.descripcion ?? "-"}</span>
    </div>
    <div class="c-row c-4" style="margin-top:1px">
      <span class="lbl">Dirección:</span>
      <span class="val">${doc.cliente?.direccion ?? "-"}</span>
      <span class="lbl r">FECHA</span>
      <span class="val-bold">${fmtDate(doc.fecha_emision)}</span>
    </div>
    <div class="c-row c-4" style="margin-top:1px">
      <span class="lbl">${tipoDocId2}:</span>
      <span class="val" style="font-family:monospace">${numDocCliente}</span>
      <span></span><span></span>
    </div>
    <div class="c-row c-2" style="margin-top:1px">
      <span class="lbl">Forma de<br/>Pago:</span>
      <span class="val-bold">${formaPago}</span>
    </div>
    ${refSerieNumero ? `
    <div class="c-row c-2" style="margin-top:1px">
      <span class="lbl">Doc. Referencia:</span>
      <span class="val-bold" style="font-family:monospace">${refSerieNumero}</span>
    </div>` : ""}
  </div>

  <!-- TABLA DETALLES -->
  <div class="det-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:50px">Cantidad</th>
          <th style="width:60px">Und Medida</th>
          <th style="width:56px">Codigo</th>
          <th>Descripcion</th>
          <th style="width:70px">Conversion</th>
          <th style="width:65px">P. Unitario</th>
          <th style="width:70px">Afecto</th>
          <th style="width:70px">Exonerado</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="8" style="text-align:center;padding:14px;color:#aaa;font-style:italic">
            Sin detalles registrados
          </td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="son-row">SON: &nbsp;<strong>${doc.total_letras ?? ""}</strong></div>
    <div class="glosa-row">GLOSA: ${doc.observacion ?? ""}</div>
    <div class="bottom-row">
      <div class="nota-col">
        NOTA: Para Consultar el comprobante ingresa a<br/>
        https://xcore.pe/consulta-tu-comprobante/,<br/>
        Muchas gracias por su preferencia.
      </div>
      <div class="totales-col">
        <table>
          <tr><td>Total Ope. Gravadas</td>   <td>S/ ${fmt(doc.valorventa_afecto   ?? 0)}</td></tr>
          <tr><td>Total Ope. Exoneradas</td> <td>S/ ${fmt(doc.valorventa_inafecto ?? 0)}</td></tr>
          <tr><td>Total Ope. Gratuitas</td>  <td>S/ ${fmt(doc.valorventa_gratuito ?? 0)}</td></tr>
          <tr><td>Total IGV 18%</td>         <td>S/ ${fmt(doc.igv                 ?? 0)}</td></tr>
          <tr class="total-final">
            <td>TOTAL A PAGAR</td>
            <td>S/ ${fmt(doc.total ?? 0)}</td>
          </tr>
        </table>
      </div>
      <div class="qr-col">
        <img id="qr-img" src="${qrImgUrl}" alt="QR SUNAT"/>
      </div>
    </div>
  </div>

  <!-- OBSERVACIONES -->
  ${!ocultarDetraccion ? `
  <div class="obs-box">
    <div class="obs-title">Observaciones:</div>
    <div class="obs-item">
      <strong>Bien o Servicio</strong> : ${doc.codigo ?? "000"}&nbsp;
      ${tieneDetrac ? "Sujeto a detracción" : "Producto que no aplica detraccion"}
    </div>
    <div class="obs-item">
      <strong>% detracción</strong> : ${(doc.detraccion_porcentaje ?? 0).toFixed(2)}
    </div>
    <div class="obs-item">
      <strong>Monto detracción</strong> : ${(doc.detraccion_monto ?? 0).toFixed(2)}
    </div>
  </div>` : ""}

</div>

<script>
  // Esperar QR antes de lanzar diálogo de impresión
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