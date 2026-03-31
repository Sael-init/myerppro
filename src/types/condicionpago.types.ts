export type CondicionPagoId = string;

export interface CondicionPago {
  condicionPagoId?: CondicionPagoId;
  condicion_pago: string;
  descripcion?: string;
  [key: string]: any;
}

export interface CondicionPagoForm {
  condicion_pago: string;
  descripcion: string;
}

export interface CondicionPagoCreateDto {
  condicion_pago: string;
  descripcion: string;
}

export interface CondicionPagoUpdateDto {
  descripcion: string;
}

export interface ServiceResult<T> {
  isSuccess: boolean;
  message?: string;
  status?: number;
  data: T;
}
