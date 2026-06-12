const EMPRESA_RUC       = "20468985757";
const EMPRESA_NOMBRE    = "INTERCOMPANY & SEÑOR DE HUANCA S.A.C.";
const EMPRESA_GIRO      = "Importación Exportación & Comercialización de Productos Alimenticios Agroindustriales";
const EMPRESA_DIRECCION = "AV. Circunvalacion del Club Golf Los Incas - Block A Nro. 170 Dpto. 1502 Santiago de Surco Lima - Lima";

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  try {
    const d     = new Date(iso);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("es-PE", { month: "long" });
    return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${d.getFullYear()}`;
  } catch { return iso; }
}

function fmt(n?: number | null): string {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

function parseJsonArray<T>(val: T[] | string | null | undefined): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) as T[]; } catch { return []; }
}

export function generarHtmlListaPrecio(lista: any, logoUrl: string): string {
  const detalles = parseJsonArray(lista?.detalles);

  const estado      = lista.estado_listprec ?? "-";
  const tipo        = lista.tipoListaPrecio?.descripcion ?? (lista.tipolistaprecioId ? `Tipo ${lista.tipolistaprecioId}` : "-");
  const esDefault   = lista.listadefault ? "SÍ" : "NO";

  const estadoColor = ["ACT","Activo","ACTIVO","Disponible","DISPONIBLE"].includes(estado)
    ? "#15803d"
    : ["ANU","Anulado","ANULADO"].includes(estado)
    ? "#dc2626"
    : ["INA","Inactivo","INACTIVO"].includes(estado)
    ? "#b45309"
    : "#1e3a5f";

  const detalleRows = detalles
    .map((d: any, i: number) => {
      const pres   = d.presentacion?.descripcion ?? d.presentacionId ?? "-";
      const bien   = d.bien?.descripcion         ?? "-";
      const costo  = fmt(d.costoValorizado);
      const utl    = d.utilidad != null ? `${d.utilidad}%` : "-";

      const cantMin  = fmt(d.cantidad_minorista);
      const pMin     = fmt(d.precio_minimo_minorista);
      const cantMay  = fmt(d.cantidad_mayorista);
      const pMay     = fmt(d.precio_minimo_mayorista);
      const cantDist = fmt(d.cantidad_distribuidor);
      const pDist    = fmt(d.precio_minimo_distribuidor);

      return `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            <div style="font-weight:700;font-size:7.5pt;text-transform:uppercase">${pres}</div>
            <div style="font-size:6.8pt;color:#64748b">${bien}</div>
          </td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${costo}</td>
          <td style="text-align:center;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb">${utl}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${cantMin}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace;font-weight:600">${pMin}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${cantMay}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace;font-weight:600">${pMay}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;font-family:monospace">${cantDist}</td>
          <td style="text-align:right;padding:4px 5px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-weight:600">${pDist}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Lista de Precios ${lista.codigo_lista ?? lista.listaprecioId}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
    html, body { background:#d1d5db; font-family:Arial,Helvetica,sans-serif; font-size:8.5pt; color:#111; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { width:297mm; min-height:210mm; margin:14px auto; background:#fff; padding:11mm 13mm 15mm; box-shadow:0 6px 32px rgba(0,0,0,.22); }
    .btn-bar { display:flex; justify-content:flex-end; margin-bottom:8px; }
    .btn-print { background:#1e3a5f; color:#fff; border:none; padding:7px 20px; font-size:9pt; font-weight:700; border-radius:5px; cursor:pointer; letter-spacing:.3px; }
    .btn-print:hover { background:#2d5080; }
    @media print {
      html,body { background:#fff; }
      .page { margin:0; padding:8mm 10mm 10mm; box-shadow:none; }
      .btn-bar { display:none !important; }
    }
    @page { size:A4 landscape; margin:0; }
  </style>
</head>
<body>
<div class="page">

  <div class="btn-bar">
    <button class="btn-print" onclick="window.print()">🖨&nbsp; Imprimir</button>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;border:1px solid #9ca3af;margin-bottom:0">
    <div style="flex:1;padding:10px 14px 8px;border-right:1px solid #9ca3af">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:46px;object-fit:contain;margin-bottom:6px;display:block"/>` : ""}
      <div style="font-weight:700;font-size:8.8pt;text-transform:uppercase;line-height:1.35">${EMPRESA_NOMBRE}</div>
      <div style="font-size:6.5pt;color:#555;font-style:italic;margin-top:2px;line-height:1.4">${EMPRESA_GIRO}</div>
      <div style="font-size:6.5pt;color:#333;margin-top:3px"><strong>Dirección:</strong> ${EMPRESA_DIRECCION}</div>
    </div>
    <div style="width:210px;display:flex;flex-direction:column;align-items:stretch;text-align:center">
      <div style="font-weight:700;font-size:8pt;padding:7px 6px 5px;border-bottom:1px solid #9ca3af">R.U.C N° ${EMPRESA_RUC}</div>
      <div style="background:#1e3a5f;color:#fff;font-weight:700;font-size:8.5pt;text-transform:uppercase;padding:6px;border-bottom:1px solid #9ca3af">LISTA DE PRECIOS</div>
      <div style="font-weight:700;font-size:11pt;font-family:monospace;letter-spacing:.8px;padding:8px 6px">${lista.codigo_lista ?? lista.listaprecioId}</div>
      <div style="font-size:7pt;padding-bottom:6px">
        <span style="background:${estadoColor};color:#fff;padding:2px 8px;border-radius:10px;font-weight:700">${estado.toUpperCase()}</span>
        ${lista.listadefault ? `<span style="background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:4px">DEFAULT</span>` : ""}
      </div>
    </div>
  </div>

  <!-- INFO GENERAL -->
  <div style="border:1px solid #9ca3af;border-top:none;padding:5px 12px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px 16px;margin-bottom:0">
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Tipo:</span>
      <span style="font-size:8pt;margin-left:4px">${tipo}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Descripción:</span>
      <span style="font-size:8pt;margin-left:4px">${lista.descripcion ?? "-"}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Fecha Inicio:</span>
      <span style="font-size:8pt;margin-left:4px">${fmtDate(lista.fecha_inicio)}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Vencimiento:</span>
      <span style="font-size:8pt;margin-left:4px">${fmtDate(lista.fecha_vencimiento)}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Lista Default:</span>
      <span style="font-size:8pt;margin-left:4px;font-weight:700">${esDefault}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Total Productos:</span>
      <span style="font-size:8pt;margin-left:4px;font-weight:700">${detalles.length}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">Creación:</span>
      <span style="font-size:8pt;margin-left:4px">${fmtDate(lista.fecha_creacion)}</span>
    </div>
    <div>
      <span style="font-weight:700;font-size:7pt;text-transform:uppercase;color:#64748b">ID:</span>
      <span style="font-size:7.5pt;font-family:monospace;margin-left:4px;color:#374151">${lista.listaprecioId}</span>
    </div>
  </div>

  <!-- TABLA PRECIOS -->
  <div style="border:1px solid #9ca3af;border-top:none">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:24px">#</th>
          <th style="padding:5px 6px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:left;border-right:1px solid #2d5080">Presentación / Producto</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:right;border-right:1px solid #2d5080;width:62px">Costo</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:42px">Utl.%</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:42px;background:#1e4d8c">Cant.</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:right;border-right:1px solid #2d5080;width:66px;background:#1e4d8c">P.Mín Min.</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:42px;background:#374151">Cant.</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:right;border-right:1px solid #2d5080;width:66px;background:#374151">P.Mín May.</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:center;border-right:1px solid #2d5080;width:42px;background:#4c1d95">Cant.</th>
          <th style="padding:5px 4px;font-size:6.5pt;font-weight:700;text-transform:uppercase;text-align:right;width:66px;background:#4c1d95">P.Mín Dist.</th>
        </tr>
        <tr style="background:#dbeafe;font-size:6pt;color:#1e40af;font-weight:700;text-transform:uppercase">
          <td colspan="4" style="padding:2px 5px;border-right:1px solid #93c5fd;border-bottom:1px solid #9ca3af"></td>
          <td colspan="2" style="text-align:center;padding:2px 4px;border-right:1px solid #93c5fd;border-bottom:1px solid #9ca3af;background:#dbeafe">MINORISTA</td>
          <td colspan="2" style="text-align:center;padding:2px 4px;border-right:1px solid #9ca3af;border-bottom:1px solid #9ca3af;background:#f1f5f9;color:#374151">MAYORISTA</td>
          <td colspan="2" style="text-align:center;padding:2px 4px;border-bottom:1px solid #9ca3af;background:#ede9fe;color:#4c1d95">DISTRIBUIDOR</td>
        </tr>
      </thead>
      <tbody>
        ${detalleRows || `<tr><td colspan="10" style="text-align:center;padding:14px;color:#aaa;font-style:italic">Sin productos registrados</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="border:1px solid #9ca3af;border-top:none;padding:5px 12px;font-size:6.5pt;color:#64748b;font-style:italic">
    Documento interno — no válido como comprobante de pago. Los precios son referenciales y pueden variar según condiciones comerciales.
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

export function imprimirListaPrecio(lista: any, logoUrl = ""): void {
  const html = generarHtmlListaPrecio(lista, logoUrl);
  const win  = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
