// src/app/dashboard/formaspago/components/FormasPagoFormModal.tsx
"use client";

import { useEffect, useState, useCallback, ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import { IconDeviceFloppy, IconLoader } from "@tabler/icons-react";
import formasPagoService from "@/services/formaspagoService";
import type { FormasPago, FormasPagoForm } from "@/types/formaspago.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  formaPagoToEdit?: FormasPago | null;
}

// Componentes de formulario reutilizables
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
  <div>
    <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
    <input
      className="mt-1 w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase"
      value={value}
      onChange={onChange}
      {...props}
    />
  </div>
);

export default function FormasPagoFormModal({
  isOpen,
  onClose,
  onSuccess,
  formaPagoToEdit,
}: Props) {
  const [loading, setLoading] = useState(false);

  const getInitialState = (): FormasPagoForm => ({
    descripcion: formaPagoToEdit?.descripcion || "",
    diasFormPago:
      formaPagoToEdit?.diasFormPago != null
        ? String(formaPagoToEdit.diasFormPago)
        : "",
    condicionPago: formaPagoToEdit?.condicionPago || "",
  });

  const [form, setForm] = useState<FormasPagoForm>(getInitialState());

  // Resetear form cuando cambia el modal
  useEffect(() => {
    if (isOpen) {
      setForm(getInitialState());
    }
  }, [isOpen, formaPagoToEdit?.formaspagoId]);

  const isEdit = Boolean(formaPagoToEdit?.formaspagoId);

  // ===================== HANDLERS =====================

  const handleChange = useCallback(
    (field: keyof FormasPagoForm) =>
      (e: ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  // ===================== VALIDACIÓN Y SUBMIT =====================

  const validate = (): string | null => {
    if (!form.descripcion.trim()) return "La descripción es obligatoria";

    if (form.diasFormPago && isNaN(Number(form.diasFormPago))) {
      return "Los días deben ser un número válido";
    }

    if (form.diasFormPago && Number(form.diasFormPago) < 0) {
      return "Los días no pueden ser negativos";
    }

    return null;
  };

  const cleanFormData = (data: FormasPagoForm): Partial<FormasPago> => {
    return {
      descripcion: data.descripcion.trim().toUpperCase(),
      diasFormPago: data.diasFormPago ? Number(data.diasFormPago) : null,
      condicionPago: data.condicionPago.trim().toUpperCase() || null,
    };
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      const cleanedData = cleanFormData(form);

      if (isEdit && formaPagoToEdit?.formaspagoId) {
        await formasPagoService.update(formaPagoToEdit.formaspagoId, cleanedData);
        toast.success("Forma de pago actualizada correctamente");
      } else {
        await formasPagoService.create(cleanedData);
        toast.success("Forma de pago registrada correctamente");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error guardando forma de pago:", error);
      toast.error(error?.message || "Error al guardar forma de pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar Forma de Pago" : "Nueva Forma de Pago"}
      size="md"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Guardando forma de pago...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Datos de la Forma de Pago
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <FormInput
                label="Descripción"
                value={form.descripcion}
                onChange={handleChange("descripcion")}
                placeholder="Ej. Contado, Crédito 30 días"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Días"
                  type="number"
                  value={form.diasFormPago}
                  onChange={handleChange("diasFormPago")}
                  placeholder="Ej. 0, 30, 60"
                />

                <FormInput
                  label="Condición de Pago"
                  value={form.condicionPago}
                  onChange={handleChange("condicionPago")}
                  placeholder="Ej. CON, CRE"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <IconLoader className="animate-spin" size={20} />
              ) : (
                <IconDeviceFloppy size={20} />
              )}
              {isEdit ? "Guardar Cambios" : "Registrar"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}