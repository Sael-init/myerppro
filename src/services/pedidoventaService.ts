// src/services/pedidoventaService.ts

import apiClient from '../api/apiCliente';
import type { PedidoVenta, FiltrosPedidoVenta, PedidoVentaDetalleFull } from '@/types/pedidoventa.type';

class PedidoVentaService {
  private readonly baseURL = '/PedidoVenta';

  async getAll(
    empresaId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: FiltrosPedidoVenta
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
        if ((filters as any).monedaId?.trim())
          params.filtro_Moneda = (filters as any).monedaId.trim();
        if ((filters as any).formaPagoId?.trim())
          params.filtro_FormaPago = (filters as any).formaPagoId.trim();
        if ((filters as any).cuentaUsuarioId?.trim())
          params.filtro_CuentaUsuario = (filters as any).cuentaUsuarioId.trim();
        if ((filters as any).tipoEntregaId?.trim())
          params.filtro_TipoEntrega = (filters as any).tipoEntregaId.trim();
        if ((filters as any).estadoAlmacen?.trim())
          params.filtro_EstadoAlmacen = (filters as any).estadoAlmacen.trim();
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
      console.error('Error al obtener pedidos de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar los pedidos de venta');
    }
  }

  async getById(pedidoventaId: string): Promise<PedidoVentaDetalleFull> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${pedidoventaId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error al obtener pedido de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el pedido de venta');
    }
  }

  async create(pedido: Partial<PedidoVenta>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, pedido);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear pedido de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el pedido de venta');
    }
  }

  async update(
    pedidoventaId: string,
    cuentausuarioId: string,
    pedido: Partial<PedidoVenta>
  ): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/${pedidoventaId}?cuentausuarioId=${cuentausuarioId}`,
        pedido
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar pedido de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el pedido de venta');
    }
  }

  async aprobar(pedidoventaId: string, cuentausuarioId: string): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/aprobar?pedidoventaId=${pedidoventaId}&cuentausuarioId=${cuentausuarioId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al aprobar pedido:', error);
      throw new Error(error.response?.data?.message || 'Error al aprobar el pedido');
    }
  }

  async desaprobar(pedidoventaId: string, cuentausuarioId: string): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/desaprobar?pedidoventaId=${pedidoventaId}&cuentausuarioId=${cuentausuarioId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al desaprobar pedido:', error);
      throw new Error(error.response?.data?.message || 'Error al desaprobar el pedido');
    }
  }

  async anular(pedidoventaId: string, cuentausuarioId: string): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/anular?pedidoventaId=${pedidoventaId}&cuentausuarioId=${cuentausuarioId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al anular pedido:', error);
      throw new Error(error.response?.data?.message || 'Error al anular el pedido');
    }
  }

  async comprometer(
    pedidoventaId: string,
    arerespedId: number,
    descripcion: string
  ): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.baseURL}/comprometer?pedidoventaId=${encodeURIComponent(pedidoventaId)}&arerespedId=${arerespedId}&descripcion=${encodeURIComponent(descripcion)}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al comprometer pedido:', error);
      throw new Error(error.response?.data?.message || 'Error al comprometer el pedido');
    }
  }

  async delete(pedidoventaId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${pedidoventaId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al eliminar pedido:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el pedido');
    }
  }

  async getEstados(): Promise<{ estadosDespacho: any[]; estadosAlmacen: any[] }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/estados`);
      const body = response.data;
      return {
        estadosDespacho: body.estadosDespacho ?? [],
        estadosAlmacen:  body.estadosAlmacen  ?? [],
      };
    } catch (error: any) {
      console.error('Error al obtener estados:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener los estados');
    }
  }

  async getStockBien(
    empresaId: string,
    bienId: string,
    tipoAlmacen?: string
  ): Promise<{
    stock_empresa: { producto: string; stock_real: number; stock_disponible: number }[];
    presentaciones: { presentacionId: string; descripcion: string; cantidad: number; unidadmedidaId: string }[];
    stock_almacenes: Record<string, any>[];
  }> {
    try {
      const params: any = { empresaId, bienId };
      if (tipoAlmacen) params.tipoAlmacen = tipoAlmacen;
      const response = await apiClient.get(`${this.baseURL}/stock-bien`, { params });
      const body = response.data;
      return body.data ?? body;
    } catch (error: any) {
      console.error('Error al obtener stock del bien:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener el stock del bien');
    }
  }

  async getParametros(empresaId?: string): Promise<any> {
    try {
      const params: any = {};
      if (empresaId) params.empresaId = empresaId;
      const response = await apiClient.get(`${this.baseURL}/parametros`, { params });
      const body = response.data;
      return body.data ?? body;
    } catch (error: any) {
      console.error('Error al obtener parámetros:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener los parámetros de configuración');
    }
  }
}

const pedidoventaService = new PedidoVentaService();
export default pedidoventaService;

export { PedidoVentaService };