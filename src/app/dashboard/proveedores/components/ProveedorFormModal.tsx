"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import proveedorService from "../../../../services/proveedoresService";
import clienteService from "@/services/clienteService";
import Modal from "@/components/ui/Modal";
import ExternalSearchInput, { type SearchType } from "@/components/forms/ExternalSearchInput";
import { IconDeviceFloppy, IconX, IconLoader } from "@tabler/icons-react";
import { toast } from "sonner";
import type { Proveedor, FormDropdowns, UbigeoOption } from "../../../../types/proveedores.types";
import { EMPRESA_ID, TENANT_ID as GLOBAL_TENANT_ID } from "@/config/globals";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proveedorToEdit: Proveedor | null;
  onSuccess: () => void;
}

type FormState = {
  tipoproveedorId: string;
  claseproveedorId: string;
  descripcion: string;
  docidentId: string;
  num_docident: string;
  direccion: string;
  telefono_fijo: string;
  telefono_fijo2: string;
  telefono_movil: string;
  telefono_movil2: string;
  fecha_nacimiento: string;
  email: string;
  website: string;
  ubidst: string;
  estado: boolean;
  tenantId: number;
};

type UbigeoState = {
  selectedPais: string;
  selectedDepartamento: string;
  selectedProvincia: string;
  selectedDistrito: string;
};

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const FormInput = ({ label, value, onChange, ...props }: FormInputProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <input
      className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
      value={value}
      onChange={onChange}
      {...props}
    />
  </div>
);

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options?: Array<{ key: string | number; value: string }>;
  disabled?: boolean;
  required?: boolean;
}

const FormSelect = ({ label, options, value, onChange, ...props }: FormSelectProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <select
      className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
      value={value}
      onChange={onChange}
      {...props}
    >
      <option value="">Seleccionar...</option>
      {options?.map((opt) => (
        <option key={String(opt.key)} value={String(opt.key)}>
          {opt.value}
        </option>
      ))}
    </select>
  </div>
);

const cleanText = (v: any) => String(v ?? "").replace(/\s+/g, " ").trim();

const normalize = (v: any) =>
  cleanText(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const firstNonEmpty = (...vals: any[]) => {
  for (const v of vals) {
    const t = cleanText(v);
    if (t) return t;
  }
  return "";
};

const toInputDate = (v: any) => {
  const t = cleanText(v);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "";
};

const findOptionKey = (
  options: UbigeoOption[],
  keyCandidates: string[] = [],
  nameCandidates: string[] = []
) => {
  const validKeys = keyCandidates.map(cleanText).filter(Boolean);
  const validNames = nameCandidates.map(normalize).filter(Boolean);

  for (const k of validKeys) {
    const hit = options.find((o: any) => cleanText(o?.key) === k);
    if (hit) return cleanText((hit as any).key);
  }

  for (const n of validNames) {
    const hit = options.find((o: any) => normalize((o as any)?.value) === n);
    if (hit) return cleanText((hit as any).key);
  }

  return "";
};

const getSearchTypeByDoc = (docidentId: string): SearchType => {
  const d = cleanText(docidentId).toUpperCase();
  if (d.includes("RUC")) return "RUC";
  if (d.includes("CEX") || d.includes("CE") || d.includes("CARNET")) return "CARNET";
  return "DNI";
};

export default function ProveedorFormModal({
  isOpen,
  onClose,
  proveedorToEdit,
  onSuccess,
}: Props) {
  const TENANT_ID = Number(GLOBAL_TENANT_ID);

  const [catalogs, setCatalogs] = useState<FormDropdowns | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paisesOptions, setPaisesOptions] = useState<UbigeoOption[]>([]);
  const [departamentosOptions, setDepartamentosOptions] = useState<UbigeoOption[]>([]);
  const [provinciasOptions, setProvinciasOptions] = useState<UbigeoOption[]>([]);
  const [distritosOptions, setDistritosOptions] = useState<UbigeoOption[]>([]);

  const getInitialState = (): FormState => ({
    tipoproveedorId: proveedorToEdit?.tipoproveedorId || "",
    claseproveedorId: proveedorToEdit?.claseproveedorId || "",
    descripcion: proveedorToEdit?.descripcion || "",
    docidentId: proveedorToEdit?.docidentId || "",
    num_docident: proveedorToEdit?.num_docident || "",
    direccion: proveedorToEdit?.direccion || "",
    telefono_fijo: proveedorToEdit?.telefono_fijo || "",
    telefono_fijo2: proveedorToEdit?.telefono_fijo2 || "",
    telefono_movil: proveedorToEdit?.telefono_movil || "",
    telefono_movil2: proveedorToEdit?.telefono_movil2 || "",
    fecha_nacimiento: proveedorToEdit?.fecha_nacimiento || "",
    email: proveedorToEdit?.email || "",
    website: proveedorToEdit?.website || "",
    ubidst: proveedorToEdit?.ubidst || "",
    estado: proveedorToEdit?.estado ?? true,
    tenantId: proveedorToEdit?.tenantId || TENANT_ID,
  });

  const getInitialUbigeoState = (): UbigeoState => ({
    selectedPais: proveedorToEdit?.ubigeo?.ubipan || "",
    selectedDepartamento: proveedorToEdit?.ubigeo?.ubiden || "",
    selectedProvincia: proveedorToEdit?.ubigeo?.ubiprn || "",
    selectedDistrito: proveedorToEdit?.ubidst || "",
  });

  const [form, setForm] = useState<FormState>(getInitialState());
  const [ubigeoState, setUbigeoState] = useState<UbigeoState>(getInitialUbigeoState());

  const isEdit = Boolean(proveedorToEdit?.proveedorId);
  const isReadOnly = proveedorToEdit?.estado === false;

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialState());
      setUbigeoState(getInitialUbigeoState());
    }
  }, [isOpen, proveedorToEdit?.proveedorId]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    proveedorService
      .getFormDropdowns()
      .then((res) => setCatalogs(res))
      .catch(() => toast.error("Error al cargar opciones del formulario"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    clienteService.ubigeo
      .getPaises()
      .then((paises) => setPaisesOptions(paises))
      .catch((err) => console.error("Error cargando países:", err));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !proveedorToEdit || !ubigeoState.selectedPais) return;
    clienteService.ubigeo
      .getDepartamentos(ubigeoState.selectedPais)
      .then((deps) => setDepartamentosOptions(deps))
      .catch((err) => console.error("Error cargando departamentos:", err));
  }, [isOpen, proveedorToEdit, ubigeoState.selectedPais]);

  useEffect(() => {
    if (!isOpen || !proveedorToEdit || !ubigeoState.selectedDepartamento) return;
    clienteService.ubigeo
      .getProvincias(ubigeoState.selectedDepartamento)
      .then((provs) => setProvinciasOptions(provs))
      .catch((err) => console.error("Error cargando provincias:", err));
  }, [isOpen, proveedorToEdit, ubigeoState.selectedDepartamento]);

  useEffect(() => {
    if (!isOpen || !proveedorToEdit || !ubigeoState.selectedProvincia) return;
    clienteService.ubigeo
      .getDistritos(ubigeoState.selectedProvincia)
      .then((dists) => setDistritosOptions(dists))
      .catch((err) => console.error("Error cargando distritos:", err));
  }, [isOpen, proveedorToEdit, ubigeoState.selectedProvincia]);

  const handleChange = useCallback(
    (field: keyof FormState) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const handlePaisChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    const pais = e.target.value;
    setUbigeoState({
      selectedPais: pais,
      selectedDepartamento: "",
      selectedProvincia: "",
      selectedDistrito: "",
    });
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setDepartamentosOptions([]);
    setProvinciasOptions([]);
    setDistritosOptions([]);

    if (pais) {
      try {
        const departamentos = await clienteService.ubigeo.getDepartamentos(pais);
        setDepartamentosOptions(departamentos);
      } catch (err) {
        console.error("Error cargando departamentos:", err);
      }
    }
  }, []);

  const handleDepartamentoChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    const departamento = e.target.value;
    setUbigeoState((prev) => ({
      ...prev,
      selectedDepartamento: departamento,
      selectedProvincia: "",
      selectedDistrito: "",
    }));
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setProvinciasOptions([]);
    setDistritosOptions([]);

    if (departamento) {
      try {
        const provincias = await clienteService.ubigeo.getProvincias(departamento);
        setProvinciasOptions(provincias);
      } catch (err) {
        console.error("Error cargando provincias:", err);
      }
    }
  }, []);

  const handleProvinciaChange = useCallback(async (e: ChangeEvent<HTMLSelectElement>) => {
    const provincia = e.target.value;
    setUbigeoState((prev) => ({
      ...prev,
      selectedProvincia: provincia,
      selectedDistrito: "",
    }));
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setDistritosOptions([]);

    if (provincia) {
      try {
        const distritos = await clienteService.ubigeo.getDistritos(provincia);
        setDistritosOptions(distritos);
      } catch (err) {
        console.error("Error cargando distritos:", err);
      }
    }
  }, []);

  const handleDistritoChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const distrito = e.target.value;
    setUbigeoState((prev) => ({ ...prev, selectedDistrito: distrito }));
    setForm((prev) => ({ ...prev, ubidst: distrito }));
  }, []);

  const hydrateUbigeoFromExternal = useCallback(
    async (params: {
      ubigeoId?: string;
      ubigeoArray?: string[];
      departamento?: string;
      provincia?: string;
      distrito?: string;
    }) => {
      const ub6 = cleanText(firstNonEmpty(params.ubigeoArray?.[2], params.ubigeoId));
      const dep2 = cleanText(firstNonEmpty(params.ubigeoArray?.[0], ub6.slice(0, 2)));
      const prov4 = cleanText(firstNonEmpty(params.ubigeoArray?.[1], ub6.slice(0, 4)));
      const dist6 = cleanText(firstNonEmpty(params.ubigeoArray?.[2], ub6));

      const paises = await clienteService.ubigeo.getPaises();
      setPaisesOptions(paises);

      const paisKey =
        findOptionKey(paises, ["PE", "PERU", "51"], ["PERU"]) ||
        cleanText((paises[0] as any)?.key);

      const departamentos = paisKey ? await clienteService.ubigeo.getDepartamentos(paisKey) : [];
      setDepartamentosOptions(departamentos);

      const departamentoKey =
        findOptionKey(
          departamentos,
          [dep2, prov4.slice(0, 2)],
          [params.departamento || ""]
        ) || "";

      const provincias = departamentoKey
        ? await clienteService.ubigeo.getProvincias(departamentoKey)
        : [];
      setProvinciasOptions(provincias);

      const provinciaKey =
        findOptionKey(provincias, [prov4], [params.provincia || ""]) || "";

      const distritos = provinciaKey
        ? await clienteService.ubigeo.getDistritos(provinciaKey)
        : [];
      setDistritosOptions(distritos);

      const distritoKey =
        findOptionKey(distritos, [dist6], [params.distrito || ""]) || dist6;

      setUbigeoState({
        selectedPais: paisKey,
        selectedDepartamento: departamentoKey,
        selectedProvincia: provinciaKey,
        selectedDistrito: distritoKey,
      });

      setForm((prev) => ({
        ...prev,
        ubidst: distritoKey || prev.ubidst,
      }));
    },
    []
  );

  const handleExternalSearchSuccess = useCallback(
    async (raw: any) => {
      const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;

      const numeroDocumento = firstNonEmpty(
        data?.numero,
        data?.numero_documento,
        data?.numeroDocumento,
        data?.dni,
        data?.ruc,
        data?.ce,
        data?.nro_documento
      );

      const descripcion = firstNonEmpty(
        data?.nombre_o_razon_social,
        data?.nombreORazonSocial,
        data?.razon_social,
        data?.razonSocial,
        [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(" "),
        [data?.nombres, data?.apellido_paterno, data?.apellido_materno].filter(Boolean).join(" "),
        data?.nombreCompleto,
        data?.nombre_completo
      );

      const direccion = firstNonEmpty(
        data?.direccionCompleta,
        data?.direccion_completa,
        data?.domicilio_fiscal,
        data?.domicilioFiscal,
        data?.direccion,
        data?.domicilio
      );

      const fechaNacimiento = toInputDate(
        firstNonEmpty(data?.fechaNacimiento, data?.fecha_nacimiento, data?.fecha_nac)
      );

      setForm((prev) => ({
        ...prev,
        num_docident: numeroDocumento || prev.num_docident,
        descripcion: descripcion || prev.descripcion,
        direccion: direccion || prev.direccion,
        fecha_nacimiento: fechaNacimiento || prev.fecha_nacimiento,
      }));

      const ubigeoId = firstNonEmpty(
        data?.ubigeoSunat,
        data?.ubigeoReniec,
        data?.ubigeoId,
        data?.ubigeo_id
      );

      const ubigeoArray = Array.isArray(data?.ubigeo)
        ? data.ubigeo.map((x: any) => cleanText(x)).filter(Boolean)
        : [];

      if (ubigeoId || ubigeoArray.length > 0) {
        try {
          await hydrateUbigeoFromExternal({
            ubigeoId,
            ubigeoArray,
            departamento: data?.departamento,
            provincia: data?.provincia,
            distrito: data?.distrito,
          });
        } catch {
          const distFallback = firstNonEmpty(ubigeoArray?.[2], ubigeoId);
          if (distFallback) {
            setForm((prev) => ({ ...prev, ubidst: distFallback }));
            setUbigeoState((prev) => ({ ...prev, selectedDistrito: distFallback }));
          }
        }
      }
    },
    [hydrateUbigeoFromExternal]
  );

  const validate = () => {
    if (!form.descripcion.trim()) return "El nombre del proveedor es requerido";
    if (!form.docidentId.trim()) return "El tipo de documento es requerido";
    if (!form.num_docident.trim()) return "El número de documento es requerido";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Email no válido";
    }
    return null;
  };

  const cleanFormData = (data: FormState): Record<string, any> => ({
    tipoproveedorId: data.tipoproveedorId,
    claseproveedorId: data.claseproveedorId ? parseInt(data.claseproveedorId, 10) : null,
    descripcion: data.descripcion.trim(),
    docidentId: data.docidentId,
    numeroDoc: data.num_docident.trim(),
    direccion: data.direccion.trim() || "",
    telefonoFijo: data.telefono_fijo.trim() || "",
    telefonoFijo2: data.telefono_fijo2.trim() || "",
    telefonoMovil: data.telefono_movil.trim() || "",
    telefonoMovil2: data.telefono_movil2.trim() || "",
    fechaNacimiento: data.fecha_nacimiento || null,
    email: data.email.trim() || "",
    website: data.website.trim() || "",
    ubidst: data.ubidst || "",
    estado: data.estado,
    tenantId: String(data.tenantId || TENANT_ID),
  });

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    setSaving(true);
    try {
      const cleanedData = cleanFormData(form);

      if (isEdit && proveedorToEdit?.proveedorId) {
        await proveedorService.update(proveedorToEdit.proveedorId, cleanedData);
        toast.success("Proveedor actualizado correctamente");
      } else {
        await proveedorService.create(cleanedData);
        toast.success("Proveedor creado correctamente");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error al guardar proveedor:", error);
      toast.error(error?.message || "Error al guardar el proveedor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isReadOnly
          ? "Detalle Proveedor (Solo Lectura)"
          : isEdit
          ? "Editar Proveedor"
          : "Nuevo Proveedor"
      }
      size="xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <IconLoader className="animate-spin text-purple-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando formulario...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Tipo de Proveedor"
                options={catalogs?.tipo_proveedor}
                value={form.tipoproveedorId}
                onChange={handleChange("tipoproveedorId") as (e: ChangeEvent<HTMLSelectElement>) => void}
                required
                disabled={isReadOnly}
              />

              <FormSelect
                label="Clase de Proveedor"
                options={catalogs?.clase_proveedor}
                value={form.claseproveedorId}
                onChange={handleChange("claseproveedorId") as (e: ChangeEvent<HTMLSelectElement>) => void}
                required
                disabled={isReadOnly}
              />

              <div className="md:col-span-2">
                <FormInput
                  label="Razón Social / Nombre"
                  value={form.descripcion}
                  onChange={handleChange("descripcion") as (e: ChangeEvent<HTMLInputElement>) => void}
                  placeholder="Ingrese el nombre del proveedor"
                  required
                  disabled={isReadOnly}
                />
              </div>

              <FormSelect
                label="Tipo de Documento"
                options={catalogs?.documento_identidad}
                value={form.docidentId}
                onChange={handleChange("docidentId") as (e: ChangeEvent<HTMLSelectElement>) => void}
                required
                disabled={isReadOnly}
              />

              <ExternalSearchInput
                label="Número de Documento"
                name="num_docident"
                value={form.num_docident}
                onChange={handleChange("num_docident") as any}
                onSuccess={handleExternalSearchSuccess}
                type={getSearchTypeByDoc(form.docidentId)}
                empresaId={EMPRESA_ID}
                required
                disabled={isReadOnly}
                placeholder="Ej: 20123456789 / 12345678"
              />

              <FormInput
                label="Fecha de Nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={handleChange("fecha_nacimiento") as (e: ChangeEvent<HTMLInputElement>) => void}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Información de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange("email") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="ejemplo@empresa.com"
                disabled={isReadOnly}
              />

              <FormInput
                label="Sitio Web"
                value={form.website}
                onChange={handleChange("website") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="www.ejemplo.com"
                disabled={isReadOnly}
              />

              <FormInput
                label="Teléfono Fijo"
                value={form.telefono_fijo}
                onChange={handleChange("telefono_fijo") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="(01) 1234567"
                disabled={isReadOnly}
              />

              <FormInput
                label="Teléfono Fijo 2"
                value={form.telefono_fijo2}
                onChange={handleChange("telefono_fijo2") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="(01) 7654321"
                disabled={isReadOnly}
              />

              <FormInput
                label="Teléfono Móvil"
                value={form.telefono_movil}
                onChange={handleChange("telefono_movil") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="999999999"
                disabled={isReadOnly}
              />

              <FormInput
                label="Teléfono Móvil 2"
                value={form.telefono_movil2}
                onChange={handleChange("telefono_movil2") as (e: ChangeEvent<HTMLInputElement>) => void}
                placeholder="988888888"
                disabled={isReadOnly}
              />

              <div className="md:col-span-2">
                <FormInput
                  label="Dirección"
                  value={form.direccion}
                  onChange={handleChange("direccion") as (e: ChangeEvent<HTMLInputElement>) => void}
                  placeholder="Av. / Jr. / Calle..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Ubicación Geográfica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="País"
                options={paisesOptions as any}
                value={ubigeoState.selectedPais}
                onChange={handlePaisChange}
                disabled={isReadOnly}
              />

              <FormSelect
                label="Departamento"
                options={departamentosOptions as any}
                value={ubigeoState.selectedDepartamento}
                onChange={handleDepartamentoChange}
                disabled={isReadOnly || !ubigeoState.selectedPais}
              />

              <FormSelect
                label="Provincia"
                options={provinciasOptions as any}
                value={ubigeoState.selectedProvincia}
                onChange={handleProvinciaChange}
                disabled={isReadOnly || !ubigeoState.selectedDepartamento}
              />

              <FormSelect
                label="Distrito"
                options={distritosOptions as any}
                value={ubigeoState.selectedDistrito}
                onChange={handleDistritoChange}
                disabled={isReadOnly || !ubigeoState.selectedProvincia}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-2"
                disabled={saving}
              >
                <IconX size={18} />
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? <IconLoader className="animate-spin" size={18} /> : <IconDeviceFloppy size={18} />}
                {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Registrar Proveedor"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
