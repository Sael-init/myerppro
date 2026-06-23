export interface CuentaUsuario {
  cuentausuarioId: string;
  usuario: string;
  clave?: string;
  observacion?: string | null;
  perfilesId?: string | null;
  estado?: boolean;
  perfil?: {
    descripcion?: string;
    detalle?: string;
    estado?: boolean;
    empresaId?: string;
  };
}

export interface CuentaUsuarioForm {
  usuario: string;
  clave: string;
  observacion: string;
  perfilesId: string;
  estado: boolean;
}
