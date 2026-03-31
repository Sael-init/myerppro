// src/services/trabajadorService.ts

import apiClient from '../api/apiCliente';
import type { Trabajador, FiltrosTrabajador } from '@/types/trabajador.types';

class TrabajadorService {
  private readonly baseURL = '/Trabajador';

  async getAll(
    empresaId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: FiltrosTrabajador
  ) {
    try {
      const params: any = { page, pageSize };

      if (search && search.trim()) {
        params.search = search.trim();
      }

      if (filters) {
        if (filters.estado === true || filters.estado === false) {
          params.estado = filters.estado ? 1 : 0;
        }

        if (filters.docidentIds && filters.docidentIds.length > 0) {
          params.docidentId = filters.docidentIds.join(',');
        }

        if (filters.cargoId && filters.cargoId.trim()) {
          params.cargoId = filters.cargoId.trim();
        }

        if (filters.areaId && filters.areaId.trim()) {
          params.areaId = filters.areaId.trim();
        }
      }

      const response = await apiClient.get(`${this.baseURL}/empresa/${empresaId}`, { params });
      const apiResponse = response.data;

      return {
        data: apiResponse.data || [],
        meta: {
          totalRecords: apiResponse.meta?.totalRecords || 0,
          totalPages: apiResponse.meta?.totalPages || 1,
          currentPage: apiResponse.meta?.currentPage || page,
          pageSize: apiResponse.meta?.pageSize || pageSize,
        },
      };
    } catch (error: any) {
      console.error('Error al obtener trabajadores:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar los trabajadores');
    }
  }

  async getById(trabajadorId: string): Promise<Trabajador> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${trabajadorId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error al obtener trabajador:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el trabajador');
    }
  }

  async create(trabajador: Partial<Trabajador>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, trabajador);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear trabajador:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el trabajador');
    }
  }

  async update(trabajadorId: string, trabajador: Partial<Trabajador>): Promise<any> {
    try {
      const empresaId = trabajador.empresaId;
      
      if (!empresaId) {
        throw new Error('empresaId es requerido para actualizar');
      }

      const response = await apiClient.put(
        `${this.baseURL}/${trabajadorId}/${empresaId}`, 
        trabajador
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar trabajador:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el trabajador');
    }
  }

  async anular(trabajadorId: string, empresaId: string): Promise<any> {
    try {
      if (!empresaId) {
        throw new Error('empresaId es requerido para anular');
      }

      const response = await apiClient.patch(
        `${this.baseURL}/anular/${trabajadorId}/${empresaId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al anular trabajador:', error);
      throw new Error(error.response?.data?.message || 'Error al anular el trabajador');
    }
  }

  async delete(trabajadorId: string, empresaId: string): Promise<any> {
    try {
      if (!empresaId) {
        throw new Error('empresaId es requerido para eliminar');
      }

      const response = await apiClient.delete(
        `${this.baseURL}/${trabajadorId}/${empresaId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al eliminar trabajador:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el trabajador');
    }
  }

  async getFormDropdowns(): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseURL}/form-dropdowns`);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener catálogos:', error);
      throw new Error('Error al cargar opciones del formulario');
    }
  }
}

const trabajadorService = new TrabajadorService();
export default trabajadorService;

export { TrabajadorService };