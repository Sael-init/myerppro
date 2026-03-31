"use client";

import { useEffect, useState, useCallback, ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import { IconDeviceFloppy, IconLoader } from "@tabler/icons-react";
import trabajadorService from "@/services/trabajadorService";
import ExternalSearchInput, { type SearchType } from "@/components/forms/ExternalSearchInput";
import type { Trabajador, FormDropdownsTrabajador } from "@/types/trabajador.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trabajadorToEdit?: Trabajador | null;
  empresaId?: string;
}

type FormState = {
  apellidos: string;
  nombres: string;
  docidentId: string;
  numero_doc: string;
  direccion: string;
  telefono: string;
  telefono_movil: string;
  sexo: string;
  estado_civil: string;
  fecha_nacimiento: string;
  cargoId: string;
  areaId: string;
  email: string;
  cuentausuarioId: string;
  firma_digital: string;
  estado: "1" | "0";
};

const isActivo = (estado?: string | null) => {
  if (!estado) return false;
  const s = String(estado).trim().toLowerCase();
  return s === "1" || s === "true" || s === "activo" || s === "a";
};

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

const FormInput = ({ label, value, onChange, noUppercase = false, ...props }: FormInputProps) => (
  <div>
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <input
      className={`mt-1 w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all ${noUppercase ? "" : "uppercase"}`}
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
}

const FormSelect = ({ label, options, value, onChange, ...props }: FormSelectProps) => (
  <div>
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <select
      className="mt-1 w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
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

const toSexoMOrF = (sexo: any) => {
  const s = cleanText(sexo).toUpperCase();
  if (!s) return "";
  if (s.startsWith("M")) return "M";
  if (s.startsWith("F")) return "F";
  return "";
};

const parseNombreCompleto = (fullName: string) => {
  const raw = cleanText(fullName);
  if (!raw) return { nombres: "", apellidos: "" };

  if (raw.includes(",")) {
    const [aps = "", noms = ""] = raw.split(",");
    return { nombres: cleanText(noms), apellidos: cleanText(aps) };
  }

  const parts = raw.split(" ").filter(Boolean);
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" };
  if (parts.length === 2) return { nombres: parts[0], apellidos: parts[1] };

  const apellidos = parts.slice(-2).join(" ");
  const nombres = parts.slice(0, -2).join(" ");
  return { nombres, apellidos };
};

const getSearchTypeByDoc = (docidentId: string): SearchType => {
  const d = cleanText(docidentId).toUpperCase();
  if (d.includes("RUC")) return "RUC";
  if (d.includes("CEX") || d.includes("CE") || d.includes("CARNET")) return "CARNET";
  return "DNI";
};

export default function TrabajadorFormModal({
  isOpen,
  onClose,
  onSuccess,
  trabajadorToEdit,
  empresaId,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<FormDropdownsTrabajador | null>(null);

  const getInitialState = (): FormState => {
    return {
      apellidos: trabajadorToEdit?.apellidos || "",
      nombres: trabajadorToEdit?.nombres || "",
      docidentId: trabajadorToEdit?.docidentId || "DNI",
      numero_doc: trabajadorToEdit?.numero_doc || "",
      direccion: trabajadorToEdit?.direccion || "",
      telefono: trabajadorToEdit?.telefono || "",
      telefono_movil: trabajadorToEdit?.telefono_movil || "",
      sexo: trabajadorToEdit?.sexo || "",
      estado_civil: trabajadorToEdit?.estado_civil || "",
      fecha_nacimiento: trabajadorToEdit?.fecha_nacimiento || "",
      cargoId: trabajadorToEdit?.cargoId ? String(trabajadorToEdit.cargoId) : "",
      areaId: trabajadorToEdit?.areaId ? String(trabajadorToEdit.areaId) : "",
      email: trabajadorToEdit?.email || "",
      cuentausuarioId: trabajadorToEdit?.cuentausuarioId || "",
      firma_digital: trabajadorToEdit?.firma_digital || "",
      estado: trabajadorToEdit ? (isActivo(trabajadorToEdit.estado) ? "1" : "0") : "1",
    };
  };

  const [form, setForm] = useState<FormState>(getInitialState());

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialState());
    }
  }, [isOpen, trabajadorToEdit?.trabajadorId]);

  useEffect(() => {
    if (!isOpen) return;

    setCatalogsLoading(true);
    trabajadorService
      .getFormDropdowns()
      .then((res: any) => {
        const body = res?.data ?? res;
        setCatalogs(body as FormDropdownsTrabajador);
      })
      .catch((err: any) => {
        console.error("Error cargando catálogos:", err);
        toast.error("Error al cargar opciones del formulario");
        setCatalogs(null);
      })
      .finally(() => setCatalogsLoading(false));
  }, [isOpen]);

  const isEdit = Boolean(trabajadorToEdit?.trabajadorId);
  const isReadOnly = trabajadorToEdit?.estado === "0" || trabajadorToEdit?.estado === "false";
  const externalEmpresaId = String(trabajadorToEdit?.empresaId || empresaId || "005");

  const handleApellidosChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, apellidos: e.target.value }));
  }, []);

  const handleNombresChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, nombres: e.target.value }));
  }, []);

  const handleDocidentIdChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, docidentId: e.target.value }));
  }, []);

  const handleNumeroDocChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, numero_doc: e.target.value }));
  }, []);

  const handleSexoChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, sexo: e.target.value }));
  }, []);

  const handleFechaNacimientoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, fecha_nacimiento: e.target.value }));
  }, []);

  const handleEstadoCivilChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, estado_civil: e.target.value }));
  }, []);

  const handleCargoIdChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, cargoId: e.target.value }));
  }, []);

  const handleAreaIdChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, areaId: e.target.value }));
  }, []);

  const handleCuentausuarioIdChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, cuentausuarioId: e.target.value }));
  }, []);

  const handleFirmaDigitalChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, firma_digital: e.target.value }));
  }, []);

  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, email: e.target.value }));
  }, []);

  const handleTelefonoChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, telefono: e.target.value }));
  }, []);

  const handleTelefonoMovilChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, telefono_movil: e.target.value }));
  }, []);

  const handleDireccionChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, direccion: e.target.value }));
  }, []);

  const handleExternalSearchSuccess = useCallback((raw: any) => {
    const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;

    const numeroDoc = firstNonEmpty(
      data?.numero,
      data?.numero_documento,
      data?.numeroDocumento,
      data?.dni,
      data?.ruc,
      data?.ce,
      data?.nro_documento
    );

    const fullName = firstNonEmpty(
      data?.nombreCompleto,
      data?.nombre_completo,
      data?.nombre_o_razon_social,
      data?.nombreORazonSocial,
      data?.razon_social,
      data?.razonSocial
    );

    const parsed = parseNombreCompleto(fullName);

    const apellidosFromApi = firstNonEmpty(
      [data?.apellidoPaterno, data?.apellidoMaterno].filter(Boolean).join(" "),
      [data?.apellido_paterno, data?.apellido_materno].filter(Boolean).join(" "),
      parsed.apellidos
    );

    const nombresFromApi = firstNonEmpty(data?.nombres, data?.nombre, parsed.nombres);

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

    const sexo = toSexoMOrF(data?.sexo);

    setForm((prev) => ({
      ...prev,
      numero_doc: numeroDoc || prev.numero_doc,
      nombres: nombresFromApi || prev.nombres,
      apellidos: apellidosFromApi || prev.apellidos,
      direccion: direccion || prev.direccion,
      fecha_nacimiento: fechaNacimiento || prev.fecha_nacimiento,
      sexo: sexo || prev.sexo,
    }));
  }, []);

  const validate = () => {
    if (!form.apellidos.trim()) return "Apellidos es obligatorio";
    if (!form.nombres.trim()) return "Nombres es obligatorio";
    if (!form.docidentId.trim()) return "Tipo de documento es obligatorio";
    if (!form.numero_doc.trim()) return "Número de documento es obligatorio";

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Email no válido";
    }

    return null;
  };

  const cleanFormData = (data: FormState): Partial<Trabajador> => {
    const empresaIdToUse = trabajadorToEdit?.empresaId || empresaId || "005";

    const cleaned: Partial<Trabajador> = {
      empresaId: String(empresaIdToUse),
      apellidos: data.apellidos.trim().toUpperCase(),
      nombres: data.nombres.trim().toUpperCase(),
      docidentId: data.docidentId,
      numero_doc: data.numero_doc.trim().toUpperCase(),
      estado: data.estado,
    };

    if (data.direccion.trim()) cleaned.direccion = data.direccion.trim().toUpperCase();
    if (data.telefono.trim()) cleaned.telefono = data.telefono.trim();
    if (data.telefono_movil.trim()) cleaned.telefono_movil = data.telefono_movil.trim();
    if (data.sexo.trim()) cleaned.sexo = data.sexo.trim();
    if (data.estado_civil.trim()) cleaned.estado_civil = data.estado_civil.trim().toUpperCase();
    if (data.fecha_nacimiento.trim()) cleaned.fecha_nacimiento = data.fecha_nacimiento.trim();
    if (data.email.trim()) cleaned.email = data.email.trim();
    if (data.firma_digital.trim()) cleaned.firma_digital = data.firma_digital.trim().toUpperCase();
    if (data.cuentausuarioId.trim()) cleaned.cuentausuarioId = data.cuentausuarioId.trim();

    const cargoNum = parseInt(data.cargoId, 10);
    if (!isNaN(cargoNum)) cleaned.cargoId = cargoNum;

    const areaNum = parseInt(data.areaId, 10);
    if (!isNaN(areaNum)) cleaned.areaId = areaNum;

    return cleaned;
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    try {
      setSaving(true);
      const cleanedData = cleanFormData(form);

      if (isEdit && trabajadorToEdit?.trabajadorId) {
        await trabajadorService.update(trabajadorToEdit.trabajadorId, cleanedData);
        toast.success("Trabajador actualizado correctamente");
      } else {
        await trabajadorService.create(cleanedData);
        toast.success("Trabajador registrado correctamente");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error guardando trabajador:", error);
      toast.error(error?.message || "Error al guardar trabajador");
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
          ? "Detalle Trabajador (Solo Lectura)"
          : isEdit
          ? "Editar Trabajador"
          : "Nuevo Trabajador"
      }
      size="xl"
    >
      {catalogsLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando formulario...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Apellidos"
                value={form.apellidos}
                onChange={handleApellidosChange}
                placeholder="Ej. Pérez Gómez"
                required
                disabled={isReadOnly}
              />

              <FormInput
                label="Nombres"
                value={form.nombres}
                onChange={handleNombresChange}
                placeholder="Ej. Juan Carlos"
                required
                disabled={isReadOnly}
              />

              <FormSelect
                label="Tipo de Documento"
                options={catalogs?.documento_identidad}
                value={form.docidentId}
                onChange={handleDocidentIdChange}
                disabled={isReadOnly || isEdit}
              />

              <ExternalSearchInput
                label="Número de Documento"
                name="numero_doc"
                value={form.numero_doc}
                onChange={handleNumeroDocChange}
                onSuccess={handleExternalSearchSuccess}
                type={getSearchTypeByDoc(form.docidentId)}
                empresaId={externalEmpresaId}
                required
                disabled={isReadOnly || isEdit}
                placeholder="Ej. 12345678"
              />

              <FormSelect
                label="Sexo"
                options={[
                  { key: "M", value: "Masculino" },
                  { key: "F", value: "Femenino" },
                ]}
                value={form.sexo}
                onChange={handleSexoChange}
                disabled={isReadOnly}
              />

              <FormInput
                label="Fecha de Nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={handleFechaNacimientoChange}
                disabled={isReadOnly}
              />

              <FormInput
                label="Estado Civil"
                value={form.estado_civil}
                onChange={handleEstadoCivilChange}
                placeholder="Ej. Soltero, Casado"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Información Laboral
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Cargo"
                options={catalogs?.cargo}
                value={form.cargoId}
                onChange={handleCargoIdChange}
                disabled={isReadOnly}
              />

              <FormSelect
                label="Área"
                options={catalogs?.area}
                value={form.areaId}
                onChange={handleAreaIdChange}
                disabled={isReadOnly}
              />

              <FormSelect
                label="Cuenta Usuario"
                options={catalogs?.cuenta_usuario}
                value={form.cuentausuarioId}
                onChange={handleCuentausuarioIdChange}
                disabled={isReadOnly}
              />

              <FormInput
                label="Firma Digital"
                value={form.firma_digital}
                onChange={handleFirmaDigitalChange}
                placeholder="Ruta / hash / referencia"
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
                onChange={handleEmailChange}
                placeholder="correo@dominio.com"
                disabled={isReadOnly}
                noUppercase
              />

              <FormInput
                label="Teléfono Fijo"
                value={form.telefono}
                onChange={handleTelefonoChange}
                placeholder="(01) 1234567"
                disabled={isReadOnly}
              />

              <FormInput
                label="Teléfono Móvil"
                value={form.telefono_movil}
                onChange={handleTelefonoMovilChange}
                placeholder="999999999"
                disabled={isReadOnly}
              />

              <div className="md:col-span-2">
                <FormInput
                  label="Dirección"
                  value={form.direccion}
                  onChange={handleDireccionChange}
                  placeholder="Av. / Jr. / Calle..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? <IconLoader className="animate-spin" size={20} /> : <IconDeviceFloppy size={20} />}
                {isEdit ? "Guardar Cambios" : "Registrar Trabajador"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}