import apiClient from "../api/apiCliente";
import type {
  TipoOpeGratuita,
  TipoOpeGratuitaCreateDto,
  TipoOpeGratuitaId,
  ServiceResult,
} from "@/types/tipoopegratuita.types";

type AnyObj = Record<string, any>;

class TipoOpeGratuitaService {
  private readonly baseURL = "/TipoOpeGratuita";

  private isObject(value: any): value is AnyObj {
    return value !== null && typeof value === "object";
  }

  private unwrap(payload: any) {
    if (
      this.isObject(payload) &&
      ("data" in payload || "isSuccess" in payload || "success" in payload || "status" in payload)
    ) {
      return {
        data: "data" in payload ? payload.data : payload,
        message: typeof payload.message === "string" ? payload.message : undefined,
        status: typeof payload.status === "number" ? payload.status : undefined,
        isSuccess:
          typeof payload.isSuccess === "boolean"
            ? payload.isSuccess
            : typeof payload.success === "boolean"
            ? payload.success
            : true,
      };
    }
    return { data: payload, isSuccess: true };
  }

  private normalize(item: any): TipoOpeGratuita {
    const raw = this.isObject(item) ? item : {};
    return {
      ...raw,
      tipoopegratuitaId: String(raw.tipoopegratuitaId ?? "").trim(),
      descripcion: String(raw.descripcion ?? "").trim(),
    };
  }

  private toResult<T>(
    unwrap: { isSuccess?: boolean; message?: string; status?: number },
    data: T,
    defaultMessage?: string
  ): ServiceResult<T> {
    return {
      isSuccess: typeof unwrap.isSuccess === "boolean" ? unwrap.isSuccess : true,
      message: unwrap.message || defaultMessage,
      status: unwrap.status,
      data,
    };
  }

  async getAll(
    page = 1,
    pageSize = 100,
    searchTerm?: string
  ): Promise<TipoOpeGratuita[]> {
    const params: AnyObj = { page, pageSize };
    if (searchTerm) params.search = searchTerm;

    const response = await apiClient.get(this.baseURL, { params });
    const u = this.unwrap(response?.data);

    const list = Array.isArray(u.data) ? u.data : Array.isArray(u.data?.items) ? u.data.items : [];
    return list.map((x: any) => this.normalize(x));
  }

  async create(payload: TipoOpeGratuitaCreateDto): Promise<ServiceResult<TipoOpeGratuita>> {
    const body: TipoOpeGratuitaCreateDto = {
      tipoopegratuitaId: String(payload?.tipoopegratuitaId ?? "").trim(),
      descripcion: String(payload?.descripcion ?? "").trim(),
    };
    const response = await apiClient.post(this.baseURL, body);
    const u = this.unwrap(response?.data);
    return this.toResult(u, this.normalize(u.data), "Tipo de operación gratuita registrado correctamente");
  }

  async delete(tipoopegratuitaId: TipoOpeGratuitaId): Promise<ServiceResult<boolean>> {
    const id = String(tipoopegratuitaId ?? "").trim();
    const response = await apiClient.delete(`${this.baseURL}/${encodeURIComponent(id)}`);
    const u = this.unwrap(response?.data);
    return this.toResult(u, true, "Tipo de operación gratuita eliminado correctamente");
  }
}

const tipoOpeGratuitaService = new TipoOpeGratuitaService();
export default tipoOpeGratuitaService;