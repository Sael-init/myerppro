// src/types/Documentoventa.types.ts

// =====================================================
// TIPOS DE ENTIDADES RELACIONADAS (respuestas GET)
// =====================================================

export interface TipoDocumentoComercial {
  descripcion: string;
  abreviatura: string;
}

export interface Moneda {
  descripcion: string;
  abreviatura: string;
}

export interface ClienteRelacionado {
  descripcion: string;
  numDocIdent: string;
}

export interface Trabajador {
  nombres: string;
  apellidos: string;
  areaId?: string;
}

export interface TipoPago {
  descripcion: string;
  estado: boolean;
}

export interface FormaPago {
  descripcion: string;
  condicionPago: string;
}

export interface CuentaUsuario {
  usuario: string;
  estado: boolean;
}

export interface PuntoVenta {
  descripcion: string;
  sedeId: string;
  serie: string;
}

export interface Sede {
  descripcion: string;
  empresaId: string;
  estado: boolean;
}

export interface Presentacion {
  descripcion: string;
  estado: boolean;
}

export interface Bien {
  descripcion: string;
  codAdmin: string;
}

// =====================================================
// DETALLE DE DOCUMENTO (GET)
// =====================================================

export interface DocumentoVentaDetalle {
  item: number;
  bienId: string;
  presentacionId: string;
  cantidad: number;
  precio: number;
  conversionTotal: number;
  importe: number;
  saldoCantidad: number;
  descuentoProducto: number;
  afectoInafecto: boolean;
  saldoTemporal: number;
  precioSinIgv: number;
  porcentajeIgv: number;
  observacion?: string;
  documentoIdEnlazado?: string;
  nombreTablaDocEnlazado?: string;
  cantidadPendienteBoleteo?: number;
  presentacion?: Presentacion;
  bien?: Bien;
}

// =====================================================
// DOCUMENTO DE VENTA PRINCIPAL (GET)
// =====================================================

export interface DocumentoVenta {
  documentoventaId: string;
  tipodoccomercialId: string;
  pedidoventaId?: string;
  serie: string;
  numero: string;
  fecha_emision: string;
  fecha_doc: string;
  monedaId: string;
  tipo_cambio: number;
  clienteId: string;
  ordencompra_numero?: string;
  ordencompra_foto?: string;
  trabajadorId?: string;
  detraccion: boolean;
  valorventa_afecto: number;
  valorventa_inafecto: number;
  igv: number;
  total: number;
  saldo: number;
  tipopagoId?: string;
  condicion_pago: string;
  fecha_vencimiento?: string;
  puntoventaId: string;
  observacion?: string;
  cotizacionventaId?: string;
  fecha_anulado?: string;
  estado: string;
  cuentausuarioId?: string;
  guiasnotassalidasId?: string;
  total_letras?: string;
  motivoelectronicoId?: string;
  documentoventa_referenciaId?: string;
  valorFirma?: string;
  formaspagoId?: string;
  estado_documento_sunat: string;
  codigo?: string;
  detraccion_porcentaje?: number;
  detraccion_monto?: number;
  asiento_contable?: string;
  identificador_boleteo?: string;
  estado_boleteo?: string;
  valorventa_gratuito?: number;
  operaciongratuita?: boolean;
  tipoopegratuitaId?: string;
  catalogo53Id?: string;
  importe_retencion?: number;
  documento_como_anticipo?: string;
  anticipo_importe?: number;
  estado_almacen?: string;
  codigo_auditoria?: string;

  tipoDocumentoComercial?: TipoDocumentoComercial;
  moneda?: Moneda;
  cliente?: ClienteRelacionado;
  trabajador?: Trabajador;
  tipoPago?: TipoPago;
  formaPago?: FormaPago;
  cuentaUsuario?: CuentaUsuario;
  puntoVenta?: PuntoVenta;
  sede?: Sede;
  motivoNcNd?: { tipoDocumento: string; concepto: string };
  detalles?: DocumentoVentaDetalle[];
}

// =====================================================
// FILTROS DE BÚSQUEDA
// =====================================================

export interface FiltrosDocumentoVenta {
  // Filtros base
  tipodoccomercialIds?: string[];
  puntoVentaIds?:       string[];
  estadoDocumentoSunat?: string[];
  estado?:              string;
  fechaDesde?:          string;
  fechaHasta?:          string;
  // Filtros adicionales
  monedaIds?:           string[];
  clienteIds?:          string[];
  trabajadorIds?:       string[];
  tipoPagoIds?:         string[];
  sedeIds?:             string[];
  formaPagoIds?:        string[];
  cuentaUsuarioIds?:    string[];
  condicionPago?:       string;
  motivoelectronicoId?: string;
}

// =====================================================
// CATÁLOGOS / DROPDOWNS
// =====================================================

export interface KeyValueOption {
  key: string | number;
  value: string;
}

/** Bien enriquecido con información de detracción proveniente del SP */
export interface BienOption {
  key: string;
  value: string;
  detraccionbienserviceId: string;
  detraccionPorcentaje: number;
  afecto_inafecto: boolean;
}

/** Presentación con su factor de conversión a unidad base
 *  Ej: 1 CAJA = 12 UNIDADES → factor = 12
 *      KILOGRAMOS            → factor = 1
 */
export interface PresentacionItem extends KeyValueOption {
  factor: number;
}

export interface PresentacionGrupo {
  bienId: string;
  items: PresentacionItem[];
}

/** Siguiente correlativo precalculado por el SP al cargar dropdowns */
export interface SiguienteNumeroItem {
  tipodoccomercialId: string;
  puntoventaId: string;
  serie: string;
  siguienteNumero: string;
}

export interface SerieGrupo {
  tipodoccomercialId: string;
  puntoventaId: string;
  items: KeyValueOption[];
}

export interface FormDropdownsDocumentoVenta {
  tipos_documento_comercial: KeyValueOption[];
  monedas: KeyValueOption[];
  clientes: KeyValueOption[];
  trabajadores: KeyValueOption[];
  tipos_pago: KeyValueOption[];
  puntos_venta: KeyValueOption[];
  condicion_pago: KeyValueOption[];
  bienes: BienOption[];
  presentaciones: PresentacionGrupo[];
  series: SerieGrupo[];
  siguientes_numeros: SiguienteNumeroItem[];
  area_responsable: KeyValueOption[];
}

// =====================================================
// DTOs PARA CREAR DOCUMENTO
// =====================================================

export interface CreateDocumentoVentaDetalleDTO {
  bienId: string;
  presentacionId: string;
  item?: number;
  cantidad: number;
  precio: number;
  conversionTotal?: number;
  importe?: number;
  saldoCantidad?: number;
  descuentoProducto?: number;
  afectoInafecto?: boolean;
  observacion?: string;
  saldoTemporal?: number;
  precioSinIgv?: number;
  porcentajeIgv?: number;
  documentoIdEnlazado?: string;
  nombreTablaDocEnlazado?: string;
  cantidadPendienteBoleteo?: number;
  /** detraccionbienserviceId: "000" = sin detracción */
  key?: string;
  detraccionPorcentaje?: number;
}

export interface CreateDocumentoVentaDTO {
  tipodoccomercialId: string;
  pedidoventaId?: string;
  serie: string;
  numero?: string;
  fechaEmision: string;
  fechaDoc: string;
  monedaId: string;
  tipoCambio: number;
  clienteId: string;
  ordencompraNumero?: string;
  ordencompraFoto?: string;
  trabajadorId?: string;
  detraccion?: boolean;
  valorventaAfecto?: number;
  valorventaInafecto?: number;
  igv?: number;
  total?: number;
  saldo?: number;
  tipopagoId?: string;
  condicionPago: string;
  fechaVencimiento?: string;
  puntoventaId: string;
  observacion?: string;
  cotizacionventaId?: string;
  estado?: string;
  cuentausuarioId?: string;
  guiasnotassalidasId?: string;
  totalLetras?: string;
  motivoelectronicoId?: string;
  documentoventaReferenciaId?: string;
  valorFirma?: string;
  formaspagoId?: string;
  estadoDocumentoSunat?: string;
  codigo?: string;
  detraccionPorcentaje?: number;
  detraccionMonto?: number;
  asientoContable?: string;
  identificadorBoleteo?: string;
  estadoBoleteo?: string;
  valorventaGratuito?: number;
  operacionGratuita?: boolean;
  tipoopegratuitaId?: string;
  catalogo53Id?: string;
  importeRetencion?: number;
  documentoComoAnticipo?: string;
  anticipoImporte?: number;
  estadoAlmacen?: string;
  detalles: CreateDocumentoVentaDetalleDTO[];
}

// =====================================================
// RESPUESTAS DE LA API
// =====================================================

/**
 * Respuesta unificada de create(dto, enviarSunat).
 *
 * enviarSunat = false  →  POST /DocumentoVenta
 *   Devuelve campos base + documentosVentaIds (puede generar N docs por detracción)
 *
 * enviarSunat = true   →  POST /DocumentoVenta/DV_EnvioSunat
 *   Devuelve campos base + campos sunat* (resultado de la validación SUNAT)
 */
export interface CreateDocumentoVentaResponse {
  isSuccess: boolean;
  message: string;

  // ── Campos base (ambos endpoints) ──────────────────────────────────────
  documentoVentaId?: string;

  // Solo presente en enviarSunat = false (puede generar N documentos)
  documentosVentaIds?: string[];
  documentosGenerados?: number;
  totalDetalles?: number;
  movimientosCreditoIds?: (number | null)[];

  // Solo presente en enviarSunat = true
  movimientoCreditoId?: number | null;
  detallesInsertados?: number;

  // ── Validación SUNAT (solo enviarSunat = true, éxito) ──────────────────
  enviadoSunat: boolean;
  estadoDocumento?: string;
  sunatCode?: string;
  sunatDescription?: string;
  sunatNote?: string;
  codigoHash?: string;
  cadenaParaCodigoQr?: string;
  urlPdf?: string;

  // ── Error SUNAT (solo enviarSunat = true, rechazo) ────────────────────
  sunatErrors?: string;
  jsonMiFact?: string;
}

export interface NotaCreditoResponse {
  documentoVentaId: string;
  serie: string;
  numero: string;
  documentoventaReferenciaId: string;
  isSuccess: boolean;
  efectosAplicados: boolean;
  message: string;
  estadoDocumento?: string;
  sunatCode?: string;
  sunatDescription?: string;
  sunatNote?: string;
  codigoHash?: string;
  cadenaParaCodigoQr?: string;
  url?: string;
}

export interface AnularDocumentoResponse {
  isSuccess: boolean;
  message: string;
  tipoDocumento: string;
  esDocumentoBoleteado?: boolean;
  totalBoletas?: number;
  boletasAnuladas?: number;
  estadoSunat?: string;
  codigoSunat?: string;
  descripcionSunat?: string;
}