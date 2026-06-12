import apiClient from '@/api/apiCliente';
import type { PuntoVenta } from '@/types/perfil.types';

class PuntoVentaService {
  private readonly base = '/Punto_Venta';

  async getByEmpresa(
    empresaId: string,
    page = 1,
    pageSize = 100,
    search?: string,
    estado?: boolean,
  ): Promise<PuntoVenta[]> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();
      if (estado !== undefined) params.estado = estado;

      const { data } = await apiClient.get(`${this.base}/empresa/${empresaId}`, { params });
      const payload = data.data ?? data;
      const items: any[] = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];
      return items as PuntoVenta[];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar puntos de venta');
    }
  }
}

const puntoVentaService = new PuntoVentaService();
export default puntoVentaService;
