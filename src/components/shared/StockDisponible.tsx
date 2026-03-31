"use client";

import { useState, useEffect } from "react";
import pedidoventaService from "@/services/pedidoventaService";

// ── Colores para los chips de almacén ────────────────────────────────────────
const CHIP_COLORS = [
  { chip: "bg-orange-100 text-orange-700 border-orange-200", header: "bg-orange-50" },
  { chip: "bg-blue-100 text-blue-700 border-blue-200",       header: "bg-blue-50" },
  { chip: "bg-green-100 text-green-700 border-green-200",    header: "bg-green-50" },
  { chip: "bg-purple-100 text-purple-700 border-purple-200", header: "bg-purple-50" },
  { chip: "bg-pink-100 text-pink-700 border-pink-200",       header: "bg-pink-50" },
  { chip: "bg-cyan-100 text-cyan-700 border-cyan-200",       header: "bg-cyan-50" },
];

const fmt = (n: number) =>
  n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) =>
  Math.floor(n).toLocaleString("es-PE");

interface StockDisponibleProps {
  empresaId: string;
  bienId: string;
  bienNombre: string;
  onClose: () => void;
}

export default function StockDisponible({
  empresaId,
  bienId,
  bienNombre,
  onClose,
}: StockDisponibleProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof pedidoventaService.getStockBien>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    pedidoventaService
      .getStockBien(empresaId, bienId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [empresaId, bienId]);

  // ── Columnas de almacén (claves dinámicas) ──────────────────────────────
  const almacenKeys: string[] = data?.stock_almacenes?.length
    ? Object.keys(data.stock_almacenes[0]).filter((k) => k !== "presentacion")
    : [];

  // ── Stock disponible base (kg) para equivalencias ───────────────────────
  const stockDisponibleKg = data?.stock_empresa?.[0]?.stock_disponible ?? 0;
  const stockRealKg       = data?.stock_empresa?.[0]?.stock_real       ?? 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Stock disponible</p>
            <h2 className="text-sm font-bold text-blue-700 uppercase">{bienNombre}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center h-40 text-slate-400 text-sm">
              Cargando stock...
            </div>
          )}

          {error && (
            <div className="flex justify-center items-center h-40 text-red-500 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="grid grid-cols-3 gap-6">

              {/* ── Columna izquierda: stock empresa + equivalencias ── */}
              <div className="col-span-1 flex flex-col gap-4">

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Stock por empresa</p>

                  {/* Stock real */}
                  <div className="border border-green-200 rounded-xl p-4 mb-3">
                    <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Stock real</p>
                    <p className="text-3xl font-bold text-slate-800">{fmt(stockRealKg)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">kg</p>
                  </div>

                  {/* Stock disponible */}
                  <div className="bg-yellow-400 rounded-xl p-4">
                    <p className="text-[9px] font-bold text-yellow-900 uppercase mb-1">Stock disponible</p>
                    <p className="text-3xl font-bold text-yellow-900">{fmt(stockDisponibleKg)}</p>
                    <p className="text-[10px] text-yellow-800 mt-0.5">kg disponibles</p>
                  </div>
                </div>

                {/* Equivalencias posibles */}
                {data.presentaciones?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                      Equivalencias posibles para venta
                    </p>
                    <div className="flex flex-col gap-2">
                      {data.presentaciones.filter((p) => p.cantidad > 1).map((pres) => {
                        const posibles = pres.cantidad > 0
                          ? Math.floor(stockDisponibleKg / pres.cantidad)
                          : 0;
                        return (
                          <div
                            key={pres.presentacionId}
                            className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-xs text-slate-600 font-medium">
                                {pres.descripcion.trim()}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-slate-800">
                              {fmtInt(posibles)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Columna derecha: stock por almacén ── */}
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Stock por almacén</p>

                {/* Chips de almacén */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {almacenKeys.map((key, i) => {
                    const color = CHIP_COLORS[i % CHIP_COLORS.length];
                    // El nombre del almacén viene como "ALMACEN X - Real" → quitar el sufijo
                    const nombre = key.replace(/ - Real$/, "").replace(/ - real$/, "");
                    return (
                      <span
                        key={key}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${color.chip}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {nombre}
                      </span>
                    );
                  })}
                </div>

                {/* Tabla stock por almacén */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px]">
                          Presentación
                        </th>
                        {almacenKeys.map((key, i) => {
                          const color = CHIP_COLORS[i % CHIP_COLORS.length];
                          const nombre = key.replace(/ - Real$/, "").replace(/ - real$/, "");
                          return (
                            <th
                              key={key}
                              className={`px-3 py-2.5 text-center font-bold text-[10px] uppercase ${color.header}`}
                            >
                              {nombre}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {data.stock_almacenes.map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-3 py-2.5 font-semibold text-slate-700">
                            {row.presentacion}
                          </td>
                          {almacenKeys.map((key) => {
                            const val = Number(row[key] ?? 0);
                            const isZero = val === 0;
                            return (
                              <td key={key} className="px-3 py-2.5 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    isZero
                                      ? "bg-red-50 text-red-400 border border-red-100"
                                      : "bg-green-50 text-green-700 border border-green-200"
                                  }`}
                                >
                                  {fmt(val)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
