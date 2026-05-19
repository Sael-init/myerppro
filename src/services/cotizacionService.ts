// src/services/cotizacionService.ts

import apiClient from '../api/apiCliente';
import type { Cotizacion, FiltrosCotizacion } from '@/types/cotizacion.types';

class CotizacionService {
  private readonly baseURL = '/Cotizacion';

  async getAll(
    empresaId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: FiltrosCotizacion
  ) {
    try {
      const params: any = { pageNumber: page, pageSize };

      if (search?.trim())
        params.search = search.trim();

      if (filters) {
        if (filters.estado?.trim())
          params.filtro_Estado = filters.estado.trim();
        if (filters.clienteId?.trim())
          params.filtro_Cliente = filters.clienteId.trim();
        if (filters.trabajadorId?.trim())
          params.filtro_Trabajador = filters.trabajadorId.trim();
        if (filters.monedaId?.trim())
          params.filtro_Moneda = filters.monedaId.trim();
        if (filters.formaPagoId?.trim())
          params.filtro_FormaPago = filters.formaPagoId.trim();
        if (filters.fechaDesde)
          params.fechaInicio = filters.fechaDesde;
        if (filters.fechaHasta)
          params.fechaFin = filters.fechaHasta;
      }

      const response = await apiClient.get(`${this.baseURL}/empresa/${empresaId}`, { params });
      const body = response.data;

      return {
        data: body.data || [],
        meta: {
          totalRecords: body.pagination?.totalRecords || 0,
          totalPages:   body.pagination?.totalPages   || 1,
          currentPage:  body.pagination?.currentPage  || page,
          pageSize:     body.pagination?.pageSize      || pageSize,
        },
      };
    } catch (error: any) {
      console.error('Error al obtener cotizaciones:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar las cotizaciones');
    }
  }

  async getById(cotizacionventaId: string): Promise<Cotizacion> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${cotizacionventaId}`);
      const raw = response.data.data || response.data;

      return {
        ...raw,
        // snake_case → camelCase (campos planos del API)
        numeroCorrelativo:  raw.numeroCorrelativo  ?? raw.numero_correlativo,
        fechaEmision:       raw.fechaEmision       ?? raw.fecha_emision,
        fechaVencimiento:   raw.fechaVencimiento   ?? raw.fecha_vencimiento,
        ordcompraNumero:    raw.ordcompraNumero     ?? raw.ordcompra_numero,
        tipoCambio:         raw.tipoCambio          ?? raw.tipo_cambio,
        valorventaAfecto:   raw.valorventaAfecto    ?? raw.valorventa_afecto,
        valorventaInafecto: raw.valorventaInafecto  ?? raw.valorventa_inafecto,
        tiempoValidez:      raw.tiempoValidez       ?? raw.tiempo_validez,
        // condicionPago: el API devuelve el string en condicion_pago y el objeto en condicionPago
        condicionPago: raw.condicion_pago
          ?? (typeof raw.condicionPago === 'string' ? raw.condicionPago : undefined),
        condicionpago: typeof raw.condicionPago === 'object' && raw.condicionPago !== null
          ? raw.condicionPago
          : raw.condicionpago,
        // Objetos anidados — el API ya los devuelve en camelCase
        tipoDocumentoComercial: raw.tipoDocumentoComercial,
        cliente:      raw.cliente,
        trabajador:   raw.trabajador,
        moneda:       raw.moneda,
        cuentaUsuario: raw.cuentaUsuario,
        empresa:      raw.empresa,
        formaPago:    raw.formaPago ?? raw.formapago,
        tipoentrega:  raw.tipoentrega,
        detalles:     raw.detalles ?? [],
      };
    } catch (error: any) {
      console.error('Error al obtener cotización:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar la cotización');
    }
  }

  async create(cotizacion: Partial<Cotizacion>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, cotizacion);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear cotización:', error);
      throw new Error(error.response?.data?.message || 'Error al crear la cotización');
    }
  }

  async update(cotizacionventaId: string, cotizacion: Partial<Cotizacion>): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${cotizacionventaId}`, cotizacion);
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar cotización:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar la cotización');
    }
  }

  async anular(cotizacionventaId: string): Promise<any> {
    try {
      const response = await apiClient.patch(`${this.baseURL}/${cotizacionventaId}/anular`);
      return response.data;
    } catch (error: any) {
      console.error('Error al anular cotización:', error);
      throw new Error(error.response?.data?.message || 'Error al anular la cotización');
    }
  }

  async delete(cotizacionventaId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${cotizacionventaId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al eliminar cotización:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar la cotización');
    }
  }
}

const cotizacionService = new CotizacionService();
export default cotizacionService;

export { CotizacionService };
