// src/app/dashboard/condicionpago/components/condicionpagoview.tsx
"use client";

import { useState, useEffect } from "react";
import condicionPagoService from "@/services/condicionpagoService";
import Modal from "@/components/ui/Modal";
import { IconLoader, IconX, IconFileInvoice } from "@tabler/icons-react";
import { toast } from "sonner";
import type { CondicionPago } from "@/types/condicionpago.types";

interface Props {
  condicionPagoId: string | null;
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

export default function CondicionPagoViewModal({ condicionPagoId, isOpen, onClose }: Props) {
  const [condicionPago, setCondicionPago] = useState<CondicionPago | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCondicionPago(null);
      return;
    }

    if (!condicionPagoId) {
      toast.error("ID inválido");
      onClose();
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await condicionPagoService.getById(condicionPagoId);
        if (!cancelled) setCondicionPago(res);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.message || "Error al cargar la condición de pago");
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
  }, [isOpen, condicionPagoId, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Condición de Pago" size="md">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando información...</p>
        </div>
      ) : condicionPago ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconFileInvoice size={40} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 uppercase">{condicionPago.descripcion}</h3>
              {condicionPago.condicionPagoId && (
                <span className="text-xs text-slate-500 font-mono uppercase">
                  ID: {condicionPago.condicionPagoId}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Información
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Código" value={condicionPago.condicionPagoId} />
              <InfoField label="Descripción" value={condicionPago.descripcion} />
            </dl>
          </div>

          {/* Footer */}
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
          No se pudo cargar la información de la condición de pago
        </div>
      )}
    </Modal>
  );
}