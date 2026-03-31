// src/types/producto.types.ts

export interface SubClaseBien {
    subclasebienId: string;
    descripcion: string;
    clasebienId?: string; // Agregado según tu JSON
}

export interface UnidadMedida {
    unidadmedidaId: string;
    abreviatura: string;
    descripcion: string;
}

export interface Producto {
    // Identificadores
    bienId: string;
    empresaId?: string;
    
    // Clasificación
    tipobienId: number; // En BD es int, en JSON es 2 (number)
    subclasebienId: string; // Corregido: antes era sub_clase_bienId
    unidadmedidaId: string;
    
    // Descripción y Detalles
    descripcion: string;
    marca?: string; // En BD es varchar, no ID
    codigo_existencia?: string;
    codigo_barra?: string;
    codigo_osce?: string;
    imagen?: string;
    observacion?: string;
    
    // Económico
    precio: number;
    costo: number;
    detraccion_porcentaje: number; // Corregido: antes era porcentaje_detraccion
    afecto_inafecto: boolean;      // Corregido: antes era aplica_detraccion
    
    // Configuración / Auditoría
    estado: boolean;
    condicion_estado?: string;
    emite_ticket?: boolean;
    
    // Relaciones (Foreign Keys directos)
    operacionesItemId?: string;
    detraccionbienserviceId?: string;
    cuenta_contable?: string;
    cuentausuarioId?: string;
    cod_admin?: number; // En JSON viene como número (100001)
    ubidst?: string;

    // Objetos anidados (Vienen en el JSON, útiles para mostrar nombres en tablas)
    tipoBien?: { descripcion: string; estado: boolean };
    subClaseBien?: { descripcion: string };
    claseBien?: { descripcion: string };
    unidadMedida?: { descripcion: string; abreviatura: string };
}

export interface ApiResponse<T> {
    status?: number;      // Agregado según tu JSON
    isSuccess: boolean;
    message?: string;     // Agregado según tu JSON
    data: T;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
    };
}