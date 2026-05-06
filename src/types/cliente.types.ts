// src/types/cliente.types.ts

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

export interface TipoCliente {
  descripcion: string;
  estado: boolean;
}

export interface DocumentoIdentidad {
  descripcion_larga: string;
  descripcion_corta: string;
  estado: boolean;
}

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

// ─── NUEVO ────────────────────────────────────────────────────────────────────
export interface DireccionExtra {
  almacenclienteId?: string;
  clienteId?: string;
  direccion: string;
  ubidst?: string | null;
  estado?: boolean;
}
// ──────────────────────────────────────────────────────────────────────────────

export interface Cliente {
  clienteId?: string;
  tipoclienteId?: string;
  descripcion: string;
  docidentId: string;
  num_docident: string;
  sexo?: string;
  fecha_nac?: string;
  direccion?: string;
  telefono_fijo?: string;
  telefono_fijo2?: string;
  telefono_movil?: string;
  telefono_movil2?: string;
  email?: string;
  website?: string;
  estado_civil?: string;
  ubidst?: string;
  empresaId?: string;
  estado: boolean;
  codigo_RepresentanteLegal?: string;
  agente_retencion?: string;
  Origen?: string;
  tenantId?: number;

  // ─── NUEVOS ───────────────────────────────────────────────────────────────
  /** Direcciones adicionales → se insertan en ALMACEN_CLIENTE */
  direccionesExtras?: DireccionExtra[];
  /** IDs de empresas (RUC) que este cliente DNI representa legalmente */
  empresasAsociadasIds?: string[];
  /** Empresas vinculadas al cliente (representante legal) — viene del GET */
  representante_legal?: Array<{ clienteId?: string; descripcion: string; num_docident: string; docidentId?: string }>;
  // ──────────────────────────────────────────────────────────────────────────

  // Objetos relacionados (GET)
  tipocliente?: TipoCliente;
  documento_identidad?: DocumentoIdentidad;
  ubigeo?: Ubigeo;
  tenant?: Tenant;
}

export interface FiltrosCliente {
  docidentIds?: (string | number)[];
  tipoclienteId?: string;
  estado?: boolean | null;
}

export interface KeyValueOption {
  key: string | number;
  value: string;
}

export interface UbigeoOption {
  key: string;
  value: string;
}

export interface UbigeoRow {
  ubigeoId?: string;
  codigo?: string;
  id?: string;
  ubipan?: string;
  ubiden?: string;
  ubiprn?: string;
  ubidst?: string;
  ubidsn?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

export interface FormDropdowns {
  tipo_cliente?: KeyValueOption[];
  documento_identidad?: KeyValueOption[];
  empresa?: KeyValueOption[];
  tenant?: KeyValueOption[];
  ubigeo?: UbigeoRow[];
}