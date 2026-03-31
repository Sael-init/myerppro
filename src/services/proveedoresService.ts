import apiClient from '../api/apiCliente';
import type { Proveedor, FiltrosProveedor, FormDropdowns } from '../types/proveedores.types';

type ProveedoresListResponse = {
  data: Proveedor[];
  meta: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

class ProveedorService {
  private readonly baseURL = '/Proveedor';

  private parseJsonSafe(value: any): any {
    if (typeof value !== 'string') return value;
    const txt = value.trim();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch {
      return value;
    }
  }

  private toBool(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['1', 'true', 'activo', 'active', 'si', 'sí'].includes(v)) return true;
      if (['0', 'false', 'inactivo', 'inactive', 'no'].includes(v)) return false;
    }
    return Boolean(value);
  }

  private normalizeProveedor(raw: any): Proveedor {
    const p = raw ?? {};

    return {
      proveedorId: String(p.proveedorId ?? p.ProveedorId ?? p.proveedor_id ?? ''),
      tipoproveedorId: p.tipoproveedorId ?? p.TipoproveedorId ?? p.tipoproveedor_id ?? '',
      claseproveedorId: p.claseproveedorId ?? p.ClaseproveedorId ?? p.claseproveedor_id ?? '',
      descripcion: p.descripcion ?? p.Descripcion ?? '',
      docidentId: p.docidentId ?? p.DocidentId ?? p.docident_id ?? '',
      num_docident: p.num_docident ?? p.numero_doc ?? p.numero_doc ?? p.numero_doc ?? '',
      direccion: p.direccion ?? p.Direccion ?? '',
      telefono_fijo: p.telefono_fijo ?? p.Telefono_fijo ?? p.telefonoFijo ?? p.TelefonoFijo ?? '',
      telefono_movil: p.telefono_movil ?? p.Telefono_movil ?? p.telefonoMovil ?? p.TelefonoMovil ?? '',
      email: p.email ?? p.Email ?? '',
      estado: this.toBool(p.estado ?? p.Estado),
      tenantId: p.tenantId ?? p.TenantId ?? p.tenant_id ?? undefined,
      tipoProveedor: p.tipoProveedor ?? p.TipoProveedor,
      claseProveedor: p.claseProveedor ?? p.ClaseProveedor,
      documentoIdentidad: p.documentoIdentidad ?? p.DocumentoIdentidad,
      tenant: p.tenant ?? p.Tenant,
      tenantDocumentoIdentidad: p.tenantDocumentoIdentidad ?? p.TenantDocumentoIdentidad,
      tenantEstado: p.tenantEstado ?? p.TenantEstado,
    } as Proveedor;
  }

  private extractList(dataNode: any): any[] {
    if (Array.isArray(dataNode)) return dataNode;
    if (Array.isArray(dataNode?.items)) return dataNode.items;
    if (Array.isArray(dataNode?.proveedores)) return dataNode.proveedores;
    if (Array.isArray(dataNode?.proveedor)) return dataNode.proveedor;
    if (Array.isArray(dataNode?.rows)) return dataNode.rows;
    return [];
  }

  private getEmptyFormDropdowns(): FormDropdowns {
    return {
      tipo_proveedor: [],
      clase_proveedor: [],
      documento_identidad: [],
      tenant: []
    };
  }

  private parseFormDropdownsPayload(payload: any): FormDropdowns {
    try {
      let node: any = this.parseJsonSafe(payload);
      node = this.parseJsonSafe(node?.data ?? node);

      const legacyStr =
        node?.JsonResult ??
        node?.jsonResult ??
        node?.data?.JsonResult ??
        node?.data?.jsonResult;

      if (legacyStr) {
        node = this.parseJsonSafe(legacyStr);
      }

      node = this.parseJsonSafe(node?.data ?? node);

      if (!node || typeof node !== 'object') {
        return this.getEmptyFormDropdowns();
      }

      const tipo =
        node.tipo_proveedor ??
        node.tipoProveedor ??
        node.TipoProveedor ??
        [];

      const clase =
        node.clase_proveedor ??
        node.claseProveedor ??
        node.ClaseProveedor ??
        [];

      const documento =
        node.documento_identidad ??
        node.documentoIdentidad ??
        node.DocumentoIdentidad ??
        [];

      const tenant =
        node.tenant ??
        node.Tenant ??
        [];

      return {
        tipo_proveedor: Array.isArray(tipo) ? tipo : [],
        clase_proveedor: Array.isArray(clase) ? clase : [],
        documento_identidad: Array.isArray(documento) ? documento : [],
        tenant: Array.isArray(tenant) ? tenant : []
      };
    } catch {
      return this.getEmptyFormDropdowns();
    }
  }

  async getAll(
    tenantId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: FiltrosProveedor
  ): Promise<ProveedoresListResponse> {
    try {
      const params: Record<string, any> = { page, pageSize };

      if (search && search.trim()) {
        params.search = search.trim();
      }

      if (filters) {
        if (filters.estado === true || filters.estado === false) {
          params.estado = filters.estado ? 1 : 0;
        }

        if (filters.docidentIds && filters.docidentIds.length > 0) {
          params.docidentId = filters.docidentIds.join(',');
        }

        if (filters.tipoproveedorId && filters.tipoproveedorId.trim()) {
          params.tipoproveedorId = filters.tipoproveedorId.trim();
        }

        if (filters.claseproveedorId && filters.claseproveedorId.trim()) {
          params.claseproveedorId = filters.claseproveedorId.trim();
        }
      }

      const response = await apiClient.get(`${this.baseURL}/tenant/${tenantId}`, { params });
      const envelope = response.data ?? {};
      const dataNode = envelope?.data ?? [];
      const rawList = this.extractList(dataNode);
      const normalizedList = rawList.map((x: any) => this.normalizeProveedor(x));

      return {
        data: normalizedList,
        meta: {
          totalRecords: Number(envelope?.meta?.totalRecords ?? 0),
          totalPages: Number(envelope?.meta?.totalPages ?? 1),
          currentPage: Number(envelope?.meta?.currentPage ?? page),
          pageSize: Number(envelope?.meta?.pageSize ?? pageSize),
        },
      };
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al cargar los proveedores');
    }
  }

  async getById(proveedorId: string): Promise<Proveedor> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${proveedorId}`);
      const payload = response.data?.data ?? response.data ?? {};
      return this.normalizeProveedor(payload);
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al cargar el proveedor');
    }
  }

  async create(proveedor: Partial<Proveedor>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, proveedor);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al crear el proveedor');
    }
  }

  async update(proveedorId: string, proveedor: Partial<Proveedor>): Promise<any> {
    try {
      const payload = {
        ...proveedor,
        proveedorId,
      };
      const response = await apiClient.put(this.baseURL, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al actualizar el proveedor');
    }
  }

  async anular(proveedorId: string): Promise<any> {
    try {
      const response = await apiClient.patch(`${this.baseURL}/anular/${proveedorId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al anular el proveedor');
    }
  }

  async delete(proveedorId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${proveedorId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Error al eliminar el proveedor');
    }
  }

  async getFormDropdowns(): Promise<FormDropdowns> {
    try {
      const response = await apiClient.get(`${this.baseURL}/form-dropdowns`);
      return this.parseFormDropdownsPayload(response.data);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 404) {
        return this.getEmptyFormDropdowns();
      }
      throw new Error(error?.response?.data?.message || 'Error al cargar opciones del formulario');
    }
  }

  async getProveedoresByTenant(
    tenantId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filtros?: FiltrosProveedor
  ) {
    const response = await this.getAll(tenantId, page, pageSize, search, filtros);
    return {
      data: response.data,
      totalRecords: response.meta.totalRecords,
      totalPages: response.meta.totalPages,
      currentPage: response.meta.currentPage,
      pageSize: response.meta.pageSize,
    };
  }

  async getProveedorFullInfo(proveedorId: string) {
    return this.getById(proveedorId);
  }

  async createProveedor(proveedor: Partial<Proveedor>) {
    return this.create(proveedor);
  }

  async updateProveedor(proveedorId: string, proveedor: Partial<Proveedor>) {
    return this.update(proveedorId, proveedor);
  }

  async anularProveedor(proveedorId: string) {
    return this.anular(proveedorId);
  }

  async deleteProveedor(proveedorId: string) {
    return this.delete(proveedorId);
  }
}

const proveedorService = new ProveedorService();
export default proveedorService;
export { ProveedorService };
