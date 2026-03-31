// src/services/listaprecioService.ts

import apiClient from '../api/apiCliente';
import type {
  ListaPrecio,
  TipoListaPrecio,
  EstadoListaPrecio,
  CreateListaPrecioDTO,
  UpdateListaPrecioDTO,
  CreateListaPrecioResponse,
  ActivarListaPrecioResponse,
  AnularListaPrecioResponse,
  CreateListaPrecioPerfilDTO,
  CreateListaPrecioPuntoVentaDTO,
  CreateTipoListaPrecioDTO,
  UpdateTipoListaPrecioDTO,
  CreateTipoListaPrecioResponse,
  CreateEstadoListaPrecioDTO,
  UpdateEstadoListaPrecioDTO,
  FiltrosListaPrecio,
  PaginatedResult,
} from '@/types/listaprecio.types';

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

class ListaPreciosService {
  private readonly base = '/ListaPrecios';

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: LISTA DE PRECIOS
  // ════════════════════════════════════════════════════════════════════════════

  // ── Listado paginado por empresa ────────────────────────────────────────────

  async getByEmpresa(
    empresaId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    _filters?: FiltrosListaPrecio
  ): Promise<PaginatedResult<ListaPrecio>> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();

      const { data: api } = await apiClient.get(`${this.base}/empresa/${empresaId}`, { params });

      // Soporte para ambos formatos de respuesta:
      // Nuevo: { data: { listas: [...], pagination: { ... } } }
      // Viejo: { data: { listas: [...] } }  o  { data: [...] }
      const payload = api.data ?? api;

      const lista: ListaPrecio[] =
        Array.isArray(payload.listas)     ? payload.listas      :   // nuevo formato
        Array.isArray(payload.listas)     ? payload.listas      :   // fallback explícito
        Array.isArray(payload)            ? payload             :   // data es array directo
        Array.isArray(payload.data)       ? payload.data        :   // data.data
        [];

      return {
        data: lista,
        meta: {
          totalRecords: payload.pagination?.totalRecords ?? lista.length,
          totalPages:   payload.pagination?.totalPages   ?? 1,
          currentPage:  payload.pagination?.page         ?? page,
          pageSize:     payload.pagination?.pageSize      ?? pageSize,
        },
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar listas de precios');
    }
  }

  /** Alias para compatibilidad */
  getAll(
    empresaId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    filters?: FiltrosListaPrecio
  ) {
    return this.getByEmpresa(empresaId, page, pageSize, search, filters);
  }

  // ── Detalle ─────────────────────────────────────────────────────────────────

  async getById(listaprecioId: string): Promise<ListaPrecio> {
    try {
      const { data } = await apiClient.get(`${this.base}/${listaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar la lista de precios');
    }
  }

  // ── Creación ─────────────────────────────────────────────────────────────────

  async create(lista: CreateListaPrecioDTO): Promise<CreateListaPrecioResponse> {
    try {
      const { data } = await apiClient.post(this.base, lista);
      const payload = data.data ?? data;
      return {
        mensaje:       payload.mensaje       ?? '',
        listaprecioId: payload.listaprecioId ?? '',
      };
    } catch (err: any) {
      const apiMessage =
        err.response?.data?.message ??
        err.response?.data?.error   ??
        (typeof err.response?.data === 'string' ? err.response.data : null);

      console.error('[ListaPreciosService.create] Error:', {
        status:  err.response?.status,
        data:    err.response?.data,
        message: apiMessage,
      });

      throw new Error(apiMessage ?? 'Error al crear la lista de precios');
    }
  }

  // ── Actualización ────────────────────────────────────────────────────────────

  async update(
    listaprecioId: string,
    lista: UpdateListaPrecioDTO
  ): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.base}/${listaprecioId}`, lista);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al actualizar la lista de precios');
    }
  }

  // ── Eliminación ───────────────────────────────────────────────────────────────

  async delete(listaprecioId: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/${listaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar la lista de precios');
    }
  }

  // ── Anular ────────────────────────────────────────────────────────────────────

  async anular(listaprecioId: string): Promise<AnularListaPrecioResponse> {
    try {
      const { data } = await apiClient.put(`${this.base}/anular`, null, {
        params: { listaprecioId },
      });
      const payload = data.data ?? data;
      return {
        mensaje:       payload.mensaje       ?? '',
        listaprecioId: payload.listaprecioId ?? listaprecioId,
        nuevoEstado:   payload.nuevoEstado   ?? 'Anulado',
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al anular la lista de precios');
    }
  }

  // ── Activar / Desactivar (toggle) ─────────────────────────────────────────────

  async activar(listaprecioId: string): Promise<ActivarListaPrecioResponse> {
    try {
      const { data } = await apiClient.put(`${this.base}/activar`, null, {
        params: { listaprecioId },
      });
      const payload = data.data ?? data;
      return {
        mensaje:       payload.mensaje       ?? '',
        listaprecioId: payload.listaprecioId ?? listaprecioId,
        nuevoEstado:   payload.nuevoEstado   ?? '',
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cambiar el estado de la lista de precios');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: PERFILES
  // ════════════════════════════════════════════════════════════════════════════

  /** Devuelve la lista con sus detalles y perfiles asociados */
  async getPerfiles(listaprecioId: string): Promise<ListaPrecio> {
    try {
      const { data } = await apiClient.get(`${this.base}/perfiles/${listaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar perfiles de la lista de precios');
    }
  }

  async addPerfil(relacion: CreateListaPrecioPerfilDTO): Promise<any> {
    try {
      const { data } = await apiClient.post(`${this.base}/perfiles`, relacion);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al asociar perfil a la lista de precios');
    }
  }

  async removePerfil(listaprecioId: string, perfilesId: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/perfiles`, {
        params: { listaprecioId, perfilesId },
      });
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar perfil de la lista de precios');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: TIPO LISTA DE PRECIOS
  // ════════════════════════════════════════════════════════════════════════════

  async getTipoById(tipolistaprecioId: number): Promise<TipoListaPrecio> {
    try {
      const { data } = await apiClient.get(`${this.base}/tipos/${tipolistaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar el tipo de lista de precios');
    }
  }

  async getTiposByEmpresa(empresaId: string): Promise<TipoListaPrecio[]> {
    try {
      const { data } = await apiClient.get(`${this.base}/tipos/empresa/${empresaId}`);
      return data.data?.tipos ?? data.data ?? [];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar tipos de lista de precios');
    }
  }

  async createTipo(tipo: CreateTipoListaPrecioDTO): Promise<CreateTipoListaPrecioResponse> {
    try {
      const { data } = await apiClient.post(`${this.base}/tipos`, tipo);
      const payload = data.data ?? data;
      return {
        mensaje:           payload.mensaje           ?? '',
        tipolistaprecioId: payload.tipolistaprecioId ?? 0,
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al crear el tipo de lista de precios');
    }
  }

  async updateTipo(
    tipolistaprecioId: number,
    tipo: UpdateTipoListaPrecioDTO
  ): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.base}/tipos/${tipolistaprecioId}`, tipo);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al actualizar el tipo de lista de precios');
    }
  }

  async deleteTipo(tipolistaprecioId: number): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/tipos/${tipolistaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar el tipo de lista de precios');
    }
  }

  async anularTipo(tipolistaprecioId: number): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.base}/tipos/anular`, null, {
        params: { tipolistaprecioId },
      });
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al anular el tipo de lista de precios');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 4: PUNTOS DE VENTA
  // ════════════════════════════════════════════════════════════════════════════

  /** Devuelve la lista con sus detalles y puntos de venta asociados */
  async getPuntosVenta(listaprecioId: string): Promise<ListaPrecio> {
    try {
      const { data } = await apiClient.get(`${this.base}/puntoventa/${listaprecioId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar puntos de venta de la lista de precios');
    }
  }

  async addPuntoVenta(relacion: CreateListaPrecioPuntoVentaDTO): Promise<any> {
    try {
      const { data } = await apiClient.post(`${this.base}/puntoventa`, relacion);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al asociar punto de venta a la lista de precios');
    }
  }

  async removePuntoVenta(listaprecioId: string, puntoventaId: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/puntoventa`, {
        params: { listaprecioId, puntoventaId },
      });
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar punto de venta de la lista de precios');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 5: ESTADO LISTA DE PRECIOS
  // ════════════════════════════════════════════════════════════════════════════

  async getEstadoById(estado_listprec: string): Promise<EstadoListaPrecio> {
    try {
      const { data } = await apiClient.get(`${this.base}/estados/${estado_listprec}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar el estado de lista de precios');
    }
  }

  async getAllEstados(): Promise<EstadoListaPrecio[]> {
    try {
      const { data } = await apiClient.get(`${this.base}/estados`);
      return data.data ?? [];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar estados de lista de precios');
    }
  }

  async createEstado(estado: CreateEstadoListaPrecioDTO): Promise<any> {
    try {
      const { data } = await apiClient.post(`${this.base}/estados`, estado);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al crear el estado de lista de precios');
    }
  }

  async updateEstado(
    estado_listprec: string,
    estado: UpdateEstadoListaPrecioDTO
  ): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.base}/estados/${estado_listprec}`, estado);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al actualizar el estado de lista de precios');
    }
  }

  async deleteEstado(estado_listprec: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/estados/${estado_listprec}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar el estado de lista de precios');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const listaPreciosService = new ListaPreciosService();
export default listaPreciosService;
export { ListaPreciosService };