// src/types/cotizacion.types.ts

export interface Cotizacion {
  cotizacionventaId: string;
  tipodoccomercialId?: string;
  // camelCase (getById normalizado)
  numeroCorrelativo?: string;
  observacion?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  trabajadorId?: string;
  ordcompraNumero?: string;
  ordcompraFoto?: string;
  clienteId?: string;
  monedaId?: string;
  tipoCambio?: number;
  tipopagoId?: string;
  igv?: number;
  total?: number;
  saldo?: number;
  condicionPago?: string;
  empresaId?: string;
  cuentausuarioId?: string;
  estado?: string;
  valorventaAfecto?: number;
  valorventaInafecto?: number;
  formaspagoId?: string;
  tipoentregaId?: string;
  tiempoValidez?: number;
  detalles?: CotizacionDetalle[];
  // snake_case (getAll — respuesta directa del API sin normalizar)
  numero_correlativo?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  tipo_cambio?: number;
  condicion_pago?: string;
  valorventa_afecto?: number;
  valorventa_inafecto?: number;
  tiempo_validez?: number;

  // Objetos anidados del API
  tipoDocumentoComercial?: { descripcion?: string; abreviatura?: string };
  cliente?: { descripcion?: string; numDocIdent?: string; num_docident?: string; direccion?: string };
  trabajador?: { nombres?: string; apellidos?: string };
  moneda?: { descripcion?: string; abreviatura?: string };
  cuentaUsuario?: { usuario?: string; perfilesId?: string };
  empresa?: { razonSocial?: string; ruc?: string };
  formaPago?: { descripcion?: string; condicionPago?: string };
  condicionpago?: { descripcion?: string; dias?: number };
  tipoentrega?: { descripcion?: string };
}

export interface CotizacionDetalle {
  cotizacionventaId?: string;
  bienId?: string;
  presentacionId?: string;
  item?: number;
  cantidad?: number;
  conversionTotal?: number;
  precio?: number;
  importe?: number;
  descuentoProducto?: number;
  saldoCantidad?: number;
  afectoInafecto?: boolean;
  observacion?: string;
  precioSinIgv?: number;
  porcentajeIgv?: number;

  bien?: { descripcion?: string; codAdmin?: number | string; cod_admin?: string; estado?: boolean };
  presentacion?: { descripcion?: string; cantidad?: number; estado?: boolean };
}

export interface FiltrosCotizacion {
  estado?: string | null;
  clienteId?: string;
  trabajadorId?: string;
  monedaId?: string;
  formaPagoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
