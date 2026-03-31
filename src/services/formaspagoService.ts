import apiClient from '../api/apiCliente';
import type { FormasPago } from '@/types/formaspago.types';

export const toId3 = (value: string | number | null | undefined): string => {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('ID inválido');
  if (!/^\d+$/.test(raw)) throw new Error('El ID debe ser numérico');
  if (raw.length > 3) throw new Error('El ID no puede tener más de 3 dígitos');
  return raw.padStart(3, '0');
};

const normalizeIdFromApi = (value: any): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{1,3}$/.test(raw)) return raw.padStart(3, '0');
  return raw;
};

const normalizeFormaPago = (item: any): FormasPago => ({
  formaspagoId: normalizeIdFromApi(
    item?.formaspagoId ??
      item?.formaPagoId ??
      item?.FormaspagoId ??
      item?.FormaPagoId
  ),
  descripcion: item?.descripcion ?? item?.Descripcion ?? '',
  diasFormPago:
    item?.diasFormPago ??
    item?.dias_form_pago ??
    item?.DiasFormPago ??
    item?.dias_formpago ??
    null,
  condicionPago:
    item?.condicionPago ??
    item?.condicion_pago ??
    item?.CondicionPago ??
    null,
});

const toNumber = (value: any, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const pickFirstArray = (...candidates: any[]): any[] => {
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

const parsePaginated = (
  response: any,
  requestedPage: number,
  requestedPageSize: number
): PaginatedResponse<FormasPago> => {
  const root = response?.data ?? {};

  const records = pickFirstArray(
    root?.data,
    root?.items,
    root?.results,
    root?.registros
  );

  const meta = root?.meta ?? root?.pagination ?? {};

  const totalRecords = toNumber(
    meta?.totalRecords ?? meta?.total ?? meta?.totalItems,
    records.length
  );

  const currentPage = toNumber(
    meta?.currentPage ?? meta?.page,
    requestedPage
  );

  const pageSize = toNumber(
    meta?.pageSize ?? meta?.limit,
    requestedPageSize
  );

  const totalPages = toNumber(
    meta?.totalPages,
    Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)))
  );

  const nextEndpointRaw =
    meta?.siguiente ??
    meta?.next ??
    meta?.nextPageUrl ??
    meta?.next_url ??
    root?.siguiente ??
    root?.next ??
    root?.nextPageUrl ??
    root?.next_url ??
    null;

  const nextEndpoint =
    typeof nextEndpointRaw === "string" && nextEndpointRaw.trim().length > 0
      ? nextEndpointRaw
      : null;

  const hasNextFlag = meta?.hasNext ?? meta?.tieneSiguiente ?? root?.hasNext ?? root?.tieneSiguiente;
  const hasNext =
    typeof hasNextFlag === "boolean"
      ? hasNextFlag
      : nextEndpoint
      ? true
      : currentPage < totalPages;

  return {
    data: records.map(normalizeFormaPago),
    totalRecords,
    currentPage,
    pageSize,
    totalPages,
    hasNext,
    nextEndpoint,
  };
};



export interface PaginatedResponse<T> {
  data: T[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  nextEndpoint: string | null;
}

class FormasPagoService {
  private readonly baseURL = '/FormasPago';

  async getAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    condicionPago?: number,
    nextEndpoint?: string | null
  ): Promise<PaginatedResponse<FormasPago>> {
    try {
      const response = nextEndpoint
        ? await apiClient.get(nextEndpoint)
        : await apiClient.get(this.baseURL, {
            params: {
              page,
              pageSize,
              ...(search ? { search } : {}),
              ...(condicionPago !== undefined ? { condicionPago } : {}),
            },
          });

      return parsePaginated(response, page, pageSize);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al cargar las formas de pago');
    }
  }

  async getById(formaspagoId: string | number): Promise<FormasPago> {
    try {
      const id3 = toId3(formaspagoId);
      const response = await apiClient.get(`${this.baseURL}/${encodeURIComponent(id3)}`);
      const root = response?.data ?? {};
      const raw = root?.data ?? root;
      return normalizeFormaPago(raw);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error?.message || 'Error al cargar la forma de pago');
    }
  }

  async create(formaPago: Partial<FormasPago>): Promise<any> {
    try {
      const payload: Partial<FormasPago> = { ...formaPago };

      if (payload.formaspagoId != null && String(payload.formaspagoId).trim() !== '') {
        payload.formaspagoId = toId3(payload.formaspagoId);
      }

      const response = await apiClient.post(this.baseURL, payload);
      const root = response?.data ?? {};
      const raw = root?.data ?? root;

      if (typeof raw === 'string' || typeof raw === 'number') {
        const id = String(raw).trim();
        if (/^\d{1,3}$/.test(id)) return id.padStart(3, '0');
      }

      return raw;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al crear la forma de pago');
    }
  }

  async update(formaspagoId: string | number, formaPago: Partial<FormasPago>): Promise<any> {
    try {
      const id3 = toId3(formaspagoId);
      const payload: Partial<FormasPago> = { ...formaPago };

      if (payload.formaspagoId != null && String(payload.formaspagoId).trim() !== '') {
        payload.formaspagoId = toId3(payload.formaspagoId);
      }

      const response = await apiClient.put(`${this.baseURL}/${encodeURIComponent(id3)}`, payload);
      const root = response?.data ?? {};
      return root?.data ?? root;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al actualizar la forma de pago');
    }
  }

  async delete(formaspagoId: string | number): Promise<any> {
    try {
      const id3 = toId3(formaspagoId);
      const response = await apiClient.delete(`${this.baseURL}/${encodeURIComponent(id3)}`);
      const root = response?.data ?? {};
      return root?.data ?? root;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al eliminar la forma de pago');
    }
  }
}

const formasPagoService = new FormasPagoService();
export default formasPagoService;
export { FormasPagoService };
