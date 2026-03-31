// src/types/proveedores.types.ts

// Tipo para Tipo Proveedor
export interface TipoProveedor {
  descripcion: string;
  estado: boolean;
}

// Tipo para Clase Proveedor
export interface ClaseProveedor {
  descripcion: string;
  estado: boolean;
}

// Tipo para Documento Identidad
export interface DocumentoIdentidad {
  descripcion_larga: string;
  descripcion_corta: string;
  estado: boolean;
}

// Tipo para Ubigeo (viene en el GET del proveedor)
export interface Ubigeo {
  ubipai?: string;
  ubipan?: string;
  ubidep?: string;
  ubiden?: string;
  ubiprv?: string;
  ubiprn?: string;
  ubidsn?: string;
  nacionalidad?: string;
  estado?: string;
}

// Tipo para Tenant
export interface Tenant {
  descripcion: string;
  dominio: string;
  fechaCreacion: string;
  docIdentidadId: number;
  nombreContacto: string;
  telefonoContacto: string;
  emailContacto: string;
  estadoId: number;
  numeroDocIdentidad: string;
}

// Tipo para Tenant Documento Identidad
export interface TenantDocumentoIdentidad {
  descripcion: string;
  abreviatura: string;
  codigoSunat: string;
}

// Tipo para Tenant Estado
export interface TenantEstado {
  descripcion: string;
}

// Tipo principal Proveedor
export interface Proveedor {
  proveedorId?: string;
  tipoproveedorId?: string;
  claseproveedorId?: string;
  descripcion: string;
  docidentId: string;
  num_docident: string;
  direccion?: string;
  telefono_fijo?: string;
  telefono_fijo2?: string;
  telefono_movil?: string;
  telefono_movil2?: string;
  fecha_nacimiento?: string;
  email?: string;
  website?: string;
  ubidst?: string;
  estado: boolean;
  tenantId?: number;

  // Objetos relacionados que vienen en el GET
  tipoProveedor?: TipoProveedor;
  claseProveedor?: ClaseProveedor;
  documentoIdentidad?: DocumentoIdentidad;
  ubigeo?: Ubigeo;
  tenant?: Tenant;
  tenantDocumentoIdentidad?: TenantDocumentoIdentidad;
  tenantEstado?: TenantEstado;
}

// Tipo para filtros de búsqueda
export interface FiltrosProveedor {
  docidentIds?: (string | number)[];
  tipoproveedorId?: string;
  claseproveedorId?: string;
  estado?: boolean | null;
}

// Tipo para opciones de dropdowns (catálogos)
export interface KeyValueOption {
  key: string | number;
  value: string;
}

// Tipo para opciones de Ubigeo
export interface UbigeoOption {
  key: string;
  value: string;
}

// Tipo para los dropdowns del formulario
export interface FormDropdowns {
  tipo_proveedor?: KeyValueOption[];
  clase_proveedor?: KeyValueOption[];
  documento_identidad?: KeyValueOption[];
  tenant?: KeyValueOption[];
}