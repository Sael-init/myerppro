"use client";

import { useEffect, useState } from "react";
import listaPreciosService from "@/services/listaprecioService";
import Modal from "@/components/ui/Modal";
import { IconLoader, IconTag, IconListDetails, IconToggleLeft, IconToggleRight, IconUsersGroup, IconBuildingStore } from "@tabler/icons-react";
import { toast } from "sonner";
import type { ListaPrecio, ListaPrecioDetalle, ListaPrecioPerfilRelacionado, ListaPrecioPuntoVentaRelacionado } from "@/types/listaprecio.types";

// SQL FOR JSON PATH puede devolver arrays como string JSON — esta función lo normaliza
function parseJsonArray<T>(val: T[] | string | null | undefined): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) as T[]; } catch { return []; }
}

interface Props {
  listaprecioId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStateChange?: () => void;
}

const InfoField = ({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value?: string | number | boolean | null;
  fullWidth?: boolean;
}) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
        {typeof value === "boolean" ? (value ? "Sí" : "No") : String(value)}
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
  Registrado: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200"          },
  REGISTRADO: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200"          },
  ACT:        { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"    },
  Activo:     { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"    },
  ACTIVO:     { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"    },
  INA:        { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Inactivo:   { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  INACTIVO:   { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ANU:        { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"          },
  Anulado:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"          },
  ANULADO:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"          },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label:     (estado ?? "—").toUpperCase(),
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

const ANULADO_ESTADOS = ["ANU", "Anulado", "ANULADO"];

export default function ListaPrecioViewModal({ listaprecioId, isOpen, onClose, onStateChange }: Props) {
  const [lista,      setLista]      = useState<ListaPrecio | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!isOpen || !listaprecioId) { setLista(null); return; }
    setLoading(true);
    listaPreciosService
      .getById(listaprecioId)
      .then(setLista)
      .catch((err: any) => toast.error(err.message ?? "Error al cargar detalle"))
      .finally(() => setLoading(false));
  }, [isOpen, listaprecioId]);

  const detalles:   ListaPrecioDetalle[]               = parseJsonArray(lista?.detalles);
  const perfiles:   ListaPrecioPerfilRelacionado[]     = parseJsonArray((lista as any)?.perfiles);
  const puntoventa: ListaPrecioPuntoVentaRelacionado[] = parseJsonArray((lista as any)?.puntoventa);

  const isAnulado = ANULADO_ESTADOS.includes(lista?.estado_listprec ?? "");
  const isActivo  = ["ACT", "Activo", "ACTIVO", "Disponible", "DISPONIBLE"]
    .includes(lista?.estado_listprec ?? "");

  const handleToggleEstado = async () => {
    if (!lista?.listaprecioId || isAnulado) return;
    if (!isActivo && lista.fecha_vencimiento) {
      const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
      const venc = new Date(lista.fecha_vencimiento); venc.setHours(0, 0, 0, 0);
      if (venc < hoy) {
        toast.error("No se puede activar una lista de precios vencida");
        return;
      }
    }
    try {
      setActivating(true);
      const res = await listaPreciosService.activar(lista.listaprecioId);
      toast.success(`Lista ${res.nuevoEstado} correctamente`);
      setLista((prev) => prev ? { ...prev, estado_listprec: res.nuevoEstado } : prev);
      onStateChange?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Error al cambiar el estado");
    } finally {
      setActivating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Lista de Precios" size="xl">
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
          <IconLoader size={22} className="animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      ) : !lista ? (
        <div className="py-8 text-center text-sm text-slate-400 italic">
          No se encontró la lista de precios
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-slate-800 font-mono">{lista.codigo_lista}</p>
              {lista.descripcion && (
                <p className="text-sm text-slate-500 mt-0.5">{lista.descripcion}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <EstadoBadge estado={lista.estado_listprec} />
              {lista.listadefault && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                  LISTA DEFAULT
                </span>
              )}
              {!isAnulado && !isActivo && (
                <button onClick={handleToggleEstado} disabled={activating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border text-green-700 border-green-200 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50">
                  {activating ? <IconLoader size={12} className="animate-spin" /> : <IconToggleRight size={14} />}
                  {activating ? "Procesando..." : "Activar"}
                </button>
              )}
              {isActivo && (
                <button onClick={handleToggleEstado} disabled={activating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all disabled:opacity-50">
                  {activating ? <IconLoader size={12} className="animate-spin" /> : <IconToggleLeft size={14} />}
                  {activating ? "Procesando..." : "Desactivar"}
                </button>
              )}
            </div>
          </div>

          {/* ── Info general ── */}
          <section>
            <SectionHeader icon={<IconTag size={14} />} title="Información General" />
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <InfoField label="ID Lista"          value={lista.listaprecioId} />
              <InfoField label="Código"            value={lista.codigo_lista} />
              <InfoField label="Tipo de Lista"     value={(lista as any).tipoListaPrecio?.descripcion ?? (lista.tipolistaprecioId ? String(lista.tipolistaprecioId) : undefined)} />
              <InfoField label="Estado"            value={(lista as any).estado?.descripcion ?? lista.estado_listprec} />
              <InfoField label="Fecha Inicio"      value={lista.fecha_inicio      ? new Date(lista.fecha_inicio).toLocaleDateString("es-PE")      : undefined} />
              <InfoField label="Fecha Vencimiento" value={lista.fecha_vencimiento ? new Date(lista.fecha_vencimiento).toLocaleDateString("es-PE") : undefined} />
              <InfoField label="Fecha Creación"    value={lista.fecha_creacion    ? new Date(lista.fecha_creacion).toLocaleDateString("es-PE")    : undefined} />
              <InfoField label="Lista Default"     value={lista.listadefault} />
              <InfoField label="Moneda"            value={lista.moneda ? `${lista.moneda.descripcion}${lista.moneda.abreviatura ? ` (${lista.moneda.abreviatura})` : ""}` : (lista.monedaId ?? "—")} />
            </dl>
          </section>

          {/* ── Detalles ── */}
          {detalles.length > 0 && (
            <section>
              <SectionHeader
                icon={<IconListDetails size={14} />}
                title={`Productos en Lista (${detalles.length})`}
              />
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="px-3 py-2.5 text-left" rowSpan={2}>Presentación / Bien</th>
                      <th className="px-3 py-2.5 text-right" rowSpan={2}>Costo Valoriz.</th>
                      <th className="px-3 py-2.5 text-right" rowSpan={2}>Utilidad %</th>
                      <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Minorista</th>
                      <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Mayorista</th>
                      <th className="px-3 py-2.5 text-center border-l border-slate-200" colSpan={2}>Distribuidor</th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 text-right border-l border-slate-200">Cantidad</th>
                      <th className="px-3 py-2 text-right">Precio Mín</th>
                      <th className="px-3 py-2 text-right border-l border-slate-200">Cantidad</th>
                      <th className="px-3 py-2 text-right">Precio Mín</th>
                      <th className="px-3 py-2 text-right border-l border-slate-200">Cantidad</th>
                      <th className="px-3 py-2 text-right">Precio Mín</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalles.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-800">
                            {d.presentacion?.descripcion ?? d.presentacionId}
                          </p>
                          {d.bien?.descripcion && (
                            <p className="text-[10px] text-slate-400">{d.bien.descripcion}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmt(d.costoValorizado)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {d.utilidad != null ? `${d.utilidad}%` : "—"}
                        </td>
                        {/* Minorista */}
                        <td className="px-3 py-2.5 text-right font-mono border-l border-slate-100">{fmt(d.cantidad_minorista)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmt(d.precio_minimo_minorista)}</td>
                        {/* Mayorista */}
                        <td className="px-3 py-2.5 text-right font-mono border-l border-slate-100">{fmt(d.cantidad_mayorista)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmt(d.precio_minimo_mayorista)}</td>
                        {/* Distribuidor */}
                        <td className="px-3 py-2.5 text-right font-mono border-l border-slate-100">{fmt(d.cantidad_distribuidor)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{fmt(d.precio_minimo_distribuidor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Perfiles Asignados ── */}
          {perfiles.length > 0 && (
            <section>
              <SectionHeader icon={<IconUsersGroup size={14} />} title={`Perfiles Asignados (${perfiles.length})`} />
              <div className="mt-3 flex flex-wrap gap-2">
                {perfiles.map((p, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <IconUsersGroup size={12} />
                    {(p as any).descripcion ?? (p as any).perfilesId ?? String(p)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Puntos de Venta Asignados ── */}
          {puntoventa.length > 0 && (
            <section>
              <SectionHeader icon={<IconBuildingStore size={14} />} title={`Puntos de Venta Asignados (${puntoventa.length})`} />
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {puntoventa.map((pv, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <IconBuildingStore size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {(pv as any).descripcion ?? (pv as any).puntoventaId ?? String(pv)}
                      </p>
                      {(pv as any).serie && (
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Serie: {(pv as any).serie}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </Modal>
  );
}
