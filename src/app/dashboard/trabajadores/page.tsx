"use client";

import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import trabajadorService from "@/services/trabajadorService";
import Modal from "@/components/ui/Modal";

import type {
  Trabajador,
  FiltrosTrabajador,
  FormDropdownsTrabajador,
} from "@/types/trabajador.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import ActionMenu from "@/components/shared/ActionMenu";

import TrabajadorFormModal from "./components/TrabajadorFormModal";
import TrabajadorViewModal from "./components/TrabajadorViewModal";

import {
  IconUserPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconUserCircle,
} from "@tabler/icons-react";

export default function TrabajadoresPage() {
  const EMPRESA_ID = "005";

  const initialFilters: FiltrosTrabajador = {
    docidentIds: [],
    cargoId: undefined,
    areaId: undefined,
    estado: null,
  };

  const {
    data,
    loading,
    meta,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    fetchData,
    handleAction,
  } = useCrud<Trabajador>(trabajadorService, EMPRESA_ID, initialFilters);

  const [tempFilters, setTempFilters] = useState<FiltrosTrabajador>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Trabajador | null>(null);

  const [catalogs, setCatalogs] = useState<FormDropdownsTrabajador | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTrabajadorId, setViewTrabajadorId] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "anular" | "delete";
    row: Trabajador;
  } | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const isActivo = (estado: string | null | undefined) => {
    if (!estado) return false;
    const s = String(estado).trim().toLowerCase();
    return s === "1" || s === "true" || s === "activo" || s === "a";
  };

  useEffect(() => {
    trabajadorService
      .getFormDropdowns()
      .then((res: any) => {
        const body = res?.data ?? res;
        setCatalogs(body as FormDropdownsTrabajador);
      })
      .catch((err: any) => {
        console.error("Error cargando catálogos:", err);
      });
  }, []);

  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters]);

  const handleOpenSidebar = () => {
    setTempFilters(filters);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters(initialFilters);
    setFilters(initialFilters);
  };

  const countActiveFilters = () => {
    let count = 0;
    if (tempFilters.docidentIds && tempFilters.docidentIds.length > 0) count += tempFilters.docidentIds.length;
    if (tempFilters.cargoId) count += 1;
    if (tempFilters.areaId) count += 1;
    if (tempFilters.estado !== null && tempFilters.estado !== undefined) count += 1;
    return count;
  };

  const handleViewTrabajador = (trabajadorId: string) => {
    setViewTrabajadorId(trabajadorId);
    setShowViewModal(true);
  };

  const openConfirm = (type: "anular" | "delete", row: Trabajador) => {
    setPendingAction({ type, row });
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setPendingAction(null);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction?.row?.trabajadorId) return;

    const { type, row } = pendingAction;
    const activo = isActivo(row.estado);

    try {
      setConfirmLoading(true);

      if (type === "delete") {
        if (activo) return;
        // ✅ CORREGIDO - Pasar empresaId como segundo parámetro
        await trabajadorService.delete(row.trabajadorId, row.empresaId ?? EMPRESA_ID);
      } else {
        if (!activo) return;
        await handleAction(row.trabajadorId, "anular", row.empresaId ?? EMPRESA_ID);
      }

      await fetchData(meta.currentPage, debouncedSearch, filters);
      closeConfirm();
    } catch (error) {
      console.error("Error ejecutando acción:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      header: "Documento",
      width: "160px",
      render: (row: Trabajador) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {row.documentoIdentidad?.descripcion_corta || row.docidentId || "DOC"}
          </span>
          <span className="font-mono font-bold text-blue-700 uppercase">{row.numero_doc || "-"}</span>
        </div>
      ),
    },
    {
      header: "Trabajador / Contacto",
      className: "min-w-[320px]",
      render: (row: Trabajador) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <IconUserCircle size={24} />
          </div>

          <div>
            <p className="font-semibold text-slate-800 text-sm uppercase">
              {(row.apellidos || "") + " " + (row.nombres || "")}
            </p>

            <div className="flex flex-col gap-0.5">
              {row.email && <p className="text-[10px] text-slate-500 uppercase">📧 {row.email}</p>}
              {row.telefono_movil && (
                <p className="text-[10px] text-slate-500 uppercase">📱 {row.telefono_movil}</p>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Cargo",
      className: "text-center",
      width: "180px",
      render: (row: Trabajador) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
          {row.cargo?.descripcion || (row.cargoId ? `#${row.cargoId}` : "N/A")}
        </span>
      ),
    },
    {
      header: "Área",
      className: "text-center",
      width: "180px",
      render: (row: Trabajador) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
          {row.area?.descripcion || (row.areaId ? `#${row.areaId}` : "N/A")}
        </span>
      ),
    },
    {
      header: "Estado",
      className: "text-center",
      width: "110px",
      render: (row: Trabajador) => {
        const activo = isActivo(row.estado);
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              activo
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-red-50 text-red-600 border-red-100"
            }`}
          >
            {activo ? "ACTIVO" : "ANULADO"}
          </span>
        );
      },
    },
    {
      header: "Acciones",
      className: "text-center",
      width: "80px",
      render: (row: Trabajador) => {
        const activo = isActivo(row.estado);

        return (
          <div className="flex justify-center">
            <ActionMenu
              onView={() => {
                if (!row.trabajadorId) return;
                handleViewTrabajador(row.trabajadorId);
              }}
              onEdit={
                activo
                  ? () => {
                      setSelected(row);
                      setShowForm(true);
                    }
                  : undefined
              }
              onAnular={activo ? () => openConfirm("anular", row) : undefined}
              onDelete={!activo ? () => openConfirm("delete", row) : undefined}
              isAnulado={!activo}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Maestro de Trabajadores
          </h1>
          <p className="text-sm text-slate-500">Gestión de trabajadores</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchData(meta.currentPage, debouncedSearch, filters)}
            className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-colors"
            disabled={loading}
          >
            <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => {
              setSelected(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconUserPlus size={20} /> Nuevo Trabajador
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o correo..."
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

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={fetchData}
      />

      <SidebarFiltros
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        totalActive={countActiveFilters()}
      >
        {catalogs ? (
          <div className="flex flex-col gap-5">
            <MultiSelect
              label="Tipo de Documento"
              options={catalogs.documento_identidad?.map((t) => ({
                label: t.value,
                value: String(t.key),
              }))}
              value={(tempFilters.docidentIds || []).map(String)}
              onChange={(vals) =>
                setTempFilters({
                  ...tempFilters,
                  docidentIds: (vals || []).map(String),
                })
              }
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Cargo</label>
              <select
                value={tempFilters.cargoId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    cargoId: e.target.value || undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {catalogs.cargo?.map((t) => (
                  <option key={String(t.key)} value={String(t.key)}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Área</label>
              <select
                value={tempFilters.areaId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    areaId: e.target.value || undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {catalogs.area?.map((t) => (
                  <option key={String(t.key)} value={String(t.key)}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
              <select
                value={tempFilters.estado === null ? "" : tempFilters.estado ? "true" : "false"}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    estado: e.target.value === "" ? null : e.target.value === "true",
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Anulados</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 italic text-sm">
            Cargando catálogos...
          </div>
        )}
      </SidebarFiltros>

      <TrabajadorFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        trabajadorToEdit={selected}
        onSuccess={() => {
          fetchData(meta.currentPage, debouncedSearch, filters);
          setShowForm(false);
        }}
      />

      <TrabajadorViewModal
        trabajadorId={viewTrabajadorId}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewTrabajadorId(null);
        }}
      />

      <Modal
        isOpen={confirmOpen}
        onClose={closeConfirm}
        title={pendingAction?.type === "delete" ? "Eliminar trabajador" : "Anular trabajador"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {pendingAction?.type === "delete"
              ? "Esta acción eliminará definitivamente al trabajador anulado. ¿Deseas continuar?"
              : "Se anulará el trabajador seleccionado. ¿Deseas continuar?"}
          </p>

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
              className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                pendingAction?.type === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {confirmLoading
                ? "Procesando..."
                : pendingAction?.type === "delete"
                ? "Eliminar"
                : "Anular"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}