export interface Conductor {
    conductortransporteId?: string; // UUID o ID del backend
    nombres: string;
    apellidos: string;
    docidentId: string;
    nro_documento: string;
    direccion?: string;
    correo?: string;
    ubidst?: string;
    telefono_fijo?: string;
    telefono_movil?: string;
    licencia_conducir?: string;
    estado: boolean;
    empresaId: string;
    documento_identidad?: {
        descripcion_corta: string;
        descripcion: string;
    };
}