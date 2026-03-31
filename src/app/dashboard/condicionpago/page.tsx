"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import condicionPagoService from "@/services/condicionpagoService";
import type { CondicionPago } from "@/types/condicionpago.types";

import CondicionPagoFormModal from "./components/condicionpagoform";
import CondicionPagoViewModal from "./components/condicionpagoview";

import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconFileInvoice,
  IconLoader,
  IconEye,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function CondicionPagoPage() {
  const [data, setData] = useState<CondicionPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CondicionPago | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await condicionPagoService.getAll();
      setData(result);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar condiciones de pago");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;

    return data.filter((item) => {
      const descripcion = String(item.descripcion ?? "").toLowerCase();
      const condicionPagoId = String(item.condicionPagoId ?? "").toLowerCase();
      return descripcion.includes(term) || condicionPagoId.includes(term);
    });
  }, [data, searchTerm]);

  const handleView = (condicionPagoId?: string | null) => {
    if (!condicionPagoId) {
      toast.error("ID inválido");
      return;
    }
    setViewId(condicionPagoId);
    setShowViewModal(true);
  };

  const handleDelete = async (condicionPagoId?: string | null) => {
    if (!condicionPagoId) {
      toast.error("ID inválido");
      return;
    }

    const result = await Swal.fire({
      title: "¿Eliminar condición de pago?",
      text: `Se eliminará el registro ${condicionPagoId}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      await condicionPagoService.delete(condicionPagoId);
      toast.success("Condición de pago eliminada correctamente");
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar la condición de pago");
    }
  };

  return (
    <div className="p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Condiciones de Pago</h1>
          <p className="text-sm text-slate-500">Gestión de condiciones de pago</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
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
            <IconPlus size={20} /> Nueva Condición de Pago
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por descripción o ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-[120px]">
                  ID
                </th>
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-3">
                  Descripción
                </th>
                <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-[140px]">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <IconLoader className="animate-spin text-blue-600" size={32} />
                      <p className="text-slate-400 text-sm">Cargando condiciones de pago...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <IconFileInvoice className="text-slate-300" size={48} />
                      <p className="text-slate-400 text-sm">
                        {searchTerm
                          ? "No se encontraron resultados para la búsqueda"
                          : "No hay condiciones de pago registradas"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr
                    key={row.condicionPagoId ?? `cp-${index}`}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-700 text-sm uppercase">
                        {row.condicionPagoId ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <IconFileInvoice size={20} />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm uppercase">{row.descripcion}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(row.condicionPagoId)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                          title="Visualizar"
                        >
                          <IconEye size={18} />
                        </button>

                        <button
                          onClick={() => {
                            setSelected(row);
                            setShowForm(true);
                          }}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-slate-600 hover:text-blue-600"
                          title="Editar"
                        >
                          <IconEdit size={18} />
                        </button>

                        <button
                          onClick={() => handleDelete(row.condicionPagoId)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-600 hover:text-red-600"
                          title="Eliminar"
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredData.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Mostrando {filteredData.length} de {data.length} condición(es) de pago
          </div>
        )}
      </div>

      {/* Modals */}
      <CondicionPagoFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        condicionPagoToEdit={selected}
        onSuccess={() => {
          fetchData();
          setShowForm(false);
        }}
      />

      <CondicionPagoViewModal
        condicionPagoId={viewId}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewId(null);
        }}
      />
    </div>
  );
}