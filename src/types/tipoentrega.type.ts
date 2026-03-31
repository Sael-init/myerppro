export interface TipoEntrega {
  id: number;
  descripcion?: string;
  estado?: boolean;
  tenantId?: number;
}

export interface FiltrosTipoEntrega {
  tenantId?:    number;
  search?:      string;
  soloActivos?: boolean;
}

export interface TipoEntregaResponse {
  data: TipoEntrega[];
  pagination: {
    totalRecords: number;
    totalPages:   number;
    currentPage:  number;
    pageSize:     number;
  };
}