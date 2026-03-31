"use client";

import { useEffect, useState } from "react";
import trabajadorService from "@/services/trabajadorService";
import Modal from "@/components/ui/Modal";
import { IconLoader, IconX, IconUserCircle } from "@tabler/icons-react";
import { toast } from "sonner";
import type { Trabajador } from "@/types/trabajador.types";

interface Props {
  trabajadorId: string | null;
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
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <dt className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 uppercase">
        {value}
      </dd>
    </div>
  );
};

const isActivo = (estado?: string | null) => {
  if (!estado) return false;
  const s = String(estado).trim().toLowerCase();
  return s === "1" || s === "true" || s === "activo" || s === "a";
};

export default function TrabajadorViewModal({ trabajadorId, isOpen, onClose }: Props) {
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && trabajadorId) {
      setLoading(true);
      trabajadorService
        .getById(trabajadorId)
        .then((res: Trabajador) => setTrabajador(res))
        .catch((err: any) => {
          console.error("Error cargando trabajador:", err);
          toast.error("Error al cargar el trabajador");
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setTrabajador(null);
    }
  }, [isOpen, trabajadorId]);

  const fullName =
    trabajador ? `${trabajador.apellidos || ""} ${trabajador.nombres || ""}`.trim() : "";

  const activo = trabajador ? isActivo(trabajador.estado) : false;

  const docCorta =
    trabajador?.documentoIdentidad?.descripcion_corta || trabajador?.docidentId || "DOC";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Trabajador" size="xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando información del trabajador...</p>
        </div>
      ) : trabajador ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <IconUserCircle size={40} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 uppercase">{fullName || "Sin nombre"}</h3>
              <div className="flex gap-4 mt-1 items-center">
                <span className="text-xs text-slate-500 uppercase">
                  <span className="font-semibold">{docCorta}:</span> {trabajador.numero_doc}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    activo
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {activo ? "ACTIVO" : "ANULADO"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Información Básica
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField
                label="Tipo de Documento"
                value={trabajador.documentoIdentidad?.descripcion_larga || trabajador.docidentId}
              />
              <InfoField label="Nro. Documento" value={trabajador.numero_doc} />
              <InfoField
                label="Sexo"
                value={
                  trabajador.sexo === "M"
                    ? "Masculino"
                    : trabajador.sexo === "F"
                    ? "Femenino"
                    : trabajador.sexo
                }
              />
              <InfoField label="Fecha de Nacimiento" value={trabajador.fecha_nacimiento} />
              <InfoField label="Estado Civil" value={trabajador.estado_civil} />
              <InfoField label="Firma Digital" value={trabajador.firma_digital} fullWidth />
            </dl>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Información Laboral
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Cargo" value={trabajador.cargo?.descripcion || trabajador.cargoId} />
              <InfoField label="Área" value={trabajador.area?.descripcion || trabajador.areaId} />
              <InfoField
                label="Empresa"
                value={trabajador.empresa?.razon_social || trabajador.empresaId}
                fullWidth
              />
              <InfoField label="RUC Empresa" value={trabajador.empresa?.ruc} />
              <InfoField label="Dirección Empresa" value={trabajador.empresa?.direccion_1} fullWidth />
            </dl>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded"></div>
              Información de Contacto
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Email" value={trabajador.email} fullWidth />
              <InfoField label="Teléfono" value={trabajador.telefono} />
              <InfoField label="Teléfono Móvil" value={trabajador.telefono_movil} />
              <InfoField label="Dirección" value={trabajador.direccion} fullWidth />
            </dl>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">Información del Sistema</h4>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <dt className="text-slate-500 font-semibold">ID Trabajador</dt>
                <dd className="text-slate-700 font-mono">{trabajador.trabajadorId}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-semibold">ID Empresa</dt>
                <dd className="text-slate-700 font-mono">{trabajador.empresaId}</dd>
              </div>
              {trabajador.cuentausuarioId && (
                <div>
                  <dt className="text-slate-500 font-semibold">ID Cuenta Usuario</dt>
                  <dd className="text-slate-700 font-mono">{trabajador.cuentausuarioId}</dd>
                </div>
              )}
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
        <div className="text-center py-10 text-slate-400">No se pudo cargar la información del trabajador</div>
      )}
    </Modal>
  );
}