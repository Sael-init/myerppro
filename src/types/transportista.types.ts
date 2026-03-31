export interface Transportista {
    transportistaId?: string;
    descripcion: string; // Razón Social
    direccion?: string;
    docidentId: string; // RUC generalmente
    numero_doc: string;
    estado: boolean;
    empresaId: string;
    documento_identidad?: {
        descripcion_corta: string;
        descripcion: string;
    };
}