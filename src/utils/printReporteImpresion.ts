// src/utils/printReporteImpresion.ts
// Generadores de impresión para el endpoint GET /DocumentoVenta/reporte-impresion/{id}:
// "Resumen Boletas" (comprobante), "Boleta Masiva" (boletasMasivas) y "Letra" (letra).
// Reutiliza el mismo sistema visual (CSS navy/teal) que printDocumentoVenta.ts para
// mantener consistencia con el resto de documentos impresos del sistema.

import type {
  ReporteImpresionCabecera,
  ReporteImpresionDetalle,
  ReporteImpresionLetra,
} from "@/types/Documentoventa.types";

// Color del banner por tipo de documento (mismo criterio que printDocumentoVenta.ts)
const TIPO_DOC_COLOR: Record<string, string> = {
  FT: "#0f766e", // Factura → verde azulado
  BV: "#2563eb", // Boleta  → azul
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d     = new Date(iso);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("es-PE", { month: "long" });
    return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${d.getFullYear()}`;
  } catch { return iso; }
}

function fmtMonto(n?: number | null): string {
  return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
}

const sharedStyles = `
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

  .sheet{max-width:900px;margin:0 auto 24px;background:var(--paper);box-shadow:0 4px 24px rgba(18,35,63,.12);border-radius:4px;overflow:hidden;}
  .sheet:last-child{margin-bottom:0;}
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
  .doc-type{color:#fff;font-weight:700;font-size:14px;letter-spacing:1.5px;padding:9px 14px;border-radius:3px;margin-bottom:10px;display:inline-block;}
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
  .footer{padding:16px 40px 32px;}
  .note{font-size:10.5px;color:var(--muted);line-height:1.6;}

  .empty-state{max-width:900px;margin:60px auto;background:var(--paper);border-radius:8px;box-shadow:0 4px 24px rgba(18,35,63,.12);padding:60px 40px;text-align:center;color:var(--muted);font-size:13px;}

  @media print{
    html,body{background:#fff;padding:0;}
    .sheet{box-shadow:none;border-radius:0;page-break-after:always;}
    .sheet:last-child{page-break-after:auto;}
    .btn-bar{display:none!important;}
  }
  @page{size:A4;margin:10mm;}`;

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>
  ${body}
<script>
  window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });
</script>
</body>
</html>`;
}

function renderSheet(cab: ReporteImpresionCabecera, detalles: ReporteImpresionDetalle[]): string {
  const bannerColor = TIPO_DOC_COLOR[(cab.tipdoc_abreviatura ?? "").trim().toUpperCase()] ?? "#2563eb";
  const monedaSym   = cab.m_simbolomoneda?.trim() || "S/";
  const serieNum    = `${(cab.docvta_serie ?? "").trim()} - ${(cab.docvta_numero ?? "").trim()}`;
  const numDoc      = (cab.c_num_docident ?? "-").trim();
  const guiaSerie   = (cab.guiarem_serie ?? "").trim();
  const guiaCorr    = (cab.guiarem_correlativo ?? "").trim();

  const propias = detalles.filter((d) => d.Ddv_documentoventaId === cab.docvta_documentoventaId);
  const detalleRows = propias
    .map((det) => {
      const nombre  = (det.B_descripcion ?? det.Ddv_bienId ?? "-").toUpperCase();
      const unidad  = (det.P_descripcion ?? det.Ddv_presentacionId ?? "-").toUpperCase();
      const cant    = (det.Ddv_cantidad ?? 0).toFixed(2);
      const precio  = (det.Ddv_precio ?? 0).toFixed(2);
      const afecto  = det.Ddv_afecto_inafecto !== false ? fmtMonto(det.Ddv_importe) : "0.00";
      const exoner  = det.Ddv_afecto_inafecto === false ? fmtMonto(det.Ddv_importe) : "0.00";
      return `
        <tr>
          <td>${cant}</td>
          <td>${unidad}</td>
          <td>${nombre}</td>
          <td class="num">${precio}</td>
          <td class="num">${afecto}</td>
          <td class="num">${exoner}</td>
        </tr>`;
    })
    .join("");

  return `
  <div class="sheet">
    <div class="strip"></div>

    <div class="header">
      <div class="brand">
        <div class="brand-mark">IC</div>
        <div class="brand-text">
          <h1>${cab.emp_razon_social ?? "-"}</h1>
          <p class="addr">
            <b>Dirección:</b> ${cab.emp_direccion_1 ?? "-"}
            ${cab.sede_descripcion ? `<br/><b>Sucursal:</b> ${cab.sede_descripcion}` : ""}
          </p>
        </div>
      </div>
      <div class="doc-box">
        <div class="ruc-line">R.U.C. <b>${cab.emp_ruc ?? "-"}</b></div>
        <div class="doc-type" style="background:${bannerColor}">${(cab.tipdoc_descripcion ?? "-").toUpperCase()}</div>
        <div class="doc-number">${serieNum}</div>
      </div>
    </div>

    <div class="meta">
      <div>
        <div class="row"><span class="label">Señor(es)</span><span class="value">${cab.c_descripcion ?? "-"}</span></div>
        <div class="row"><span class="label">Dirección</span><span class="value">${cab.c_direccion ?? "-"}</span></div>
        <div class="row"><span class="label">${(cab.c_docidentId ?? "DOC").trim()}</span><span class="value" style="font-family:monospace">${numDoc}</span></div>
        <div class="row"><span class="label">Cond. pago</span><span class="value">${cab.docvta_condicion_pago ?? "-"}</span></div>
        ${guiaSerie && guiaCorr ? `<div class="row"><span class="label">Guía Remisión</span><span class="value" style="font-family:monospace">${guiaSerie}-${guiaCorr}</span></div>` : ""}
      </div>
      <div class="meta-right">
        <span class="fecha-pill">Fecha de emisión</span>
        <span class="fecha-val">${fmtDate(cab.docvta_fecha_emision)}</span>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>Cant.</th>
          <th>Und. Medida</th>
          <th>Descripción</th>
          <th class="num">P. Unit.</th>
          <th class="num">Afecto</th>
          <th class="num">Exonerado</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa;font-style:italic">Sin detalles registrados</td></tr>`}
      </tbody>
    </table>

    <div class="lower">
      <div>
        <div class="son-box">
          <div class="lbl">Son</div>
          ${cab.docvta_total_letras ?? "-"}
        </div>
        ${cab.docvta_observacion ? `
        <div class="glosa">
          <div class="lbl">Glosa</div>
          ${cab.docvta_observacion}
        </div>` : ""}
      </div>
      <div class="totals">
        <div class="t-row"><span>Op. Gravadas</span><span>${monedaSym} ${fmtMonto(cab.docvta_valorventa_afecto)}</span></div>
        <div class="t-row"><span>Op. Exoneradas</span><span>${monedaSym} ${fmtMonto(cab.docvta_valorventa_inafecto)}</span></div>
        <div class="t-row"><span>IGV (18%)</span><span>${monedaSym} ${fmtMonto(cab.docvta_igv)}</span></div>
        <div class="t-final"><span>TOTAL</span><span>${monedaSym} ${fmtMonto(cab.docvta_total)}</span></div>
      </div>
    </div>

    <div class="footer">
      <p class="note">
        Para consultar este comprobante ingresa a<br/>
        <a href="https://xcore.pe/consulta-tu-comprobante/">https://xcore.pe/consulta-tu-comprobante/</a><br/>
        Muchas gracias por su preferencia.
      </p>
    </div>
  </div>`;
}

function renderComprobantes(
  data: [ReporteImpresionCabecera[], ReporteImpresionDetalle[]] | undefined,
  emptyMessage: string,
): string {
  const cabeceras = data?.[0] ?? [];
  const detalles  = data?.[1] ?? [];
  if (cabeceras.length === 0) {
    return `<div class="empty-state">${emptyMessage}</div>`;
  }
  return cabeceras.map((cab) => renderSheet(cab, detalles)).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Resumen Boletas: reimprime el/los comprobante(s) propios del documento
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlResumenBoletas(
  comprobante: [ReporteImpresionCabecera[], ReporteImpresionDetalle[]] | undefined,
): string {
  const titulo = comprobante?.[0]?.[0]
    ? `${comprobante[0][0].tipdoc_descripcion ?? "Comprobante"} ${comprobante[0][0].docvta_serie}-${comprobante[0][0].docvta_numero}`
    : "Resumen de Boletas";
  return wrapHtml(titulo, renderComprobantes(comprobante, "Este documento no tiene comprobante para mostrar."));
}

// ─────────────────────────────────────────────────────────────────────────────
// Boleta Masiva: boletas generadas en masa asociadas a este documento
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlBoletaMasiva(
  boletasMasivas: [ReporteImpresionCabecera[], ReporteImpresionDetalle[]] | undefined,
): string {
  return wrapHtml(
    "Boletas Masivas",
    renderComprobantes(boletasMasivas, "Este documento no tiene boletas masivas asociadas."),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Letra: letra(s) de cambio asociadas (una por cuota en ventas al crédito)
// ─────────────────────────────────────────────────────────────────────────────
function renderLetra(l: ReporteImpresionLetra): string {
  return `
  <div class="sheet">
    <div class="strip"></div>
    <div class="header">
      <div class="brand">
        <div class="brand-mark">IC</div>
        <div class="brand-text">
          <h1>LETRA DE CAMBIO</h1>
          <p class="tagline">Documento referencial de cobranza — no constituye título valor negociable</p>
        </div>
      </div>
      <div class="doc-box">
        <div class="ruc-line">N° <b>${l.correlativo ?? "-"}</b></div>
        <div class="doc-type" style="background:#7c3aed">LETRA</div>
        <div class="doc-number">${l.moneda ?? "S/"} ${fmtMonto(l.importe)}</div>
      </div>
    </div>

    <div class="meta" style="grid-template-columns:1fr">
      <div>
        <div class="row"><span class="label">Lugar y fecha</span><span class="value">${l.sucursal_departamento ?? "-"}, ${fmtDate(l.fecha_venta)}</span></div>
        <div class="row"><span class="label">Sr(es)</span><span class="value">${l.cliente_razonsocial ?? "-"}</span></div>
        <div class="row"><span class="label">RUC/DNI</span><span class="value" style="font-family:monospace">${l.cliente_rucdni ?? "-"}</span></div>
        <div class="row"><span class="label">Domicilio</span><span class="value">${l.cliente_domicilio ?? "-"}</span></div>
        <div class="row"><span class="label">Localidad</span><span class="value">${l.cliente_localidad ?? "-"}</span></div>
      </div>
    </div>

    <div class="lower" style="grid-template-columns:1fr">
      <div class="son-box">
        <div class="lbl">Sírvase Ud. pagar por esta letra de cambio la cantidad de</div>
        ${l.totalLetras ?? "-"}
      </div>
    </div>

    <div class="footer">
      <div style="display:flex;justify-content:space-between;gap:24px;margin-top:24px">
        <div style="flex:1;text-align:center">
          <div style="height:60px;border-bottom:1px solid var(--line);margin-bottom:6px"></div>
          <span class="note">Firma del Aceptante</span>
        </div>
        <div style="flex:1;text-align:center">
          <div style="height:60px;border-bottom:1px solid var(--line);margin-bottom:6px"></div>
          <span class="note">Firma y sello del Girador</span>
        </div>
      </div>
    </div>
  </div>`;
}

export function generarHtmlLetra(letra: [ReporteImpresionLetra[]] | undefined): string {
  const filas = letra?.[0] ?? [];
  const body  = filas.length === 0
    ? `<div class="empty-state">Este documento no tiene letra(s) de cambio asociadas.</div>`
    : filas.map(renderLetra).join("");
  return wrapHtml("Letra de Cambio", body);
}
