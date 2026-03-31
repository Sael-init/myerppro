"use client";
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export function useCrud<T>(
  service: any, 
  entityId: string,  // Genérico: puede ser tenantId, empresaId, etc.
  initialFilters: any = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ 
    totalPages: 0, 
    currentPage: 1, 
    totalRecords: 0,
    pageSize: 20 
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async (page = 1, term = searchTerm, activeFilters = filters) => {
    setLoading(true);
    try {
      // Llamar al método getAll (cada servicio lo implementa según su endpoint)
      const response = await service.getAll(entityId, page, 20, term, activeFilters);
      
      if (response?.data) {
        setData(response.data);
        setMeta(response.meta || { 
          totalPages: 0, 
          currentPage: 1, 
          totalRecords: 0,
          pageSize: 20 
        });
      } else {
        setData([]);
        toast.error("No se pudieron cargar los datos");
      }
    } catch (error: any) {
      console.error("Error en fetchData:", error);
      setData([]);
      toast.error(error.message || "Error de conexión con la API");
    } finally {
      setLoading(false);
    }
  }, [service, entityId, searchTerm, filters]);

  const handleAction = async (
    id: string | number, 
    actionType: 'delete' | 'anular' = 'delete',
    recordEmpresaId?: string  // ✅ Parámetro adicional para empresaId
  ) => {
    const isDelete = actionType === 'delete';
    const result = await Swal.fire({
      title: isDelete ? '¿Eliminar registro?' : '¿Anular registro?',
      text: "Esta acción no se puede deshacer",
      icon: isDelete ? 'error' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: isDelete ? '#ef4444' : '#f59e0b',
    });

    if (result.isConfirmed) {
      try {
        let res;
        if (isDelete) {
          res = await service.delete(id);
        } else {
          // ✅ Para anular, usamos el empresaId del registro o el entityId del hook
          const empresaIdToUse = recordEmpresaId || entityId;
          res = await service.anular(id, empresaIdToUse);
        }
        
        toast.success("Operación exitosa");
        fetchData(meta.currentPage);
      } catch (error: any) {
        console.error("Error en handleAction:", error);
        toast.error(error.message || "Error al procesar solicitud");
      }
    }
  };

  return { 
    data, 
    loading, 
    meta, 
    searchTerm, 
    setSearchTerm, 
    filters, 
    setFilters, 
    fetchData, 
    handleAction 
  };
}