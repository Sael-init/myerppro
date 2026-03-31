export interface ConfiguracionApiRecurso {
  id: string;
  empresaId: string;
  condicion: string;
  direccion: string;
  token: string;
  descripcion: string;
}

export interface DniResponse {
  numero: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  direccionCompleta: string;
  ubigeoReniec: string;
  ubigeoSunat: string;
  ubigeo: string[];
  fechaNacimiento: string;
  sexo: string;
}

export interface RucResponse {
  numero: string;
  nombreORazonSocial: string;
  tipoContribuyente: string;
  estado: string;
  condicion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  direccionCompleta: string;
  ubigeoSunat: string;
  ubigeo: string[];
}

export interface CarnetExtranjeriaResponse {
  numero: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
}

export interface TipoCambioResponse {
  fecha: string;
  compra: number;
  venta: number;
}

export interface PlacaVehiculoResponse {
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  color?: string | null;
  motor?: string | null;
  vin?: string | null;
}

export interface Licencia {
  numero: string;
  categoria: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
  estado: string;
  restricciones: string;
}

export interface LicenciaConducirResponse {
  numeroDocumento: string;
  nombreCompleto: string;
  licencia: Licencia;
}
