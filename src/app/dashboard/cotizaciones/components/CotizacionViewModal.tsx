"use client";

import { useEffect, useState } from "react";
import cotizacionService from "@/services/cotizacionService";
import Modal from "@/components/ui/Modal";
import {
  IconLoader,
  IconX,
  IconFileDescription,
  IconPackage,
  IconBuilding,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type { Cotizacion, CotizacionDetalle } from "@/types/cotizacion.types";

interface Props {
  cotizacionventaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const InfoField = ({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
}) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
        {value}
      </dd>
    </div>
  );
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
    <div className="w-1 h-4 bg-blue-600 rounded" />
    {icon}
    {title}
  </h4>
);

const estadoConfig: Record<string, { label: string; className: string }> = {
  REGISTRADO: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200" },
  Registrado: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200" },
  ANULADO:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"  },
  Anulado:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"  },
  ACEPTADO:   { label: "ACEPTADO",   className: "bg-green-100 text-green-700 border-green-200" },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label: (estado ?? "—").toUpperCase(),
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const fmt = (n?: number | null) =>
  n !== undefined && n !== null
    ? n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

export default function CotizacionViewModal({ cotizacionventaId, isOpen, onClose }: Props) {
  const [cot, setCot]         = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && cotizacionventaId) {
      setLoading(true);
      cotizacionService
        .getById(cotizacionventaId)
        .then((res) => setCot(res))
        .catch(() => { toast.error("Error al cargar la cotización"); onClose(); })
        .finally(() => setLoading(false));
    } else {
      setCot(null);
    }
  }, [isOpen, cotizacionventaId]);

  const detalles: CotizacionDetalle[] = cot?.detalles ?? [];

  const docAbrev = cot?.tipoDocumentoComercial?.abreviatura;
  const docDesc  = cot?.tipoDocumentoComercial?.descripcion;
  const clienteNumDoc = cot?.cliente?.numDocIdent ?? cot?.cliente?.num_docident;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Cotización" size="xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando cotización...</p>
        </div>
      ) : cot ? (
        <div className="space-y-5">

          {/* ── Header ── */}
          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconFileDescription size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-800">
                  {cot.numeroCorrelativo || cot.cotizacionventaId}
                </h3>
                {(docAbrev || docDesc) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                    {docAbrev}{docDesc ? ` — ${docDesc}` : ""}
                  </span>
                )}
                <EstadoBadge estado={cot.estado} />
              </div>
              <div className="flex gap-4 mt-1 flex-wrap">
                <span className="text-xs text-slate-500">
                  <span className="font-semibold">Emisión:</span>{" "}
                  {cot.fechaEmision ? new Date(cot.fechaEmision).toLocaleDateString("es-PE") : "—"}
                </span>
                {cot.cliente?.descripcion && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold">Cliente:</span> {cot.cliente.descripcion}
                  </span>
                )}
                {cot.moneda && (
                  <span className="text-xs font-semibold text-blue-600">
                    {cot.moneda.abreviatura || cot.moneda.descripcion}
                  </span>
                )}
              </div>
              {cot.empresa && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {cot.empresa.razonSocial}{cot.empresa.ruc ? ` · RUC ${cot.empresa.ruc}` : ""}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total</p>
              <p className="text-2xl font-bold text-slate-800">{fmt(cot.total)}</p>
              {cot.saldo != null && cot.saldo !== cot.total && (
                <p className="text-xs text-orange-600 font-semibold">Saldo: {fmt(cot.saldo)}</p>
              )}
            </div>
          </div>

          {/* ── Info General ── */}
          <div className="space-y-3">
            <SectionHeader icon={<IconUser size={14} />} title="Información General" />
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Correlativo" value={cot.numeroCorrelativo} />
              <InfoField
                label="Fecha Emisión"
                value={cot.fechaEmision ? new Date(cot.fechaEmision).toLocaleDateString("es-PE") : undefined}
              />
              <InfoField
                label="Fecha Vencimiento"
                value={cot.fechaVencimiento ? new Date(cot.fechaVencimiento).toLocaleDateString("es-PE") : undefined}
              />
              <InfoField
                label="Tiempo de Validez"
                value={cot.tiempoValidez != null ? `${cot.tiempoValidez} día(s)` : undefined}
              />
              <InfoField
                label="Cliente"
                value={
                  cot.cliente?.descripcion
                    ? `${cot.cliente.descripcion}${clienteNumDoc ? ` (${clienteNumDoc})` : ""}`
                    : cot.clienteId
                }
                fullWidth
              />
              {cot.cliente?.direccion && (
                <InfoField label="Dirección Cliente" value={cot.cliente.direccion} fullWidth />
              )}
              <InfoField
                label="Vendedor"
                value={
                  cot.trabajador
                    ? `${cot.trabajador.apellidos || ""} ${cot.trabajador.nombres || ""}`.trim()
                    : cot.trabajadorId
                }
                fullWidth
              />
              <InfoField label="Ord. Compra N°" value={cot.ordcompraNumero} />
              <InfoField label="Tipo de Entrega" value={cot.tipoentrega?.descripcion || cot.tipoentregaId} />
              <InfoField label="Observación" value={cot.observacion} fullWidth />
            </dl>
          </div>

          {/* ── Financiero ── */}
          <div className="space-y-3">
            <SectionHeader icon={null} title="Resumen Financiero" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Vta. Afecta",   value: cot.valorventaAfecto   },
                { label: "Vta. Inafecta", value: cot.valorventaInafecto },
                { label: "IGV",           value: cot.igv                },
                { label: "Total",         value: cot.total              },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
                  <p className="text-base font-bold text-slate-800 mt-1">{fmt(value)}</p>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <InfoField
                label="Forma de Pago"
                value={cot.formaPago?.condicionPago || cot.formaPago?.descripcion || cot.formaspagoId}
              />
              <InfoField
                label="Condición de Pago"
                value={
                  cot.condicionpago?.descripcion
                    ? `${cot.condicionpago.descripcion}${cot.condicionpago.dias ? ` (${cot.condicionpago.dias} días)` : ""}`
                    : cot.condicionPago
                }
              />
              <InfoField
                label="Moneda"
                value={
                  cot.moneda?.descripcion
                    ? `${cot.moneda.descripcion}${cot.moneda.abreviatura ? ` (${cot.moneda.abreviatura})` : ""}`
                    : cot.monedaId
                }
              />
              <InfoField label="Tipo de Cambio" value={cot.tipoCambio ? fmt(cot.tipoCambio) : undefined} />
            </dl>
          </div>

          {/* ── Detalle de Ítems ── */}
          <div className="space-y-3">
            <SectionHeader icon={<IconPackage size={14} />} title={`Detalle de Ítems (${detalles.length})`} />
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {["#", "Producto", "Presentación", "Cant.", "Saldo Cant.", "Precio", "Desc. %", "Importe", "IGV"].map((h) => (
                      <th key={h} className={`px-3 py-2 text-[11px] font-bold uppercase whitespace-nowrap ${
                        ["Cant.", "Saldo Cant.", "Precio", "Desc. %", "Importe"].includes(h) ? "text-right" : "text-left"
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 text-xs italic">
                        Sin detalles
                      </td>
                    </tr>
                  ) : (
                    detalles.map((d, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-mono text-xs">{d.item ?? i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800 text-xs uppercase">
                            {d.bien?.descripcion || d.bienId}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {d.bien?.codAdmin ?? d.bien?.cod_admin ?? d.bienId}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          <span>{d.presentacion?.descripcion || d.presentacionId}</span>
                          {d.presentacion?.cantidad != null && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({d.presentacion.cantidad} kg)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{fmt(d.cantidad)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-blue-600">
                          {fmt((d as any).saldoCantidad ?? (d as any).saldo_cantidad)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{fmt(d.precio)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs italic text-slate-400">
                          {d.descuentoProducto != null
                            ? `${Number(d.descuentoProducto).toFixed(2)}%`
                            : "0.00%"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-xs text-slate-800">
                          {fmt(d.importe)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {d.afectoInafecto === false ? (
                            <span className="text-[10px] font-semibold text-amber-600">Inafecto</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-green-600">Afecto</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Sistema ── */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
              <IconBuilding size={14} /> Información del Sistema
            </h4>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-slate-500 font-semibold">ID Cotización</dt>
                <dd className="text-slate-700 font-mono">{cot.cotizacionventaId}</dd>
              </div>
              {cot.empresa?.razonSocial && (
                <div>
                  <dt className="text-slate-500 font-semibold">Empresa</dt>
                  <dd className="text-slate-700">{cot.empresa.razonSocial}</dd>
                </div>
              )}
              {cot.empresa?.ruc && (
                <div>
                  <dt className="text-slate-500 font-semibold">RUC</dt>
                  <dd className="text-slate-700 font-mono">{cot.empresa.ruc}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 font-semibold">ID Empresa</dt>
                <dd className="text-slate-700 font-mono">{cot.empresaId}</dd>
              </div>
              {cot.cuentaUsuario?.usuario && (
                <div>
                  <dt className="text-slate-500 font-semibold">Usuario</dt>
                  <dd className="text-slate-700 font-mono">{cot.cuentaUsuario.usuario}</dd>
                </div>
              )}
              {cot.cuentausuarioId && (
                <div>
                  <dt className="text-slate-500 font-semibold">Cuenta Usuario</dt>
                  <dd className="text-slate-700 font-mono">{cot.cuentausuarioId}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <IconX size={18} /> Cerrar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400">
          No se pudo cargar la información de la cotización
        </div>
      )}
    </Modal>
  );
}
