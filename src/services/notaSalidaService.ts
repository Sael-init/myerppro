// src/services/notaSalidaService.ts
import apiClient from '../api/apiCliente';
import { NotaSalidaPayload, NotaSalidaResponse } from '../types/notaSalida.types';
import { ApiResponse } from '../types';

export const notaSalidaService = {
    /**
     * Obtiene el listado de Notas de Salida.
     * Backend:
     * - GET /NotaSalida/almacen?EmpresaId=... (listado por empresa)
     * - GET /NotaSalida/almacen/{almacenId}?EmpresaId=... (listado por almacén)
     */
    getByAlmacen: async (
        almacenId?: string | null,
        page = 1,
        pageSize = 20,
        term = '',
        filters: unknown = null,
        empresaId: string = '005'
    ): Promise<ApiResponse<NotaSalidaResponse[]>> => {
        try {
            const trimmedAlmacenId = String(almacenId ?? '').trim();
            const f = (filters ?? {}) as {
                fecha_inicio?: string;
                fecha_fin?: string;
                estadoJson?: string[];
                transaccionJson?: string[];
                tipocomercialJson?: string[];
                usuarioJson?: string[];
            };

            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('pageSize', String(pageSize));
            params.append('EmpresaId', String(empresaId || '').trim());

            if (term && term.trim() !== '') params.append('SearchTerm', term.trim());

            if (f.fecha_inicio) params.append('FechaInicio', f.fecha_inicio);
            if (f.fecha_fin) params.append('FechaFin', f.fecha_fin);

            if (Array.isArray(f.estadoJson)) f.estadoJson.forEach((x) => params.append('Estados', x));
            if (Array.isArray(f.transaccionJson)) f.transaccionJson.forEach((x) => params.append('Transacciones', x));
            if (Array.isArray(f.tipocomercialJson)) f.tipocomercialJson.forEach((x) => params.append('TiposDocumentoComercial', x));
            if (Array.isArray(f.usuarioJson)) f.usuarioJson.forEach((x) => params.append('CuentasUsuario', x));

            const url = trimmedAlmacenId
                ? `/NotaSalida/almacen/${trimmedAlmacenId}?${params.toString()}`
                : `/NotaSalida/almacen?${params.toString()}`;

            const response = await apiClient.get(url);

            if (response.status === 204) {
                return {
                    isSuccess: true,
                    data: [],
                    meta: { currentPage: page, totalPages: 1, totalRecords: 0 }
                };
            }

            return {
                isSuccess: true,
                data: response.data?.data || [],
                meta: response.data?.meta || { currentPage: page, totalPages: 1, totalRecords: 0 },
                message: response.data?.message
            };
        } catch (error: unknown) {
            let message = 'Error al obtener el listado';
            if (error instanceof Error) message = error.message || message;
            // Axios-like: error.response.data.message
            if (typeof error === 'object' && error !== null) {
                const maybeResponse = (error as { response?: unknown }).response;
                if (typeof maybeResponse === 'object' && maybeResponse !== null) {
                    const maybeData = (maybeResponse as { data?: unknown }).data;
                    if (typeof maybeData === 'object' && maybeData !== null) {
                        const maybeMsg = (maybeData as { message?: unknown }).message;
                        if (typeof maybeMsg === 'string' && maybeMsg.trim()) message = maybeMsg;
                    }
                }
            }
            return { isSuccess: false, data: [], message };
        }
    },

    /**
     * Obtiene el detalle profundo de una Nota de Salida
     */
    getById: async (id: string): Promise<ApiResponse<NotaSalidaResponse>> => {
        const response = await apiClient.get(`/NotaSalida/detalle/${id}`);
        return response.data;
    },

    /**
     * Inserta una nueva Nota de Salida con sus detalles
     */
    create: async (data: Partial<NotaSalidaPayload>): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post('/NotaSalida', data);
            return response.data;
        } catch (error: unknown) {
            let message = 'Error al crear la Nota de Salida';
            if (typeof error === 'object' && error !== null) {
                const maybeResponse = (error as { response?: unknown }).response;
                if (typeof maybeResponse === 'object' && maybeResponse !== null) {
                    const rawData = (maybeResponse as { data?: unknown }).data;
                    // BadRequest("texto") / ServerError(ex.Message) puede venir como string plano
                    if (typeof rawData === 'string' && rawData.trim()) {
                        message = rawData.trim();
                    } else if (rawData && typeof rawData === 'object') {
                        const maybeData = rawData as Record<string, unknown>;
                        // ASP.NET ValidationProblemDetails: { errors: { campo: ["mensaje"] } }
                        if (maybeData.errors && typeof maybeData.errors === 'object') {
                            const fieldErrors = Object.entries(maybeData.errors as Record<string, string[]>)
                                .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                                .join(' | ');
                            if (fieldErrors) message = fieldErrors;
                        } else {
                            const maybeMsg = maybeData.message ?? maybeData.title ?? maybeData.error;
                            if (typeof maybeMsg === 'string' && maybeMsg.trim()) message = maybeMsg;
                        }
                    }
                }
            }
            return { isSuccess: false, data: undefined, message };
        }
    },

    /**
     * Anula una nota de salida. 
     * 🚀 NOTA: El backend recibe 'cuentausuarioId' pero internamente el SP evalúa '@empresaId'.
     * Pasamos el ID de la empresa como parámetro.
     */
    anular: async (notassalidaId: string, empresaId: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.patch(`/NotaSalida/anular/${notassalidaId}`, null, {
            params: {
                cuentausuarioId: empresaId
            }
        });
        return response.data;
    },

    /**
     * Genera la impresión de la Nota de Salida (Asumiendo que crearás este endpoint luego)
     */
    imprimir: async (id: string): Promise<ApiResponse<unknown>> => {
        const response = await apiClient.get(`/NotaSalida/${id}/imprimir`);
        return response.data;
    }
};
