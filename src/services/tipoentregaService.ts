// src/services/tipoentregaService.ts

import apiClient from '../api/apiCliente';
import type { TipoEntrega, FiltrosTipoEntrega, TipoEntregaResponse } from '@/types/tipoentrega.type';

class TipoEntregaService {
  private readonly baseURL = '/TipoEntrega';

  async getAll(
    pageNumber = 1,
    pageSize   = 20,
    filtros?:  FiltrosTipoEntrega
  ): Promise<TipoEntregaResponse> {
    try {
      const params: Record<string, string | number | boolean> = {
        pageNumber,
        pageSize,
      };

      if (filtros?.tenantId    != null) params.tenantId    = filtros.tenantId;
      if (filtros?.search?.trim())      params.search      = filtros.search.trim();
      if (filtros?.soloActivos != null) params.soloActivos = filtros.soloActivos;

      const response = await apiClient.get<TipoEntregaResponse>(this.baseURL, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener tipos de entrega:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar los tipos de entrega');
    }
  }

  /**
   * Devuelve todos los tipos de entrega activos para usar en DDLs.
   * Carga hasta 200 registros sin paginación visible.
   */
  async getActivos(tenantId?: number): Promise<TipoEntrega[]> {
    const response = await this.getAll(1, 200, {
      tenantId,
      soloActivos: true,
    });
    return response.data;
  }
}

const tipoentregaService = new TipoEntregaService();
export default tipoentregaService;
export { TipoEntregaService };