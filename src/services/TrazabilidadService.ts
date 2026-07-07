import apiClient from '../api/apiCliente';

export type TrazabilidadTabla = 'COTIZACION' | 'PEDIDOVENTA' | 'DOCUMENTOVENTA';

class TrazabilidadService {
  async get(tabla: TrazabilidadTabla, id: string): Promise<any> {
    try {
      const { data } = await apiClient.get(`/DocumentoVenta/trazabilidad/${tabla}/${id}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al obtener trazabilidad');
    }
  }
}

const trazabilidadService = new TrazabilidadService();
export default trazabilidadService;
