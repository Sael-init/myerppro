// src/services/productoService.ts
import apiClient from '../api/apiCliente';
import { Producto } from '../types/producto.types';
import { ApiResponse } from '../types';

export const productoService = {
    getByEmpresa: async (
        empresaId: string, 
        page = 1, 
        pageSize = 20, 
        term = "", 
        filters: any = null,
        estado?: boolean
    ): Promise<ApiResponse<Producto[]>> => {
        // NOTA: En este backend, el estado se filtra via `filters={"estado":[1]}` (no via `estado=true`).
        // Por compatibilidad, aceptamos `estado?: boolean` y lo traducimos a `filters.estado=[1|0]`.
        const normalizeEstadoToArray = (raw: unknown): number[] | null => {
            if (raw === undefined || raw === null) return null;
            if (Array.isArray(raw)) {
                const arr = raw
                    .map((x) => {
                        if (typeof x === 'number') return x;
                        const s = String(x).trim().toLowerCase();
                        if (s === '1' || s === 'true' || s === 'activo') return 1;
                        if (s === '0' || s === 'false' || s === 'anulado' || s === 'inactivo') return 0;
                        const n = Number(s);
                        return Number.isFinite(n) ? n : null;
                    })
                    .filter((x): x is number => typeof x === 'number');
                return arr.length > 0 ? arr : null;
            }
            if (typeof raw === 'boolean') return [raw ? 1 : 0];
            if (typeof raw === 'number') return [raw];
            const s = String(raw).trim().toLowerCase();
            if (s === '1' || s === 'true' || s === 'activo') return [1];
            if (s === '0' || s === 'false' || s === 'anulado' || s === 'inactivo') return [0];
            const n = Number(s);
            return Number.isFinite(n) ? [n] : null;
        };

        let filtersInput: any = filters;
        if (!filtersInput || typeof filtersInput !== 'object' || Array.isArray(filtersInput)) filtersInput = null;

        // Si el caller pasó `estado`, lo imponemos.
        if (typeof estado === 'boolean') {
            filtersInput = { ...(filtersInput || {}), estado: [estado ? 1 : 0] };
        } else if (filtersInput && 'estado' in filtersInput) {
            // Normalizamos `filters.estado` si vino en un formato distinto (bool/string/number).
            const normalized = normalizeEstadoToArray((filtersInput as { estado?: unknown }).estado);
            if (normalized) filtersInput = { ...filtersInput, estado: normalized };
        }

        let filtersToSend = null;
        if (filtersInput) {
            const cleaned: any = {};
            let hasData = false;
            Object.keys(filtersInput).forEach(key => {
                if (Array.isArray(filtersInput[key]) && filtersInput[key].length > 0) {
                    cleaned[key] = filtersInput[key];
                    hasData = true;
                } else if (!Array.isArray(filtersInput[key]) && filtersInput[key] !== undefined && filtersInput[key] !== null && filtersInput[key] !== '') {
                    cleaned[key] = filtersInput[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        const response = await apiClient.get(`/Producto/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // ¡ELIMINADO getFormDropdowns! 🚀

    create: async (data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.post(`/Producto`, data);
        return response.data;
    },

    update: async (id: string | number, data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.put(`/Producto/${id}`, data);
        return response.data;
    },

    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/Producto/${id}`);
        return response.data;
    },

    anular: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/Producto/anular/${id}`);
        return response.data;
    },

    getById: async (bienId: string): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.get(`/Producto/${bienId}`);
        return response.data;
    },
};
