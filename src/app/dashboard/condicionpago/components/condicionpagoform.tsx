"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";
import { IconDeviceFloppy, IconLoader } from "@tabler/icons-react";
import condicionPagoService from "@/services/condicionpagoService";
import type { CondicionPago } from "@/types/condicionpago.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  condicionPagoToEdit?: CondicionPago | null;
}

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

const normalizeText = (v: string) => v.replace(/\s+/g, " ").trim();

const resolveId = (row?: CondicionPago | null): string => {
  if (!row) return "";
  const r: any = row;
  return String(r.condicion_pago ?? r.condicionPagoId ?? r.id ?? "").trim();
};

export default function CondicionPagoFormModal({
  isOpen,
  onClose,
  onSuccess,
  condicionPagoToEdit,
}: Props) {
  const [saving, setSaving] = useState(false);

  const condicionPagoId = useMemo(() => resolveId(condicionPagoToEdit), [condicionPagoToEdit]);
  const isEdit = Boolean(condicionPagoId);

  const getInitialValue = () =>
    condicionPagoToEdit?.descripcion || condicionPagoId || "";

  const [value, setValue] = useState(getInitialValue());

  useEffect(() => {
    if (isOpen) setValue(getInitialValue());
  }, [isOpen, condicionPagoId]);

  const validate = (): string | null => {
    if (!normalizeText(value)) return "La condición de pago es obligatoria";
    if (normalizeText(value).length > 200) return "El valor excede el máximo permitido";
    return null;
  };

  const getErrorMessage = (error: any): string => {
    return (
      error?.response?.data?.mensaje ||
      error?.response?.data?.message ||
      error?.message ||
      "Error al guardar condición de pago"
    );
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      toast.error(msg);
      return;
    }

    try {
      setSaving(true);

      const normalized = normalizeText(value).toUpperCase();
      if (isEdit) {
        await condicionPagoService.update(condicionPagoId, {
          descripcion: normalized,
        });
        toast.success("Condición de pago actualizada correctamente");
      } else {
        await condicionPagoService.create({
          condicion_pago: normalized,
          descripcion: normalized,
        });
        toast.success("Condición de pago registrada correctamente");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error guardando condición de pago:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar Condición de Pago" : "Nueva Condición de Pago"}
      size="md"
    >
      {saving ? (
        <div className="flex flex-col items-center justify-center py-16">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Guardando condición de pago...</p>
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase border-b pb-2">
              Datos de la Condición de Pago
            </h3>

            <div className="grid grid-cols-1 gap-4">
              <FormInput
                label="Condición de Pago"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ej. CONTADO, CRÉDITO 30 DÍAS, CRÉDITO 60 DÍAS"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? <IconLoader className="animate-spin" size={20} /> : <IconDeviceFloppy size={20} />}
              {isEdit ? "Guardar Cambios" : "Registrar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}