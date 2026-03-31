// src/services/unidadTransporteService.ts
import apiClient from '../api/apiCliente';
import { UnidadTransporte } from '../types/unidadTransporte.types';
import { ApiResponse } from '../types';

export const unidadTransporteService = {
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<UnidadTransporte[]>> => {
        let filtersToSend = null;
        if (filters) {
            const cleaned: any = {};
            let hasData = false;
            Object.keys(filters).forEach(key => {
                if (Array.isArray(filters[key]) && filters[key].length > 0) {
                    cleaned[key] = filters[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        const response = await apiClient.get(`/UnidadTransporte/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/UnidadTransporte/form-dropdowns`);
        return response.data;
    },

    // ---> NUEVO MÉTODO AGREGADO AQUÍ <---
    getById: async (id: string): Promise<ApiResponse<UnidadTransporte>> => {
        const response = await apiClient.get(`/UnidadTransporte/detalle/${id}`);
        return response.data;
    },

    create: async (data: Partial<UnidadTransporte>) => {
        return (await apiClient.post(`/UnidadTransporte`, data)).data;
    },

    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/UnidadTransporte/${id}`);
        return response.data;
    },

    update: async (id: string, data: Partial<UnidadTransporte>) => {
        return (await apiClient.put(`/UnidadTransporte/${id}`, data)).data;
    },

    anular: async (id: string) => {
        return (await apiClient.patch(`/UnidadTransporte/anular/${id}`)).data;
    }
};