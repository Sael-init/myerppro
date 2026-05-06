// src/services/monedaService.ts

import apiClient from '../api/apiCliente';
import type { Moneda, MonedaResponse } from '@/types/moneda.types';

class MonedaService {
  private readonly baseURL = '/Moneda';

  async getAll(
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<MonedaResponse> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();

      const { data: api } = await apiClient.get(this.baseURL, { params });
      // Maneja doble-envoltura (Ok(ApiResponse.SuccessPaginated(...)))
      const payload = api.value ?? api;
      return {
        data: payload.data ?? [],
        meta: {
          totalRecords: payload.meta?.totalRecords ?? 0,
          totalPages:   payload.meta?.totalPages   ?? 1,
          currentPage:  payload.meta?.currentPage  ?? page,
          pageSize:     payload.meta?.pageSize      ?? pageSize,
        },
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar monedas');
    }
  }

  /**
   * Obtiene una moneda por ID incluyendo su tipo de cambio universal.
   * El campo tipoCambioUniversal contiene tc_venta y tc_compra.
   */
  async getById(monedaId: string): Promise<Moneda> {
    try {
      const { data } = await apiClient.get(`${this.baseURL}/${monedaId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? `Error al cargar la moneda ${monedaId}`);
    }
  }

  /**
   * Devuelve el tipo de cambio de venta para una moneda dada.
   * Si es PEN (moneda base) retorna 1.
   */
  async getTipoCambio(monedaId: string): Promise<number> {
    if (monedaId === 'PEN' || monedaId === '001') return 1;
    // "002" = USD, "003" = EUR — ambos requieren tipo de cambio
    try {
      const moneda = await this.getById(monedaId);
      return moneda.tipoCambioUniversal?.tc_venta ?? 1;
    } catch {
      return 1;
    }
  }

  async create(moneda: Omit<Moneda, 'monedaId' | 'tipoCambioUniversal'>): Promise<any> {
    try {
      const { data } = await apiClient.post(this.baseURL, moneda);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al crear la moneda');
    }
  }

  async update(monedaId: string, moneda: Partial<Moneda>): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.baseURL}/${monedaId}`, moneda);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al actualizar la moneda');
    }
  }

  async delete(monedaId: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.baseURL}/${monedaId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar la moneda');
    }
  }
}

const monedaService = new MonedaService();
export default monedaService;
export { MonedaService };
