export interface Marca {
    marcaId: number;
    descripcion: string;

}

export interface Modelo {
    modeloId: number;
    descripcion: string;
    marcaId: number;
    groupKey?: string; 
    marca?: Marca;
}

export interface UnidadTransporte {
    unidadtransporteId?: string;
    descripcion: string;
    nro_matricula_cabina: string; // Placa Principal
    modeloId: string | number;
    peso_maximo: number;
    certificado_inscripcion?: string;   
    nro_matricula_carrosa1?: string;
    nro_matricula_carrosa2?: string;
    nro_matricula_carrosa3?: string;
    observaciones?: string;
    estado: string; // "1" Activo, "0" Anulado (Según tu React)
    empresaId: string;
    
    // Propiedades de navegación
    modelo?: Modelo;
}