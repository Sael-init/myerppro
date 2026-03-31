"use client";

import { useState, useEffect, useCallback } from "react";
import formasPagoService, { toId3, PaginatedResponse } from "@/services/formaspagoService";
import type { FormasPago } from "@/types/formaspago.types";

import FormasPagoFormModal from "./components/FormasPagoFormsmodal";
import FormasPagoViewModal from "./components/FromasPagoViewmodal";

import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconCreditCard,
  IconLoader,
  IconEye,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { toast } from "sonner";
import Swal from "sweetalert2";

export default function FormasPagoPage() {
  const [data, setData] = useState<FormasPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [nextEndpoint, setNextEndpoint] = useState<string | null>(null);
  


  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<FormasPago | null>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

 const fetchData = useCallback(async (page: number, endpoint?: string | null) => {
  try {
    setLoading(true);
    const result: PaginatedResponse<FormasPago> = await formasPagoService.getAll(
      page,
      pageSize,
      searchTerm || undefined,
      undefined,
      endpoint ?? null
    );

    setData(result.data);
    setTotalRecords(result.totalRecords);
    setCurrentPage(result.currentPage);
    setTotalPages(result.totalPages);
    setHasNext(result.hasNext);
    setNextEndpoint(result.nextEndpoint);
  } catch (error: any) {
    console.error('Error al cargar:', error);
    toast.error(error?.message || "Error al cargar formas de pago");
    setData([]);
    setTotalRecords(0);
    setTotalPages(1);
    setCurrentPage(1);
    setHasNext(false);
    setNextEndpoint(null);
  } finally {
    setLoading(false);
  }
}, [pageSize, searchTerm]);


  // Cargar datos iniciales y cuando cambia la búsqueda
  useEffect(() => {
  setNextEndpoint(null);
  fetchData(1, null);
}, [searchTerm, fetchData]);


  const handleView = (formaspagoId?: string | null) => {
    try {
      const id3 = toId3(formaspagoId);
      setViewId(id3);
      setShowViewModal(true);
    } catch (error: any) {
      toast.error(error?.message || "ID inválido");
    }
  };

  const handleDelete = async (formaspagoId?: string | null) => {
    try {
      const id3 = toId3(formaspagoId);

      const result = await Swal.fire({
        title: "¿Eliminar forma de pago?",
        text: `Se eliminará el registro ${id3}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
      });

      if (!result.isConfirmed) return;

      await formasPagoService.delete(id3);
      toast.success("Forma de pago eliminada correctamente");
      fetchData(currentPage);
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar la forma de pago");
    }
  };

  const handlePageChange = (newPage: number) => {
  if (loading || newPage < 1) return;

  if (newPage > currentPage) {
    if (nextEndpoint) {
      fetchData(newPage, nextEndpoint);
      return;
    }

    if (newPage <= totalPages) {
      fetchData(newPage);
      return;
    }

    return;
  }

  if (newPage <= totalPages) {
    fetchData(newPage);
  }
};


  const startRecord = totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="p-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Formas de Pago</h1>
          <p className="text-sm text-slate-500">Gestión de formas y condiciones de pago</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchData(currentPage)}
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
            <IconPlus size={20} /> Nueva Forma de Pago
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por descripción, condición..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-3">
                  Descripción
                </th>
                <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-[120px]">
                  Días
                </th>
                <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-[180px]">
                  Condición de Pago
                </th>
                <th className="text-center text-[10px] font-bold text-slate-500 uppercase px-4 py-3 w-[140px]">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <IconLoader className="animate-spin text-blue-600" size={32} />
                      <p className="text-slate-400 text-sm">Cargando formas de pago...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <IconCreditCard className="text-slate-300" size={48} />
                      <p className="text-slate-400 text-sm">
                        {searchTerm
                          ? "No se encontraron resultados para la búsqueda"
                          : "No hay formas de pago registradas"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={row.formaspagoId ?? `fp-${index}`}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <IconCreditCard size={20} />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm uppercase">{row.descripcion}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.diasFormPago != null ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {row.diasFormPago} días
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {row.condicionPago ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          {row.condicionPago}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(row.formaspagoId)}
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
                          onClick={() => handleDelete(row.formaspagoId)}
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

        {!loading && (totalRecords > 0 || data.length > 0) && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Mostrando {startRecord} a {endRecord} de {totalRecords} forma(s) de pago
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconChevronLeft size={18} />
              </button>

              <span className="text-xs text-slate-600 font-medium px-3">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={loading || (!hasNext && currentPage >= totalPages)}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <FormasPagoFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        formaPagoToEdit={selected}
        onSuccess={() => {
          fetchData(currentPage);
          setShowForm(false);
        }}
      />

      <FormasPagoViewModal
        formaspagoId={viewId}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewId(null);
        }}
      />
    </div>
  );
}