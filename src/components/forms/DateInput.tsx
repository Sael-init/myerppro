"use client";
import { useRef } from "react";
import { IconCalendar } from "@tabler/icons-react";

interface DateInputProps {
  label?: string;
  name: string;
  /** Valor en formato ISO yyyy-mm-dd (o vacío) */
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Separador de visualización: '/' (default) o '-' */
  separator?: '/' | '-';
}

/** Convierte yyyy-mm-dd → dd{sep}mm{sep}yyyy para mostrar */
function toDisplay(iso: string, sep: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}${sep}${m}${sep}${y}`;
}

/**
 * Input de fecha que muestra dd/mm/yyyy al usuario pero almacena yyyy-mm-dd internamente.
 * Al escribir 8 dígitos numéricos convierte automáticamente; el ícono abre el picker nativo.
 */
export default function DateInput({
  label,
  name,
  value,
  onChange,
  required,
  disabled,
  className,
  separator = '/',
}: DateInputProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length === 0) {
      onChange({ target: { name, value: "" } });
      return;
    }
    if (digits.length === 8) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yy = digits.slice(4, 8);
      const iso = `${yy}-${mm}-${dd}`;
      if (!isNaN(new Date(iso).getTime())) {
        onChange({ target: { name, value: iso } });
      }
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2 border rounded-lg px-2.5 bg-white transition-all
          focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400
          ${disabled
            ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
            : "border-slate-200 hover:border-slate-300"
          }`}
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder={`dd${separator}mm${separator}yyyy`}
          value={toDisplay(value, separator)}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          required={required}
          maxLength={10}
          className="flex-1 py-2 text-sm font-mono tracking-wide outline-none bg-transparent text-slate-700 placeholder-slate-400 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => hiddenRef.current?.showPicker?.()}
          className="shrink-0 p-1 text-slate-400 hover:text-blue-500 transition-colors disabled:cursor-not-allowed"
        >
          <IconCalendar size={15} />
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={value}
          onChange={(e) => onChange({ target: { name, value: e.target.value } })}
          disabled={disabled}
          tabIndex={-1}
          className="sr-only"
        />
      </div>
    </div>
  );
}
