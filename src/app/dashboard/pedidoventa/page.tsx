"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import pedidoventaService from "@/services/pedidoventaService";
import documentoVentaService from "@/services/DocumentoventaService";
import type { KeyValueOption } from "@/types/Documentoventa.types";
import Modal from "@/components/ui/Modal";

import type { PedidoVenta, FiltrosPedidoVenta } from "@/types/pedidoventa.type";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";

import PedidoVentaViewModal from "./components/pedidoventaviewmodal";

import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconShoppingCart,
  IconCheck,
  IconBan,
  IconX,
  IconHandStop,
  IconClock,
  IconAlertTriangle,
  IconCircleX,
  IconMoodSmile,
  IconLayoutGrid,
  IconScale,
  IconTruckDelivery,
  IconCalendar,
  IconEye,
} from "@tabler/icons-react";
import { toast } from "sonner";

const EMPRESA_ID        = "005";
const CUENTA_USUARIO_ID = "CU0001";

const fmt = (n?: number | null) =>
  n !== undefined && n !== null
    ? n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

// ── Estado Facturación ───────────────────────────────────────────────────────
const estadoConfig: Record<string, { label: string; className: string; detalle: string }> = {
  Registrado:            { label: "REGISTRADO",         className: "bg-sky-100 text-sky-700 border-sky-200",         detalle: "Pedido registrado por aprobar" },
  Aprobado:              { label: "APROBADO",            className: "bg-blue-100 text-blue-700 border-blue-200",      detalle: "Pedido aprobado" },
  Anulado:               { label: "ANULADO",             className: "bg-red-100 text-red-600 border-red-200",         detalle: "Pedido anulado" },
  PENDIENTE:             { label: "PENDIENTE",           className: "bg-orange-100 text-orange-700 border-orange-200", detalle: "Pedido en proceso de facturacion" },
  COMPROMETIDO:          { label: "COMPROMETIDO",        className: "bg-amber-100 text-amber-700 border-amber-200",   detalle: "Pedido totalmente facturado" },
  "COMPROMETIDO MANUAL": { label: "COMPROMETIDO MANUAL", className: "bg-amber-100 text-amber-700 border-amber-200",   detalle: "Pedido parcialmente facturado" },
};

// ── Estado Almacén ───────────────────────────────────────────────────────────
const estadoAlmacenConfig: Record<string, { label: string; className: string; detalle: string }> = {
  "ANULADO":           { label: "ANULADO",           className: "bg-red-100 text-red-600 border-red-200",           detalle: "Pedido anulado" },
  "ATENDIDO":          { label: "ATENDIDO",           className: "bg-amber-100 text-amber-700 border-amber-200",     detalle: "Pedido atendido en su totalidad" },
  "CANCELADO PARCIAL": { label: "CANCELADO PARCIAL",  className: "bg-indigo-100 text-indigo-700 border-indigo-200",  detalle: "Pedido parcialmente atendido" },
  "DESPACHO PARCIAL":  { label: "DESPACHO PARCIAL",   className: "bg-green-100 text-green-700 border-green-200",     detalle: "Pedido en proceso de atencion" },
  "POR APROBAR":       { label: "POR APROBAR",        className: "bg-slate-100 text-slate-500 border-slate-200",     detalle: "Pedido aun sin aprobar" },
  "POR DESPACHAR":     { label: "POR DESPACHAR",      className: "bg-red-50 text-red-500 border-red-100",            detalle: "Pedido aprobado" },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label: estado?.toUpperCase() ?? "—",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    detalle: "",
  };
  return (
    <span
      title={cfg.detalle}
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-default ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
};

const EstadoAlmacenBadge = ({ estado }: { estado?: string }) => {
  if (!estado) return <span className="text-[10px] text-slate-300">—</span>;
  const cfg = estadoAlmacenConfig[estado.toUpperCase()] ?? {
    label: estado.toUpperCase(),
    className: "bg-slate-100 text-slate-500 border-slate-200",
    detalle: "",
  };
  return (
    <span
      title={cfg.detalle}
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-default ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
};

// ── Leyenda dropdown ─────────────────────────────────────────────────────────
type LeyendaItem = { label: string; detalle: string; icon: React.ElementType; iconBg: string };

const LEYENDA_DESPACHO: LeyendaItem[] = [
  { label: "POR APROBAR",        detalle: "Pedido aun sin aprobar",               icon: IconClock,         iconBg: "bg-slate-400" },
  { label: "DESPACHO OPTIMO",    detalle: "Pedido dentro del plazo normal",       icon: IconCheck,         iconBg: "bg-green-500" },
  { label: "DESPACHO A REVISAR", detalle: "Pedido en riesgo de despacho",         icon: IconAlertTriangle, iconBg: "bg-yellow-500" },
  { label: "FUERA DE DESPACHO",  detalle: "Pedido fuera de plazo maximo atencion",icon: IconCircleX,       iconBg: "bg-red-500" },
];

const LEYENDA_ALMACEN: LeyendaItem[] = [
  { label: "ANULADO",           detalle: "Pedido anulado",                    icon: IconCircleX,       iconBg: "bg-red-500" },
  { label: "ATENDIDO",          detalle: "Pedido atendido en su totalidad",   icon: IconMoodSmile,     iconBg: "bg-orange-400" },
  { label: "CANCELADO PARCIAL", detalle: "Pedido parcialmente atendido",      icon: IconLayoutGrid,    iconBg: "bg-blue-500" },
  { label: "DESPACHO PARCIAL",  detalle: "Pedido en proceso de atencion",     icon: IconScale,         iconBg: "bg-green-500" },
  { label: "POR APROBAR",       detalle: "Pedido aun sin aprobar",            icon: IconClock,         iconBg: "bg-slate-400" },
  { label: "POR DESPACHAR",     detalle: "Pedido aprobado",                   icon: IconTruckDelivery, iconBg: "bg-slate-800" },
];

const LEYENDA_FACTURACION: LeyendaItem[] = [
  { label: "ANULADO",            detalle: "Pedido anulado",                       icon: IconCircleX,   iconBg: "bg-red-500" },
  { label: "APROBADO",           detalle: "Pedido aprobado",                      icon: IconClock,     iconBg: "bg-blue-500" },
  { label: "COMPROMETIDO",       detalle: "Pedido totalmente facturado",           icon: IconMoodSmile, iconBg: "bg-orange-400" },
  { label: "COMPROMETIDO MANUAL",detalle: "Pedido parcialmente facturado",        icon: IconCalendar,  iconBg: "bg-orange-400" },
  { label: "PENDIENTE",          detalle: "Pedido en proceso de facturacion",     icon: IconClock,     iconBg: "bg-orange-400" },
  { label: "REGISTRADO",         detalle: "Pedido registrado por aprobar",        icon: IconEye,       iconBg: "bg-indigo-400" },
];

const LeyendaItem = ({ item }: { item: LeyendaItem }) => {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
      <div className={`w-9 h-9 rounded-full ${item.iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={18} color="white" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-700 uppercase">{item.label}</p>
        <p className="text-[10px] text-slate-400">{item.detalle}</p>
      </div>
    </div>
  );
};

const LeyendaDropdown = ({ onClose }: { onClose: () => void }) => (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 w-[820px] max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-3 gap-4 divide-x divide-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Estado Despacho</h3>
          <div className="flex flex-col gap-0.5">
            {LEYENDA_DESPACHO.map((item) => <LeyendaItem key={item.label} item={item} />)}
          </div>
        </div>
        <div className="pl-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Estado Almacén</h3>
          <div className="flex flex-col gap-0.5">
            {LEYENDA_ALMACEN.map((item) => <LeyendaItem key={item.label} item={item} />)}
          </div>
        </div>
        <div className="pl-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Estado Facturación</h3>
          <div className="flex flex-col gap-0.5">
            {LEYENDA_FACTURACION.map((item) => <LeyendaItem key={item.label} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  </>
);

// ── Indicador de despacho ────────────────────────────────────────────────────
interface DespachoIndicatorProps {
  row: PedidoVenta;
  diasRevisar: number;
}

const DespachoIndicator = ({ row, diasRevisar }: DespachoIndicatorProps) => {
  const estado = row.estado ?? "";

  // No mostrar para anulados ni comprometidos
  if (estado === "Anulado" || estado === "COMPROMETIDO MANUAL") return null;

  const dias = row.dias_diferencia;
  if (dias === undefined || dias === null) return null;

  if (dias <= 0) {
    return (
      <span title="Pedido dentro del plazo normal" className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-green-100 text-green-700 border-green-200 cursor-default">
        DESPACHO OPTIMO
      </span>
    );
  }
  if (dias < diasRevisar) {
    return (
      <span title="Pedido en riesgo de despacho" className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-yellow-100 text-yellow-700 border-yellow-200 cursor-default">
        DESPACHO A REVISAR
      </span>
    );
  }
  return (
    <span title="Pedido fuera de plazo maximo atencion" className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-100 text-red-600 border-red-200 cursor-default">
      FUERA DE DESPACHO
    </span>
  );
};

// ── Tipos de confirmación ───────────────────────────────────────────────────
type ConfirmType = "aprobar" | "desaprobar" | "anular" | "delete";

const confirmConfig: Record<ConfirmType, { title: string; msg: string; btnLabel: string; btnClass: string }> = {
  aprobar:    { title: "Aprobar pedido",    msg: "Se aprobará el pedido y pasará al estado Aprobado. ¿Deseas continuar?",                          btnLabel: "Aprobar",    btnClass: "bg-green-600 hover:bg-green-700" },
  desaprobar: { title: "Desaprobar pedido", msg: "El pedido volverá al estado Registrado. ¿Deseas continuar?",                                     btnLabel: "Desaprobar", btnClass: "bg-yellow-600 hover:bg-yellow-700" },
  anular:     { title: "Anular pedido",     msg: "Se anulará el pedido. Esta acción no se puede deshacer fácilmente. ¿Deseas continuar?",          btnLabel: "Anular",     btnClass: "bg-orange-600 hover:bg-orange-700" },
  delete:     { title: "Eliminar pedido",   msg: "Esta acción eliminará definitivamente el pedido anulado. ¿Deseas continuar?",                    btnLabel: "Eliminar",   btnClass: "bg-red-600 hover:bg-red-700" },
};

// ── ActionMenu con control total de acciones ─────────────────────────────────
interface PedidoMenuProps {
  row: PedidoVenta;
  onView:         () => void;
  onEdit?:        () => void;
  onAprobar?:     () => void;
  onDesaprobar?:  () => void;
  onAnular?:      () => void;
  onComprometer?: () => void;
  onDelete?:      () => void;
}

const PedidoAccionesMenu = ({
  row,
  onView,
  onEdit,
  onAprobar,
  onDesaprobar,
  onAnular,
  onComprometer,
  onDelete,
}: PedidoMenuProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5"  r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">

          {/* Ver — siempre visible */}
          <button
            onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Ver detalle
          </button>

          {/* Editar — solo Registrado */}
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
          )}

          {(onAprobar || onDesaprobar || onAnular || onComprometer) && (
            <div className="border-t border-slate-100" />
          )}

          {/* Aprobar — solo Registrado */}
          {onAprobar && (
            <button
              onClick={() => { setOpen(false); onAprobar(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-green-700 hover:bg-green-50 transition-colors"
            >
              <IconCheck size={14} />
              Aprobar pedido
            </button>
          )}

          {/* Desaprobar — solo Aprobado */}
          {onDesaprobar && (
            <button
              onClick={() => { setOpen(false); onDesaprobar(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-yellow-700 hover:bg-yellow-50 transition-colors"
            >
              <IconX size={14} />
              Desaprobar pedido
            </button>
          )}

          {/* Comprometer — solo PENDIENTE */}
          {onComprometer && (
            <button
              onClick={() => { setOpen(false); onComprometer(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <IconHandStop size={14} />
              Comprometer pedido
            </button>
          )}

          {/* Anular — solo Registrado */}
          {onAnular && (
            <button
              onClick={() => { setOpen(false); onAnular(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
            >
              <IconBan size={14} />
              Anular pedido
            </button>
          )}

          {/* Eliminar — solo Anulado */}
          {onDelete && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Eliminar pedido
              </button>
            </>
          )}

        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function PedidoVentaPage() {
  const router = useRouter();

  const initialFilters: FiltrosPedidoVenta = {
    estado: null,
    clienteId: undefined,
    trabajadorId: undefined,
    fechaDesde: undefined,
    fechaHasta: undefined,
  };

  const {
    data, loading, meta,
    searchTerm, setSearchTerm,
    filters, setFilters, fetchData,
  } = useCrud<PedidoVenta>(pedidoventaService, EMPRESA_ID, initialFilters);

  const [tempFilters, setTempFilters]     = useState<FiltrosPedidoVenta>(initialFilters);
  const [showFilters, setShowFilters]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPedidoId, setViewPedidoId]   = useState<string | null>(null);
  const [showLeyenda, setShowLeyenda]     = useState(false);

  // ── Modal confirmación simple ─────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingAction, setPendingAction]   = useState<{ type: ConfirmType; row: PedidoVenta } | null>(null);

  // ── Modal comprometer ─────────────────────────────────────────────────────
  const [comprometiendo, setComprometiendo]     = useState(false);
  const [comprometerId, setComprometerId]       = useState<string | null>(null);
  const [comprometLoading, setComprometLoading] = useState(false);
  const [comprometForm, setComprometForm]             = useState({ arerespedId: "", descripcion: "" });
  const [areasResponsable, setAreasResponsable]       = useState<KeyValueOption[]>([]);

  // ── Estados y parámetros de despacho ─────────────────────────────────────
  const [estadosAlmacen, setEstadosAlmacen] = useState<{ key: string; value: string }[]>([]);
  const [diasRevisar,    setDiasRevisar]    = useState<number>(3);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    documentoVentaService
      .getFormDropdowns(EMPRESA_ID, EMPRESA_ID)
      .then((d) => setAreasResponsable(d.area_responsable ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.allSettled([
      pedidoventaService.getEstados(),
      pedidoventaService.getParametros(EMPRESA_ID),
    ]).then(([resEstados, resParams]) => {
      if (resEstados.status === "fulfilled") {
        const almacen = (resEstados.value.estadosAlmacen ?? []).map((e: any) => ({
          key:   e.estado_almacen ?? e.key ?? e.estadoAlmacen ?? "",
          value: e.descripcion   ?? e.value ?? "",
        }));
        setEstadosAlmacen(almacen);
      }
      if (resParams.status === "fulfilled") {
        const params: any[] = Array.isArray(resParams.value)
          ? resParams.value
          : resParams.value?.parametros ?? [];
        const param = params.find((p: any) =>
          (p.descripcion ?? p.nombre ?? "")
            .toLowerCase()
            .includes("plazo maximo revisar")
        );
        if (param) {
          const val = Number(param.valor ?? param.value ?? param.cantidad ?? 0);
          if (val > 0) setDiasRevisar(val);
        }
      }
    });
  }, []);

  const handleOpenSidebar  = () => { setTempFilters(filters); setShowFilters(true); };
  const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
  const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

  const countActiveFilters = () => {
    let count = 0;
    if (tempFilters.estado !== null && tempFilters.estado !== undefined && tempFilters.estado !== "") count++;
    if (tempFilters.clienteId)             count++;
    if (tempFilters.trabajadorId)          count++;
    if (tempFilters.fechaDesde)            count++;
    if (tempFilters.fechaHasta)            count++;
    if ((tempFilters as any).estadoAlmacen) count++;
    return count;
  };

  // ── Acciones confirm ──────────────────────────────────────────────────────
  const openConfirm  = (type: ConfirmType, row: PedidoVenta) => { setPendingAction({ type, row }); setConfirmOpen(true); };
  const closeConfirm = () => { if (confirmLoading) return; setConfirmOpen(false); setPendingAction(null); };

  const handleConfirmAction = async () => {
    if (!pendingAction?.row?.pedidoventaId) return;
    const { type, row } = pendingAction;
    try {
      setConfirmLoading(true);
      switch (type) {
        case "aprobar":    await pedidoventaService.aprobar(row.pedidoventaId, CUENTA_USUARIO_ID);    toast.success("Pedido aprobado correctamente");    break;
        case "desaprobar": await pedidoventaService.desaprobar(row.pedidoventaId, CUENTA_USUARIO_ID); toast.success("Pedido desaprobado correctamente"); break;
        case "anular":     await pedidoventaService.anular(row.pedidoventaId, CUENTA_USUARIO_ID);     toast.success("Pedido anulado correctamente");     break;
        case "delete":     await pedidoventaService.delete(row.pedidoventaId);                        toast.success("Pedido eliminado correctamente");   break;
      }
      await fetchData(meta.currentPage, debouncedSearch, filters);
      closeConfirm();
    } catch (error: any) {
      toast.error(error?.message || "Error al ejecutar la acción");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Comprometer ───────────────────────────────────────────────────────────
  const openComprometer = (row: PedidoVenta) => {
    if (!row.pedidoventaId) return;
    setComprometerId(row.pedidoventaId);
    setComprometForm({ arerespedId: "", descripcion: "" });
    setComprometiendo(true);
  };
  const closeComprometer = () => { if (comprometLoading) return; setComprometiendo(false); setComprometerId(null); };

  const handleComprometer = async () => {
    if (!comprometerId) return;
    const arerespedIdNum = Number(comprometForm.arerespedId);
    if (!arerespedIdNum || arerespedIdNum <= 0) { toast.error("Seleccione un área responsable"); return; }
    if (!comprometForm.descripcion.trim())       { toast.error("La descripción es requerida"); return; }
    try {
      setComprometLoading(true);
      await pedidoventaService.comprometer(comprometerId, arerespedIdNum, comprometForm.descripcion.trim());
      toast.success("Pedido comprometido correctamente");
      await fetchData(meta.currentPage, debouncedSearch, filters);
      closeComprometer();
    } catch (error: any) {
      toast.error(error?.message || "Error al comprometer el pedido");
    } finally {
      setComprometLoading(false);
    }
  };

  // ── Editar ────────────────────────────────────────────────────────────────
  const handleEdit = (row: PedidoVenta) => {
    if (!row.pedidoventaId) return;
    router.push(`/dashboard/pedidoventa/crear?edit=${row.pedidoventaId}`);
  };

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns = [
    {
      header: "Correlativo",
      width: "160px",
      render: (row: PedidoVenta) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-blue-700 text-sm uppercase">
            {row.numero_correlativo || row.pedidoventaId}
          </span>
          <span className="text-[10px] text-slate-400">
            {row.fecha_emision ? new Date(row.fecha_emision).toLocaleDateString("es-PE") : "—"}
          </span>
        </div>
      ),
    },
    {
      header: "Cliente / Vendedor",
      className: "min-w-[260px]",
      render: (row: PedidoVenta) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <IconShoppingCart size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm uppercase">
              {row.cliente?.descripcion || row.clienteId || "—"}
            </p>
            {row.trabajador && (
              <p className="text-[10px] text-slate-500 uppercase">
                👤 {`${row.trabajador.apellidos || ""} ${row.trabajador.nombres || ""}`.trim()}
              </p>
            )}
            {row.cliente_referencia && (
              <p className="text-[10px] text-slate-400 italic uppercase">{row.cliente_referencia}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Entrega",
      width: "160px",
      render: (row: PedidoVenta) => (
        <div className="flex flex-col text-xs text-slate-600 uppercase">
          <span>{row.tipoentrega?.descripcion || (row.tipoentregaId ? `#${row.tipoentregaId}` : "—")}</span>
          {row.fecha_entrega && (
            <span className="text-[10px] text-slate-400">
              {new Date(row.fecha_entrega).toLocaleDateString("es-PE")}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      className: "text-right",
      width: "120px",
      render: (row: PedidoVenta) => (
        <div className="text-right">
          <span className="text-xs text-slate-400 font-semibold mr-1 uppercase">
            {row.moneda?.abreviatura || row.monedaId || ""}
          </span>
          <span className="font-bold text-slate-800">{fmt(row.total)}</span>
        </div>
      ),
    },
    {
      header: "Estado",
      className: "text-center",
      width: "150px",
      render: (row: PedidoVenta) => (
        <div className="flex flex-col items-center gap-1">
          <EstadoBadge estado={row.estado} />
          <DespachoIndicator row={row} diasRevisar={diasRevisar} />
          {row.fecha_limite_despacho && (
            <span className="text-[9px] text-slate-400">
              límite: {new Date(row.fecha_limite_despacho).toLocaleDateString("es-PE")}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Estado Almacén",
      className: "text-center",
      width: "150px",
      render: (row: PedidoVenta) => (
        <div className="flex justify-center">
          <EstadoAlmacenBadge estado={row.estado_almacen} />
        </div>
      ),
    },
    {
      header: "Acciones",
      className: "text-center",
      width: "80px",
      render: (row: PedidoVenta) => {
        const estado        = row.estado ?? "";
        const esRegistrado  = estado === "Registrado";
        const esAprobado    = estado === "Aprobado";
        const esAnulado     = estado === "Anulado";
        const esPendiente   = estado === "PENDIENTE";

        return (
          <div className="flex justify-center">
            <PedidoAccionesMenu
              row={row}
              onView={() => {
                if (!row.pedidoventaId) return;
                setViewPedidoId(row.pedidoventaId);
                setShowViewModal(true);
              }}
              onEdit={esRegistrado        ? () => handleEdit(row)                 : undefined}
              onAprobar={esRegistrado     ? () => openConfirm("aprobar", row)     : undefined}
              onDesaprobar={esAprobado    ? () => openConfirm("desaprobar", row)  : undefined}
              onAnular={esRegistrado      ? () => openConfirm("anular", row)      : undefined}
              onComprometer={esPendiente  ? () => openComprometer(row)            : undefined}
              onDelete={esAnulado         ? () => openConfirm("delete", row)      : undefined}
            />
          </div>
        );
      },
    },
  ];

  const cfg = pendingAction ? confirmConfig[pendingAction.type] : null;

  return (
    <div className="p-6 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pedidos de Venta</h1>
          <p className="text-sm text-slate-500">Gestión de pedidos de venta</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(meta.currentPage, debouncedSearch, filters)}
            className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-colors"
            disabled={loading}
            title="Actualizar"
          >
            <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowLeyenda((v) => !v)}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors text-sm"
            >
              Leyenda
            </button>
            {showLeyenda && <LeyendaDropdown onClose={() => setShowLeyenda(false)} />}
          </div>
          <button
            onClick={() => router.push("/dashboard/pedidoventa/crear")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconPlus size={20} /> Nuevo Pedido
          </button>
        </div>
      </div>

      {/* ── Búsqueda + Filtros ── */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por correlativo, cliente, trabajador..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handleOpenSidebar}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
            countActiveFilters() > 0
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-white border-slate-300"
          }`}
        >
          <IconFilter size={20} />
          Filtros {countActiveFilters() > 0 && `(${countActiveFilters()})`}
        </button>
      </div>

      {/* ── Tabla ── */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={fetchData}
      />

      {/* ── Sidebar filtros ── */}
      <SidebarFiltros
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        totalActive={countActiveFilters()}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
            <select
              value={tempFilters.estado ?? ""}
              onChange={(e) => setTempFilters({ ...tempFilters, estado: e.target.value || null })}
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="Registrado">Registrado</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Anulado">Anulado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="COMPROMETIDO MANUAL">Comprometido</option>
            </select>
          </div>
          {estadosAlmacen.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Estado Almacén</label>
              <select
                value={(tempFilters as any).estadoAlmacen ?? ""}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, ...(e.target.value ? { estadoAlmacen: e.target.value } : { estadoAlmacen: undefined }) } as any)
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {estadosAlmacen.map((e) => (
                  <option key={e.key} value={e.key}>{e.value}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha Desde</label>
            <input
              type="date"
              value={tempFilters.fechaDesde || ""}
              onChange={(e) => setTempFilters({ ...tempFilters, fechaDesde: e.target.value || undefined })}
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha Hasta</label>
            <input
              type="date"
              value={tempFilters.fechaHasta || ""}
              onChange={(e) => setTempFilters({ ...tempFilters, fechaHasta: e.target.value || undefined })}
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </SidebarFiltros>

      {/* ── View modal ── */}
      <PedidoVentaViewModal
        pedidoventaId={viewPedidoId}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewPedidoId(null); }}
      />

      {/* ── Modal confirmación simple ── */}
      <Modal isOpen={confirmOpen} onClose={closeConfirm} title={cfg?.title ?? "Confirmar acción"} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{cfg?.msg}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeConfirm}
              disabled={confirmLoading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={confirmLoading}
              className={`px-4 py-2 rounded-lg text-white font-bold disabled:opacity-50 ${cfg?.btnClass ?? ""}`}
            >
              {confirmLoading ? "Procesando..." : cfg?.btnLabel}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal leyenda ── */}
      {/* ── Modal comprometer ── */}
      <Modal isOpen={comprometiendo} onClose={closeComprometer} title="Comprometer pedido" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Complete los datos para comprometer el pedido con un área responsable.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Área Responsable *</label>
            <select
              value={comprometForm.arerespedId}
              onChange={(e) => setComprometForm((p) => ({ ...p, arerespedId: e.target.value }))}
              disabled={comprometLoading}
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400 bg-white"
            >
              <option value="">— Seleccione un área —</option>
              {areasResponsable.map((a) => (
                <option key={a.key} value={String(a.key)}>
                  {a.value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción / Motivo *</label>
            <textarea
              rows={3}
              value={comprometForm.descripcion}
              onChange={(e) => setComprometForm((p) => ({ ...p, descripcion: e.target.value }))}
              disabled={comprometLoading}
              placeholder="Motivo del compromiso..."
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={closeComprometer}
              disabled={comprometLoading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleComprometer}
              disabled={comprometLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
            >
              {comprometLoading ? "Procesando..." : "Comprometer"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}