// src/utils/printPedidoVenta.ts

const EMPRESA_RUC       = "20468985757";
const EMPRESA_NOMBRE    = "INTERCOMPANY & SEÑOR DE HUANCA S.A.C.";
const EMPRESA_GIRO      = "Importación Exportación & Comercialización de Productos Alimenticios Agroindustriales";
const EMPRESA_GIRO_EN   = "Import Exports & Agro-Industrial Product Trading Company";
const EMPRESA_DIRECCION = "AV. Circunvalacion del Club Golf Los Incas - Block A Nro. 170 Dpto. 1502 Santiago de Surco Lima - Lima";

// ─────────────────────────────────────────────────────────────────────────────
// Mismo sistema visual (CSS) que usa el comprobante de Documentoventa
// (src/utils/printDocumentoVenta.ts → generarHtmlBoleta), para que el Pedido de
// Venta impreso se vea consistente con el resto de documentos del sistema.
// bannerColor distingue el formato: azul para Estándar, rosado para Interno.
// ─────────────────────────────────────────────────────────────────────────────
function buildStyles(bannerColor: string): string {
  return `
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
    .meta-right{display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-end;gap:10px;}
    .fecha-pill{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;}
    .fecha-val{font-size:14px;font-weight:700;color:var(--navy);}

    /* TABLE */
    table.items{width:100%;border-collapse:collapse;margin:0;}
    table.items thead th{background:var(--navy);color:#fff;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;padding:12px 10px;text-align:left;font-weight:600;}
    table.items thead th.num{text-align:right;}
    table.items thead th.center{text-align:center;}
    table.items tbody td{padding:12px 10px;font-size:12.5px;border-bottom:1px solid var(--line);}
    table.items tbody td.num{text-align:right;font-variant-numeric:tabular-nums;}
    table.items tbody td.center{text-align:center;}
    table.items tbody tr:nth-child(even){background:#fafbfc;}
    .item-code{color:var(--muted);font-size:11px;}

    /* LOWER */
    .lower{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;padding:24px 40px 8px;}
    .son-box{background:var(--teal-light);border-left:3px solid var(--teal);padding:12px 16px;border-radius:3px;font-size:12px;align-self:start;}
    .son-box .lbl{font-size:10px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
    .totals{border:1px solid var(--line);border-radius:4px;overflow:hidden;height:fit-content;}
    .totals .t-row{display:flex;justify-content:space-between;padding:9px 16px;font-size:12px;border-bottom:1px solid var(--line);}
    .totals .t-row span:first-child{color:var(--muted);}
    .totals .t-row span:last-child{font-weight:600;font-variant-numeric:tabular-nums;}
    .totals .t-final{background:var(--navy);color:#fff;padding:13px 16px;display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-bottom:none;}
    .totals .t-final span:last-child{color:var(--accent);font-size:16px;}

    /* FOOTER */
    .footer{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;padding:20px 40px 32px;}
    .note{font-size:10.5px;color:var(--muted);line-height:1.6;}
    .signbox{width:150px;height:90px;border:1.5px dashed #b7c0cc;border-radius:4px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.3px;}

    @media print{
      html,body{background:#fff;padding:0;}
      .sheet{box-shadow:none;border-radius:0;}
      .btn-bar{display:none!important;}
    }
    @page{size:A4;margin:10mm;}`;
}

function fmtFecha(iso?: string): string {
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

function buildHeaderYMeta(pv: any, docTypeLabel: string, bannerColor: string, extraMetaRight?: string): string {
  const correlativo   = pv.numero_correlativo ?? pv.pedidoventaId ?? "-";
  const numDocCliente = pv.cliente?.num_docident ?? "-";
  const soloDigitos   = String(numDocCliente).replace(/\D/g, "");
  const tipoDocId     = soloDigitos.length === 11 ? "RUC" : soloDigitos.length === 8 ? "DNI" : "DOC";
  const vendedor      = pv.trabajador
    ? `${pv.trabajador.apellidos ?? ""} ${pv.trabajador.nombres ?? ""}`.trim()
    : pv.trabajadorId ?? "-";
  const formaPago   = pv.formapago?.descripcion    ?? "-";
  const condPago    = pv.condicionpago?.descripcion ?? pv.condicion_pago ?? "-";
  const tipoEntrega = pv.tipoentrega?.descripcion   ?? "-";

  return `
    <!-- HEADER -->
    <div class="header">
      <div class="brand">
        <div class="brand-mark">IC</div>
        <div class="brand-text">
          <h1>${EMPRESA_NOMBRE}</h1>
          <p class="tagline">${EMPRESA_GIRO}<br/><em>${EMPRESA_GIRO_EN}</em></p>
          <p class="addr"><b>Dirección:</b> ${EMPRESA_DIRECCION}</p>
        </div>
      </div>
      <div class="doc-box">
        <div class="ruc-line">R.U.C. <b>${EMPRESA_RUC}</b></div>
        <div class="doc-type">${docTypeLabel}</div>
        <div class="doc-number">${correlativo}</div>
      </div>
    </div>

    <!-- META / CLIENTE -->
    <div class="meta">
      <div>
        <div class="row"><span class="label">Señor(es)</span><span class="value">${pv.cliente?.descripcion ?? "-"}</span></div>
        <div class="row"><span class="label">${tipoDocId}</span><span class="value" style="font-family:monospace">${numDocCliente}</span></div>
        <div class="row"><span class="label">Vendedor</span><span class="value">${vendedor}</span></div>
        <div class="row"><span class="label">Forma de pago</span><span class="value">${formaPago}</span></div>
        <div class="row"><span class="label">Cond. de pago</span><span class="value">${condPago}</span></div>
        <div class="row"><span class="label">Tipo entrega</span><span class="value">${tipoEntrega}</span></div>
        ${pv.lugar_despacho ? `<div class="row"><span class="label">Lugar desp.</span><span class="value">${pv.lugar_despacho}</span></div>` : ""}
        ${(pv.cotizacion?.numero_correlativo || pv.cotizacionventaId) ? `<div class="row"><span class="label">Ref. Cotiz.</span><span class="value" style="font-family:monospace;color:var(--navy-2)">${pv.cotizacion?.numero_correlativo ?? pv.cotizacionventaId}</span></div>` : ""}
      </div>
      <div class="meta-right">
        <div>
          <span class="fecha-pill">Fecha de emisión</span><br/>
          <span class="fecha-val">${fmtFecha(pv.fecha_emision)}</span>
        </div>
        <div>
          <span class="fecha-pill">Fecha de entrega</span><br/>
          <span class="fecha-val">${fmtFecha(pv.fecha_entrega)}</span>
        </div>
        ${extraMetaRight ?? ""}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formato Estándar: mismo diseño que la boleta de Documentoventa, con precios
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlPedidoVenta(pv: any, detalle: any[]): string {
  const correlativo = pv.numero_correlativo ?? pv.pedidoventaId ?? "-";
  const monedaAbrev  = pv.moneda?.abreviatura ?? pv.monedaId ?? "S/";
  const monedaSym    = monedaAbrev === "D" || monedaAbrev === "USD" ? "US$" :
                        monedaAbrev === "E" || monedaAbrev === "EUR" ? "€"   : "S/";

  const detalleRows = detalle
    .map((det: any) => {
      const nombre  = (det.bien?.descripcion ?? det.bienId ?? "-").toUpperCase();
      const unidad  = (det.presentacion?.descripcion ?? det.presentacionId ?? "-").toUpperCase();
      const cant    = (det.cantidad ?? 0).toFixed(2);
      const precio  = (det.precio ?? 0).toFixed(4);
      const desc    = (det.descuento_producto ?? 0) > 0 ? `${Number(det.descuento_producto).toFixed(2)}%` : "-";
      const importe = det.importe ?? (det.cantidad ?? 0) * (det.precio ?? 0);
      const afecto  = det.afecto_inafecto !== false ? fmtMonto(importe) : "0.00";
      const exoner  = det.afecto_inafecto === false ? fmtMonto(importe) : "0.00";
      return `
        <tr>
          <td class="num">${cant}</td>
          <td>${unidad}</td>
          <td>${nombre}</td>
          <td class="num">${monedaSym} ${precio}</td>
          <td class="center">${desc}</td>
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
  <title>Pedido de Venta ${correlativo}</title>
  <style>${buildStyles("#2563eb")}</style>
</head>
<body>

  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <div class="sheet">
    <div class="strip"></div>

    ${buildHeaderYMeta(pv, "PEDIDO DE VENTA", "#2563eb")}

    <!-- TABLA DETALLES -->
    <table class="items">
      <thead>
        <tr>
          <th class="num">Cant.</th>
          <th>Und. Medida</th>
          <th>Descripción</th>
          <th class="num">P. Unit.</th>
          <th class="center">Desc.</th>
          <th class="num">Afecto</th>
          <th class="num">Exonerado</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="7" style="text-align:center;padding:20px;color:#aaa;font-style:italic">Sin detalles registrados</td></tr>`}
      </tbody>
    </table>

    <!-- LOWER: OBSERVACIÓN + TOTALES -->
    <div class="lower">
      <div>
        <div class="son-box">
          <div class="lbl">Observación</div>
          ${pv.observacion ?? "—"}
        </div>
      </div>
      <div class="totals">
        <div class="t-row"><span>Vta. Afecta</span><span>${monedaSym} ${fmtMonto(pv.valorventa_afecto)}</span></div>
        <div class="t-row"><span>Vta. Exonerada</span><span>${monedaSym} ${fmtMonto(pv.valorventa_inafecto)}</span></div>
        ${(pv.valorventa_gratuito ?? 0) > 0 ? `<div class="t-row"><span>Vta. Gratuita</span><span>${monedaSym} ${fmtMonto(pv.valorventa_gratuito)}</span></div>` : ""}
        <div class="t-row"><span>IGV (18%)</span><span>${monedaSym} ${fmtMonto(pv.igv)}</span></div>
        <div class="t-final"><span>TOTAL</span><span>${monedaSym} ${fmtMonto(pv.total)}</span></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p class="note">
        Documento interno de gestión — no válido como comprobante de pago SUNAT.<br/>
        Los precios indicados incluyen IGV según corresponda.<br/>
        Estado del pedido: <strong>${(pv.estado ?? "-").toUpperCase()}</strong><br/>
        Muchas gracias por su preferencia.
      </p>
      <div class="signbox">Firma y sello</div>
    </div>
  </div>

<script>
  window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formato Interno: picking / preparación en almacén (sin precios ni montos),
// mismo sistema visual que el resto de documentos, en tono rosado para
// distinguirlo a simple vista del formato Estándar.
// ─────────────────────────────────────────────────────────────────────────────
export function generarHtmlPedidoVentaInterna(pv: any, detalle: any[]): string {
  const correlativo   = pv.numero_correlativo ?? pv.pedidoventaId ?? "-";
  const totalCantidad = detalle.reduce((sum: number, det: any) => sum + (det.cantidad ?? 0), 0);
  const bannerColor   = "#be123c";

  const detalleRows = detalle
    .map((det: any, i: number) => {
      const nombre = (det.bien?.descripcion ?? det.bienId ?? "-").toUpperCase();
      const unidad = (det.presentacion?.descripcion ?? det.presentacionId ?? "-").toUpperCase();
      const cant   = (det.cantidad ?? 0).toFixed(2);
      const obs    = det.observacion ?? "";
      return `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${nombre}</td>
          <td>${unidad}</td>
          <td class="num" style="font-weight:700">${cant}</td>
          <td style="color:var(--muted);font-size:11px">${obs}</td>
          <td class="center"><span style="display:inline-block;width:14px;height:14px;border:1.3px solid #94a3b8;border-radius:3px"></span></td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Pedido de Venta ${correlativo} — USO INTERNO</title>
  <style>${buildStyles(bannerColor)}</style>
</head>
<body>

  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <div class="sheet">
    <div class="strip"></div>

    ${buildHeaderYMeta(pv, "PEDIDO · USO INTERNO", bannerColor)}

    <!-- TABLA DETALLES (PICKING) -->
    <table class="items">
      <thead>
        <tr>
          <th class="center" style="width:34px">#</th>
          <th>Producto</th>
          <th style="width:120px">Presentación</th>
          <th class="num" style="width:80px">Cantidad</th>
          <th>Observación</th>
          <th class="center" style="width:44px">✓</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="6" style="text-align:center;padding:20px;color:#aaa;font-style:italic">Sin detalles registrados</td></tr>`}
      </tbody>
    </table>

    <!-- LOWER: OBSERVACIÓN + RESUMEN -->
    <div class="lower">
      <div>
        <div class="son-box">
          <div class="lbl">Observación</div>
          ${pv.observacion ?? "—"}
        </div>
      </div>
      <div class="totals">
        <div class="t-row"><span>Total de líneas</span><span>${detalle.length}</span></div>
        <div class="t-final"><span>TOTAL UNIDADES</span><span>${totalCantidad.toFixed(2)}</span></div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer" style="grid-template-columns:1fr auto auto">
      <p class="note">
        Documento de uso interno para preparación de pedido — no incluye precios ni comprobante de pago.<br/>
        Estado del pedido: <strong>${(pv.estado ?? "-").toUpperCase()}</strong>
      </p>
      <div class="signbox">Preparado por</div>
      <div class="signbox">Verificado por</div>
    </div>
  </div>

<script>
  window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });
</script>
</body>
</html>`;
}

export function imprimirPedidoVenta(full: any, tipo: "estandar" | "interno" = "estandar") {
  const pv      = full?.pedidoventa ?? full;
  const detalle = full?.detalle     ?? [];
  // Inyectar correlativo de cotizacion al objeto pv para que lo use el generador
  if (full?.cotizacion?.numero_correlativo && !pv.cotizacion) {
    pv.cotizacion = full.cotizacion;
  }
  const html = tipo === "interno"
    ? generarHtmlPedidoVentaInterna(pv, detalle)
    : generarHtmlPedidoVenta(pv, detalle);
  const win     = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
