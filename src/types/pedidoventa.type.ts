// src/types/pedidoventa.types.ts

export interface PedidoVenta {
  pedidoventaId: string;
  numero_correlativo?: string;
  fecha_emision?: string;
  fecha_entrega?: string;
  fecha_vencimiento?: string;
  clienteId?: string;
  cliente_referencia?: string;
  tipoentregaId?: number;
  direccion_entrega?: string;
  documento_referencia?: string;
  trabajadorId?: string;
  monedaId?: string;
  tipo_cambio?: number;
  formaspagoId?: string;
  observacion?: string;
  total?: number;
  condicion_pago?: string;
  estado?: string;
  cuentausuarioId?: string;
  valorventa_afecto?: number;
  valorventa_inafecto?: number;
  igv?: number;
  empresaId?: string;
  valorventa_gratuito?: number;
  operaciongratuita?: boolean;
  tipoopegratuitaId?: string;
  lugar_despacho?: string;
  estado_almacen?: string;
  estado_documento_sunat?: string;
  listaprecioId?: string;
  ultima_fechaUpdate?: string;
  dias_diferencia?: number;
  fecha_limite_despacho?: string;
  estado_despacho?: string;         // "DESPACHO ÓPTIMO" | "DESPACHO A REVISAR" | "FUERA DE DESPACHO"

  // Objetos anidados (del SP getById)
  tipoentrega?: { descripcion?: string; estado?: string };
  tipooperaciongratuita?: { descripcion?: string };
  cliente?: { descripcion?: string; num_docident?: string };
  condicionpago?: { descripcion?: string; dias?: number };
  cuentausuario?: { usuario?: string; correo?: string; estado?: string };
  empresa?: { razon_social?: string; num_ruc?: string };
  formapago?: { descripcion?: string; condicion_pago?: string };
  moneda?: { descripcion?: string; abreviatura?: string };
  trabajador?: { nombres?: string; apellidos?: string; areaId?: number };
  listaprecio?: { codigo_lista?: string; descripcion?: string; estado_listprec?: string };
  estadoalmacen?: { descripcion?: string };
  estadofacturacion?: { descripcion?: string };
  detalles?: PedidoVentaDetalle[];
}

export interface PedidoVentaDetalle {
  pedidoventaId?: string;
  item?: number;
  bienId?: string;
  presentacionId?: string;
  precio?: number;
  cantidad?: number;
  conversion_total?: number;
  saldo_cantidad?: number;
  importe?: number;
  descuento_producto?: number;
  afecto_inafecto?: boolean;
  observacion?: string;
  precio_sin_igv?: number;
  saldo_fisico?: number;
  fecha_preparado?: string;
  fecha_despachado?: string;
  porcentaje_igv?: number;
  bien?: { descripcion?: string; cod_admin?: string };
  presentacion?: { descripcion?: string; estado?: string };
  
}

export interface PedidoVentaAccion {
  pedidoventaId?: string;
  fechaUpdate?: string;
  usuarioUpdate?: string;
  usuario?: string;
  correo?: string;
  descripcion?: string;
}

export interface HistorialSuceso {
  historialsucesoId?: string;
  modulo?: string;
  interfase?: string;
  suceso?: string;
  documentoId?: string;
  descripcion?: string;
  arerespedId?: number;
  area_responsable?: { descripcion?: string; empresaId?: string };
}

export interface PedidoVentaDetalleFull {
  pedidoventa: PedidoVenta;
  detalle: PedidoVentaDetalle[];
  pedidoventa_acciones: PedidoVentaAccion[];
  historial_sucesos: HistorialSuceso[];
}

export interface FiltrosPedidoVenta {
  estado?: string | null;
  clienteId?: string;
  trabajadorId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PedidoVentaResponse {
  success: boolean;
  data: PedidoVenta | PedidoVenta[];
  message?: string;
  pagination?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
// en pedidoventa.types.ts
export interface FiltrosPedidoVenta {
  estado?:          string | null;   // CSV: "Registrado,Aprobado"
  clienteId?:       string;
  trabajadorId?:    string;
  monedaId?:        string;
  formaPagoId?:     string;
  cuentaUsuarioId?: string;
  tipoEntregaId?:   string;          // CSV si multi-valor
  estadoAlmacen?:   string;
  fechaDesde?:      string;          // ISO: "2025-01-01"
  fechaHasta?:      string;
}