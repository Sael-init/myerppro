"use client";

import { useState, useEffect } from "react";
import documentoVentaService from "@/services/DocumentoventaService";
import Modal from "@/components/ui/Modal";
import { IconLoader, IconRoute, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

interface Props {
  documentoventaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function renderValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined || val === "") return <span className="text-slate-400">—</span>;
  if (typeof val === "boolean") return <span className={val ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>{val ? "Sí" : "No"}</span>;
  if (typeof val === "number") return <span className="font-mono text-blue-700">{val}</span>;
  if (typeof val === "string") return <span className="text-slate-800">{val}</span>;
  if (Array.isArray(val)) return <JsonArray data={val} />;
  if (typeof val === "object") return <JsonObject data={val as Record<string, unknown>} />;
  return <span>{String(val)}</span>;
}

function JsonObject({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <span className="text-slate-400 italic text-xs">vacío</span>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([key, val]) => {
        const isComplex = val !== null && typeof val === "object";
        return (
          <div key={key} className={isComplex ? "sm:col-span-2" : ""}>
            <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              {key.replace(/_/g, " ")}
            </dt>
            <dd className={isComplex
              ? "border border-slate-200 rounded-lg p-3 bg-slate-50"
              : "text-sm px-3 py-2 bg-white rounded-lg border border-slate-200"}>
              {renderValue(val)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function JsonArray({ data }: { data: unknown[] }) {
  if (data.length === 0) return <span className="text-slate-400 italic text-xs">sin elementos</span>;
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Item {i + 1}</p>
          {renderValue(item)}
        </div>
      ))}
    </div>
  );
}

export default function TrazabilidadModal({ documentoventaId, isOpen, onClose }: Props) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentoventaId) {
      setLoading(true);
      setData(null);
      documentoVentaService
        .getTrazabilidad(documentoventaId)
        .then(setData)
        .catch((err: any) => {
          toast.error(err.message ?? "Error al cargar trazabilidad");
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, documentoventaId, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trazabilidad del Documento" size="lg">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader className="animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-slate-400 text-sm">Cargando trazabilidad...</p>
        </div>
      ) : data ? (
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <IconRoute size={18} className="text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-800">
              Historial de trazabilidad · {documentoventaId}
            </span>
          </div>
          {renderValue(data)}
          <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-white pb-1">
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
          No se encontró información de trazabilidad
        </div>
      )}
    </Modal>
  );
}
