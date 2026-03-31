// src/types/trabajador.types.ts

export interface Trabajador {
  trabajadorId: string;
  empresaId: string;
  apellidos: string;
  nombres: string;
  docidentId: string;
  numero_doc: string;
  direccion?: string;
  telefono?: string;
  sexo?: string;
  estado_civil?: string;
  cuentausuarioId?: string;
  telefono_movil?: string;
  fecha_nacimiento?: string;
  cargoId?: number;
  areaId?: number;
  email?: string;
  firma_digital?: string;
  estado: string;
  
  // Objetos anidados
  documentoIdentidad?: DocumentoIdentidad;
  cuentaUsuario?: CuentaUsuario;
  empresa?: EmpresaResumen;
  cargo?: Cargo;
  area?: Area;
}

export interface DocumentoIdentidad {
  descripcion_larga: string;
  descripcion_corta: string;
  estado: boolean;
}

export interface CuentaUsuario {
  observacion?: string;
  usuario?: string;
  perfilesId?: string;
  estado?: boolean;
  perfil?: Perfil;
}

export interface Perfil {
  descripcion?: string;
  detalle?: string;
  estado?: boolean;
  empresaId?: string;
  empresa?: EmpresaResumen;
}

export interface EmpresaResumen {
  razon_social: string;
  ruc: string;
  direccion_1?: string;
  direccion_2?: string;
  telefono_fijo?: string;
  telefono_movil?: string;
  email?: string;
  estado?: boolean;
  ubigeo?: Ubigeo;
}

export interface Ubigeo {
  ubipai?: string;
  ubipan?: string;
  ubidep?: string;
  ubiden?: string;
  ubiprn?: string;
}

export interface Cargo {
  descripcion: string;
  estado: boolean;
}

export interface Area {
  descripcion: string;
  estado: boolean;
}

export interface DropdownOption {
  key: string | number;
  value: string;
}

export interface FormDropdownsTrabajador {
  documento_identidad: DropdownOption[];
  cargo: DropdownOption[];
  area: DropdownOption[];
  empresa: DropdownOption[];
  cuenta_usuario: DropdownOption[];
}

export interface FiltrosTrabajador {
  estado?: boolean | null;
  docidentIds?: string[];
  cargoId?: string;
  areaId?: string;
}

export interface TrabajadorResponse {
  success: boolean;
  data: Trabajador | Trabajador[];
  message?: string;
  pagination?: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}