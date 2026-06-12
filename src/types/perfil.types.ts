export interface Perfil {
  perfilesId: string;
  descripcion?: string;
  detalle?: string;
  estado?: boolean;
  empresaId?: string;
}

export interface PuntoVenta {
  puntoventaId: string;
  almacenId?: string;
  serie?: string;
  descripcion?: string;
  serie_maqregistradora?: string;
  estado?: boolean;
  sedeId?: string;
}
