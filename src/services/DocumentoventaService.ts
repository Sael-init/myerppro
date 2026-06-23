// src/services/DocumentoventaService.ts

import apiClient from '../api/apiCliente';
import type {
  DocumentoVenta,
  FiltrosDocumentoVenta,
  FormDropdownsDocumentoVenta,
  CreateDocumentoVentaDTO,
  CreateDocumentoVentaResponse,
  AnularDocumentoResponse,
  NotaCreditoResponse,
  BienOption,
} from '@/types/Documentoventa.types';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

interface PaginatedResult<T = any> {
  data: T[];
  meta: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Servicio
// ─────────────────────────────────────────────────────────────────────────────

class DocumentoVentaService {
  private readonly base = '/DocumentoVenta';

  // ── Listados paginados ──────────────────────────────────────────────────────

  async getByEmpresa(
    empresaId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    filters?: FiltrosDocumentoVenta
  ): Promise<PaginatedResult> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();

      if (filters) {
        const cleaned: Record<string, any> = {};
        let hasData = false;
        Object.entries(filters).forEach(([key, val]) => {
          if (Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null && val !== '') {
            // El SP espera fechaInicio/fechaFin, el frontend usa fechaDesde/fechaHasta
            const mappedKey = key === 'fechaDesde' ? 'fechaInicio' : key === 'fechaHasta' ? 'fechaFin' : key;
            cleaned[mappedKey] = val;
            hasData = true;
          }
        });
        if (hasData) params.filters = JSON.stringify(cleaned);
      }

      const { data: api } = await apiClient.get(`${this.base}/empresa/${empresaId}`, { params });
      // El backend hace Ok(ApiResponse.SuccessPaginated(...)), lo que genera doble-envoltura:
      // { contentTypes, formatters, statusCode, value: { data: [...], meta: {...} } }
      // Intentamos api.value primero, si no existe usamos api directamente
      const payload = api.value ?? api;
      return {
        data: payload.data ?? [],
        meta: {
          totalRecords: payload.meta?.totalRecords ?? 0,
          totalPages:   payload.meta?.totalPages   ?? 1,
          currentPage:  payload.meta?.currentPage  ?? page,
          pageSize:     payload.meta?.pageSize      ?? pageSize,
        },
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar documentos de venta');
    }
  }

  /** Alias para compatibilidad con código que use getAll() */
  getAll(
    empresaId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    filters?: FiltrosDocumentoVenta
  ) {
    return this.getByEmpresa(empresaId, page, pageSize, search, filters);
  }

  async getByPuntoVenta(
    puntoventaId: string,
    page = 1,
    pageSize = 20,
    search?: string,
    _filters?: FiltrosDocumentoVenta
  ): Promise<PaginatedResult> {
    try {
      const params: Record<string, any> = { page, pageSize };
      if (search?.trim()) params.search = search.trim();

      const { data: api } = await apiClient.get(`${this.base}/puntoventa/${puntoventaId}`, { params });
      const payload = api.value ?? api;
      return {
        data: payload.data ?? [],
        meta: {
          totalRecords: payload.meta?.totalRecords ?? 0,
          totalPages:   payload.meta?.totalPages   ?? 1,
          currentPage:  payload.meta?.currentPage  ?? page,
          pageSize:     payload.meta?.pageSize      ?? pageSize,
        },
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar documentos de venta');
    }
  }

  // ── Detalle ─────────────────────────────────────────────────────────────────

  async getById(documentoventaId: string): Promise<DocumentoVenta> {
    try {
      const { data } = await apiClient.get(`${this.base}/${documentoventaId}`);
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar el documento de venta');
    }
  }

  // ── Creación unificada ──────────────────────────────────────────────────────

  /**
   * Crea un documento de venta.
   *
   * @param documento  DTO con los datos del documento y sus detalles.
   * @param enviarSunat
   *   - `false` (default) → POST /DocumentoVenta
   *     Guarda el documento sin enviarlo a SUNAT. El backend puede generar
   *     varios documentos si los ítems tienen distintas familias de detracción.
   *   - `true` → POST /DocumentoVenta/DV_EnvioSunat
   *     Guarda el documento Y lo valida en SUNAT mediante MiFact.
   *     Requiere que `puntoventaId` esté configurado con una API MiFact válida.
   */
  async create(
    documento: CreateDocumentoVentaDTO,
    enviarSunat = false
  ): Promise<CreateDocumentoVentaResponse> {
    const endpoint = enviarSunat
      ? `${this.base}/DV_EnvioSunat`
      : this.base;

    try {
      // ── Aplicar defaults antes de enviar ──────────────────────────────────
      const body: CreateDocumentoVentaDTO = {
        ...documento,
        cuentausuarioId: documento.cuentausuarioId?.trim() || 'CU0001',
      };

      const { data: api } = await apiClient.post(endpoint, body);
      const payload = api.data ?? api;

      // Normalizar la respuesta para que ambos endpoints tengan la misma forma
      return {
        isSuccess:    payload.isSuccess    ?? payload.success ?? false,
        message:      payload.message      ?? '',
        enviadoSunat: enviarSunat,

        // ── Base ──────────────────────────────────────────────────────────
        documentoVentaId:      payload.documentoVentaId      ?? undefined,
        documentosVentaIds:    payload.documentosVentaIds    ?? undefined,
        documentosGenerados:   payload.documentosGenerados   ?? undefined,
        totalDetalles:         payload.totalDetalles         ?? undefined,
        movimientosCreditoIds: payload.movimientosCreditoIds ?? undefined,
        movimientoCreditoId:   payload.movimientoCreditoId   ?? undefined,
        detallesInsertados:    payload.detallesInsertados    ?? undefined,

        // ── SUNAT éxito ───────────────────────────────────────────────────
        estadoDocumento:    payload.estadoDocumento    ?? undefined,
        sunatCode:          payload.sunatCode          ?? undefined,
        sunatDescription:   payload.sunatDescription   ?? undefined,
        sunatNote:          payload.sunatNote          ?? undefined,
        codigoHash:         payload.codigoHash         ?? undefined,
        cadenaParaCodigoQr: payload.cadenaParaCodigoQr ?? undefined,
        urlPdf:             payload.url                ?? undefined,

        // ── SUNAT error ───────────────────────────────────────────────────
        sunatErrors: payload.sunatErrors ?? undefined,
        jsonMiFact:  payload.jsonMiFact  ?? undefined,
      };
    } catch (err: any) {
      const data = err.response?.data;

      // Extraer errores de campo específicos de ASP.NET ValidationProblemDetails
      const fieldErrors = data?.errors
        ? Object.entries(data.errors as Record<string, string[]>)
            .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
            .join(' | ')
        : null;

      const apiMessage =
        fieldErrors          ??
        data?.message        ??
        data?.error          ??
        data?.title          ??
        (typeof data === 'string' ? data : null);

      throw new Error(
        apiMessage ??
          (enviarSunat
            ? 'Error al crear y validar el documento en SUNAT'
            : 'Error al crear el documento de venta')
      );
    }
  }

  // ── Actualización ───────────────────────────────────────────────────────────

  async update(
    documentoventaId: string,
    documento: Partial<DocumentoVenta>
  ): Promise<any> {
    try {
      const { data } = await apiClient.put(`${this.base}/${documentoventaId}`, documento);
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al actualizar el documento de venta');
    }
  }

  // ── Anulación ───────────────────────────────────────────────────────────────

  async anular(documentoventaId: string): Promise<AnularDocumentoResponse> {
    try {
      const { data } = await apiClient.patch(`${this.base}/${documentoventaId}/anular`);
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al anular el documento de venta');
    }
  }

  // ── Eliminación ─────────────────────────────────────────────────────────────

  async delete(documentoventaId: string): Promise<any> {
    try {
      const { data } = await apiClient.delete(`${this.base}/${documentoventaId}`);
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al eliminar el documento de venta');
    }
  }

  // ── Boleteo ─────────────────────────────────────────────────────────────────

  async getSeriesBoleteo(puntoventaId: string, tipodoccomercialId: string): Promise<any[]> {
    try {
      const { data } = await apiClient.get(`${this.base}/seriesBoleteo`, {
        params: { puntoventaId, tipodoccomercialId },
      });
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar series de boleteo');
    }
  }

  async asociarBoletas(documentoInternoId: string, boletasIds: string[]): Promise<any> {
    try {
      const { data } = await apiClient.post(
        `${this.base}/${documentoInternoId}/asociar-boletas`,
        { boletasIds }
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al asociar boletas al documento interno');
    }
  }

  async convertirInternoAFactura(
    documentoInternoId: string,
    serie: string,
    numero: string,
    cuentaUsuarioId?: string
  ): Promise<any> {
    try {
      const { data } = await apiClient.post(
        `${this.base}/convertir-interno-a-factura`,
        null,
        { params: { documentoInternoId, serie, numero, cuentaUsuarioId } }
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al convertir documento interno a factura');
    }
  }

  async boletear(documentoInternoId: string, serie: string): Promise<any> {
    try {
      const { data } = await apiClient.post(
        `${this.base}/${documentoInternoId}/boletear`,
        null,
        { params: { serie } }
      );
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al procesar el boleteo');
    }
  }

  // ── Reportes ────────────────────────────────────────────────────────────────

  async getReporteImportacionContable(
    empresaId: string,
    fechaIni: string,
    fechaFin: string,
    asientoContable = 1
  ): Promise<any[]> {
    try {
      const { data } = await apiClient.get(`${this.base}/reporte-importacion-contable`, {
        params: { empresaId, fecha_ini: fechaIni, fecha_fin: fechaFin, asiento_contable: asientoContable },
      });
      return data.data ?? data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al generar reporte contable');
    }
  }

  // ── Crear DV + GR en un solo paso ───────────────────────────────────────────

  /**
   * Crea un Documento de Venta y su Guía de Remisión en una sola transacción.
   * POST /DocumentoVenta/DocumentoConGuiaRemision
   *
   * El DTO combina los campos del DV (CreateDocumentoVentaDTO) más un campo
   * `guiaRemision` con el payload de la guía.
   */
  async crearConGuiaRemision(dto: any): Promise<any> {
    try {
      const body = {
        ...dto,
        cuentausuarioId: dto.cuentausuarioId?.trim() || 'CU0001',
      };
      const { data: api } = await apiClient.post(`${this.base}/DocumentoConGuiaRemision`, body);
      return api.data ?? api;
    } catch (err: any) {
      const apiMessage =
        err.response?.data?.message ??
        err.response?.data?.error   ??
        err.response?.data?.title   ??
        (typeof err.response?.data === 'string' ? err.response.data : null);

      console.error('[DocumentoVentaService.crearConGuiaRemision] Error:', {
        status: err.response?.status,
        data:   err.response?.data,
      });

      throw new Error(apiMessage ?? 'Error al crear el documento con guía de remisión');
    }
  }

  // ── Asociar Guía de Remisión ─────────────────────────────────────────────────

async actualizarGuiaRemision(
  documentoventaId: string,
  guiaremisionId: string
): Promise<any> {
  try {
    const { data } = await apiClient.patch(
      `${this.base}/${documentoventaId}/guia-remision`,
      null,
      { params: { guiaremisionId } }
    );
    return data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message ?? 'Error al asociar la guía de remisión al documento de venta');
  }
}
  // ── Dropdowns ───────────────────────────────────────────────────────────────

  async getFormDropdowns(
    empresaId: string,
    tenantId: string
  ): Promise<FormDropdownsDocumentoVenta> {
    try {
      const { data } = await apiClient.get(`${this.base}/form-dropdowns`, {
        params: { empresaId, tenantId },
      });
      const raw = data?.data ?? data;

      return {
        tipos_documento_comercial: raw.tipo_doc_comercial ?? [],
        monedas:                   raw.moneda             ?? [],
        clientes:                  raw.cliente            ?? [],
        trabajadores:              raw.trabajador         ?? [],
        tipos_pago:                raw.tipo_pago          ?? [],
        puntos_venta:              raw.punto_venta        ?? [],
        condicion_pago:            raw.condicion_pago     ?? [],
        bienes:                    (raw.bien ?? []) as BienOption[],
        presentaciones: (raw.presentacion ?? []).map((g: any) => ({
          bienId: g.bienId,
          items:  (g.items ?? []).map((p: any) => ({
            key:    p.key   ?? p.presentacionId,
            value:  p.value ?? p.descripcion ?? p.key,
            factor: typeof p.factor === 'number' ? p.factor : 1,
          })),
        })),
        series:             raw.serie            ?? [],
        siguientes_numeros: raw.siguiente_numero ?? [],
        area_responsable:   raw.area_responsable ?? [],
      };
    } catch (err: any) {
      throw new Error('Error al cargar opciones del formulario');
    }
  }

  // ── Pedido de Venta ─────────────────────────────────────────────────────────

  /**
   * Jalamos los pedidos de venta aprobados en el rango de fechas dado.
   * Recibe fechas en formato YYYY-MM-DD y las convierte a DD/MM/YYYY
   * porque SQL Server en locale español (es-PE) usa ese formato.
   */
  async jalarPedidoVenta(
    empresaId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<any[]> {
    try {
      const toSqlDate = (iso: string) => {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
      };

      const { data } = await apiClient.get(`${this.base}/jalar-pedido-venta`, {
        params: {
          empresaId,
          fechaInicio: toSqlDate(fechaInicio),
          fechaFin:    toSqlDate(fechaFin),
        },
      });
      return data?.data ?? data ?? [];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al cargar pedidos de venta');
    }
  }

  /**
   * Compromete un pedido de venta luego de haber generado el documento de venta.
   * Llama a PUT /DocumentoVenta/comprometer-pedido-venta?pedidoVentaId=xxx
   */
  async comprometerPedidoVenta(
    pedidoVentaId: string
  ): Promise<{ isSuccess: boolean; message: string }> {
    try {
      const { data } = await apiClient.put(
        `${this.base}/comprometer-pedido-venta`,
        null,
        { params: { pedidoVentaId } }
      );
      return {
        isSuccess: data?.isSuccess ?? data?.success ?? false,
        message:   data?.message  ?? data?.data     ?? '',
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al comprometer el pedido de venta');
    }
  }

  // ── NC/ND ───────────────────────────────────────────────────────────────────

  async crearNotaCredito(documento: CreateDocumentoVentaDTO): Promise<NotaCreditoResponse> {
    try {
      const body = {
        ...documento,
        cuentausuarioId: documento.cuentausuarioId?.trim() || 'CU0001',
      };
      const { data: api } = await apiClient.post(`${this.base}/nota-credito`, body);
      const payload = api.data ?? api;
      return {
        documentoVentaId:           payload.documentoVentaId           ?? '',
        serie:                      payload.serie                      ?? '',
        numero:                     payload.numero                     ?? '',
        documentoventaReferenciaId: payload.documentoventaReferenciaId ?? '',
        isSuccess:                  payload.isSuccess                  ?? false,
        efectosAplicados:           payload.efectosAplicados           ?? false,
        message:                    payload.message                    ?? '',
        estadoDocumento:            payload.estadoDocumento            ?? undefined,
        sunatCode:                  payload.sunatCode                  ?? undefined,
        sunatDescription:           payload.sunatDescription           ?? undefined,
        sunatNote:                  payload.sunatNote                  ?? undefined,
        codigoHash:                 payload.codigoHash                 ?? undefined,
        cadenaParaCodigoQr:         payload.cadenaParaCodigoQr         ?? undefined,
        url:                        payload.url                        ?? undefined,
      };
    } catch (err: any) {
      const apiMessage =
        err.response?.data?.message ??
        err.response?.data?.error   ??
        err.response?.data?.title   ??
        (typeof err.response?.data === 'string' ? err.response.data : null);

      console.error('[DocumentoVentaService.crearNotaCredito] Error:', {
        status: err.response?.status,
        data:   err.response?.data,
      });

      throw new Error(apiMessage ?? 'Error al crear la nota de crédito');
    }
  }

  async getMotivosNcNd(): Promise<Array<{ motivoelectronicoId: string; tipodocumento: string; concepto: string }>> {
    try {
      const { data: api } = await apiClient.get(`${this.base}/motivosNcNd`);
      const payload = api.value ?? api;
      return payload.data ?? payload ?? [];
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Error al obtener motivos NC/ND');
    }
  }

  async getIgvVigente(): Promise<number> {
    try {
      const { data: api } = await apiClient.get(`${this.base}/igvVigente`);
      const payload = api.value ?? api;
      const val = payload.data?.igv ?? payload.data?.porcentaje ?? payload.igv ?? payload.porcentaje ?? 18;
      return val > 1 ? val / 100 : val;
    } catch {
      return 0.18;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Devuelve el key de detracción y su porcentaje para un bien dado */
  getBienDetraccionInfo(
    bienes: BienOption[],
    bienId: string
  ): { key: string; detraccionPorcentaje: number } {
    const bien = bienes.find((b) => b.key === bienId);
    return {
      key:                  bien?.detraccionbienserviceId ?? '000',
      detraccionPorcentaje: bien?.detraccionPorcentaje    ?? 0,
    };
  }
}

const documentoVentaService = new DocumentoVentaService();
export default documentoVentaService;
export { DocumentoVentaService };