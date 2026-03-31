"use client";

import { useEffect, useState, useCallback, ChangeEvent, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import {
  IconDeviceFloppy,
  IconLoader,
  IconPlus,
  IconTrash,
  IconBuilding,
  IconSearch,
  IconX,
  IconCheck,
  IconMapPin,
} from "@tabler/icons-react";
import clienteService from "@/services/clienteService";
import type {
  Cliente,
  DireccionExtra,
  FormDropdowns,
  UbigeoOption,
} from "@/types/cliente.types";
import SearchableSelect from "@/components/forms/SearchableSelect";
import ExternalSearchInput, {
  type SearchType,
} from "@/components/forms/ExternalSearchInput";

// ─────────────────────────────────────────────────────────────────────────────
//  TIPOS LOCALES
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteToEdit?: Cliente | null;
  tenantId?: string;
}

type FormState = {
  tenantId: string;
  descripcion: string;
  docidentId: string;
  num_docident: string;
  direccion: string;
  telefono_fijo: string;
  telefono_fijo2: string;
  telefono_movil: string;
  telefono_movil2: string;
  email: string;
  tipoclienteId: string;
  sexo: string;
  fecha_nac: string;
  estado_civil: string;
  website: string;
  ubidst: string;
  codigo_RepresentanteLegal: string;
  agente_retencion: string;
  Origen: string;
  estado: boolean;
};

type UbigeoState = {
  selectedPais: string;
  selectedDepartamento: string;
  selectedProvincia: string;
  selectedDistrito: string;
};

type SelectLikeEvent = { target: { value: string; name?: string } };

/** Fila editable de dirección extra — ubidstLabel es solo visual */
type DireccionExtraForm = {
  _tempId: string;
  direccion: string;
  ubidst: string;
  ubidstLabel: string; // "LIMA / LIMA / COMAS" para mostrar en la fila
};

type ActiveTab = "datos" | "direcciones";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

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

const findOptionKey = (
  options: UbigeoOption[],
  keyCandidates: string[] = [],
  nameCandidates: string[] = []
) => {
  const validKeys  = keyCandidates.map(cleanText).filter(Boolean);
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
  const d = String(docidentId || "").toUpperCase();
  if (d.includes("RUC")) return "RUC";
  if (d.includes("CEX") || d.includes("CARNET") || d === "CE") return "CARNET";
  return "DNI";
};

const toSexoMOrF = (sexo: string) => {
  const s = cleanText(sexo).toUpperCase();
  if (!s) return "";
  if (s.startsWith("M")) return "M";
  if (s.startsWith("F")) return "F";
  return "";
};

const normalizeOptions = (
  options?: Array<{ key: string | number; value: string }>
): Array<{ key: string | number; value: string }> => {
  if (!Array.isArray(options)) return [];
  return options.map((o) => ({ key: o?.key ?? "", value: String(o?.value ?? "") }));
};

const emptyDireccion = (): DireccionExtraForm => ({
  _tempId:     genId(),
  direccion:   "",
  ubidst:      "",
  ubidstLabel: "",
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUBCOMPONENTE: FormInput
// ─────────────────────────────────────────────────────────────────────────────

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  noUppercase?: boolean;
}

const FormInput = ({
  label,
  value,
  onChange,
  noUppercase = false,
  ...props
}: FormInputProps) => (
  <div>
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <input
      className={`mt-1 w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all ${
        noUppercase ? "" : "uppercase"
      }`}
      value={value}
      onChange={onChange}
      {...props}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  SUBCOMPONENTE: UbigeoPickerModal
//  Popup cascading País → Departamento → Provincia → Distrito
// ─────────────────────────────────────────────────────────────────────────────

interface UbigeoPickerResult {
  ubidst: string;       // código de 6 chars
  label:  string;       // "LIMA / LIMA / COMAS"
}

interface UbigeoPickerModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onConfirm: (result: UbigeoPickerResult) => void;
  initialUbidst?: string;
}

function UbigeoPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialUbidst = "",
}: UbigeoPickerModalProps) {
  const [paisesOpts,        setPaisesOpts]        = useState<UbigeoOption[]>([]);
  const [depOpts,           setDepOpts]           = useState<UbigeoOption[]>([]);
  const [provOpts,          setProvOpts]          = useState<UbigeoOption[]>([]);
  const [distOpts,          setDistOpts]          = useState<UbigeoOption[]>([]);

  const [selPais, setSelPais]   = useState("");
  const [selDep,  setSelDep]   = useState("");
  const [selProv, setSelProv]  = useState("");
  const [selDist, setSelDist]  = useState("");

  const [loadingPais, setLoadingPais] = useState(false);
  const [loadingDep,  setLoadingDep]  = useState(false);
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);

  // Reset y carga inicial al abrir
  useEffect(() => {
    if (!isOpen) return;
    setSelPais(""); setSelDep(""); setSelProv(""); setSelDist("");
    setDepOpts([]); setProvOpts([]); setDistOpts([]);
    setLoadingPais(true);
    clienteService.ubigeo.getPaises()
      .then(setPaisesOpts)
      .catch(console.error)
      .finally(() => setLoadingPais(false));
  }, [isOpen]);

  const handlePaisChange = async (e: SelectLikeEvent) => {
    const v = e.target.value;
    setSelPais(v); setSelDep(""); setSelProv(""); setSelDist("");
    setDepOpts([]); setProvOpts([]); setDistOpts([]);
    if (!v) return;
    setLoadingDep(true);
    try { setDepOpts(await clienteService.ubigeo.getDepartamentos(v)); } catch { /**/ }
    finally { setLoadingDep(false); }
  };

  const handleDepChange = async (e: SelectLikeEvent) => {
    const v = e.target.value;
    setSelDep(v); setSelProv(""); setSelDist("");
    setProvOpts([]); setDistOpts([]);
    if (!v) return;
    setLoadingProv(true);
    try { setProvOpts(await clienteService.ubigeo.getProvincias(v)); } catch { /**/ }
    finally { setLoadingProv(false); }
  };

  const handleProvChange = async (e: SelectLikeEvent) => {
    const v = e.target.value;
    setSelProv(v); setSelDist("");
    setDistOpts([]);
    if (!v) return;
    setLoadingDist(true);
    try { setDistOpts(await clienteService.ubigeo.getDistritos(v)); } catch { /**/ }
    finally { setLoadingDist(false); }
  };

  const handleDistChange = (e: SelectLikeEvent) => setSelDist(e.target.value);

  const handleConfirm = () => {
    if (!selDist) { toast.error("Seleccione el distrito"); return; }
    const depLabel  = depOpts.find((o: any)  => cleanText(o.key) === selDep)?.value  ?? selDep;
    const provLabel = provOpts.find((o: any) => cleanText(o.key) === selProv)?.value ?? selProv;
    const distLabel = distOpts.find((o: any) => cleanText(o.key) === selDist)?.value ?? selDist;
    onConfirm({
      ubidst: selDist,
      label:  [depLabel, provLabel, distLabel].filter(Boolean).join(" / ").toUpperCase(),
    });
    onClose();
  };

  const UbigeoSelect = ({
    label,
    value,
    options,
    onChange,
    disabled,
    loading,
    placeholder,
  }: {
    label: string;
    value: string;
    options: UbigeoOption[];
    onChange: (e: SelectLikeEvent) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder: string;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
        {label}
        {loading && <IconLoader size={11} className="animate-spin text-blue-500" />}
      </label>
      <select
        value={value}
        onChange={onChange as any}
        disabled={disabled || loading}
        className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400 transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map((o: any) => (
          <option key={o.key} value={o.key}>{o.value}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Ubigeo"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Seleccione el ubigeo correspondiente a la dirección adicional.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UbigeoSelect
            label="País"
            value={selPais}
            options={paisesOpts}
            onChange={handlePaisChange}
            loading={loadingPais}
            placeholder="Seleccionar país..."
          />
          <UbigeoSelect
            label="Departamento"
            value={selDep}
            options={depOpts}
            onChange={handleDepChange}
            disabled={!selPais}
            loading={loadingDep}
            placeholder="Seleccionar departamento..."
          />
          <UbigeoSelect
            label="Provincia"
            value={selProv}
            options={provOpts}
            onChange={handleProvChange}
            disabled={!selDep}
            loading={loadingProv}
            placeholder="Seleccionar provincia..."
          />
          <UbigeoSelect
            label="Distrito"
            value={selDist}
            options={distOpts}
            onChange={handleDistChange}
            disabled={!selProv}
            loading={loadingDist}
            placeholder="Seleccionar distrito..."
          />
        </div>

        {/* Preview selección */}
        {selDist && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
            <IconMapPin size={14} className="text-blue-500 shrink-0" />
            <span className="text-xs font-bold text-blue-700 uppercase">
              {[
                depOpts.find((o: any)  => cleanText(o.key) === selDep)?.value,
                provOpts.find((o: any) => cleanText(o.key) === selProv)?.value,
                distOpts.find((o: any) => cleanText(o.key) === selDist)?.value,
              ].filter(Boolean).join(" / ")}
            </span>
            <span className="ml-auto text-[10px] font-mono text-blue-400">{selDist}</span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selDist}
            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconCheck size={16} />
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL: ClienteFormModal
// ─────────────────────────────────────────────────────────────────────────────

export default function ClienteFormModal({
  isOpen,
  onClose,
  onSuccess,
  clienteToEdit,
  tenantId,
}: Props) {
  const EMPRESA_ID = "005";
  const [loading,   setLoading]   = useState(false);
  const [catalogs,  setCatalogs]  = useState<FormDropdowns | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("datos");

  const [paisesOptions,        setPaisesOptions]        = useState<UbigeoOption[]>([]);
  const [departamentosOptions, setDepartamentosOptions] = useState<UbigeoOption[]>([]);
  const [provinciasOptions,    setProvinciasOptions]    = useState<UbigeoOption[]>([]);
  const [distritosOptions,     setDistritosOptions]     = useState<UbigeoOption[]>([]);

  const [direccionesExtras, setDireccionesExtras] = useState<DireccionExtraForm[]>([
    emptyDireccion(),
  ]);
  const [empresasAsociadas, setEmpresasAsociadas] = useState<Cliente[]>([]);

  // ── Ubigeo picker para direcciones extra ────────────────────────────────
  const [ubigeoPickerOpen,      setUbigeoPickerOpen]      = useState(false);
  const [ubigeoPickerTargetId,  setUbigeoPickerTargetId]  = useState<string | null>(null);

  // ── Búsqueda inline de empresas ─────────────────────────────────────────
  const [empresaSearch,        setEmpresaSearch]        = useState("");
  const [empresaResults,       setEmpresaResults]       = useState<Cliente[]>([]);
  const [loadingEmpresaSearch, setLoadingEmpresaSearch] = useState(false);
  const empresaDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────

  const getInitialState = (): FormState => {
    const tenant = clienteToEdit?.tenantId || tenantId || "1";
    return {
      tenantId:     String(tenant),
      descripcion:  clienteToEdit?.descripcion  || "",
      docidentId:   clienteToEdit?.docidentId   || "RUC",
      num_docident: clienteToEdit?.num_docident || "",
      direccion:    clienteToEdit?.direccion    || "",
      telefono_fijo:   clienteToEdit?.telefono_fijo   || "",
      telefono_fijo2:  clienteToEdit?.telefono_fijo2  || "",
      telefono_movil:  clienteToEdit?.telefono_movil  || "",
      telefono_movil2: clienteToEdit?.telefono_movil2 || "",
      email:        clienteToEdit?.email        || "",
      tipoclienteId: clienteToEdit?.tipoclienteId || "",
      sexo:         clienteToEdit?.sexo         || "",
      fecha_nac:    clienteToEdit?.fecha_nac    || "",
      estado_civil: clienteToEdit?.estado_civil || "",
      website:      clienteToEdit?.website      || "",
      ubidst:       clienteToEdit?.ubidst       || "",
      codigo_RepresentanteLegal: clienteToEdit?.codigo_RepresentanteLegal || "",
      agente_retencion: clienteToEdit?.agente_retencion || "",
      Origen: clienteToEdit?.Origen || "",
      estado: clienteToEdit?.estado ?? true,
    };
  };

  const getInitialUbigeoState = (): UbigeoState => ({
    selectedPais:         clienteToEdit?.ubigeo?.ubipan || "",
    selectedDepartamento: clienteToEdit?.ubigeo?.ubiden || "",
    selectedProvincia:    clienteToEdit?.ubigeo?.ubiprn || "",
    selectedDistrito:     clienteToEdit?.ubidst         || "",
  });

  const [form,        setForm]        = useState<FormState>(getInitialState());
  const [ubigeoState, setUbigeoState] = useState<UbigeoState>(getInitialUbigeoState());

  // ── Reset al abrir ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("datos");
    setForm(getInitialState());
    setUbigeoState(getInitialUbigeoState());
    const extrasFromEdit = clienteToEdit?.direccionesExtras;
    setDireccionesExtras(
      extrasFromEdit && extrasFromEdit.length > 0
        ? extrasFromEdit.map((d) => ({
            _tempId:     genId(),
            direccion:   d.direccion || "",
            ubidst:      d.ubidst    || "",
            ubidstLabel: d.ubidst    || "",   // sin label previo, mostramos el código
          }))
        : [emptyDireccion()]
    );
    setEmpresasAsociadas([]);
    setEmpresaSearch("");
    setEmpresaResults([]);
  }, [isOpen, clienteToEdit?.clienteId]);

  // Precarga de resultados al entrar al tab de direcciones
  useEffect(() => {
    if (activeTab === "direcciones" && empresaResults.length === 0) {
      fetchEmpresaSearch("", true);
    }
  }, [activeTab]);

  // ── Catálogos ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    clienteService
      .getFormDropdowns()
      .then((res) => setCatalogs(res))
      .catch(() => toast.error("Error al cargar opciones del formulario"));
  }, [isOpen]);

  // ── Ubigeo cascading (tab Datos Básicos) ────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    clienteService.ubigeo.getPaises().then(setPaisesOptions).catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !clienteToEdit || !ubigeoState.selectedPais) return;
    clienteService.ubigeo.getDepartamentos(ubigeoState.selectedPais).then(setDepartamentosOptions).catch(console.error);
  }, [isOpen, clienteToEdit, ubigeoState.selectedPais]);

  useEffect(() => {
    if (!isOpen || !clienteToEdit || !ubigeoState.selectedDepartamento) return;
    clienteService.ubigeo.getProvincias(ubigeoState.selectedDepartamento).then(setProvinciasOptions).catch(console.error);
  }, [isOpen, clienteToEdit, ubigeoState.selectedDepartamento]);

  useEffect(() => {
    if (!isOpen || !clienteToEdit || !ubigeoState.selectedProvincia) return;
    clienteService.ubigeo.getDistritos(ubigeoState.selectedProvincia).then(setDistritosOptions).catch(console.error);
  }, [isOpen, clienteToEdit, ubigeoState.selectedProvincia]);

  const isEdit     = Boolean(clienteToEdit?.clienteId);
  const isReadOnly = clienteToEdit?.estado === false;
  const isDNI      = getSearchTypeByDoc(form.docidentId) === "DNI";

  // Badge tab 2
  const tab2Badge =
    direccionesExtras.filter((d) => d.direccion.trim()).length +
    empresasAsociadas.length;

  // ── Búsqueda inline de empresas ─────────────────────────────────────────

  const fetchEmpresaSearch = async (text: string, isInit = false) => {
    setLoadingEmpresaSearch(true);
    try {
      const res = await clienteService.getAll(
        form.tenantId || tenantId || "1",
        1, 15, text,
        { docidentIds: ["RUC"], estado: true }
      );
      setEmpresaResults(res.data ?? []);
    } catch {
      if (!isInit) toast.error("Error al buscar empresas");
    } finally {
      setLoadingEmpresaSearch(false);
    }
  };

  const handleEmpresaSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmpresaSearch(val);
    if (empresaDebounceRef.current) clearTimeout(empresaDebounceRef.current);
    empresaDebounceRef.current = setTimeout(() => fetchEmpresaSearch(val), 400);
  };

  const handleEmpresaSearchSubmit = () => {
    if (empresaDebounceRef.current) clearTimeout(empresaDebounceRef.current);
    fetchEmpresaSearch(empresaSearch);
  };

  const addEmpresa = (c: Cliente) => {
    if (!c.clienteId) return;
    if (empresasAsociadas.some((e) => e.clienteId === c.clienteId)) return;
    setEmpresasAsociadas((prev) => [...prev, c]);
  };

  const removeEmpresa = (clienteId: string) =>
    setEmpresasAsociadas((prev) => prev.filter((e) => e.clienteId !== clienteId));

  // ── Handlers form ───────────────────────────────────────────────────────

  const handleChange = useCallback(
    (field: keyof FormState) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement> | SelectLikeEvent) => {
        setForm((prev) => ({ ...prev, [field]: String(e.target.value ?? "") }));
      },
    []
  );

  const handlePaisChange = useCallback(async (e: SelectLikeEvent) => {
    const pais = String(e.target.value ?? "");
    setUbigeoState({ selectedPais: pais, selectedDepartamento: "", selectedProvincia: "", selectedDistrito: "" });
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setDepartamentosOptions([]); setProvinciasOptions([]); setDistritosOptions([]);
    if (pais) {
      try { setDepartamentosOptions(await clienteService.ubigeo.getDepartamentos(pais)); } catch { /**/ }
    }
  }, []);

  const handleDepartamentoChange = useCallback(async (e: SelectLikeEvent) => {
    const departamento = String(e.target.value ?? "");
    setUbigeoState((prev) => ({ ...prev, selectedDepartamento: departamento, selectedProvincia: "", selectedDistrito: "" }));
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setProvinciasOptions([]); setDistritosOptions([]);
    if (departamento) {
      try { setProvinciasOptions(await clienteService.ubigeo.getProvincias(departamento)); } catch { /**/ }
    }
  }, []);

  const handleProvinciaChange = useCallback(async (e: SelectLikeEvent) => {
    const provincia = String(e.target.value ?? "");
    setUbigeoState((prev) => ({ ...prev, selectedProvincia: provincia, selectedDistrito: "" }));
    setForm((prev) => ({ ...prev, ubidst: "" }));
    setDistritosOptions([]);
    if (provincia) {
      try { setDistritosOptions(await clienteService.ubigeo.getDistritos(provincia)); } catch { /**/ }
    }
  }, []);

  const handleDistritoChange = useCallback((e: SelectLikeEvent) => {
    const distrito = String(e.target.value ?? "");
    setUbigeoState((prev) => ({ ...prev, selectedDistrito: distrito }));
    setForm((prev) => ({ ...prev, ubidst: distrito }));
  }, []);

  const hydrateUbigeoFromExternal = useCallback(
    async (params: {
      ubigeoId?: string; ubigeoArray?: string[];
      departamento?: string; provincia?: string; distrito?: string;
    }) => {
      const ub6   = cleanText(firstNonEmpty(params.ubigeoArray?.[2], params.ubigeoId));
      const dep2  = cleanText(firstNonEmpty(params.ubigeoArray?.[0], ub6.slice(0, 2)));
      const prov4 = cleanText(firstNonEmpty(params.ubigeoArray?.[1], ub6.slice(0, 4)));
      const dist6 = cleanText(firstNonEmpty(params.ubigeoArray?.[2], ub6));

      const paises = await clienteService.ubigeo.getPaises();
      setPaisesOptions(paises);
      const paisKey = findOptionKey(paises, ["PE", "PERU", "51"], ["PERU"]) || cleanText((paises[0] as any)?.key);

      const departamentos = paisKey ? await clienteService.ubigeo.getDepartamentos(paisKey) : [];
      setDepartamentosOptions(departamentos);
      const departamentoKey = findOptionKey(departamentos, [dep2, prov4.slice(0, 2)], [params.departamento || ""]) || "";

      const provincias = departamentoKey ? await clienteService.ubigeo.getProvincias(departamentoKey) : [];
      setProvinciasOptions(provincias);
      const provinciaKey = findOptionKey(provincias, [prov4], [params.provincia || ""]) || "";

      const distritos = provinciaKey ? await clienteService.ubigeo.getDistritos(provinciaKey) : [];
      setDistritosOptions(distritos);
      const distritoKey = findOptionKey(distritos, [dist6], [params.distrito || ""]) || dist6;

      setUbigeoState({ selectedPais: paisKey, selectedDepartamento: departamentoKey, selectedProvincia: provinciaKey, selectedDistrito: distritoKey });
      setForm((prev) => ({ ...prev, ubidst: distritoKey || prev.ubidst }));
    },
    []
  );

  const handleExternalSearchSuccess = useCallback(
    async (raw: any) => {
      const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
      const numeroDocumento = firstNonEmpty(data?.numero, data?.numero_documento, data?.numeroDocumento, data?.dni, data?.ruc, data?.ce, data?.nro_documento);
      const descripcion = firstNonEmpty(
        data?.nombre_o_razon_social, data?.nombreORazonSocial, data?.razon_social, data?.razonSocial, data?.nombreCompleto, data?.nombre_completo,
        [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(" "),
        [data?.nombres, data?.apellido_paterno, data?.apellido_materno].filter(Boolean).join(" ")
      );
      const direccion       = firstNonEmpty(data?.direccionCompleta, data?.direccion_completa, data?.domicilio_fiscal, data?.domicilioFiscal, data?.direccion, data?.domicilio);
      const sexo            = toSexoMOrF(data?.sexo || "");
      const fechaNacimiento = firstNonEmpty(data?.fechaNacimiento, data?.fecha_nac);

      setForm((prev) => ({
        ...prev,
        num_docident: numeroDocumento || prev.num_docident,
        descripcion:  descripcion     || prev.descripcion,
        direccion:    direccion        || prev.direccion,
        sexo:         sexo             || prev.sexo,
        fecha_nac:    fechaNacimiento  || prev.fecha_nac,
      }));

      const ubigeoId    = firstNonEmpty(data?.ubigeoSunat, data?.ubigeoReniec, data?.ubigeoId, data?.ubigeo_id);
      const ubigeoArray = Array.isArray(data?.ubigeo) ? data.ubigeo.map((x: any) => cleanText(x)).filter(Boolean) : [];

      if (ubigeoId || ubigeoArray.length > 0) {
        try {
          await hydrateUbigeoFromExternal({ ubigeoId, ubigeoArray, departamento: data?.departamento, provincia: data?.provincia, distrito: data?.distrito });
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

  // ── Handlers direcciones extras ─────────────────────────────────────────

  const addDireccion = () => setDireccionesExtras((prev) => [...prev, emptyDireccion()]);

  const removeDireccion = (tempId: string) => {
    if (direccionesExtras.length <= 1) {
      toast.error("Debe conservar al menos una dirección adicional");
      return;
    }
    setDireccionesExtras((prev) => prev.filter((d) => d._tempId !== tempId));
  };

  const updateDireccion = (
    tempId: string,
    field: keyof Omit<DireccionExtraForm, "_tempId">,
    value: string
  ) => {
    setDireccionesExtras((prev) =>
      prev.map((d) => (d._tempId === tempId ? { ...d, [field]: value } : d))
    );
  };

  // Abre el ubigeo picker para una fila específica
  const openUbigeoPicker = (tempId: string) => {
    setUbigeoPickerTargetId(tempId);
    setUbigeoPickerOpen(true);
  };

  // Recibe el resultado del picker y lo aplica a la fila correspondiente
  const handleUbigeoPickerConfirm = (result: { ubidst: string; label: string }) => {
    if (!ubigeoPickerTargetId) return;
    setDireccionesExtras((prev) =>
      prev.map((d) =>
        d._tempId === ubigeoPickerTargetId
          ? { ...d, ubidst: result.ubidst, ubidstLabel: result.label }
          : d
      )
    );
    setUbigeoPickerTargetId(null);
  };

  // ── Validación ──────────────────────────────────────────────────────────

  const validate = () => {
    if (!form.descripcion.trim())  return "Descripción/Nombre es obligatorio";
    if (!form.docidentId.trim())   return "Tipo de documento es obligatorio";
    if (!form.num_docident.trim()) return "Número de documento es obligatorio";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return "Email no válido";
    if (direccionesExtras.some((d) => !d.direccion.trim()))
      return "Todas las direcciones adicionales deben tener texto";
    return null;
  };

  // ── Clean & submit ──────────────────────────────────────────────────────

  const cleanFormData = (data: FormState): Partial<Cliente> => ({
    tenantId:     Number(data.tenantId),
    descripcion:  data.descripcion.trim().toUpperCase(),
    docidentId:   data.docidentId,
    num_docident: data.num_docident.trim().toUpperCase(),
    direccion:    data.direccion.trim().toUpperCase() || "",
    telefono_fijo:   data.telefono_fijo.trim()   || "",
    telefono_fijo2:  data.telefono_fijo2.trim()  || "",
    telefono_movil:  data.telefono_movil.trim()  || "",
    telefono_movil2: data.telefono_movil2.trim() || "",
    email:        data.email.trim() || "",
    tipoclienteId: data.tipoclienteId || "",
    sexo:         data.sexo || "",
    fecha_nac:    data.fecha_nac || "",
    estado_civil: data.estado_civil.trim().toUpperCase() || "",
    website:      data.website.trim() || "",
    ubidst:       data.ubidst || "",
    codigo_RepresentanteLegal: data.codigo_RepresentanteLegal.trim().toUpperCase() || "",
    agente_retencion: data.agente_retencion.trim() || "",
    Origen:       data.Origen.trim().toUpperCase() || "",
    estado:       data.estado,
    empresaId:    EMPRESA_ID,
    direccionesExtras: direccionesExtras.map<DireccionExtra>((d) => ({
      direccion: d.direccion.trim().toUpperCase(),
      ubidst:    d.ubidst.trim() || null,
      estado:    true,
    })),
    empresasAsociadasIds: isDNI
      ? empresasAsociadas.map((e) => e.clienteId!).filter(Boolean)
      : [],
  });

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) { toast.error(msg); return; }
    try {
      setLoading(true);
      const cleanedData = cleanFormData(form);
      if (isEdit && clienteToEdit?.clienteId) {
        await clienteService.update(clienteToEdit.clienteId, cleanedData);
        toast.success("Cliente actualizado correctamente");
      } else {
        await clienteService.create(cleanedData);
        toast.success("Cliente registrado correctamente");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error guardando cliente:", error);
      toast.error(error?.message || "Error al guardar cliente");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          isReadOnly
            ? "Detalle Cliente (Solo Lectura)"
            : isEdit
            ? "Editar Cliente"
            : "Nuevo Cliente"
        }
        size="xl"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="text-slate-400 text-sm">Guardando cliente...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ══════════════════════════════════════════ TABS */}
            <div className="flex border-b border-slate-200">
              {(
                [
                  { key: "datos",       label: "Datos Básicos"          },
                  { key: "direcciones", label: "Direcciones y Empresas" },
                ] as { key: ActiveTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 text-sm font-bold transition-all rounded-t-lg flex items-center gap-2 ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {tab.label}
                  {tab.key === "direcciones" && tab2Badge > 0 && (
                    <span
                      className={`text-xs rounded-full w-5 h-5 flex items-center justify-center leading-none font-bold ${
                        activeTab === "direcciones"
                          ? "bg-white text-blue-600"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {tab2Badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════ TAB 1: DATOS BÁSICOS */}
            {activeTab === "datos" && (
              <div className="space-y-6">

                {/* ── Información Básica ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <FormInput label="Nombre / Razón Social" value={form.descripcion}
                        onChange={handleChange("descripcion") as (e: ChangeEvent<HTMLInputElement>) => void}
                        placeholder="Ej. Juan Pérez / Empresa SAC" required disabled={isReadOnly} />
                    </div>
                    <SearchableSelect label="Tipo de Documento" name="docidentId"
                      options={normalizeOptions(catalogs?.documento_identidad as any)}
                      value={form.docidentId} onChange={handleChange("docidentId")}
                      disabled={isReadOnly} placeholder="Seleccionar..." />
                    <ExternalSearchInput label="Número de Documento" name="num_docident"
                      value={form.num_docident} onChange={handleChange("num_docident") as any}
                      onSuccess={handleExternalSearchSuccess} type={getSearchTypeByDoc(form.docidentId)}
                      empresaId={EMPRESA_ID} required disabled={isReadOnly}
                      placeholder="Ej. 12345678 / 20123456789" />
                    <SearchableSelect label="Tipo de Cliente" name="tipoclienteId"
                      options={normalizeOptions(catalogs?.tipo_cliente as any)}
                      value={form.tipoclienteId} onChange={handleChange("tipoclienteId")}
                      disabled={isReadOnly} placeholder="Seleccionar..." />
                    <SearchableSelect label="Sexo" name="sexo"
                      options={[{ key: "M", value: "Masculino" }, { key: "F", value: "Femenino" }]}
                      value={form.sexo} onChange={handleChange("sexo")}
                      disabled={isReadOnly} placeholder="Seleccionar..." />
                    <FormInput label="Fecha de Nacimiento" type="date" value={form.fecha_nac}
                      onChange={handleChange("fecha_nac") as (e: ChangeEvent<HTMLInputElement>) => void}
                      disabled={isReadOnly} />
                    <SearchableSelect label="Estado Civil" name="estado_civil"
                      options={[
                        { key: "SOLTERO", value: "Soltero" }, { key: "CASADO", value: "Casado" },
                        { key: "VIUDO", value: "Viudo" },     { key: "DIVORCIADO", value: "Divorciado" },
                      ]}
                      value={form.estado_civil} onChange={handleChange("estado_civil")}
                      disabled={isReadOnly} placeholder="Seleccionar..." />
                  </div>
                </div>

                {/* ── Información de Contacto ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">Información de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Email" type="email" value={form.email}
                      onChange={handleChange("email") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="correo@dominio.com" disabled={isReadOnly} noUppercase />
                    <FormInput label="Sitio Web" value={form.website}
                      onChange={handleChange("website") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="www.ejemplo.com" disabled={isReadOnly} noUppercase />
                    <FormInput label="Teléfono Fijo" value={form.telefono_fijo}
                      onChange={handleChange("telefono_fijo") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="(01) 1234567" disabled={isReadOnly} />
                    <FormInput label="Teléfono Fijo 2" value={form.telefono_fijo2}
                      onChange={handleChange("telefono_fijo2") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="(01) 7654321" disabled={isReadOnly} />
                    <FormInput label="Teléfono Móvil" value={form.telefono_movil}
                      onChange={handleChange("telefono_movil") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="999999999" disabled={isReadOnly} />
                    <FormInput label="Teléfono Móvil 2" value={form.telefono_movil2}
                      onChange={handleChange("telefono_movil2") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="988888888" disabled={isReadOnly} />
                    <div className="md:col-span-2">
                      <FormInput label="Dirección Principal" value={form.direccion}
                        onChange={handleChange("direccion") as (e: ChangeEvent<HTMLInputElement>) => void}
                        placeholder="Av. / Jr. / Calle..." disabled={isReadOnly} />
                    </div>
                  </div>
                </div>

                {/* ── Ubicación Geográfica ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">Ubicación Geográfica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableSelect label="País" name="selectedPais"
                      options={normalizeOptions(paisesOptions as any)} value={ubigeoState.selectedPais}
                      onChange={handlePaisChange} disabled={isReadOnly} placeholder="Seleccionar país..." />
                    <SearchableSelect label="Departamento" name="selectedDepartamento"
                      options={normalizeOptions(departamentosOptions as any)} value={ubigeoState.selectedDepartamento}
                      onChange={handleDepartamentoChange} disabled={isReadOnly || !ubigeoState.selectedPais}
                      placeholder="Seleccionar departamento..." />
                    <SearchableSelect label="Provincia" name="selectedProvincia"
                      options={normalizeOptions(provinciasOptions as any)} value={ubigeoState.selectedProvincia}
                      onChange={handleProvinciaChange} disabled={isReadOnly || !ubigeoState.selectedDepartamento}
                      placeholder="Seleccionar provincia..." />
                    <SearchableSelect label="Distrito" name="selectedDistrito"
                      options={normalizeOptions(distritosOptions as any)} value={ubigeoState.selectedDistrito}
                      onChange={handleDistritoChange} disabled={isReadOnly || !ubigeoState.selectedProvincia}
                      placeholder="Seleccionar distrito..." />
                  </div>
                </div>

                {/* ── Información Adicional ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">Información Adicional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 md:grid md:grid-cols-2 md:gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Código Representante Legal</label>
                        <input
                          className="mt-1 w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase text-sm"
                          value={form.codigo_RepresentanteLegal}
                          onChange={handleChange("codigo_RepresentanteLegal") as any}
                          placeholder="Código del representante legal"
                          disabled={isReadOnly}
                        />
                      </div>
                      <SearchableSelect label="Agente de Retención" name="agente_retencion"
                        options={[{ key: "SI", value: "Sí" }, { key: "NO", value: "No" }]}
                        value={form.agente_retencion} onChange={handleChange("agente_retencion")}
                        disabled={isReadOnly} placeholder="Seleccionar..." />
                    </div>
                    <FormInput label="Origen" value={form.Origen}
                      onChange={handleChange("Origen") as (e: ChangeEvent<HTMLInputElement>) => void}
                      placeholder="Ej. Web, Referido, Tienda" disabled={isReadOnly} />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════ TAB 2: DIRECCIONES Y EMPRESAS */}
            {activeTab === "direcciones" && (
              <div className="space-y-8">

                {/* ── Direcciones Adicionales ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-600 uppercase">Direcciones Adicionales</h3>
                    {!isReadOnly && (
                      <button type="button" onClick={addDireccion}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        <IconPlus size={14} /> Agregar dirección
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {direccionesExtras.map((dir, idx) => (
                      <div key={dir._tempId}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">

                        {/* Fila superior: badge + dirección + eliminar */}
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            className="flex-1 border border-slate-200 bg-white p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="Dirección (Av. / Jr. / Calle...)"
                            value={dir.direccion}
                            onChange={(e) => updateDireccion(dir._tempId, "direccion", e.target.value)}
                            disabled={isReadOnly}
                          />
                          {!isReadOnly && (
                            <button type="button" onClick={() => removeDireccion(dir._tempId)}
                              className="flex-shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                              title="Eliminar dirección">
                              <IconTrash size={16} />
                            </button>
                          )}
                        </div>

                        {/* Fila inferior: ubigeo */}
                        <div className="flex items-center gap-2 ml-8">
                          <IconMapPin size={13} className="text-slate-400 shrink-0" />
                          {dir.ubidst ? (
                            /* Ubigeo ya seleccionado → chip + botón cambiar */
                            <div className="flex items-center gap-2 flex-1">
                              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                <IconMapPin size={10} />
                                {dir.ubidstLabel || dir.ubidst}
                                <span className="font-mono text-blue-400 ml-1">({dir.ubidst})</span>
                              </span>
                              {!isReadOnly && (
                                <>
                                  <button type="button" onClick={() => openUbigeoPicker(dir._tempId)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-bold underline underline-offset-2 transition-colors">
                                    Cambiar
                                  </button>
                                  <button type="button"
                                    onClick={() => {
                                      updateDireccion(dir._tempId, "ubidst", "");
                                      updateDireccion(dir._tempId, "ubidstLabel", "");
                                    }}
                                    className="text-red-400 hover:text-red-600 p-0.5 rounded transition-colors">
                                    <IconX size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            /* Sin ubigeo → botón seleccionar */
                            !isReadOnly ? (
                              <button type="button" onClick={() => openUbigeoPicker(dir._tempId)}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors">
                                <IconMapPin size={12} />
                                Seleccionar ubigeo (opcional)
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sin ubigeo</span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Empresas Asociadas (solo DNI) ── */}
                {isDNI && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2 flex items-center gap-2">
                      <IconBuilding size={15} /> Empresas Asociadas
                    </h3>

                    {!isReadOnly && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm uppercase"
                            placeholder="BUSCAR EMPRESA POR NOMBRE O RUC..."
                            value={empresaSearch}
                            onChange={handleEmpresaSearchChange}
                            onKeyDown={(e) => e.key === "Enter" && handleEmpresaSearchSubmit()}
                          />
                          <button type="button" onClick={handleEmpresaSearchSubmit}
                            className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            {loadingEmpresaSearch
                              ? <IconLoader size={18} className="animate-spin" />
                              : <IconSearch size={18} />}
                          </button>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <p className="text-xs font-bold text-slate-400 uppercase px-4 pt-2.5 pb-1">Resultados</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase">Tipo Doc</th>
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase">Num Doc</th>
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase">Razón Social</th>
                                <th className="px-4 py-2.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {loadingEmpresaSearch ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-slate-400">
                                    <IconLoader className="animate-spin inline-block mr-2" size={16} /> Buscando...
                                  </td>
                                </tr>
                              ) : empresaResults.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-slate-400 text-sm">
                                    No se encontraron empresas
                                  </td>
                                </tr>
                              ) : (
                                empresaResults.map((c) => {
                                  const isAdded = empresasAsociadas.some((e) => e.clienteId === c.clienteId);
                                  return (
                                    <tr key={c.clienteId} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-2.5 text-slate-600 font-medium uppercase">{c.docidentId}</td>
                                      <td className="px-4 py-2.5 text-slate-600 font-mono">{c.num_docident}</td>
                                      <td className="px-4 py-2.5 text-slate-800 font-medium uppercase">{c.descripcion}</td>
                                      <td className="px-4 py-2.5 text-right">
                                        {isAdded ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                            <IconCheck size={14} /> Agregado
                                          </span>
                                        ) : (
                                          <button type="button" onClick={() => addEmpresa(c)}
                                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                            <IconPlus size={14} /> Agregar
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                        Empresas asociadas ({empresasAsociadas.length})
                      </p>
                      {empresasAsociadas.length === 0 ? (
                        <p className="text-sm text-slate-400 italic border border-dashed border-slate-200 rounded-lg py-5 text-center">
                          Ninguna empresa asociada aún
                        </p>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase text-slate-600">Tipo Doc</th>
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase text-slate-600">Num Doc</th>
                                <th className="text-left px-4 py-2.5 font-bold text-xs uppercase text-slate-600">Razón Social</th>
                                {!isReadOnly && <th className="px-4 py-2.5" />}
                              </tr>
                            </thead>
                            <tbody>
                              {empresasAsociadas.map((e) => (
                                <tr key={e.clienteId} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-2.5 text-slate-600 font-medium uppercase">{e.docidentId}</td>
                                  <td className="px-4 py-2.5 text-slate-600 font-mono">{e.num_docident}</td>
                                  <td className="px-4 py-2.5 text-slate-800 font-medium uppercase">{e.descripcion}</td>
                                  {!isReadOnly && (
                                    <td className="px-4 py-2.5 text-right">
                                      <button type="button" onClick={() => removeEmpresa(e.clienteId!)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                                        <IconX size={16} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════ BOTONES */}
            {!isReadOnly && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {activeTab === "datos" ? (
                    <button type="button" onClick={() => setActiveTab("direcciones")}
                      className="px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
                      Siguiente →
                    </button>
                  ) : (
                    <button type="button" onClick={() => setActiveTab("datos")}
                      className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
                      ← Anterior
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose} disabled={loading}
                    className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading
                      ? <IconLoader className="animate-spin" size={20} />
                      : <IconDeviceFloppy size={20} />}
                    {isEdit ? "Guardar Cambios" : "Registrar Cliente"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Popup Ubigeo para dirección extra ── */}
      <UbigeoPickerModal
        isOpen={ubigeoPickerOpen}
        onClose={() => { setUbigeoPickerOpen(false); setUbigeoPickerTargetId(null); }}
        onConfirm={handleUbigeoPickerConfirm}
        initialUbidst={
          ubigeoPickerTargetId
            ? (direccionesExtras.find((d) => d._tempId === ubigeoPickerTargetId)?.ubidst ?? "")
            : ""
        }
      />
    </>
  );
}