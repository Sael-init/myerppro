import apiClient from '../api/apiCliente';
import { ApiResponse } from '../types';
import {
  DniResponse,
  RucResponse,
  CarnetExtranjeriaResponse,
  LicenciaConducirResponse,
  PlacaVehiculoResponse,
  TipoCambioResponse
} from '../types/apiExternal.types';

type Params = Record<string, string | number | boolean | undefined>;

const get = async <T>(url: string, params: Params): Promise<ApiResponse<T>> => {
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data;
};

export const apiExternalService = {
  getDni: (numero: string, empresaId: string) =>
    get<DniResponse>(`/ApiFactiliza/dni/${numero}`, { empresaId }),

  getRuc: (numero: string, empresaId: string) =>
    get<RucResponse>(`/ApiFactiliza/ruc/${numero}`, { empresaId }),

  getCarnetExtranjeria: (numero: string, empresaId: string) =>
    get<CarnetExtranjeriaResponse>(`/ApiFactiliza/carnet-extranjeria/${numero}`, { empresaId }),

  getLicencia: (numero: string, empresaId: string) =>
    get<LicenciaConducirResponse>(`/ApiFactiliza/licencia/${numero}`, { empresaId }),

  getPlaca: (numero: string, empresaId: string) =>
    get<PlacaVehiculoResponse>(`/ApiFactiliza/placa/${numero}`, { empresaId }),

  getTipoCambio: (empresaId: string, fecha?: string) =>
    get<TipoCambioResponse>(`/ApiFactiliza/tipo-cambio`, { empresaId, fecha })
};