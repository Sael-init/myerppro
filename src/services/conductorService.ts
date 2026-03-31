// src/services/conductorService.ts
import apiClient from '../api/apiCliente';
import { Conductor } from '../types/conductor.types';
import { ApiResponse } from '../types';

export const conductorService = {
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<Conductor[]>> => {
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

        const response = await apiClient.get(`/ConductorTransporte/empresa/${empresaId}`, {
    params: { page, pageSize, term, filters: filtersToSend }
    });
        return response.data;
    },

    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get('/ConductorTransporte/form-dropdowns');
        return response.data;
    },

    // ---> NUEVO MÉTODO AGREGADO AQUÍ <---
    getById: async (id: string): Promise<ApiResponse<Conductor>> => {
        const response = await apiClient.get(`/ConductorTransporte/${id}`);
        return response.data;
    },

    create: async (data: Partial<Conductor>): Promise<ApiResponse<Conductor>> => {
        const response = await apiClient.post('/ConductorTransporte', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Conductor>): Promise<ApiResponse<Conductor>> => {
        const response = await apiClient.put(`/ConductorTransporte/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/ConductorTransporte/${id}`);
        return response.data;
    },

    anular: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/ConductorTransporte/anular/${id}`);
        return response.data;
    }
};