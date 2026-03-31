import apiClient from "../api/apiCliente";
import type {
  CondicionPago,
  CondicionPagoCreateDto,
  CondicionPagoForm,
  CondicionPagoId,
  CondicionPagoUpdateDto,
  ServiceResult,
} from "@/types/condicionpago.types";

type AnyObj = Record<string, any>;

class CondicionPagoService {
  private readonly baseURL = "/CondicionPago";

  private isObject(value: any): value is AnyObj {
    return value !== null && typeof value === "object";
  }

  private unwrap(payload: any) {
    if (this.isObject(payload) && ("data" in payload || "isSuccess" in payload || "success" in payload || "status" in payload)) {
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

  private toId(value: any): string {
    return String(value ?? "").trim();
  }

  private normalize(item: any): CondicionPago {
    const raw = this.isObject(item) ? item : {};
    const id = this.toId(raw.condicionPagoId ?? raw.condicion_pago ?? raw.id);
    return {
      ...raw,
      condicionPagoId: id || undefined,
      condicion_pago: this.toId(raw.condicion_pago ?? id),
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

  async getAll(): Promise<CondicionPago[]> {
    const response = await apiClient.get(this.baseURL);
    const u = this.unwrap(response?.data);
    if (Array.isArray(u.data)) return u.data.map((x: any) => this.normalize(x));
    return [];
  }

  async getById(condicionPagoId: CondicionPagoId): Promise<CondicionPago | null> {
    const id = this.toId(condicionPagoId);
    if (!id) return null;
    const response = await apiClient.get(`${this.baseURL}/${encodeURIComponent(id)}`);
    const u = this.unwrap(response?.data);
    if (!u.data) return null;
    return this.normalize(u.data);
  }

  async create(payload: CondicionPagoForm | CondicionPagoCreateDto): Promise<ServiceResult<CondicionPago>> {
    const body: CondicionPagoCreateDto = {
      condicion_pago: String(payload?.condicion_pago ?? "").trim(),
      descripcion: String(payload?.descripcion ?? "").trim(),
    };

    const response = await apiClient.post(this.baseURL, body);
    const u = this.unwrap(response?.data);
    const model = this.normalize(u.data);

    return this.toResult(u, model, "Condición de pago registrada correctamente");
  }

  async update(condicionPagoId: CondicionPagoId, payload: CondicionPagoUpdateDto | CondicionPagoForm): Promise<ServiceResult<CondicionPago>> {
    const id = this.toId(condicionPagoId);
    const body: CondicionPagoUpdateDto = {
      descripcion: String(payload?.descripcion ?? "").trim(),
    };

    const response = await apiClient.put(`${this.baseURL}/${encodeURIComponent(id)}`, body);
    const u = this.unwrap(response?.data);
    const model = this.normalize(u.data);

    return this.toResult(u, model, "Condición de pago actualizada correctamente");
  }

  async delete(condicionPagoId: CondicionPagoId): Promise<ServiceResult<boolean>> {
    const id = this.toId(condicionPagoId);
    const response = await apiClient.delete(`${this.baseURL}/${encodeURIComponent(id)}`);
    const u = this.unwrap(response?.data);
    return this.toResult(u, true, "Condición de pago eliminada correctamente");
  }
}

const condicionPagoService = new CondicionPagoService();
export default condicionPagoService;
