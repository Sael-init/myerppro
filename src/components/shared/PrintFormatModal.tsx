"use client";

import type { ComponentType } from "react";
import { IconPrinter, IconClipboardList, IconX } from "@tabler/icons-react";

export interface PrintFormatOption {
  key: string;
  label: string;
  descripcion: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Paleta de acento al hacer hover — debe ser una de las soportadas (clases estáticas para Tailwind) */
  color?: "sky" | "rose" | "violet" | "amber" | "emerald";
}

interface PrintFormatModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
  loading?: boolean;
  /** Lista de formatos a ofrecer. Por defecto: Estándar / Interno. */
  options?: PrintFormatOption[];
}

const COLOR_CLASSES: Record<
  NonNullable<PrintFormatOption["color"]>,
  { border: string; bg: string; iconBg: string; icon: string; label: string }
> = {
  sky:     { border: "hover:border-sky-400",     bg: "hover:bg-sky-50",     iconBg: "group-hover:bg-sky-100",     icon: "group-hover:text-sky-600",     label: "group-hover:text-sky-700" },
  rose:    { border: "hover:border-rose-400",    bg: "hover:bg-rose-50",    iconBg: "group-hover:bg-rose-100",    icon: "group-hover:text-rose-600",    label: "group-hover:text-rose-700" },
  violet:  { border: "hover:border-violet-400",  bg: "hover:bg-violet-50",  iconBg: "group-hover:bg-violet-100",  icon: "group-hover:text-violet-600",  label: "group-hover:text-violet-700" },
  amber:   { border: "hover:border-amber-400",   bg: "hover:bg-amber-50",   iconBg: "group-hover:bg-amber-100",   icon: "group-hover:text-amber-600",   label: "group-hover:text-amber-700" },
  emerald: { border: "hover:border-emerald-400", bg: "hover:bg-emerald-50", iconBg: "group-hover:bg-emerald-100", icon: "group-hover:text-emerald-600", label: "group-hover:text-emerald-700" },
};

const DEFAULT_OPTIONS: PrintFormatOption[] = [
  { key: "estandar", label: "Estándar", descripcion: "Para enviar al cliente", icon: IconPrinter,        color: "sky"  },
  { key: "interno",  label: "Interno",  descripcion: "Uso interno",            icon: IconClipboardList,  color: "rose" },
];

export default function PrintFormatModal({
  open,
  onClose,
  onSelect,
  loading = false,
  options = DEFAULT_OPTIONS,
}: PrintFormatModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <IconPrinter size={20} className="text-sky-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Formato de impresión</h2>
              <p className="text-xs text-slate-500">Selecciona cómo imprimir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon ?? IconPrinter;
            const c    = COLOR_CLASSES[opt.color ?? "sky"];
            return (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                disabled={loading}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200
                           ${c.border} ${c.bg} transition-all disabled:opacity-50 group`}
              >
                <div className={`w-10 h-10 rounded-lg bg-slate-100 ${c.iconBg} flex items-center justify-center transition-colors`}>
                  <Icon size={20} className={`text-slate-500 ${c.icon}`} />
                </div>
                <span className={`font-bold text-sm text-slate-700 ${c.label}`}>{opt.label}</span>
                <span className="text-[11px] text-slate-400 text-center leading-tight">{opt.descripcion}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
