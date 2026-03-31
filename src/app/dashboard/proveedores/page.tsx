"use client";

import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import proveedorService from "../../../services/proveedoresService";
import { Proveedor, FiltrosProveedor, FormDropdowns } from "../../../types/proveedores.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import ProveedorFormModal from "./components/ProveedorFormModal";
import ProveedorViewModal from "./components/ProveedorViewModal";
import ActionMenu from "@/components/shared/ActionMenu";

import {
  IconUserPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconBuildingStore,
  IconPhone,
  IconMail,
} from "@tabler/icons-react";
import { toast } from "sonner";

export default function ProveedoresPage() {
  const TENANT_ID = "1";

  const initialFilters: FiltrosProveedor = {
    docidentIds: [],
    tipoproveedorId: undefined,
    claseproveedorId: undefined,
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
  } = useCrud<Proveedor>(proveedorService, TENANT_ID, initialFilters);

  const [tempFilters, setTempFilters] = useState<FiltrosProveedor>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Proveedor | null>(null);

  const [catalogs, setCatalogs] = useState<FormDropdowns | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewProveedorId, setViewProveedorId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const unwrapRow = (row: any) => row?.original ?? row?.row ?? row ?? {};

  const resolveProveedorId = (row: any): string => {
    const r = unwrapRow(row);
    return String(r?.proveedorId ?? r?.ProveedorId ?? r?.proveedor_id ?? "").trim();
  };

  const resolveEstado = (row: any): boolean => {
    const r = unwrapRow(row);
    const v = r?.estado ?? r?.Estado;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    if (typeof v === "string") {
      const x = v.trim().toLowerCase();
      if (["1", "true", "activo", "active", "si", "sí"].includes(x)) return true;
      if (["0", "false", "anulado", "inactive", "inactivo", "no"].includes(x)) return false;
    }
    return Boolean(v);
  };

  const kvLabel = (item: any) =>
    String(item?.value ?? item?.descripcion ?? item?.descripcion_corta ?? item?.label ?? item?.key ?? "");

  const kvValue = (item: any) =>
    String(item?.key ?? item?.id ?? item?.value ?? item?.codigo ?? item?.descripcion ?? "");

  useEffect(() => {
    proveedorService
      .getFormDropdowns()
      .then((res: FormDropdowns) => {
        setCatalogs(res);
      })
      .catch(() => {
        toast.error("No se pudieron cargar los catálogos");
        setCatalogs({
          tipo_proveedor: [],
          clase_proveedor: [],
          documento_identidad: [],
          tenant: [],
        });
      });
  }, []);

  useEffect(() => {
    fetchData(1, debouncedSearch, filters);
  }, [debouncedSearch, filters, fetchData]);

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
    if (tempFilters.docidentIds && tempFilters.docidentIds.length > 0) {
      count += tempFilters.docidentIds.length;
    }
    if (tempFilters.tipoproveedorId) count += 1;
    if (tempFilters.claseproveedorId) count += 1;
    if (tempFilters.estado !== null && tempFilters.estado !== undefined) count += 1;
    return count;
  };

  const handleViewProveedor = (row: any) => {
    const proveedorId = resolveProveedorId(row);
    if (!proveedorId) {
      toast.error("No se pudo identificar el proveedor seleccionado");
      return;
    }
    setViewProveedorId(proveedorId);
    setShowViewModal(true);
  };

  const columns = [
    {
  header: "Documento",
  width: "140px",
  render: (row: any) => {
    const r = unwrapRow(row);
    return (
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400 font-bold uppercase">
          {r?.documentoIdentidad?.descripcion_corta || r?.docidentId || r?.DocidentId || "DOC"}
        </span>
        <span className="font-mono font-bold text-blue-700">
          {r?.numero_doc || r?.num_docident || r?.Num_docident || r?.NumeroDoc || "-"}
        </span>
      </div>
    );
  },
},
    {
      header: "Proveedor / Contacto",
      className: "min-w-[280px]",
      render: (row: any) => {
        const r = unwrapRow(row);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <IconBuildingStore size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{r?.descripcion || r?.Descripcion || "Sin nombre"}</p>
              <div className="flex flex-col gap-0.5">
                {(r?.email || r?.Email) && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <IconMail size={10} /> {r?.email || r?.Email}
                  </p>
                )}
                {(r?.telefono_movil || r?.Telefono_movil) && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <IconPhone size={10} /> {r?.telefono_movil || r?.Telefono_movil}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Dirección",
      className: "min-w-[200px]",
      render: (row: any) => {
        const r = unwrapRow(row);
        const direccion = r?.direccion || r?.Direccion;
        return (
          <div className="text-sm text-slate-700">
            {direccion ? (
              <span className="line-clamp-2">{direccion}</span>
            ) : (
              <span className="text-slate-400 italic text-xs">Sin dirección</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Tipo Proveedor",
      className: "text-center",
      width: "160px",
      render: (row: any) => {
        const r = unwrapRow(row);
        return (
          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap inline-block">
            {r?.tipoProveedor?.descripcion || r?.TipoProveedor?.descripcion || r?.tipoproveedorId || r?.TipoproveedorId || "N/A"}
          </span>
        );
      },
    },
    {
      header: "Clase Proveedor",
      className: "text-center",
      width: "160px",
      render: (row: any) => {
        const r = unwrapRow(row);
        return (
          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap inline-block">
            {r?.claseProveedor?.descripcion || r?.ClaseProveedor?.descripcion || r?.claseproveedorId || r?.ClaseproveedorId || "N/A"}
          </span>
        );
      },
    },
    {
      header: "Estado",
      className: "text-center",
      width: "100px",
      render: (row: any) => {
        const activo = resolveEstado(row);
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
      width: "120px",
      render: (row: any) => {
        const r = unwrapRow(row);
        const proveedorId = resolveProveedorId(row);
        const activo = resolveEstado(row);

        return (
          <div className="flex justify-center">
            <ActionMenu
              onEdit={
                activo
                  ? () => {
                      setSelected(r as Proveedor);
                      setShowForm(true);
                    }
                  : undefined
              }
              onAnular={
                activo
                  ? () => {
                      if (!proveedorId) {
                        toast.error("ID de proveedor inválido");
                        return;
                      }
                      handleAction(proveedorId, "anular");
                    }
                  : undefined
              }
              onDelete={
                !activo
                  ? () => {
                      if (!proveedorId) {
                        toast.error("ID de proveedor inválido");
                        return;
                      }
                      handleAction(proveedorId, "delete");
                    }
                  : undefined
              }
              onView={() => handleViewProveedor(row)}
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Maestro de Proveedores</h1>
          <p className="text-sm text-slate-500">Gestión de proveedores y suministros</p>
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
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <IconUserPlus size={20} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, teléfono, dirección..."
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
        onPageChange={(page: number) => fetchData(page, debouncedSearch, filters)}
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
              options={(catalogs.documento_identidad ?? []).map((t: any) => ({
                label: kvLabel(t),
                value: kvValue(t),
              }))}
              value={(tempFilters.docidentIds ?? []).map(String)}
              onChange={(vals: Array<string | number>) =>
                setTempFilters({
                  ...tempFilters,
                  docidentIds: vals.map(String),
                })
              }
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Proveedor</label>
              <select
                value={tempFilters.tipoproveedorId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    tipoproveedorId: e.target.value || undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {(catalogs.tipo_proveedor ?? []).map((t: any) => (
                  <option key={kvValue(t)} value={kvValue(t)}>
                    {kvLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Clase de Proveedor</label>
              <select
                value={tempFilters.claseproveedorId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    claseproveedorId: e.target.value || undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {(catalogs.clase_proveedor ?? []).map((t: any) => (
                  <option key={kvValue(t)} value={kvValue(t)}>
                    {kvLabel(t)}
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
          <div className="text-center py-10 text-slate-400 italic text-sm">Cargando catálogos...</div>
        )}
      </SidebarFiltros>

      <ProveedorFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        proveedorToEdit={selected}
        onSuccess={() => {
          fetchData(meta.currentPage, debouncedSearch, filters);
          setShowForm(false);
        }}
      />

      <ProveedorViewModal
        proveedorId={viewProveedorId}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewProveedorId(null);
        }}
      />
    </div>
  );
}
