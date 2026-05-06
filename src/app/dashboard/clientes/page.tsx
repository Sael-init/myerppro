"use client";

import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import clienteService from "@/services/clienteService";
import { Cliente, FiltrosCliente, FormDropdowns } from "@/types/cliente.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import ClienteFormModal from "./components/ClienteFormModal";
import ClienteViewModal from "./components/ClientViewModal";
import ActionMenu from "@/components/shared/ActionMenu";

import {
  IconUserPlus,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconUserCircle,
  IconMapPin,
} from "@tabler/icons-react";

export default function ClientesPage() {
  const TENANT_ID = "1";

  const initialFilters: FiltrosCliente = {
    docidentIds: [],
    tipoclienteId: undefined,
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
  } = useCrud<Cliente>(clienteService, TENANT_ID, initialFilters);

  const [tempFilters, setTempFilters] = useState<FiltrosCliente>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const handleOpenEdit = async (row: Cliente) => {
    if (!row.clienteId) return;
    setLoadingEdit(true);
    try {
      const full = await clienteService.getById(row.clienteId);
      setSelected(full);
    } catch {
      setSelected(row);
    } finally {
      setLoadingEdit(false);
      setShowForm(true);
    }
  };

  const [catalogs, setCatalogs] = useState<FormDropdowns | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewClienteId, setViewClienteId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    clienteService
      .getFormDropdowns()
      .then((res: FormDropdowns) => {
        setCatalogs(res);
      })
      .catch((err) => {
        console.error("Error cargando catálogos:", err);
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
    if (tempFilters.tipoclienteId) count += 1;
    if (tempFilters.estado !== null && tempFilters.estado !== undefined) count += 1;
    return count;
  };

  const handleViewCliente = (clienteId: string) => {
    setViewClienteId(clienteId);
    setShowViewModal(true);
  };

  const columns = [
    {
      header: "Documento",
      width: "140px",
      render: (row: Cliente) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {row.documento_identidad?.descripcion_corta || row.docidentId || "DOC"}
          </span>
          <span className="font-mono font-bold text-blue-700 uppercase">{row.num_docident}</span>
        </div>
      ),
    },
    {
      header: "Cliente / Contacto",
      className: "min-w-[280px]",
      render: (row: Cliente) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <IconUserCircle size={24} />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm uppercase">{row.descripcion || "Sin nombre"}</p>
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
      header: "Dirección",
      className: "min-w-[200px]",
      render: (row: Cliente) => (
        <div className="text-sm text-slate-700">
          {row.direccion ? (
            <span className="line-clamp-2 uppercase">{row.direccion}</span>
          ) : (
            <span className="text-slate-400 italic text-xs">Sin dirección</span>
          )}
        </div>
      ),
    },
    {
      header: "Ubicación",
      className: "min-w-[220px]",
      render: (row: Cliente) => {
        const ubicacionParts = [row.ubigeo?.ubidsn, row.ubigeo?.ubiprn, row.ubigeo?.ubiden].filter(
          Boolean
        );
        const ubicacionText = ubicacionParts.join(", ");

        return (
          <div className="flex items-start gap-2">
            <IconMapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 uppercase">
              {ubicacionText || <span className="text-slate-400 italic">Sin ubicación</span>}
            </div>
          </div>
        );
      },
    },
    {
      header: "Tipo Cliente",
      className: "text-center",
      width: "160px",
      render: (row: Cliente) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap inline-block uppercase">
          {row.tipocliente?.descripcion || row.tipoclienteId || "N/A"}
        </span>
      ),
    },
    {
      header: "Estado",
      className: "text-center",
      width: "100px",
      render: (row: Cliente) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            row.estado
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-red-50 text-red-600 border-red-100"
          }`}
        >
          {row.estado ? "ACTIVO" : "ANULADO"}
        </span>
      ),
    },
   {
    header: "Acciones",
    className: "text-center",
    width: "120px",
    render: (row: Cliente) => (
        <div className="flex justify-center">
            <ActionMenu 
                onEdit={row.estado ? () => handleOpenEdit(row) : undefined}
                onAnular={row.estado ? () => {
                    if (!row.clienteId) return;
                    handleAction(row.clienteId, "anular");
                } : undefined}
                onDelete={!row.estado ? () => {
                    if (!row.clienteId) return;
                    handleAction(row.clienteId, "delete");
                } : undefined}
                onView={() => {
                    if (!row.clienteId) return;
                    handleViewCliente(row.clienteId);
                }}
                isAnulado={!row.estado}
            />
        </div>
    ),
},
  ];

  return (
    <div className="p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Maestro de Clientes</h1>
          <p className="text-sm text-slate-500">Gestión de clientes y contactos</p>
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
            <IconUserPlus size={20} /> Nuevo Cliente
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
            placeholder="Buscar por nombre, documento, teléfono, dirección, ubicación..."
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
              options={(catalogs.documento_identidad ?? []).map((t) => ({
                label: t.value,
                value: String(t.key),
              }))}
              value={tempFilters.docidentIds || []}
              onChange={(vals: Array<string | number>) =>
                setTempFilters({
                  ...tempFilters,
                  docidentIds: vals.map(String),
                })
              }
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Cliente</label>
              <select
                value={tempFilters.tipoclienteId || ""}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    tipoclienteId: e.target.value || undefined,
                  })
                }
                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {(catalogs.tipo_cliente ?? []).map((t) => (
                  <option key={String(t.key)} value={String(t.key)}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
              <select
                value={
                  tempFilters.estado === null ? "" : tempFilters.estado ? "true" : "false"
                }
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

      <ClienteFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        clienteToEdit={selected}
        onSuccess={() => {
          fetchData(meta.currentPage, debouncedSearch, filters);
          setShowForm(false);
        }}
      />

      <ClienteViewModal
        clienteId={viewClienteId}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewClienteId(null);
        }}
      />
    </div>
  );
}