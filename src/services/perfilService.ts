import apiClient from '@/api/apiCliente';
import type { Perfil } from '@/types/perfil.types';

class PerfilService {
  private readonly base = '/Perfil';

  async getByEmpresa(
    empresaId: string,
    page = 1,
    pageSize = 100,
    search?: string,
  ): Promise<Perfil[]> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();

      const { data } = await apiClient.get(`${this.base}/empresa/${empresaId}`, { params });
      const outer  = data.data ?? data;                  // { empresaId, pagination, data: { ..., perfiles: [...] } }
      const inner  = outer.data ?? outer;                // { empresaId, razon_social, ..., perfiles: [...] }
      const items: any[] = Array.isArray(inner.perfiles)
        ? inner.perfiles
        : Array.isArray(inner)
        ? inner
        : [];
      return items as Perfil[];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar perfiles');
    }
  }
}

const perfilService = new PerfilService();
export default perfilService;
