"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { IconLoader, IconX, IconSearch, IconUsersGroup, IconBuildingStore } from "@tabler/icons-react";
import listaPreciosService from "@/services/listaprecioService";
import perfilService from "@/services/perfilService";
import puntoVentaService from "@/services/puntoVentaService";
import type { Perfil, PuntoVenta } from "@/types/perfil.types";

interface Props {
  listaprecioId: string | null;
  listaCodigo?: string;
  empresaId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── CheckItem ─────────────────────────────────────────────────────────────────

function CheckItem({
  checked,
  loading,
  label,
  sublabel,
  onChange,
}: {
  checked: boolean;
  loading: boolean;
  label: string;
  sublabel?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer group transition-colors ${loading ? "opacity-60 pointer-events-none" : "hover:bg-slate-50"}`}>
      {loading ? (
        <IconLoader size={16} className="mt-0.5 shrink-0 animate-spin text-blue-500" />
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
      )}
      <div>
        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 leading-tight">
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>
        )}
      </div>
    </label>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function AsignarPanel({
  listaprecioId,
  listaCodigo,
  empresaId,
  isOpen,
  onClose,
}: Props) {
  const [loading,     setLoading]     = useState(false);
  const [perfiles,    setPerfiles]    = useState<Perfil[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([]);
  const [selPerfiles, setSelPerfiles] = useState<Set<string>>(new Set());
  const [selPuntos,   setSelPuntos]   = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [searchPerfil, setSearchPerfil] = useState("");
  const [searchPunto,  setSearchPunto]  = useState("");

  // ── carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !listaprecioId) return;
    setSearchPerfil("");
    setSearchPunto("");

    const load = async () => {
      setLoading(true);
      try {
        const [todosPerfiles, todosPuntos, listaActual] = await Promise.all([
          perfilService.getByEmpresa(empresaId),
          puntoVentaService.getByEmpresa(empresaId),
          listaPreciosService.getById(listaprecioId),
        ]);

        setPerfiles(todosPerfiles);
        setPuntosVenta(todosPuntos);
        setSelPerfiles(new Set((listaActual.perfiles ?? []).map((p) => p.perfilesId)));
        setSelPuntos(new Set((listaActual.puntoventa ?? []).map((p) => p.puntoventaId)));
      } catch (err: any) {
        toast.error(err?.message ?? "Error al cargar datos de asignación");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, listaprecioId, empresaId]);

  // ── toggle helpers ────────────────────────────────────────────────────────────
  const startToggle = (id: string) =>
    setTogglingIds((prev) => new Set([...prev, id]));
  const endToggle = (id: string) =>
    setTogglingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });

  const togglePerfil = useCallback(async (id: string, checked: boolean) => {
    if (!listaprecioId) return;
    startToggle(id);
    // Optimistic update
    setSelPerfiles((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
    try {
      if (checked) {
        await listaPreciosService.addPerfil({ listaprecioId, perfilesId: id });
        toast.success("Perfil asignado");
      } else {
        await listaPreciosService.removePerfil(listaprecioId, id);
        toast.success("Perfil removido");
      }
    } catch (err: any) {
      // Revert on error
      setSelPerfiles((prev) => { const n = new Set(prev); checked ? n.delete(id) : n.add(id); return n; });
      toast.error(err?.message ?? "Error al actualizar perfil");
    } finally {
      endToggle(id);
    }
  }, [listaprecioId]);

  const togglePunto = useCallback(async (id: string, checked: boolean) => {
    if (!listaprecioId) return;
    startToggle(id);
    // Optimistic update
    setSelPuntos((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
    try {
      if (checked) {
        await listaPreciosService.addPuntoVenta({ listaprecioId, puntoventaId: id });
        toast.success("Punto de venta asignado");
      } else {
        await listaPreciosService.removePuntoVenta(listaprecioId, id);
        toast.success("Punto de venta removido");
      }
    } catch (err: any) {
      // Revert on error
      setSelPuntos((prev) => { const n = new Set(prev); checked ? n.delete(id) : n.add(id); return n; });
      toast.error(err?.message ?? "Error al actualizar punto de venta");
    } finally {
      endToggle(id);
    }
  }, [listaprecioId]);

  // ── filtros ──────────────────────────────────────────────────────────────────
  const filteredPerfiles = perfiles.filter((p) =>
    !searchPerfil || (p.descripcion ?? p.perfilesId).toLowerCase().includes(searchPerfil.toLowerCase())
  );
  const filteredPuntos = puntosVenta.filter((p) =>
    !searchPunto || (p.descripcion ?? p.puntoventaId).toLowerCase().includes(searchPunto.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-bold text-slate-800">Asignar Perfiles y Puntos de Venta</p>
            {listaCodigo && (
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{listaCodigo}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-3 text-slate-400">
            <IconLoader size={20} className="animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">

            {/* ── PERFILES ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <IconUsersGroup size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Perfiles</h3>
                <span className="ml-auto text-[11px] text-slate-400">
                  {selPerfiles.size} seleccionado{selPerfiles.size !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="relative mb-2">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar perfil..."
                  value={searchPerfil}
                  onChange={(e) => setSearchPerfil(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredPerfiles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-4">
                    {perfiles.length === 0 ? "No hay perfiles disponibles" : "Sin resultados"}
                  </p>
                ) : (
                  filteredPerfiles.map((p) => (
                    <CheckItem
                      key={p.perfilesId}
                      checked={selPerfiles.has(p.perfilesId)}
                      loading={togglingIds.has(p.perfilesId)}
                      label={p.descripcion ?? p.perfilesId}
                      sublabel={p.detalle}
                      onChange={(v) => togglePerfil(p.perfilesId, v)}
                    />
                  ))
                )}
              </div>
            </section>

            {/* ── PUNTOS DE VENTA ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <IconBuildingStore size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Puntos de Venta</h3>
                <span className="ml-auto text-[11px] text-slate-400">
                  {selPuntos.size} seleccionado{selPuntos.size !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="relative mb-2">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar punto de venta..."
                  value={searchPunto}
                  onChange={(e) => setSearchPunto(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredPuntos.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-4">
                    {puntosVenta.length === 0 ? "No hay puntos de venta disponibles" : "Sin resultados"}
                  </p>
                ) : (
                  filteredPuntos.map((p) => (
                    <CheckItem
                      key={p.puntoventaId}
                      checked={selPuntos.has(p.puntoventaId)}
                      loading={togglingIds.has(p.puntoventaId)}
                      label={p.descripcion ?? p.puntoventaId}
                      sublabel={p.serie ? `Serie: ${p.serie}` : undefined}
                      onChange={(v) => togglePunto(p.puntoventaId, v)}
                    />
                  ))
                )}
              </div>
            </section>

          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
