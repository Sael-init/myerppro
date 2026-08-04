"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import listaPreciosService from "@/services/listaprecioService";
import Modal from "@/components/ui/Modal";
import type { ListaPrecio, FiltrosListaPrecio, TipoListaPrecio } from "@/types/listaprecio.types";
import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import ListaPrecioViewModal from "./components/ListaPrecioViewModal";
import AsignarPanel from "./components/AsignarPanel";
import { imprimirListaPrecio } from "@/utils/printListaPrecio";

import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconBan,
  IconToggleLeft,
  IconToggleRight,
  IconLink,
  IconPrinter,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { EMPRESA_ID } from "@/config/globals";

// ── Estado badge ─────────────────────────────────────────────────────────────
const estadoConfig: Record<string, { label: string; className: string }> = {
  Registrado: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200"         },
  REGISTRADO: { label: "REGISTRADO", className: "bg-sky-100 text-sky-700 border-sky-200"         },
  ACT:        { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"   },
  Activo:     { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"   },
  ACTIVO:     { label: "ACTIVO",     className: "bg-green-100 text-green-700 border-green-200"   },
  INA:        { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200"},
  Inactivo:   { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200"},
  INACTIVO:   { label: "INACTIVO",   className: "bg-yellow-100 text-yellow-700 border-yellow-200"},
  ANU:        { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"         },
  Anulado:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"         },
  ANULADO:    { label: "ANULADO",    className: "bg-red-100 text-red-600 border-red-200"         },
};

const EstadoBadge = ({ estado }: { estado?: string }) => {
  const cfg = estadoConfig[estado ?? ""] ?? {
    label:     (estado ?? "—").toUpperCase(),
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-default ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

function isAnuladoEstado(e?: string) {
  return ["ANU", "Anulado", "ANULADO"].includes(e ?? "");
}

function isActivoEstado(e?: string) {
  return ["ACT", "Activo", "ACTIVO", "Disponible", "DISPONIBLE"].includes(e ?? "");
}

// ── Confirm types ─────────────────────────────────────────────────────────────
type ConfirmType = "anular" | "delete" | "toggleEstado";

// ── ActionMenu ─────────────────────────────────────────────────────────────────
interface AccionesMenuProps {
  row:           ListaPrecio;
  onView:        () => void;
  onPrint?:      () => void;
  onEdit?:       () => void;
  onAsignar?:    () => void;
  onActivar?:    () => void;
  onDesactivar?: () => void;
  onAnular?:     () => void;
  onDelete?:     () => void;
}

const AccionesMenu = ({
  row,
  onView,
  onPrint,
  onEdit,
  onAsignar,
  onActivar,
  onDesactivar,
  onAnular,
  onDelete,
}: AccionesMenuProps) => {
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
        <div className="absolute right-0 z-50 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">

          <button
            onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Ver detalle
          </button>

          {onPrint && (
            <button
              onClick={() => { setOpen(false); onPrint(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <IconPrinter size={14} />
              Imprimir / Descargar
            </button>
          )}

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

          {onAsignar && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => { setOpen(false); onAsignar(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <IconLink size={14} />
                Asignar
              </button>
            </>
          )}

          {onActivar && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => { setOpen(false); onActivar(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-green-700 hover:bg-green-50 transition-colors"
              >
                <IconToggleRight size={14} />
                Activar
              </button>
            </>
          )}

          {onDesactivar && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => { setOpen(false); onDesactivar(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
              >
                <IconToggleLeft size={14} />
                Desactivar
              </button>
            </>
          )}

          {onAnular && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => { setOpen(false); onAnular(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
              >
                <IconBan size={14} />
                Anular lista
              </button>
            </>
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
                Eliminar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function ListaPreciosPage() {
  const router = useRouter();

  const initialFilters: FiltrosListaPrecio = {
    estado:           undefined,
    tipolistaprecioId: undefined,
    soloActivas:      undefined,
  };

  const {
    data, loading, meta,
    searchTerm, setSearchTerm,
    filters, setFilters, fetchData,
  } = useCrud<ListaPrecio>(listaPreciosService, EMPRESA_ID, initialFilters);

  const [tempFilters, setTempFilters]     = useState<FiltrosListaPrecio>(initialFilters);
  const [showFilters, setShowFilters]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewId, setViewId]               = useState<string | null>(null);

  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingAction, setPendingAction]   = useState<{ type: ConfirmType; row: ListaPrecio } | null>(null);

  const [asignarOpen,    setAsignarOpen]    = useState(false);
  const [asignarRow,     setAsignarRow]     = useState<ListaPrecio | null>(null);

  const [printingId, setPrintingId] = useState<string | null>(null);

  const [tipos, setTipos] = useState<TipoListaPrecio[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => { fetchData(1, debouncedSearch, filters); }, [debouncedSearch, filters]);

  useEffect(() => {
    listaPreciosService
      .getTiposByEmpresa(EMPRESA_ID)
      .then(setTipos)
      .catch(() => {});
  }, []);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = data;
    if (filters.estado) {
      const estadoLower = filters.estado.toLowerCase();
      result = result.filter((d) =>
        (d.estado_listprec ?? "").toLowerCase() === estadoLower
      );
    }
    if (filters.tipolistaprecioId) {
      result = result.filter((d) => d.tipolistaprecioId === filters.tipolistaprecioId);
    }
    return result;
  }, [data, filters]);

  const handleOpenSidebar  = () => { setTempFilters(filters); setShowFilters(true); };
  const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
  const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

  const countActiveFilters = () => {
    let n = 0;
    if (tempFilters.estado)            n++;
    if (tempFilters.tipolistaprecioId) n++;
    return n;
  };

  const openConfirm  = (type: ConfirmType, row: ListaPrecio) => { setPendingAction({ type, row }); setConfirmOpen(true); };
  const closeConfirm = () => { if (confirmLoading) return; setConfirmOpen(false); setPendingAction(null); };

  const handleConfirmAction = async () => {
    if (!pendingAction?.row?.listaprecioId) return;
    const { type, row } = pendingAction;
    try {
      setConfirmLoading(true);
      switch (type) {
        case "anular": {
          await listaPreciosService.anular(row.listaprecioId);
          toast.success("Lista de precios anulada correctamente");
          break;
        }
        case "delete": {
          await listaPreciosService.delete(row.listaprecioId);
          toast.success("Lista de precios eliminada correctamente");
          break;
        }
        case "toggleEstado": {
          const estaActivo = isActivoEstado(row.estado_listprec);
          if (!estaActivo && row.fecha_vencimiento) {
            const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
            const venc = new Date(row.fecha_vencimiento); venc.setHours(0, 0, 0, 0);
            if (venc < hoy) {
              toast.error("No se puede activar una lista de precios vencida");
              closeConfirm();
              return;
            }
          }
          const res = await listaPreciosService.activar(row.listaprecioId);
          toast.success(`Lista ${res.nuevoEstado} correctamente`);
          break;
        }
      }
      await fetchData(meta.currentPage, debouncedSearch, filters);
      closeConfirm();
    } catch (error: any) {
      toast.error(error?.message ?? "Error al ejecutar la acción");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Imprimir / Descargar ─────────────────────────────────────────────────
  const handlePrint = async (row: ListaPrecio) => {
    if (!row.listaprecioId || printingId) return;
    try {
      setPrintingId(row.listaprecioId);
      const full    = await listaPreciosService.getById(row.listaprecioId);
      const logoUrl = `${window.location.origin}/image/logo.png`;
      imprimirListaPrecio(full, logoUrl);
    } catch {
      toast.error("No se pudo obtener los datos para imprimir");
    } finally {
      setPrintingId(null);
    }
  };

  const getConfirmConfig = () => {
    if (!pendingAction) return null;
    const { type, row } = pendingAction;
    const esActivo = isActivoEstado(row.estado_listprec);
    const configs = {
      anular:       { title: "Anular lista de precios",          msg: "Se anulará la lista de precios. Esta acción no se puede deshacer fácilmente.",              btnLabel: "Anular",      btnClass: "bg-orange-600 hover:bg-orange-700" },
      delete:       { title: "Eliminar lista de precios",        msg: "Esta acción eliminará definitivamente la lista de precios anulada.",                        btnLabel: "Eliminar",    btnClass: "bg-red-600 hover:bg-red-700"       },
      toggleEstado: { title: esActivo ? "Desactivar lista" : "Activar lista", msg: esActivo ? "Se desactivará la lista de precios. No estará disponible para nuevos documentos." : "Se activará la lista de precios.", btnLabel: esActivo ? "Desactivar" : "Activar", btnClass: esActivo ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700" },
    };
    return configs[type];
  };

  const columns = [
    {
      header: "Código",
      width:  "130px",
      render: (row: ListaPrecio) => (
        <span className="font-mono font-bold text-blue-700 text-sm">{row.codigo_lista ?? "—"}</span>
      ),
    },
    {
      header:    "Tipo",
      width:     "140px",
      render:    (row: ListaPrecio) => (
        <span className="text-xs text-slate-700">
          {(row as any).tipoListaPrecio?.descripcion ?? (row.tipolistaprecioId ? `Tipo ${row.tipolistaprecioId}` : "—")}
        </span>
      ),
    },
    {
      header:    "Descripción",
      className: "min-w-[180px]",
      render:    (row: ListaPrecio) => (
        <span className="text-sm text-slate-700">{row.descripcion?.trim() || "—"}</span>
      ),
    },
    {
      header: "Moneda",
      width:  "110px",
      render: (row: ListaPrecio) => {
        const m = (row as any).moneda;
        if (m?.descripcion) {
          return (
            <span className="text-xs text-slate-700">
              {m.descripcion}{m.abreviatura ? ` (${m.abreviatura})` : ""}
            </span>
          );
        }
        return <span className="text-xs text-slate-400">{row.monedaId ?? "—"}</span>;
      },
    },
    {
      header: "Fecha Inicio",
      width:  "110px",
      render: (row: ListaPrecio) => (
        <span className="text-xs text-slate-700">
          {row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleDateString("es-PE") : "—"}
        </span>
      ),
    },
    {
      header: "Fecha Venc.",
      width:  "110px",
      render: (row: ListaPrecio) => {
        if (!row.fecha_vencimiento) return <span className="text-xs text-slate-400">—</span>;
        const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
        const venc = new Date(row.fecha_vencimiento); venc.setHours(0, 0, 0, 0);
        const vencida = venc < hoy;
        return (
          <span className={`text-xs ${vencida ? "text-red-600 font-semibold" : "text-slate-700"}`}>
            {venc.toLocaleDateString("es-PE")}
          </span>
        );
      },
    },
    {
      header:    "Default",
      width:     "70px",
      className: "text-center",
      render:    (row: ListaPrecio) =>
        row.listadefault ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">SÍ</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header:    "Estado",
      width:     "110px",
      className: "text-center",
      render:    (row: ListaPrecio) => (
        <div className="flex justify-center">
          <EstadoBadge estado={row.estado_listprec} />
        </div>
      ),
    },
    {
      header:    "Acciones",
      width:     "80px",
      className: "text-center",
      render:    (row: ListaPrecio) => {
        const anulado    = isAnuladoEstado(row.estado_listprec);
        const activo     = isActivoEstado(row.estado_listprec);
        const registrado = ["Registrado", "REGISTRADO"].includes(row.estado_listprec ?? "");
        const hoy        = new Date(); hoy.setHours(0, 0, 0, 0);
        const vencida    = row.fecha_vencimiento
          ? new Date(row.fecha_vencimiento).setHours(0, 0, 0, 0) < hoy.getTime()
          : false;

        return (
          <div className="flex justify-center">
            <AccionesMenu
              row={row}
              onView={() => { setViewId(row.listaprecioId); setShowViewModal(true); }}
              onPrint={() => handlePrint(row)}
              onEdit={!anulado ? () => router.push(`/dashboard/lista_precios/crear?edit=${row.listaprecioId}`) : undefined}
              onAsignar={!anulado ? () => { setAsignarRow(row); setAsignarOpen(true); } : undefined}
              onActivar={!activo && !anulado && !vencida ? () => openConfirm("toggleEstado", row) : undefined}
              onDesactivar={activo ? () => openConfirm("toggleEstado", row) : undefined}
              onAnular={!anulado ? () => openConfirm("anular", row) : undefined}
              onDelete={anulado  ? () => openConfirm("delete",  row) : undefined}
            />
          </div>
        );
      },
    },
  ];

  const cfg = getConfirmConfig();

  return (
    <div className="p-6 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Listas de Precios</h1>
          <p className="text-sm text-slate-500">Gestión de listas de precios de productos</p>
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
          <button
            onClick={() => router.push("/dashboard/lista_precios/crear")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconPlus size={20} /> Nueva Lista
          </button>
        </div>
      </div>

      {/* ── Búsqueda + Filtros ── */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por código, descripción..."
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
        data={filteredData}
        loading={loading}
        meta={meta}
        onPageChange={(page) => fetchData(page, debouncedSearch, filters)}
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
              onChange={(e) => setTempFilters({ ...tempFilters, estado: e.target.value || undefined })}
              className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="Disponible">Disponible</option>
              <option value="ACT">Activo</option>
              <option value="INA">Inactivo</option>
              <option value="ANU">Anulado</option>
            </select>
          </div>

          {tipos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Lista</label>
              <select
                value={tempFilters.tipolistaprecioId ?? ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    tipolistaprecioId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {tipos.map((t) => (
                  <option key={t.tipolistaprecioId} value={t.tipolistaprecioId}>
                    {t.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>
      </SidebarFiltros>

      {/* ── Panel asignar ── */}
      <AsignarPanel
        listaprecioId={asignarRow?.listaprecioId ?? null}
        listaCodigo={asignarRow?.codigo_lista}
        empresaId={EMPRESA_ID}
        isOpen={asignarOpen}
        onClose={() => { setAsignarOpen(false); setAsignarRow(null); }}
      />

      {/* ── View modal ── */}
      <ListaPrecioViewModal
        listaprecioId={viewId}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewId(null); }}
        onStateChange={() => fetchData(meta.currentPage, debouncedSearch, filters)}
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
