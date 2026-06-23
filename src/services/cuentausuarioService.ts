import apiClient from '@/api/apiCliente';
import type { CuentaUsuario } from '@/types/cuentausuario.types';

class CuentaUsuarioService {
  private readonly baseURL = '/CuentaUsuario';

  async getAll(
    _entityId?: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: Record<string, any>
  ): Promise<{ data: CuentaUsuario[]; meta: any }> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();
      if (filters) Object.assign(params, filters);

      const response = await apiClient.get(this.baseURL, { params });
      const apiRes = response.data;

      return {
        data: apiRes.data ?? [],
        meta: {
          totalRecords: apiRes.meta?.totalRecords ?? 0,
          totalPages:   apiRes.meta?.totalPages   ?? 1,
          currentPage:  apiRes.meta?.currentPage  ?? page,
          pageSize:     apiRes.meta?.pageSize      ?? pageSize,
        },
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? 'Error al cargar las cuentas de usuario');
    }
  }

  async getById(id: string): Promise<CuentaUsuario> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${id}`);
      return response.data.data ?? response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? 'Error al cargar la cuenta de usuario');
    }
  }

  async create(cuenta: Partial<CuentaUsuario>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, cuenta);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? 'Error al crear la cuenta de usuario');
    }
  }

  async update(id: string, cuenta: Partial<CuentaUsuario>): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${id}`, cuenta);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? 'Error al actualizar la cuenta de usuario');
    }
  }

  async delete(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message ?? 'Error al eliminar la cuenta de usuario');
    }
  }
}

const cuentaUsuarioService = new CuentaUsuarioService();
export default cuentaUsuarioService;
export { CuentaUsuarioService };
