// src/services/guiaRemisionService.ts
import apiClient from '../api/apiCliente';
import { GuiaRemisionPayload, GuiaRemisionResponse } from '../types/guiaRemision.types';
import { ApiResponse } from '../types';

export const guiaRemisionService = {
    // 1. Obtener listado paginado
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<GuiaRemisionResponse[]>> => {
        let filtersToSend = null;
        if (filters) {
            // Lógica para limpiar filtros vacíos
            const cleaned: any = {};
            let hasData = false;
            Object.keys(filters).forEach(key => {
                if ((Array.isArray(filters[key]) && filters[key].length > 0) || (filters[key] && !Array.isArray(filters[key]))) {
                    cleaned[key] = filters[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        const response = await apiClient.get(`/GuiaRemision/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Obtener Dropdowns gigantes
    getFormDropdowns: async (empresaId: string,almacenId:string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/GuiaRemision/form-dropdowns/${empresaId}/${almacenId}`);
        return response.data;
    },

    // 3. Obtener por ID (Para Editar)
    getById: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/GuiaRemision/${id}`);
        return response.data;
    },

    // 4. Crear (Solo guardar)
    create: async (data: GuiaRemisionPayload): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/GuiaRemision', data);
        return response.data;
    },

    // 5. Crear y Validar SUNAT (SaveValidar)
    createAndValidate: async (data: GuiaRemisionPayload): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/GuiaRemision/savevalidar', data);
        return response.data;
    },

    // 6. Validar ID existente en SUNAT
    validarSunatId: async (guiaId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.post(`/GuiaRemision/validarId?guiaRemisionId=${guiaId}`);
        return response.data;
    },

    // 7. Anular
    anular: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/GuiaRemision/anular/${id}`);
        return response.data;
    },

    // 8. Eliminar (Físico)
    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/GuiaRemision/${id}`);
        return response.data;
    }
};