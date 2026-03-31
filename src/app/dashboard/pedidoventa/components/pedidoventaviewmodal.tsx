"use client";

import { useEffect, useState } from "react";
import pedidoventaService from "@/services/pedidoventaService";
import Modal from "@/components/ui/Modal";
import {
  IconLoader,
  IconX,
  IconShoppingCart,
  IconPackage,
  IconHistory,
  IconChecklist,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type {
  PedidoVenta,
  PedidoVentaDetalle,
  PedidoVentaDetalleFull,
  PedidoVentaAccion,
  HistorialSuceso,
} from "@/types/pedidoventa.type";

interface Props {
  pedidoventaId: string | null;
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
    <div className="w-1 h-4 bg-blue-600 rounded"></div>
    {icon}
    {title}
  </h4>
);

const estadoConfig: Record<string, { label: string; className: string }> = {
  Registrado: {
    label: "REGISTRADO",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  Aprobado: {
    label: "APROBADO",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  Anulado: {
    label: "ANULADO",
    className: "bg-red-50 text-red-600 border-red-100",
  },
  "COMPROMETIDO MANUAL": {
    label: "COMPROMETIDO",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label: estado?.toUpperCase() ?? "—",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
};

const fmt = (n?: number | null) =>
  n !== undefined && n !== null
    ? n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

export default function PedidoVentaViewModal({ pedidoventaId, isOpen, onClose }: Props) {
  const [full, setFull] = useState<PedidoVentaDetalleFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"detalle" | "acciones" | "historial">("detalle");

  useEffect(() => {
    if (isOpen && pedidoventaId) {
      setLoading(true);
      setActiveTab("detalle");
      pedidoventaService
        .getById(pedidoventaId)
        .then((res) => setFull(res))
        .catch((err: any) => {
          console.error("Error cargando pedido:", err);
          toast.error("Error al cargar el pedido de venta");
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setFull(null);
    }
  }, [isOpen, pedidoventaId]);

  const pv = full?.pedidoventa;
  const detalle = full?.detalle ?? [];
  const acciones = full?.pedidoventa_acciones ?? [];
  const historial = full?.historial_sucesos ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Pedido de Venta" size="xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando pedido de venta...</p>
        </div>
      ) : pv ? (
        <div className="space-y-5">
          {/* ── Header ── */}
          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconShoppingCart size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-800">
                  {pv.numero_correlativo || pv.pedidoventaId}
                </h3>
                <EstadoBadge estado={pv.estado} />
                {pv.estadoalmacen?.descripcion && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
                    {pv.estadoalmacen.descripcion.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-1 flex-wrap">
                <span className="text-xs text-slate-500">
                  <span className="font-semibold">Emisión:</span>{" "}
                  {pv.fecha_emision
                    ? new Date(pv.fecha_emision).toLocaleDateString("es-PE")
                    : "—"}
                </span>
                {pv.cliente?.descripcion && (
                  <span className="text-xs text-slate-500">
                    <span className="font-semibold">Cliente:</span> {pv.cliente.descripcion}
                  </span>
                )}
                {pv.moneda && (
                  <span className="text-xs text-slate-500 font-semibold text-blue-600">
                    {pv.moneda.abreviatura || pv.moneda.descripcion}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total</p>
              <p className="text-2xl font-bold text-slate-800">
                {fmt(pv.total)}
              </p>
            </div>
          </div>

          {/* ── Info cabecera ── */}
          <div className="space-y-3">
            <SectionHeader icon={null} title="Información General" />
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Correlativo" value={pv.numero_correlativo} />
              <InfoField
                label="Fecha Emisión"
                value={
                  pv.fecha_emision
                    ? new Date(pv.fecha_emision).toLocaleDateString("es-PE")
                    : undefined
                }
              />
              <InfoField
                label="Fecha Entrega"
                value={
                  pv.fecha_entrega
                    ? new Date(pv.fecha_entrega).toLocaleDateString("es-PE")
                    : undefined
                }
              />
              <InfoField
                label="Fecha Vencimiento"
                value={
                  pv.fecha_vencimiento
                    ? new Date(pv.fecha_vencimiento).toLocaleDateString("es-PE")
                    : undefined
                }
              />
              <InfoField
                label="Cliente"
                value={
                  pv.cliente?.descripcion
                    ? `${pv.cliente.descripcion}${pv.cliente.num_docident ? ` (${pv.cliente.num_docident})` : ""}`
                    : pv.clienteId
                }
                fullWidth
              />
              <InfoField label="Referencia Cliente" value={pv.cliente_referencia} fullWidth />
              <InfoField
                label="Vendedor"
                value={
                  pv.trabajador
                    ? `${pv.trabajador.apellidos || ""} ${pv.trabajador.nombres || ""}`.trim()
                    : pv.trabajadorId
                }
                fullWidth
              />
              <InfoField
                label="Tipo de Entrega"
                value={pv.tipoentrega?.descripcion || String(pv.tipoentregaId ?? "")}
              />
              <InfoField label="Dirección Entrega" value={pv.direccion_entrega} fullWidth />
              <InfoField label="Doc. Referencia" value={pv.documento_referencia} />
              <InfoField label="Lugar Despacho" value={pv.lugar_despacho} />
              <InfoField label="Observación" value={pv.observacion} fullWidth />
            </dl>
          </div>

          {/* ── Financiero ── */}
          <div className="space-y-3">
            <SectionHeader icon={null} title="Resumen Financiero" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Vta. Afecta", value: pv.valorventa_afecto },
                { label: "Vta. Inafecta", value: pv.valorventa_inafecto },
                { label: "IGV", value: pv.igv },
                { label: "Total", value: pv.total },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center"
                >
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
                  <p className="text-base font-bold text-slate-800 mt-1">{fmt(value)}</p>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <InfoField
                label="Forma de Pago"
                value={pv.formapago?.descripcion || pv.formaspagoId}
              />
              <InfoField
                label="Condición de Pago"
                value={
                  pv.condicionpago?.descripcion
                    ? `${pv.condicionpago.descripcion}${pv.condicionpago.dias ? ` (${pv.condicionpago.dias} días)` : ""}`
                    : pv.condicion_pago
                }
              />
              <InfoField
                label="Moneda"
                value={
                  pv.moneda?.descripcion
                    ? `${pv.moneda.descripcion}${pv.moneda.abreviatura ? ` (${pv.moneda.abreviatura})` : ""}`
                    : pv.monedaId
                }
              />
              <InfoField
                label="Tipo de Cambio"
                value={pv.tipo_cambio ? fmt(pv.tipo_cambio) : undefined}
              />
              {pv.operaciongratuita && (
                <InfoField
                  label="Operación Gratuita"
                  value={pv.tipooperaciongratuita?.descripcion || pv.tipoopegratuitaId}
                />
              )}
              {pv.valorventa_gratuito ? (
                <InfoField label="Valor Venta Gratuito" value={fmt(pv.valorventa_gratuito)} />
              ) : null}
            </dl>
          </div>

          {/* ── Tabs ── */}
          <div>
            <div className="flex gap-1 border-b mb-4">
              {(
                [
                  { key: "detalle", label: `Detalle (${detalle.length})`, icon: <IconPackage size={14} /> },
                  { key: "acciones", label: `Acciones (${acciones.length})`, icon: <IconChecklist size={14} /> },
                  { key: "historial", label: `Historial (${historial.length})`, icon: <IconHistory size={14} /> },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Detalle */}
            {activeTab === "detalle" && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      {["#", "Bien", "Presentación", "Cantidad", "Por Facturar", "Por Despachar", "Precio", "Importe"].map(
                        (h) => (
                          <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase whitespace-nowrap">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 text-xs italic">
                          Sin detalles
                        </td>
                      </tr>
                    ) : (
                      detalle.map((d, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono text-xs">{d.item ?? i + 1}</td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800 text-xs">{d.bien?.descripcion || d.bienId}</p>
                            {d.bien?.cod_admin && (
                              <p className="text-[10px] text-slate-400">{d.bien.cod_admin}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {d.presentacion?.descripcion || d.presentacionId}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(d.cantidad)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {(d as any).saldo_cantidad != null ? fmt((d as any).saldo_cantidad) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {(d as any).saldo_fisico != null ? fmt((d as any).saldo_fisico) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{fmt(d.precio)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-xs text-slate-800">
                            {fmt(d.importe)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Acciones */}
            {activeTab === "acciones" && (
              <div className="space-y-2">
                {acciones.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs italic">Sin acciones registradas</p>
                ) : (
                  acciones.map((a, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-1.5 rounded-full bg-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">{a.descripcion}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {a.usuario || a.usuarioUpdate}{" "}
                          {a.correo && `· ${a.correo}`}{" "}
                          {a.fechaUpdate && `· ${new Date(a.fechaUpdate).toLocaleString("es-PE")}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Historial */}
            {activeTab === "historial" && (
              <div className="space-y-2">
                {historial.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-xs italic">Sin historial de sucesos</p>
                ) : (
                  historial.map((h, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-1.5 rounded-full bg-purple-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            {h.suceso}
                          </span>
                          <span className="text-[10px] text-slate-400">{h.modulo} / {h.interfase}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{h.descripcion}</p>
                        {h.area_responsable?.descripcion && (
                          <p className="text-[10px] text-slate-400">Área: {h.area_responsable.descripcion}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Sistema ── */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Información del Sistema</h4>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-slate-500 font-semibold">ID Pedido</dt>
                <dd className="text-slate-700 font-mono">{pv.pedidoventaId}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-semibold">ID Empresa</dt>
                <dd className="text-slate-700 font-mono">{pv.empresaId}</dd>
              </div>
              {pv.cuentausuario?.usuario && (
                <div>
                  <dt className="text-slate-500 font-semibold">Usuario</dt>
                  <dd className="text-slate-700 font-mono">{pv.cuentausuario.usuario}</dd>
                </div>
              )}
              {pv.listaprecio?.descripcion && (
                <div>
                  <dt className="text-slate-500 font-semibold">Lista de Precios</dt>
                  <dd className="text-slate-700">{pv.listaprecio.descripcion}</dd>
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
          No se pudo cargar la información del pedido
        </div>
      )}
    </Modal>
  );
}