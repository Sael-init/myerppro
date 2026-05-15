"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import cotizacionService from "@/services/cotizacionService";
import documentoVentaService from "@/services/documentoventaService";
import Modal from "@/components/ui/Modal";
import type { Cotizacion, FiltrosCotizacion } from "@/types/cotizacion.types";
import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import DateInput from "@/components/forms/DateInput";
import CotizacionViewModal from "./components/CotizacionViewModal";

import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconFileDescription,
  IconCheck,
  IconBan,
  IconAlertTriangle,
  IconClock,
  IconMoodSmile,
} from "@tabler/icons-react";
import { toast } from "sonner";

const EMPRESA_ID        = "005";
const CUENTA_USUARIO_ID = "CU0001";

const fmt = (n?: number | null) =>
  n !== undefined && n !== null
    ? n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

// ── Estado Cotización ────────────────────────────────────────────────────────
const estadoConfig: Record<string, { label: string; className: string; detalle: string }> = {
  Registrado: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200",       detalle: "Cotización registrada" },
  REGISTRADO: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200",       detalle: "Cotización registrada" },
  Anulado:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200",       detalle: "Cotización anulada"     },
  ANULADO:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200",       detalle: "Cotización anulada"     },
  ACEPTADO:   { label: "ACEPTADO",   className: "bg-green-100 text-green-700 border-green-200", detalle: "Cotización aceptada"    },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label:     (estado ?? "—").toUpperCase(),
    className: "bg-slate-100 text-slate-600 border-slate-200",
    detalle:   "",
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

// ── Validez badge (vencimiento) ──────────────────────────────────────────────
type ValidezStatus = "vigente" | "por_vencer" | "vencida" | "sin_fecha";

function getValidezStatus(cot: Cotizacion): ValidezStatus {
  if (!cot.fechaVencimiento) return "sin_fecha";
  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(cot.fechaVencimiento); venc.setHours(0, 0, 0, 0);
  const diff = Math.ceil((venc.getTime() - hoy.getTime()) / 86_400_000);
  if (diff < 0) return "vencida";
  if (diff <= 3) return "por_vencer";
  return "vigente";
}

const VALIDEZ_BADGE = {
  vigente:    { bg: "bg-green-100",  text: "text-green-700",  border: "border-green-300",  tooltip: "Cotización vigente"              },
  por_vencer: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", tooltip: "Cotización próxima a vencer"     },
  vencida:    { bg: "bg-red-100",    text: "text-red-600",    border: "border-red-300",    tooltip: "Cotización vencida"              },
  sin_fecha:  { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",   tooltip: ""                               },
};

const CorrelatvoValidez = ({ row }: { row: Cotizacion }) => {
  const estado = (row.estado ?? "").toUpperCase();
  const esAnulado = estado === "ANULADO";
  const status = esAnulado ? "sin_fecha" : getValidezStatus(row);
  const cfg    = VALIDEZ_BADGE[status];

  return (
    <div className="flex flex-col gap-1">
      <span
        title={cfg.tooltip || undefined}
        className={`inline-flex self-start items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border cursor-default ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {row.numeroCorrelativo || row.cotizacionventaId}
      </span>
      <span className="text-[10px] text-slate-400">
        {row.fechaEmision ? new Date(row.fechaEmision).toLocaleDateString("es-PE") : "—"}
      </span>
      {row.fechaVencimiento && !esAnulado && (
        <span className="text-[9px] text-slate-400">
          vence: {new Date(row.fechaVencimiento).toLocaleDateString("es-PE")}
        </span>
      )}
    </div>
  );
};

// ── Leyenda ──────────────────────────────────────────────────────────────────
type LeyendaItem = { label: string; detalle: string; icon: React.ElementType; iconBg: string };

const LEYENDA: LeyendaItem[] = [
  { label: "REGISTRADO",    detalle: "Cotización registrada, pendiente de respuesta",  icon: IconClock,         iconBg: "bg-sky-500"    },
  { label: "ACEPTADO",      detalle: "Cotización aceptada por el cliente",              icon: IconMoodSmile,     iconBg: "bg-green-500"  },
  { label: "ANULADO",       detalle: "Cotización anulada",                              icon: IconBan,           iconBg: "bg-red-500"    },
  { label: "VIGENTE",       detalle: "Cotización dentro del plazo de validez",          icon: IconCheck,         iconBg: "bg-green-500"  },
  { label: "POR VENCER",    detalle: "Vence en 3 días o menos",                        icon: IconAlertTriangle, iconBg: "bg-yellow-500" },
];

const LeyendaItemComp = ({ item }: { item: LeyendaItem }) => {
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
    <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 w-80 max-h-[80vh] overflow-y-auto">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Estados y Validez</h3>
      <div className="flex flex-col gap-0.5">
        {LEYENDA.map((item) => <LeyendaItemComp key={item.label} item={item} />)}
      </div>
    </div>
  </>
);

// ── Tipos de confirmación ────────────────────────────────────────────────────
type ConfirmType = "anular" | "delete";

const confirmConfig: Record<ConfirmType, { title: string; msg: string; btnLabel: string; btnClass: string }> = {
  anular: { title: "Anular cotización", msg: "Se anulará la cotización. Esta acción no se puede deshacer fácilmente. ¿Deseas continuar?", btnLabel: "Anular",    btnClass: "bg-orange-600 hover:bg-orange-700" },
  delete: { title: "Eliminar cotización", msg: "Esta acción eliminará definitivamente la cotización anulada. ¿Deseas continuar?",          btnLabel: "Eliminar",  btnClass: "bg-red-600 hover:bg-red-700"       },
};

// ── ActionMenu ───────────────────────────────────────────────────────────────
interface CotizacionMenuProps {
  row:       Cotizacion;
  onView:    () => void;
  onEdit?:   () => void;
  onAnular?: () => void;
  onDelete?: () => void;
}

const CotizacionAccionesMenu = ({ row, onView, onEdit, onAnular, onDelete }: CotizacionMenuProps) => {
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

          <button
            onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Ver detalle
          </button>

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

          {(onAnular || onDelete) && <div className="border-t border-slate-100" />}

          {onAnular && (
            <button
              onClick={() => { setOpen(false); onAnular(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
            >
              <IconBan size={14} />
              Anular cotización
            </button>
          )}

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
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Eliminar cotización
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const router = useRouter();

  const initialFilters: FiltrosCotizacion = {
    estado:      null,
    clienteId:   undefined,
    trabajadorId: undefined,
    monedaId:    undefined,
    formaPagoId: undefined,
    fechaDesde:  undefined,
    fechaHasta:  undefined,
  };

  const {
    data, loading, meta,
    searchTerm, setSearchTerm,
    filters, setFilters, fetchData,
  } = useCrud<Cotizacion>(cotizacionService, EMPRESA_ID, initialFilters);

  const [tempFilters, setTempFilters]     = useState<FiltrosCotizacion>(initialFilters);
  const [showFilters, setShowFilters]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCotId, setViewCotId]         = useState<string | null>(null);
  const [showLeyenda, setShowLeyenda]     = useState(false);

  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingAction, setPendingAction]   = useState<{ type: ConfirmType; row: Cotizacion } | null>(null);

  const [monedas,    setMonedas]    = useState<{ key: string; value: string }[]>([]);
  const [formasPago, setFormasPago] = useState<{ key: string; value: string }[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => { fetchData(1, debouncedSearch, filters); }, [debouncedSearch, filters]);

  useEffect(() => {
    documentoVentaService
      .getFormDropdowns(EMPRESA_ID, EMPRESA_ID)
      .then((d) => {
        setMonedas((d.monedas ?? []).map((m: any) => ({ key: m.key ?? m.monedaId, value: m.value ?? m.descripcion })));
        setFormasPago((d.tipos_pago ?? []).map((f: any) => ({ key: f.key ?? f.formaspagoId, value: f.value ?? f.descripcion })));
      })
      .catch(() => {});
  }, []);

  const handleOpenSidebar  = () => { setTempFilters(filters); setShowFilters(true); };
  const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
  const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

  const countActiveFilters = () => {
    let count = 0;
    if (tempFilters.estado !== null && tempFilters.estado !== undefined && tempFilters.estado !== "") count++;
    if (tempFilters.clienteId)   count++;
    if (tempFilters.trabajadorId) count++;
    if (tempFilters.monedaId)    count++;
    if (tempFilters.formaPagoId) count++;
    if (tempFilters.fechaDesde)  count++;
    if (tempFilters.fechaHasta)  count++;
    return count;
  };

  const openConfirm  = (type: ConfirmType, row: Cotizacion) => { setPendingAction({ type, row }); setConfirmOpen(true); };
  const closeConfirm = () => { if (confirmLoading) return; setConfirmOpen(false); setPendingAction(null); };

  const handleConfirmAction = async () => {
    if (!pendingAction?.row?.cotizacionventaId) return;
    const { type, row } = pendingAction;
    try {
      setConfirmLoading(true);
      switch (type) {
        case "anular": await cotizacionService.anular(row.cotizacionventaId); toast.success("Cotización anulada correctamente");   break;
        case "delete": await cotizacionService.delete(row.cotizacionventaId); toast.success("Cotización eliminada correctamente"); break;
      }
      await fetchData(meta.currentPage, debouncedSearch, filters);
      closeConfirm();
    } catch (error: any) {
      toast.error(error?.message || "Error al ejecutar la acción");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEdit = (row: Cotizacion) => {
    if (!row.cotizacionventaId) return;
    router.push(`/dashboard/cotizaciones/crear?edit=${row.cotizacionventaId}`);
  };

  const columns = [
    {
      header: "Correlativo",
      width: "160px",
      render: (row: Cotizacion) => <CorrelatvoValidez row={row} />,
    },
    {
      header: "Cliente / Vendedor",
      className: "min-w-[260px]",
      render: (row: Cotizacion) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <IconFileDescription size={18} />
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
          </div>
        </div>
      ),
    },
    {
      header: "Vencimiento",
      width: "140px",
      render: (row: Cotizacion) => (
        <div className="flex flex-col text-xs text-slate-600">
          <span>
            {row.fechaVencimiento
              ? new Date(row.fechaVencimiento).toLocaleDateString("es-PE")
              : "—"}
          </span>
          {row.tiempoValidez != null && (
            <span className="text-[10px] text-slate-400">{row.tiempoValidez} día(s)</span>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      className: "text-right",
      width: "120px",
      render: (row: Cotizacion) => (
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
      width: "130px",
      render: (row: Cotizacion) => (
        <div className="flex justify-center">
          <EstadoBadge estado={row.estado} />
        </div>
      ),
    },
    {
      header: "Acciones",
      className: "text-center",
      width: "80px",
      render: (row: Cotizacion) => {
        const estado       = (row.estado ?? "").toUpperCase();
        const esRegistrado = estado === "REGISTRADO" || estado === "Registrado";
        const esAnulado    = estado === "ANULADO"    || estado === "Anulado";

        return (
          <div className="flex justify-center">
            <CotizacionAccionesMenu
              row={row}
              onView={() => { if (!row.cotizacionventaId) return; setViewCotId(row.cotizacionventaId); setShowViewModal(true); }}
              onEdit={esRegistrado   ? () => handleEdit(row)              : undefined}
              onAnular={esRegistrado ? () => openConfirm("anular", row)  : undefined}
              onDelete={esAnulado    ? () => openConfirm("delete", row)  : undefined}
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-slate-500">Gestión de cotizaciones de venta</p>
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
            onClick={() => router.push("/dashboard/cotizaciones/crear")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconPlus size={20} /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* ── Búsqueda + Filtros ── */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por correlativo, cliente..."
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
              <option value="ACEPTADO">Aceptado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>

          {monedas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Moneda</label>
              <select
                value={tempFilters.monedaId ?? ""}
                onChange={(e) => setTempFilters({ ...tempFilters, monedaId: e.target.value || undefined })}
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {monedas.map((m) => <option key={m.key} value={m.key}>{m.value}</option>)}
              </select>
            </div>
          )}

          {formasPago.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pago</label>
              <select
                value={tempFilters.formaPagoId ?? ""}
                onChange={(e) => setTempFilters({ ...tempFilters, formaPagoId: e.target.value || undefined })}
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {formasPago.map((f) => <option key={f.key} value={f.key}>{f.value}</option>)}
              </select>
            </div>
          )}

          <DateInput
            label="Fecha Desde"
            name="fechaDesde"
            value={tempFilters.fechaDesde || ""}
            onChange={(e) => setTempFilters({ ...tempFilters, fechaDesde: e.target.value || undefined })}
          />
          <DateInput
            label="Fecha Hasta"
            name="fechaHasta"
            value={tempFilters.fechaHasta || ""}
            onChange={(e) => setTempFilters({ ...tempFilters, fechaHasta: e.target.value || undefined })}
          />
        </div>
      </SidebarFiltros>

      {/* ── View modal ── */}
      <CotizacionViewModal
        cotizacionventaId={viewCotId}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewCotId(null); }}
      />

      {/* ── Modal confirmación ── */}
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

    </div>
  );
}
