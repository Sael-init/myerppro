"use client";

import { useState, useEffect } from "react";
import formasPagoService, { toId3 } from "@/services/formaspagoService";
import Modal from "@/components/ui/Modal";
import { IconLoader, IconX, IconCreditCard } from "@tabler/icons-react";
import { toast } from "sonner";
import type { FormasPago } from "@/types/formaspago.types";

interface Props {
  formaspagoId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const InfoField = ({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
}) => {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 uppercase">
        {value}
      </dd>
    </div>
  );
};

export default function FormasPagoViewModal({ formaspagoId, isOpen, onClose }: Props) {
  const [formaPago, setFormaPago] = useState<FormasPago | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormaPago(null);
      return;
    }

    if (!formaspagoId) {
      toast.error("ID inválido");
      onClose();
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const id3 = toId3(formaspagoId);
        const res = await formasPagoService.getById(id3);
        if (!cancelled) setFormaPago(res);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Error al cargar la forma de pago");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, formaspagoId, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Forma de Pago" size="md">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando información...</p>
        </div>
      ) : formaPago ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconCreditCard size={40} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 uppercase">{formaPago.descripcion}</h3>
              {formaPago.formaspagoId && (
                <span className="text-xs text-slate-500 font-mono uppercase">ID: {formaPago.formaspagoId}</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Información
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Descripción" value={formaPago.descripcion} fullWidth />
              <InfoField label="Días" value={formaPago.diasFormPago ?? null} />
              <InfoField label="Condición de Pago" value={formaPago.condicionPago} />
            </dl>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <IconX size={18} /> Cerrar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400">
          No se pudo cargar la información de la forma de pago
        </div>
      )}
    </Modal>
  );
}