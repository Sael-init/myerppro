// src/types/formaspago.types.ts

export interface FormasPago {
  formaspagoId?: string;
  descripcion: string;
  diasFormPago?: number | null;
  condicionPago?: string | null;
}

// Tipo para el formulario (todos string para manejo de inputs)
export interface FormasPagoForm {
  descripcion: string;
  diasFormPago: string;
  condicionPago: string;
}