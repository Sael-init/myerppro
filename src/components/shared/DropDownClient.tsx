// src/components/forms/DropDownClient.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import clienteService from "@/services/clienteService";
import type { Cliente } from "@/types/cliente.types";
import { IconSearch, IconLoader, IconUser, IconX, IconChevronDown } from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

/** IDs de tipo de documento en el sistema.
 *  Ajusta estos valores si tu catálogo usa IDs distintos. */
const DOCIDENT_RUC = ["6", "RUC"];  // docidentId que corresponde a RUC
const DOCIDENT_DNI = ["1", "DNI"];  // docidentId que corresponde a DNI

export type FiltroTipoDoc = "RUC" | "DNI" | null;

interface ClienteOption {
  /** clienteId — clave que se guarda en el formulario */
  key: string;
  /** "NOMBRE | RUC | 20123456789" — compatible con getClienteTipoDoc() del form */
  value: string;
  /** Etiqueta corta del tipo de documento ("RUC" | "DNI" | ...) */
  tipoDoc: string;
  /** Número de documento */
  numDoc: string;
  /** Nombre / razón social */
  descripcion: string;
}

interface DropDownClientProps {
  /** ID del tenant para la consulta */
  tenantId: string;
  /** Valor actualmente seleccionado (clienteId) */
  value: string;
  /** Nombre del campo — se reenvía en el evento sintético */
  name?: string;
  /** Label visible sobre el select */
  label?: string;
  /** Callback compatible con handleChange del form (event sintético) */
  onChange: (e: { target: { name: string; value: string } }) => void;
  /** Filtra la lista mostrando solo clientes con este tipo de doc */
  filtroTipoDoc?: FiltroTipoDoc;
  /** Deshabilita el componente */
  disabled?: boolean;
  /** Tamaño de página de la consulta (default 50) */
  pageSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Determina la etiqueta corta del tipo de documento del cliente */
function resolveTipoDocLabel(cliente: Cliente): string {
  // Prioridad 1: viene el objeto relacionado con descripcion_corta
  const corta = cliente.documento_identidad?.descripcion_corta?.toUpperCase().trim();
  if (corta) return corta;

  // Prioridad 2: inferir por docidentId numérico/string
  const id = String(cliente.docidentId ?? "").toUpperCase().trim();
  if (DOCIDENT_RUC.includes(id)) return "RUC";
  if (DOCIDENT_DNI.includes(id)) return "DNI";

  return id || "—";
}

/** Mapea un Cliente a ClienteOption con el value en formato pipe */
function toClienteOption(c: Cliente): ClienteOption {
  const tipoDoc    = resolveTipoDocLabel(c);
  const numDoc     = c.num_docident ?? "";
  const descripcion = c.descripcion ?? "";

  return {
    key:         c.clienteId ?? "",
    value:       `${descripcion} | ${tipoDoc} | ${numDoc}`,
    tipoDoc,
    numDoc,
    descripcion,
  };
}

/** Badget de colores según tipo de doc */
function TipoDocBadge({ tipo }: { tipo: string }) {
  const color =
    tipo === "RUC"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : tipo === "DNI"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full shrink-0 ${color}`}>
      {tipo}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function DropDownClient({
  tenantId,
  value,
  name = "clienteId",
  label = "Cliente *",
  onChange,
  filtroTipoDoc = null,
  disabled = false,
  pageSize = 50,
}: DropDownClientProps) {
  const [opciones,       setOpciones]       = useState<ClienteOption[]>([]);
  const [busqueda,       setBusqueda]       = useState("");
  const [abierto,        setAbierto]        = useState(false);
  const [cargando,       setCargando]       = useState(false);
  const [pagina,         setPagina]         = useState(1);
  const [hayMas,         setHayMas]         = useState(false);
  const [selectedOption, setSelectedOption] = useState<ClienteOption | null>(null);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Cargar clientes desde el servicio ──────────────────────────────────────
  const cargarClientes = useCallback(
    async (search: string, page: number, acumular: boolean) => {
      if (!tenantId) return;
      setCargando(true);
      try {
        const resp = await clienteService.getAll(
          tenantId,
          page,
          pageSize,
          search || undefined,
          filtroTipoDoc === "RUC"
            ? { docidentIds: DOCIDENT_RUC }
            : filtroTipoDoc === "DNI"
            ? { docidentIds: DOCIDENT_DNI }
            : undefined
        );

        const mapped: ClienteOption[] = (resp.data as Cliente[])
          .filter((c) => c.clienteId)
          .map(toClienteOption);

        // Si el backend no filtra por docidentId correctamente,
        // aplicamos un filtro client-side como fallback
        const filtrados = filtroTipoDoc
          ? mapped.filter((o) => o.tipoDoc === filtroTipoDoc)
          : mapped;

        setOpciones((prev) => (acumular ? [...prev, ...filtrados] : filtrados));
        setHayMas(page < resp.meta.totalPages);
      } catch {
        // silencioso: el form padre ya maneja errores globales
      } finally {
        setCargando(false);
      }
    },
    [tenantId, pageSize, filtroTipoDoc]
  );

  // ── Efecto: resetear y recargar cuando cambia filtroTipoDoc o se abre ──────
  useEffect(() => {
    if (!abierto) return;
    setPagina(1);
    cargarClientes(busqueda, 1, false);
  }, [abierto, filtroTipoDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Efecto: debounce búsqueda ──────────────────────────────────────────────
  useEffect(() => {
    if (!abierto) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPagina(1);
      cargarClientes(busqueda, 1, false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Efecto: resolver opción seleccionada cuando cambia `value` ────────────
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    // Buscar entre opciones ya cargadas
    const found = opciones.find((o) => o.key === value);
    if (found) {
      setSelectedOption(found);
      return;
    }
    // Si no está en la lista (p.ej. modo edición), cargar el cliente por ID
    clienteService.getById(value).then((c) => {
      setSelectedOption(toClienteOption(c));
    }).catch(() => {/* silencioso */});
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cerrar al hacer click afuera ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Seleccionar opción ─────────────────────────────────────────────────────
  const handleSelect = (opt: ClienteOption) => {
    setSelectedOption(opt);
    onChange({ target: { name, value: opt.key } });
    setAbierto(false);
    setBusqueda("");
  };

  // ── Limpiar selección ──────────────────────────────────────────────────────
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(null);
    onChange({ target: { name, value: "" } });
  };

  // ── Cargar más (scroll infinito simplificado) ─────────────────────────────
  const handleCargarMas = () => {
    const next = pagina + 1;
    setPagina(next);
    cargarClientes(busqueda, next, true);
  };

  // ── Abrir panel ───────────────────────────────────────────────────────────
  const handleOpen = () => {
    if (disabled) return;
    setAbierto(true);
    // Foco en el input de búsqueda
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1.5" ref={contenedorRef}>
      {/* Label */}
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
        {label}
        {filtroTipoDoc && (
          <span
            className={`ml-2 font-bold ${
              filtroTipoDoc === "RUC" ? "text-blue-500" : "text-green-500"
            }`}
          >
            — Solo {filtroTipoDoc}
          </span>
        )}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`
          w-full flex items-center gap-2 border rounded-lg px-2.5 py-2.5 text-sm text-left
          outline-none focus:ring-2 focus:ring-blue-500 transition-all
          ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                     : "bg-white text-slate-700 cursor-pointer border-slate-200 hover:border-blue-400"}
          ${abierto ? "ring-2 ring-blue-500 border-blue-400" : ""}
        `}
      >
        <IconUser size={14} className="text-slate-400 shrink-0" />

        {selectedOption ? (
          <span className="flex-1 flex items-center gap-2 min-w-0">
            <TipoDocBadge tipo={selectedOption.tipoDoc} />
            <span className="truncate font-medium text-slate-800 uppercase">
              {selectedOption.descripcion}
            </span>
            <span className="text-slate-400 font-mono text-[10px] shrink-0 uppercase">
              {selectedOption.numDoc}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-slate-400 italic text-xs">
            -- Seleccione cliente --
          </span>
        )}

        <span className="flex items-center gap-1 ml-auto shrink-0">
          {selectedOption && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <IconX size={12} />
            </span>
          )}
          <IconChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Hint */}
      {filtroTipoDoc && (
        <p className={`text-[10px] font-semibold ml-1 -mt-0.5 ${
          filtroTipoDoc === "RUC" ? "text-blue-600" : "text-green-600"
        }`}>
          {filtroTipoDoc === "RUC"
            ? "⚠ Factura: solo se muestran clientes con RUC"
            : "⚠ Boleta: solo se muestran clientes con DNI"}
        </p>
      )}

      {/* Panel desplegable */}
      {abierto && (
        <div className="absolute z-50 mt-[64px] w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">

          {/* Buscador */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <IconSearch size={14} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o RUC/DNI..."
              className="flex-1 text-sm outline-none placeholder-slate-400 text-slate-700"
            />
            {cargando && (
              <IconLoader size={14} className="text-blue-500 animate-spin shrink-0" />
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {opciones.length === 0 && !cargando ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400 italic">
                {busqueda
                  ? "Sin resultados para la búsqueda"
                  : filtroTipoDoc
                  ? `No hay clientes con ${filtroTipoDoc} registrados`
                  : "No hay clientes disponibles"}
              </li>
            ) : (
              opciones.map((opt) => (
                <li key={opt.key}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                      hover:bg-blue-50 transition-colors text-sm
                      ${value === opt.key ? "bg-blue-50" : ""}
                    `}
                  >
                    <TipoDocBadge tipo={opt.tipoDoc} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium text-slate-800 text-xs uppercase">
                        {opt.descripcion}
                      </span>
                      <span className="block font-mono text-[10px] text-slate-400 uppercase">
                        {opt.numDoc}
                      </span>
                    </span>
                    {value === opt.key && (
                      <span className="text-blue-500 text-[10px] font-bold shrink-0">✓</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Cargar más */}
          {hayMas && !cargando && (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={handleCargarMas}
                className="w-full py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Cargar más clientes...
              </button>
            </div>
          )}

          {cargando && opciones.length > 0 && (
            <div className="border-t border-slate-100 py-2 flex justify-center">
              <IconLoader size={14} className="text-slate-400 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}