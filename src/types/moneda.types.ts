// src/types/moneda.types.ts

export interface TipoCambioUniversal {
  fecha: string;
  tc_venta: number;
  tc_compra: number;
}

export interface Moneda {
  monedaId: string;
  descripcion: string;
  abreviatura: string;
  simbolomoneda: string;
  tipoCambioUniversal?: TipoCambioUniversal;
}

export interface FiltrosMoneda {
  search?: string;
}

export interface MonedaResponse {
  data: Moneda[];
  meta: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
