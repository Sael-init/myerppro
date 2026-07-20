// src/types/notaSalida.types.ts

export interface BienLite {
    descripcion?: string;
    codigo_existencia?: string;
}

export interface PresentacionLite {
    descripcion?: string;
}

export interface LoteLite {
    descripcion?: string;
}

export interface TablaTransaccionesLite {
    descripcion?: string;
}

export interface TipoDocumentoComercialLite {
    descripcion?: string;
}

export interface MonedaLite {
    descripcion?: string;
    abreviatura?: string;
    simbolomoneda?: string;
}

export interface AlmacenLite {
    descripcion?: string;
}

export interface ClienteLite {
    descripcion?: string;
}

export interface ProveedorLite {
    descripcion?: string;
}

export interface EntidadLite {
    descripcion?: string;
}

export interface CuentaUsuarioLite {
    observacion?: string;
    usuario?: string;
    perfil?: {
        descripcion?: string;
    };
}

export interface NotaSalidaDetalle {
    item: number;
    bienId: string;
    cantidad: number;
    precio: number;   // 🚀 En Salidas usamos "precio" según el backend
    importe: number;
    presentacionId: string | null;
    loteId?: string | null;

    // Campos Auxiliares para la UI (Frontend)
    descripcion_aux?: string;
    unidad_aux?: string;
    unidades_opciones?: Array<{
        key: string;
        value: string;
        presentacionId?: string | null;
    }>;

    // Objetos anidados del backend (detalle)
    bien?: BienLite;
    presentacion?: PresentacionLite;
    lote?: LoteLite;
}

export interface NotaSalidaPayload {
    transaccionId: string;
    monedaId: string;
    tipo_cambio: number;
    tipodoccomercialId: string;
    doc_referencia: string;
    almacenId: string;
    almacenDestinoId?: string; // 🚀 Requerido para Traslados (TE)
    estado: string;
    cuentausuario: string;
    observaciones: string;
    doc_referencia_numero: string;
    empresaId: string;
    detalles: NotaSalidaDetalle[];
}

export interface NotaSalidaResponse extends Omit<NotaSalidaPayload, 'detalles'> {
    notassalidaId: string;
    fecha_emision: string;
    fecha_doc: string;
    detalles?: NotaSalidaDetalle[];
    
    // Campos extra que suele devolver el SP para la grilla
    transaccionDesc?: string;
    tipodoccomercialDesc?: string;
    CuentasusuarioId?: string;
    NombreUsuario?: string;
    clienteDesc?: string;
    
    // Objetos anidados que devuelve el backend (GET BY ID)
    tablaTransacciones?: TablaTransaccionesLite;
    transaccion?: TablaTransaccionesLite;
    tipoDocumentoComercial?: TipoDocumentoComercialLite;
    moneda?: MonedaLite;
    almacen?: AlmacenLite;
    almacenDestino?: AlmacenLite;
    cliente?: ClienteLite;
    cuentaUsuario?: CuentaUsuarioLite;

    // Referencia estándar (DOCUMENTO_VENTA / GUIAS_REMISION / etc.)
    referenciaDocumento?: {
        idDocumento?: string;
        entidadId?: string;
        documentoReferencia?: string;
        clienteId?: string;
        proveedorId?: string;
        entidad?: EntidadLite;
        cliente?: ClienteLite;
        proveedor?: ProveedorLite;
    };

    // Backward compatibility (puede desaparecer en el backend, pero lo dejamos opcional por seguridad)
    referenciaDocumentoVenta?: {
        clienteId?: string;
        cliente?: ClienteLite;
    };
    referenciaGuiaRemision?: {
        clienteId?: string;
        proveedorId?: string;
        cliente?: ClienteLite;
        proveedor?: ProveedorLite;
    };
}
