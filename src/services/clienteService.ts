import apiClient from '../api/apiCliente';
import type { Cliente, FiltrosCliente, FormDropdowns, UbigeoOption, UbigeoRow } from '@/types/cliente.types';

class ClienteService {
  private readonly baseURL = '/Cliente';
  private ubigeoCache: UbigeoRow[] | null = null;

  /**
   * Parsea la respuesta del endpoint form-dropdowns
   * Maneja diferentes formatos de respuesta del backend
   */
  private parseFormDropdownsPayload(payload: any): FormDropdowns {
    try {
      // Caso 1: Ya viene como objeto con estructura correcta
      if (payload?.data && typeof payload.data === 'object' && !payload.data.JsonResult) {
        return payload.data as FormDropdowns;
      }

      // Caso 2: Viene como string JSON directo
      if (typeof payload === 'string') {
        const parsed = JSON.parse(payload);
        return parsed as FormDropdowns;
      }

      // Caso 3: Tiene JsonResult o jsonResult (formato legacy)
      const jsonStr = payload?.data?.JsonResult || payload?.data?.jsonResult || payload?.JsonResult || payload?.jsonResult;
      if (jsonStr && typeof jsonStr === 'string') {
        const parsed = JSON.parse(jsonStr);
        return parsed as FormDropdowns;
      }

      // Caso 4: Ya es el objeto directo
      if (payload?.tipo_cliente && payload?.documento_identidad) {
        return payload as FormDropdowns;
      }

      // Si nada funciona, retornar estructura vacía
      console.warn('No se pudo parsear form dropdowns, retornando estructura vacía');
      return this.getEmptyFormDropdowns();
    } catch (error) {
      console.error('Error parseando form dropdowns:', error);
      return this.getEmptyFormDropdowns();
    }
  }

  /**
   * Retorna una estructura vacía de FormDropdowns
   */
  private getEmptyFormDropdowns(): FormDropdowns {
    return {
      tipo_cliente: [],
      documento_identidad: [],
      empresa: [],
      tenant: [],
      ubigeo: []
    };
  }

  /**
   * Convierte un array de valores a opciones únicas y ordenadas
   * Elimina duplicados usando Set
   */
  private toOptions(values: Array<string | number | null | undefined>): UbigeoOption[] {
    const set = new Set<string>();
    
    for (const v of values) {
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (!s) continue;
      set.add(s);
    }
    
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((v) => ({ key: v, value: v }));
  }

  /**
   * ✅ CORREGIDO: Convierte array de UbigeoRow a opciones de distrito
   * key = código del distrito (ubidst) - lo que se guarda
   * value = nombre del distrito (ubidsn) - lo que se muestra
   */
  private toDistritoOptions(rows: UbigeoRow[]): UbigeoOption[] {
    // Crear un Map para eliminar duplicados por código
    const distritosMap = new Map<string, string>();
    
    for (const row of rows) {
      const codigo = row.ubidst;
      const nombre = row.ubidsn || row.distrito || row.ubidst;
      
      // ✅ FIX: Verificar que AMBOS existan antes de agregar al Map
      if (codigo && nombre) {
        distritosMap.set(codigo, nombre);
      }
    }
    
    // Convertir Map a array de opciones y ordenar por nombre
    return Array.from(distritosMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([codigo, nombre]) => ({
        key: codigo,    // ✅ Código para guardar
        value: nombre   // ✅ Nombre para mostrar
      }));
  }

  /**
   * Asegura que el caché de ubigeo esté cargado
   * Si no existe, llama a getFormDropdowns
   */
  private async ensureUbigeoCache(): Promise<UbigeoRow[]> {
    if (this.ubigeoCache && this.ubigeoCache.length > 0) {
      return this.ubigeoCache;
    }
    
    const dropdowns = await this.getFormDropdowns();
    this.ubigeoCache = dropdowns?.ubigeo ?? [];
    return this.ubigeoCache;
  }

  /**
   * Obtiene todos los clientes con paginación, búsqueda y filtros
   */
  async getAll(
    tenantId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filters?: FiltrosCliente
  ) {
    try {
      const params: any = { tenantId, page, pageSize };

      // Añadir búsqueda si existe
      if (search && search.trim()) {
        params.search = search.trim();
      }

      // Procesar filtros
      if (filters) {
        // Estado: convertir boolean a 1/0
        if (filters.estado === true || filters.estado === false) {
          params.estado = filters.estado ? 1 : 0;
        }

        // Tipos de documento: convertir array a string separado por comas
        if (filters.docidentIds && filters.docidentIds.length > 0) {
          params.docidentId = filters.docidentIds.join(',');
        }

        // Tipo de cliente
        if (filters.tipoclienteId && filters.tipoclienteId.trim()) {
          params.tipoclienteId = filters.tipoclienteId.trim();
        }
      }

      const response = await apiClient.get(this.baseURL, { params });
      const apiResponse = response.data;

      return {
        data: apiResponse.data || [],
        meta: {
          totalRecords: apiResponse.meta?.totalRecords || 0,
          totalPages: apiResponse.meta?.totalPages || 1,
          currentPage: apiResponse.meta?.currentPage || page,
          pageSize: apiResponse.meta?.pageSize || pageSize,
        },
      };
    } catch (error: any) {
      console.error('Error al obtener clientes:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar los clientes');
    }
  }

  /**
   * Obtiene un cliente por su ID
   */
  async getById(clienteId: string): Promise<Cliente> {
    try {
      const response = await apiClient.get(`${this.baseURL}/${clienteId}`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error al obtener cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar el cliente');
    }
  }

  /**
   * Crea un nuevo cliente
   */
  async create(cliente: Partial<Cliente>): Promise<any> {
    try {
      const response = await apiClient.post(this.baseURL, cliente);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el cliente');
    }
  }

  /**
   * Actualiza un cliente existente
   */
  async update(clienteId: string, cliente: Partial<Cliente>): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${clienteId}`, cliente);
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el cliente');
    }
  }

  /**
   * Anula un cliente (cambia estado a inactivo)
   */
  async anular(clienteId: string): Promise<any> {
    try {
      const response = await apiClient.patch(`${this.baseURL}/anular/${clienteId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al anular cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al anular el cliente');
    }
  }

  /**
   * Elimina permanentemente un cliente
   */
  async delete(clienteId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${clienteId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al eliminar cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el cliente');
    }
  }

  /**
   * Obtiene los catálogos para los formularios
   * (Tipo de cliente, documentos de identidad, empresas, tenants, ubigeo)
   */
  async getFormDropdowns(): Promise<FormDropdowns> {
    try {
      const response = await apiClient.get(`${this.baseURL}/form-dropdowns`);
      const parsed = this.parseFormDropdownsPayload(response.data);
      
      // Cachear ubigeo para uso posterior
      this.ubigeoCache = parsed?.ubigeo ?? [];
      
      return parsed;
    } catch (error: any) {
      console.error('Error al obtener catálogos:', error);
      throw new Error('Error al cargar opciones del formulario');
    }
  }

  /**
   * API de Ubigeo
   * Permite obtener países, departamentos, provincias y distritos
   * usando agrupación por claves (groupBy) en JavaScript
   */
  ubigeo = {
    /**
     * Obtiene lista de países únicos
     */
    getPaises: async (): Promise<UbigeoOption[]> => {
      try {
        const rows = await this.ensureUbigeoCache();
        // Agrupar por ubipan (país) y eliminar duplicados
        return this.toOptions(rows.map((r) => r.ubipan));
      } catch (error: any) {
        console.error('Error al obtener países:', error);
        return [];
      }
    },

    /**
     * Obtiene departamentos de un país específico
     * @param ubipan - Nombre del país (ej: "PERU")
     */
    getDepartamentos: async (ubipan: string): Promise<UbigeoOption[]> => {
      if (!ubipan) return [];
      try {
        const rows = await this.ensureUbigeoCache();
        // Filtrar por país y agrupar por ubiden (departamento)
        const departamentos = rows
          .filter((r) => r.ubipan === ubipan)
          .map((r) => r.ubiden);
        return this.toOptions(departamentos);
      } catch (error: any) {
        console.error('Error al obtener departamentos:', error);
        return [];
      }
    },

    /**
     * Obtiene provincias de un departamento específico
     * @param ubiden - Nombre del departamento (ej: "LIMA")
     */
    getProvincias: async (ubiden: string): Promise<UbigeoOption[]> => {
      if (!ubiden) return [];
      try {
        const rows = await this.ensureUbigeoCache();
        // Filtrar por departamento y agrupar por ubiprn (provincia)
        const provincias = rows
          .filter((r) => r.ubiden === ubiden)
          .map((r) => r.ubiprn);
        return this.toOptions(provincias);
      } catch (error: any) {
        console.error('Error al obtener provincias:', error);
        return [];
      }
    },

    /**
     * ✅ CORREGIDO: Obtiene distritos de una provincia específica
     * Retorna key = código (ubidst), value = nombre (ubidsn)
     * @param ubiprn - Nombre de la provincia (ej: "LIMA")
     */
    getDistritos: async (ubiprn: string): Promise<UbigeoOption[]> => {
      if (!ubiprn) return [];
      try {
        const rows = await this.ensureUbigeoCache();
        // Filtrar por provincia
        const distritosRows = rows.filter((r) => r.ubiprn === ubiprn);
        
        // ✅ Usar el nuevo método que retorna código como key y nombre como value
        return this.toDistritoOptions(distritosRows);
      } catch (error: any) {
        console.error('Error al obtener distritos:', error);
        return [];
      }
    },
  };

  /**
   * Resuelve un código ubidst a etiqueta legible "País, Departamento, Distrito"
   */
  async getLabelByUbidst(ubidst: string): Promise<string> {
    if (!ubidst) return "";
    try {
      const rows = await this.ensureUbigeoCache();
      const row = rows.find((r) => r.ubidst === ubidst);
      if (!row) return ubidst;
      return [row.ubipan, row.ubiden, row.ubidsn].filter(Boolean).join(", ");
    } catch {
      return ubidst;
    }
  }

  // ==================== MÉTODOS ALIAS (Para mantener compatibilidad) ====================

  /**
   * Alias de getAll - Obtiene clientes por tenant
   */
  async getClientesByTenant(
    tenantId: string,
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    filtros?: FiltrosCliente
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

  /**
   * Alias de getById - Obtiene información completa de un cliente
   */
  async getClienteFullInfo(clienteId: string) {
    return this.getById(clienteId);
  }

  /**
   * Alias de create
   */
  async createCliente(cliente: Partial<Cliente>) {
    return this.create(cliente);
  }

  /**
   * Alias de update
   */
  async updateCliente(clienteId: string, cliente: Partial<Cliente>) {
    return this.update(clienteId, cliente);
  }

  /**
   * Alias de anular
   */
  async anularCliente(clienteId: string) {
    return this.anular(clienteId);
  }

  /**
   * Alias de delete
   */
  async deleteCliente(clienteId: string) {
    return this.delete(clienteId);
  }
}

// Exportar instancia singleton
const clienteService = new ClienteService();
export default clienteService;

// Exportar clase para casos especiales
export { ClienteService };

// Exportar API de ubigeo para uso directo
export const ubigeoAPI = clienteService.ubigeo;