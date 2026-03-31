// src/types/guiaRemision.types.ts

// --- 1. LO QUE ENVIAMOS AL BACKEND (POST/PUT) ---
export interface GuiaRemisionDetalle {
    guiasremisionId?: string;
    bienId?: string;
    presentacionId?: string;
    item?: number;
    cantidad: number;
    conversion_total?: number;
    precio?: number;
    costo?: number;
    importe?: number;
    Saldo_cantidad?: number;
    descuento_producto?: number;
    afecto_inafecto?: boolean;
    observacion?: string;
    documentoId?: string;
    tabla_documento?: string;
    saldo_temporal?: number;
    
    // Auxiliar para frontend (mostrar nombre del producto en la tabla de items)
    descripcion_aux?: string; 
    unidad_aux?: string;
}

export interface GuiaRemisionPayload {
    guiasremisionId?: string;
    empresaId: string;
    tipomovimientoId: string;
    tipodoccomercialId: string;
    doc_referencia?: string;
    doc_referencia_numero?: string;
    fecha_emision: string | Date; // ISO String
    fecha_doc?: string | Date;
    fecha_traslado: string | Date;
    serie: string;
    correlativo?: string;
    clienteId: string;
    proveedorId?: string;
    id_almacen_inicio: string;
    id_almacen_destino: string;
    punto_partida?: string;
    punto_llegada?: string;
    monedaId: string;
    tipo_cambio: number;
    motivotrasladoId: string;
    otro_motivo_traslado?: string;
    observacion?: string;
    movilidadId?: string; // Opcional si usas los IDs directos abajo
    guia_remision_remitente?: string;
    trabajadorId?: string;
    foto_guiaremision?: string;
    cuentausuarioId: string;
    estado?: string;
    puntoventaId?: string;
    transportistaId?: string;
    unidadTransporteId?: string;
    conductorId?: string;
    incluye_igv?: boolean;
    estado_documento_sunat?: string;
    documentoReferencia?: string;
    documentoReferenciaTipo?: string;

    detalles: GuiaRemisionDetalle[];
}

// --- 2. LO QUE RECIBIMOS DEL BACKEND (GET) ---
// Esta interfaz refleja la estructura anidada del JSON que me mostraste
export interface GuiaRemisionResponse {
    guiasremisionId: string;
    fecha_emision: string;
    fecha_traslado: string;
    serie: string;
    correlativo: string;
    estado: string;
    estado_documento_sunat: string;
    punto_partida: string;
    punto_llegada: string;

    // Objetos Anidados (Solo los necesarios para la tabla)
    cliente?: {
        descripcion: string;
        num_docident: string;
        docidentId: string;
    };
    transportista?: {
        descripcion: string;
        numero_doc: string;
    };
    conductor?: {
        nombres: string;
        apellidos: string;
        nro_documento: string;
        licencia_conducir: string;
    };
    unidadTransporte?: {
        nro_matricula_cabina: string;
        marca?: { descripcion: string };
        modelo?: { descripcion: string };
    };
    motivoTraslado?: {
        descripcion: string;
    };
    almacenInicio?: {
        descripcion: string;
    };
    almacenDestino?: {
        descripcion: string;
    };
}