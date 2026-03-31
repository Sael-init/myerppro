export type TipoOpeGratuitaId = string;

export interface TipoOpeGratuita {
  tipoopegratuitaId: TipoOpeGratuitaId;
  descripcion?: string;
  [key: string]: any;
}

export interface TipoOpeGratuitaCreateDto {
  tipoopegratuitaId: string;
  descripcion?: string;
}

export interface ServiceResult<T> {
  isSuccess: boolean;
  message?: string;
  status?: number;
  data: T;
}