import apiClient from '../api/apiCliente';
import { Transportista } from '../types/transportista.types';
import { ApiResponse } from '../types';

const normalizeTransportista = (raw: any): Transportista => ({
    transportistaId: raw?.transportistaId ?? raw?.transportista_id ?? '',
    descripcion: raw?.descripcion ?? raw?.razonSocial ?? raw?.razon_social ?? '',
    direccion: raw?.direccion ?? '',
    docidentId: raw?.docidentId ?? raw?.docIdentId ?? raw?.docident_id ?? '',
    numero_doc: raw?.numero_doc ?? raw?.numeroDoc ?? raw?.numeroDocumento ?? '',
    estado: raw?.estado === undefined ? true : Boolean(raw?.estado),
    empresaId: raw?.empresaId ?? raw?.empresa_id ?? ''
});

export const transportistaService = {
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<Transportista[]>> => {
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

        const response = await apiClient.get(`/Transportista/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get('/Transportista/form-dropdowns');
        return response.data;
    },

    getById: async (id: string): Promise<ApiResponse<Transportista>> => {
        const safeId = id?.trim();
        if (!safeId) {
            throw new Error('El ID del transportista es requerido');
        }

        const response = await apiClient.get(`/Transportista/${safeId}`);
        const payload = response.data;
        const data = payload?.data ?? payload;
        const transportistaRaw = data?.transportista ?? data;
        const normalized = normalizeTransportista(transportistaRaw);

        return {
            isSuccess: payload?.isSuccess ?? true,
            message: payload?.message ?? 'Éxito',
            data: normalized
        };
    },

    create: async (data: Partial<Transportista>): Promise<ApiResponse<Transportista>> => {
        const response = await apiClient.post('/Transportista', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Transportista>): Promise<ApiResponse<Transportista>> => {
        const response = await apiClient.put(`/Transportista/${id}`, data);
        return response.data;
    },
    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/Transportista/${id}`);
        return response.data;
    },

    anular: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/Transportista/anular/${id}`);
        return response.data;
    }
};
