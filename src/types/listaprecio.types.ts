// src/types/listaprecio.types.ts

// =====================================================
// ENTIDADES RELACIONADAS (respuestas GET)
// =====================================================

export interface TipoListaPrecioRelacionado {
  descripcion: string;
}

export interface EstadoListaPrecioRelacionado {
  descripcion: string;
}

export interface PresentacionListaPrecio {
  descripcion: string;
  cantidad: number;
  bienId: string;
  estado: string;
}

export interface BienListaPrecio {
  descripcion: string;
  cod_admin: string;
  observacion?: string;
}

export interface MonedaListaPrecio {
  descripcion: string;
  abreviatura: string;
}

// =====================================================
// DETALLE DE LISTA DE PRECIOS (GET)
// =====================================================

export interface ListaPrecioDetalle {
  listaprecioId: string;
  presentacionId: string;
  bienId?: string;
  precio_nuevo?: number;
  porcentaje_descuento?: number;
  precio_nuevo_minimo?: number;
  costoValorizado?: number;
  utilidad?: number;
  precio_nuevo_dol?: number;
  porcentaje_descuento_dol?: number;
  precio_nuevo_minimo_dol?: number;
  precio_nuevo_eur?: number;
  porcentaje_descuento_eur?: number;
  precio_nuevo_minimo_eur?: number;
  tipo_cambio_dol?: number;
  tipo_cambio_eur?: number;
  monedaId?: string;

  presentacion?: PresentacionListaPrecio;
  bien?: BienListaPrecio;
  moneda?: MonedaListaPrecio;
}

// =====================================================
// PERFIL ASOCIADO A LISTA DE PRECIOS (GET)
// =====================================================

export interface ListaPrecioPerfilRelacionado {
  listaprecioId: string;
  perfilesId: string;
  descripcion?: string;
  detalle?: string;
  estado?: string;
}

// =====================================================
// PUNTO DE VENTA ASOCIADO A LISTA DE PRECIOS (GET)
// =====================================================

export interface ListaPrecioPuntoVentaRelacionado {
  listaprecioId: string;
  puntoventaId: string;
  descripcion?: string;
  direccion?: string;
  estado?: string;
}

// =====================================================
// LISTA DE PRECIOS PRINCIPAL (GET)
// =====================================================

export interface ListaPrecio {
  listaprecioId: string;
  codigo_lista: string;
  tipolistaprecioId?: number;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  estado_listprec?: string;
  fecha_creacion?: string;
  listadefault?: boolean;
  empresaId: string;

  tipoListaPrecio?: TipoListaPrecioRelacionado;
  estado?: EstadoListaPrecioRelacionado;
  detalles?: ListaPrecioDetalle[];
  perfiles?: ListaPrecioPerfilRelacionado[];
  puntoventa?: ListaPrecioPuntoVentaRelacionado[];
}

// =====================================================
// TIPO LISTA DE PRECIOS
// =====================================================

export interface TipoListaPrecio {
  tipolistaprecioId?: number;
  descripcion: string;
  empresaId: string;
}

// =====================================================
// ESTADO LISTA DE PRECIOS
// =====================================================

export interface EstadoListaPrecio {
  estado_listprec: string;
  descripcion?: string;
}

// =====================================================
// DTOs — DETALLE (CREATE / UPDATE)
// =====================================================

export interface ListaPrecioDetalleDTO {
  presentacionId: string;
  precio_nuevo?: number;
  porcentaje_descuento?: number;
  precio_nuevo_minimo?: number;
  costoValorizado?: number;
  utilidad?: number;
  precio_nuevo_dol?: number;
  porcentaje_descuento_dol?: number;
  precio_nuevo_minimo_dol?: number;
  precio_nuevo_eur?: number;
  porcentaje_descuento_eur?: number;
  precio_nuevo_minimo_eur?: number;
  tipo_cambio_dol?: number;
  tipo_cambio_eur?: number;
  monedaId?: string;
}

// =====================================================
// DTOs — LISTA DE PRECIOS (CREATE)
// =====================================================

export interface CreateListaPrecioDTO {
  empresaId: string;
  codigo_lista: string;
  tipolistaprecioId: number;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  listadefault?: boolean;
  detalles: ListaPrecioDetalleDTO[];
}

// =====================================================
// DTOs — LISTA DE PRECIOS (UPDATE)
// =====================================================

export interface UpdateListaPrecioDTO {
  listaprecioId?: string;
  codigo_lista: string;
  tipolistaprecioId?: number;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  listadefault?: boolean;
  detalles: ListaPrecioDetalleDTO[];
}

// =====================================================
// DTOs — PERFIL / PUNTO DE VENTA (CREATE)
// =====================================================

export interface CreateListaPrecioPerfilDTO {
  listaprecioId: string;
  perfilesId: string;
}

export interface CreateListaPrecioPuntoVentaDTO {
  listaprecioId: string;
  puntoventaId: string;
}

// =====================================================
// DTOs — TIPO LISTA DE PRECIOS (CREATE / UPDATE)
// =====================================================

export interface CreateTipoListaPrecioDTO {
  descripcion: string;
  empresaId: string;
}

export interface UpdateTipoListaPrecioDTO {
  tipolistaprecioId?: number;
  descripcion: string;
}

// =====================================================
// DTOs — ESTADO LISTA DE PRECIOS (CREATE / UPDATE)
// =====================================================

export interface CreateEstadoListaPrecioDTO {
  estado_listprec: string;
  descripcion?: string;
}

export interface UpdateEstadoListaPrecioDTO {
  descripcion?: string;
}

// =====================================================
// RESPUESTAS DE LA API
// =====================================================

export interface CreateListaPrecioResponse {
  mensaje: string;
  listaprecioId: string;
}

export interface ActivarListaPrecioResponse {
  mensaje: string;
  listaprecioId: string;
  nuevoEstado: string;
}

export interface AnularListaPrecioResponse {
  mensaje: string;
  listaprecioId: string;
  nuevoEstado: string;
}

export interface CreateTipoListaPrecioResponse {
  mensaje: string;
  tipolistaprecioId: number;
}

// =====================================================
// FILTROS Y PAGINACIÓN
// =====================================================

export interface FiltrosListaPrecio {
  estado?: string;
  tipolistaprecioId?: number;
  soloActivas?: boolean;
}

export interface PaginatedResult<T = any> {
  data: T[];
  meta: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
