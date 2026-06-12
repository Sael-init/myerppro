// src/utils/printPedidoVenta.ts

const EMPRESA_RUC       = "20468985757";
const EMPRESA_NOMBRE    = "INTERCOMPANY & SEÑOR DE HUANCA S.A.C.";
const EMPRESA_GIRO      = "Importación Exportación & Comercialización de Productos Alimenticios Agroindustriales";
const EMPRESA_GIRO_EN   = "Import Exports & Agro-Industrial Product Trading Company";
const EMPRESA_DIRECCION = "AV. Circunvalacion del Club Golf Los Incas - Block A Nro. 170 Dpto. 1502 Santiago de Surco Lima - Lima";

export function generarHtmlPedidoVenta(pv: any, detalle: any[], logoUrl: string): string {
  const fmtDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d     = new Date(iso);
      const day   = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("es-PE", { month: "long" });
      return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${d.getFullYear()}`;
    } catch { return iso; }
  };

  const fmt = (n?: number | null) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

  const correlativo     = pv.numero_correlativo ?? pv.pedidoventaId ?? "-";
  const monedaAbrev     = pv.moneda?.abreviatura ?? pv.monedaId ?? "S/";
  const monedaSym       = monedaAbrev === "D" || monedaAbrev === "USD" ? "US$" :
                          monedaAbrev === "E" || monedaAbrev === "EUR" ? "€"   : "S/";
  const numDocCliente   = pv.cliente?.num_docident ?? "-";
  const soloDigitos     = numDocCliente.replace(/\D/g, "");
  const tipoDocId       = soloDigitos.length === 11 ? "RUC" : soloDigitos.length === 8 ? "DNI" : "DOC";
  const vendedor        = pv.trabajador
    ? `${pv.trabajador.apellidos ?? ""} ${pv.trabajador.nombres ?? ""}`.trim()
    : pv.trabajadorId ?? "-";
  const formaPago  = pv.formapago?.descripcion    ?? pv.formaspagoId  ?? "-";
  const condPago   = pv.condicionpago?.descripcion ?? pv.condicion_pago ?? "-";
  const tipoEntrega = pv.tipoentrega?.descripcion  ?? "-";

  const detalleRows = detalle
    .map((det: any, i: number) => {
      const nombre  = (det.bien?.descripcion ?? det.bienId ?? "-").toUpperCase();
      const unidad  =  det.presentacion?.descripcion ?? det.presentacionId ?? "-";
      const cant    = (det.cantidad  ?? 0).toFixed(3);
      const precio  = (det.precio    ?? 0).toFixed(4);
      const desc    = (det.descuento_producto ?? 0) > 0
        ? `${Number(det.descuento_producto).toFixed(2)}%`
        : "-";
      const importe = fmt(det.importe ?? (det.cantidad ?? 0) * (det.precio ?? 0));
      const igvCell = det.afecto_inafecto === false
        ? `<span style="color:#b45309;font-weight:700">Inafecto</span>`
        : `<span style="color:#15803d;font-weight:700">Afecto</span>`;
      return `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            ${nombre}<br/><span style="font-size:7pt;color:#64748b">${unidad}</span>
          </td>
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${cant}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${monedaSym} ${precio}</td>
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">${desc}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace;font-weight:600">${monedaSym} ${importe}</td>
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb">${igvCell}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Pedido de Venta ${correlativo}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
    html, body { background:#d1d5db; font-family:Arial,Helvetica,sans-serif; font-size:8.5pt; color:#111; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { width:210mm; min-height:297mm; margin:14px auto; background:#fff; padding:11mm 13mm 15mm; box-shadow:0 6px 32px rgba(0,0,0,.22); }
    .btn-bar { display:flex; justify-content:flex-end; margin-bottom:8px; }
    .btn-print { background:#1e3a5f; color:#fff; border:none; padding:7px 20px; font-size:9pt; font-weight:700; border-radius:5px; cursor:pointer; letter-spacing:.3px; }
    .btn-print:hover { background:#2d5080; }
    @media print {
      html,body { background:#fff; }
      .page { margin:0; padding:8mm 12mm 12mm; box-shadow:none; }
      .btn-bar { display:none !important; }
    }
    @page { size:A4; margin:0; }
  </style>
</head>
<body>
<div class="page">

  <!-- BOTÓN IMPRIMIR -->
  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;border:1px solid #9ca3af">
    <div style="flex:1;padding:10px 14px 8px;border-right:1px solid #9ca3af">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:50px;object-fit:contain;margin-bottom:7px;display:block"/>` : ""}
      <div style="font-weight:700;font-size:8.8pt;text-transform:uppercase;line-height:1.35">${EMPRESA_NOMBRE}</div>
      <div style="font-size:6.8pt;color:#555;font-style:italic;margin-top:2px;line-height:1.45">
        ${EMPRESA_GIRO}<br/><em>${EMPRESA_GIRO_EN}</em>
      </div>
      <div style="font-size:6.8pt;color:#333;margin-top:4px;line-height:1.4">
        <strong>Dirección:</strong> ${EMPRESA_DIRECCION}
      </div>
    </div>
    <div style="width:188px;display:flex;flex-direction:column;align-items:stretch;text-align:center">
      <div style="font-weight:700;font-size:9pt;padding:8px 6px 5px;border-bottom:1px solid #9ca3af">R.U.C N° ${EMPRESA_RUC}</div>
      <div style="background:#1e3a5f;color:#fff;font-weight:700;font-size:8.8pt;text-transform:uppercase;padding:7px 6px;border-bottom:1px solid #9ca3af">PEDIDO DE VENTA</div>
      <div style="font-weight:700;font-size:10pt;font-family:monospace;letter-spacing:.8px;padding:8px 6px">${correlativo}</div>
    </div>
  </div>

  <!-- DATOS CLIENTE -->
  <div style="border:1px solid #9ca3af;border-top:none;padding:6px 12px 5px">
    <div style="display:grid;grid-template-columns:85px 1fr 95px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">Señor(es):</span>
      <span style="font-size:8pt;font-weight:700;grid-column:span 3">${pv.cliente?.descripcion ?? "-"}</span>
    </div>
    <div style="display:grid;grid-template-columns:85px 1fr 95px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">${tipoDocId}:</span>
      <span style="font-size:8pt;font-family:monospace">${numDocCliente}</span>
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase;text-align:right;padding-right:8px">FECHA</span>
      <span style="font-size:8pt;font-weight:700">${fmtDate(pv.fecha_emision)}</span>
    </div>
    <div style="display:grid;grid-template-columns:85px 1fr 95px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">Vendedor:</span>
      <span style="font-size:8pt">${vendedor}</span>
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase;text-align:right;padding-right:8px">F. ENTREGA</span>
      <span style="font-size:8pt;font-weight:700">${fmtDate(pv.fecha_entrega)}</span>
    </div>
    <div style="display:grid;grid-template-columns:85px 1fr 95px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">Forma Pago:</span>
      <span style="font-size:8pt;font-weight:700">${formaPago}</span>
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase;text-align:right;padding-right:8px">COND. PAGO</span>
      <span style="font-size:8pt">${condPago}</span>
    </div>
    <div style="display:grid;grid-template-columns:85px 1fr 95px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">Tipo Entrega:</span>
      <span style="font-size:8pt">${tipoEntrega}</span>
      ${pv.lugar_despacho ? `
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase;text-align:right;padding-right:8px">LUGAR DESP.</span>
      <span style="font-size:7.5pt">${pv.lugar_despacho}</span>` : `<span></span><span></span>`}
    </div>
    ${(pv.cotizacion?.numero_correlativo || pv.cotizacionventaId) ? `
    <div style="display:grid;grid-template-columns:85px 1fr;align-items:baseline;margin-bottom:2.5px">
      <span style="font-weight:700;font-size:7.5pt;text-transform:uppercase">Ref. Cotiz.:</span>
      <span style="font-size:8pt;font-family:monospace;color:#1e40af;font-weight:700">${pv.cotizacion?.numero_correlativo ?? pv.cotizacionventaId}</span>
    </div>` : ""}
  </div>

  <!-- TABLA DETALLES -->
  <div style="border:1px solid #9ca3af;border-top:none">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:28px">#</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:left;border-right:1px solid #2d5080">Descripción</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:55px">Cantidad</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:right;border-right:1px solid #2d5080;width:75px">P. Unitario</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:55px">Desc. %</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:right;border-right:1px solid #2d5080;width:80px">Importe</th>
          <th style="padding:5px 4px;font-size:6.8pt;font-weight:700;text-transform:uppercase;text-align:center;width:60px">IGV</th>
        </tr>
      </thead>
      <tbody>
        ${detalleRows ||
          `<tr><td colspan="7" style="text-align:center;padding:14px;color:#aaa;font-style:italic">Sin detalles registrados</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="border:1px solid #9ca3af;border-top:none">
    ${pv.observacion ? `<div style="padding:5px 12px;font-size:8pt;border-bottom:1px solid #e5e7eb"><strong>Observación:</strong> ${pv.observacion}</div>` : ""}
    <div style="display:flex">
      <div style="flex:1;padding:8px 12px;border-right:1px solid #e5e7eb;font-size:6.8pt;color:#555;font-style:italic;line-height:1.55">
        Documento interno — no válido como comprobante de pago SUNAT.<br/>
        Los precios indicados incluyen IGV según corresponda.<br/>
        Estado del pedido: <strong>${(pv.estado ?? "-").toUpperCase()}</strong>
      </div>
      <div style="width:222px;border-right:1px solid #e5e7eb">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0">Vta. Afecta</td>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-weight:600;white-space:nowrap">${monedaSym} ${fmt(pv.valorventa_afecto)}</td>
          </tr>
          <tr>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0">Vta. Inafecta</td>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-weight:600;white-space:nowrap">${monedaSym} ${fmt(pv.valorventa_inafecto)}</td>
          </tr>
          ${(pv.valorventa_gratuito ?? 0) > 0 ? `
          <tr>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0">Vta. Gratuita</td>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-weight:600;white-space:nowrap">${monedaSym} ${fmt(pv.valorventa_gratuito)}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0">IGV 18%</td>
            <td style="padding:3px 8px;font-size:8pt;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-weight:600;white-space:nowrap">${monedaSym} ${fmt(pv.igv)}</td>
          </tr>
          <tr style="background:#1e3a5f;color:#fff">
            <td style="padding:5px 8px;font-size:8.8pt;font-weight:700">TOTAL</td>
            <td style="padding:5px 8px;font-size:8.8pt;font-weight:700;text-align:right;font-family:monospace;white-space:nowrap">${monedaSym} ${fmt(pv.total)}</td>
          </tr>
        </table>
      </div>
      <div style="width:138px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 6px;gap:6px">
        <div style="font-size:7pt;color:#64748b;text-align:center;font-weight:600">FIRMA Y SELLO</div>
        <div style="width:110px;height:70px;border:1px dashed #94a3b8;border-radius:4px"></div>
      </div>
    </div>
  </div>

</div>
<script>
  window.addEventListener('load', function() {
    setTimeout(function(){ window.print(); }, 400);
  });
</script>
</body>
</html>`;
}

export function imprimirPedidoVenta(full: any, logoUrl = "") {
  const pv      = full?.pedidoventa ?? full;
  const detalle = full?.detalle     ?? [];
  // Inyectar correlativo de cotizacion al objeto pv para que lo use el generador
  if (full?.cotizacion?.numero_correlativo && !pv.cotizacion) {
    pv.cotizacion = full.cotizacion;
  }
  const html    = generarHtmlPedidoVenta(pv, detalle, logoUrl);
  const win     = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
