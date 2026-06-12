"use client";
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
    IconAlertCircle,
    IconChartBar,
    IconChevronDown,
    IconDownload,
    IconFileSpreadsheet,
    IconLoader,
    IconX,
} from '@tabler/icons-react';
import { reportesVentasService } from '@/services/reportesVentasService';
import documentoVentaService from '@/services/documentoventaService';
import pedidoventaService from '@/services/pedidoventaService';
import cotizacionService from '@/services/cotizacionService';
import apiClient from '@/api/apiCliente';
import SearchableSelect from '@/components/forms/SearchableSelect';
import DateInput from '@/components/forms/DateInput';

const EMPRESA_ID = '005';

type ReportType =
    | 'ventas-administrativo'
    | 'ventas-contable'
    | 'ncnd'
    | 'comprobantes-gratuitos'
    | 'importar-sistema-contable'
    | 'pedido-venta'
    | 'cotizacion';

type ReportItem = { id: ReportType; title: string };
type Section = { id: string; title: string; items: ReportItem[] };
type Tab = { id: string; title: string; sections: Section[] };

const REPORT_TITLES: Record<ReportType, string> = {
    'ventas-administrativo':    'Reporte de Ventas Administrativo',
    'ventas-contable':          'Reporte de Ventas Contable',
    'ncnd':                     'Reporte de Notas de Crédito y Débito',
    'comprobantes-gratuitos':   'Reporte de Facturas, Boletas y NC/ND Gratuitas',
    'importar-sistema-contable':'Reporte de Comprobantes para Sistema Contable',
    'pedido-venta':             'Reporte de Pedidos de Venta',
    'cotizacion':               'Reporte de Cotizaciones',
};

const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 placeholder:text-slate-400';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5';

function reorderForExcel(data: any[]): any[] {
    if (data.length === 0) return data;

    const keys = Object.keys(data[0]);

    // Columnas que siempre van primero (en este orden)
    const PRIORITY: Array<(k: string) => boolean> = [
        (k) => /sede|sucursal/i.test(k),
        (k) => /punto.?venta/i.test(k),
    ];

    const priority: string[] = [];
    const rest: string[] = [];

    for (const key of keys) {
        const slot = PRIORITY.findIndex((fn) => fn(key));
        if (slot !== -1) {
            priority[slot] = key;
        } else {
            rest.push(key);
        }
    }

    const ordered = [...priority.filter(Boolean), ...rest];

    return data.map((row) => {
        const r: any = {};
        for (const k of ordered) r[k] = row[k];
        return r;
    });
}

function exportToExcel(data: any[], reportTitle: string) {
    const ordered = reorderForExcel(data);
    if (!ordered.length) return;

    const keys = Object.keys(ordered[0]);
    const ws: any = {};

    // ── Estilos ────────────────────────────────────────────────────────────────
    const HEADER_BG  = '2F5496'; // azul oscuro
    const EVEN_BG    = 'D9E1F2'; // azul claro (filas pares)
    const ODD_BG     = 'FFFFFF'; // blanco (filas impares)

    const baseFont = { name: 'Calibri', sz: 10 };

    const headerStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: HEADER_BG } },
        font: { ...baseFont, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
        border: {
            bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
            right:  { style: 'thin', color: { rgb: HEADER_BG } },
        },
    };

    // ── Cabecera (fila 0) ──────────────────────────────────────────────────────
    keys.forEach((key, c) => {
        ws[XLSX.utils.encode_cell({ r: 0, c })] = {
            v: key, t: 's', s: headerStyle,
        };
    });

    // ── Datos (filas 1…n) ─────────────────────────────────────────────────────
    ordered.forEach((row, ri) => {
        const bgRgb = ri % 2 === 0 ? EVEN_BG : ODD_BG;
        const rowStyle = {
            fill: { patternType: 'solid', fgColor: { rgb: bgRgb } },
            font: baseFont,
            alignment: { vertical: 'center' },
        };

        keys.forEach((key, c) => {
            const raw = row[key];
            const isNum = typeof raw === 'number';
            ws[XLSX.utils.encode_cell({ r: ri + 1, c })] = {
                v: raw ?? '',
                t: isNum ? 'n' : 's',
                s: { ...rowStyle, alignment: { ...rowStyle.alignment, horizontal: isNum ? 'right' : 'left' } },
            };
        });
    });

    // ── Rango, anchos, filtro, freeze ──────────────────────────────────────────
    ws['!ref'] = XLSX.utils.encode_range(
        { r: 0, c: 0 },
        { r: ordered.length, c: keys.length - 1 }
    );

    ws['!cols'] = keys.map((key) => ({
        wch: Math.min(
            Math.max(key.length, ...ordered.slice(0, 200).map((r) => String(r[key] ?? '').length)) + 2,
            60
        ),
    }));

    ws['!autofilter'] = { ref: ws['!ref'] };
    ws['!freeze']     = { xSplit: 0, ySplit: 1 } as any;

    // ── Escribir archivo ───────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `${reportTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function ReportesVentasPage() {
    const [activeTab, setActiveTab]         = useState('generales');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ventas-facturacion']));
    const [activeReport, setActiveReport]   = useState<ReportType | null>(null);

    // Filters
    const [fechaInicial,  setFechaInicial]  = useState('');
    const [fechaFinal,    setFechaFinal]    = useState('');
    const [puntoventaId,  setPuntoventaId]  = useState('');
    const [sedeId,        setSedeId]        = useState('');
    const [asientoAnterior, setAsientoAnterior] = useState('');
    const [isDetallado,     setIsDetallado]     = useState(false);

    // Todos los PV con su sedeId para cascada
    const [allPvOptions, setAllPvOptions] = useState<{ key: string; value: string; sedeId: string }[]>([]);
    const [loadingPv,    setLoadingPv]    = useState(false);

    // Sede options
    const [sedeOptions, setSedeOptions] = useState<{ key: string; value: string }[]>([]);
    const [loadingSede, setLoadingSede] = useState(false);

    useEffect(() => {
        let alive = true;

        // Cargar puntos de venta con sedeId desde el raw API
        setLoadingPv(true);
        apiClient
            .get('/DocumentoVenta/form-dropdowns', { params: { empresaId: EMPRESA_ID, tenantId: '1' } })
            .then(({ data }) => {
                if (!alive) return;
                const payload  = data?.value ?? data;
                const pvRaw: any[] = payload?.data?.punto_venta ?? payload?.punto_venta ?? [];
                setAllPvOptions(
                    pvRaw.map((pv) => ({
                        key:    String(pv.key    ?? pv.puntoventaId ?? '').trim(),
                        value:  String(pv.value  ?? pv.descripcion  ?? '').trim(),
                        sedeId: String(pv.sedeId ?? pv.sede_id      ?? '').trim(),
                    }))
                );
            })
            .catch(() => { if (alive) setAllPvOptions([]); })
            .finally(() => { if (alive) setLoadingPv(false); });

        // Cargar sedes
        setLoadingSede(true);
        apiClient
            .get(`/Sede/${EMPRESA_ID}`)
            .then(({ data }) => {
                if (!alive) return;
                const raw: any[] = data?.data ?? data?.value?.data ?? (Array.isArray(data) ? data : []);
                setSedeOptions([
                    { key: '', value: 'Todos' },
                    ...raw.map((s) => ({
                        key:   String(s.sedeId ?? s.sede_id ?? '').trim(),
                        value: String(s.descripcion ?? s.nombre ?? '').trim(),
                    })),
                ]);
            })
            .catch(() => { if (alive) setSedeOptions([{ key: '', value: 'Todos' }]); })
            .finally(() => { if (alive) setLoadingSede(false); });

        return () => { alive = false; };
    }, []);

    // PV filtrados según la sede seleccionada (cascada)
    const pvOptions = useMemo(() => {
        const filtered = sedeId
            ? allPvOptions.filter((pv) => pv.sedeId === sedeId)
            : allPvOptions;
        return [{ key: '', value: 'Todos' }, ...filtered];
    }, [sedeId, allPvOptions]);

    // Al cambiar sede, limpiar PV si ya no pertenece a la nueva sede
    useEffect(() => {
        if (!puntoventaId) return;
        const stillValid = allPvOptions.some(
            (pv) => pv.key === puntoventaId && (!sedeId || pv.sedeId === sedeId)
        );
        if (!stillValid) setPuntoventaId('');
    }, [sedeId, allPvOptions]); // eslint-disable-line react-hooks/exhaustive-deps

    // Export state
    const [exporting, setExporting] = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    const tabs: Tab[] = useMemo(() => [
        {
            id: 'generales',
            title: 'Reportes Generales',
            sections: [
                {
                    id: 'ventas-facturacion',
                    title: 'Ventas y Facturación',
                    items: [
                        { id: 'ventas-administrativo',    title: 'Reporte de Ventas Administrativo' },
                        { id: 'ventas-contable',          title: 'Reporte de Ventas Contable' },
                        { id: 'ncnd',                     title: 'Reporte de Notas de Crédito y Débito' },
                        { id: 'comprobantes-gratuitos',   title: 'Reporte de Facturas, Boletas y NC/ND Gratuitas' },
                        { id: 'importar-sistema-contable',title: 'Reporte de Comprobantes Electrónicos para Sistema Contable' },
                    ],
                },
                {
                    id: 'pedidos-venta',
                    title: 'Pedidos de Venta',
                    items: [
                        { id: 'pedido-venta', title: 'Reporte de Pedidos de Venta' },
                    ],
                },
                {
                    id: 'cotizaciones',
                    title: 'Cotizaciones',
                    items: [
                        { id: 'cotizacion', title: 'Reporte de Cotizaciones' },
                    ],
                },
            ],
        },
        { id: 'distribucion', title: 'Distribución de Ventas', sections: [] },
        { id: 'vendedor',     title: 'Ventas por Vendedor',    sections: [] },
    ], []);

    const toggleSection = (id: string) =>
        setExpandedSections((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const handleOpenReport = (type: ReportType) => {
        setActiveReport(type);
        setError(null);
        setPuntoventaId('');
        setSedeId('');
        setAsientoAnterior('');
        setIsDetallado(false);
    };

    const isExportarDisabled = useCallback(() => {
        if (!activeReport || exporting) return true;
        if (!fechaInicial || !fechaFinal) return true;
        if (activeReport === 'importar-sistema-contable') {
            return !asientoAnterior.trim() || isNaN(parseInt(asientoAnterior));
        }
        return false;
    }, [activeReport, exporting, fechaInicial, fechaFinal, asientoAnterior]);

    const handleExportar = useCallback(async () => {
        if (!activeReport) return;
        setExporting(true);
        setError(null);

        const E  = EMPRESA_ID;
        const fi = fechaInicial;
        const ff = fechaFinal;
        const pv = puntoventaId || undefined;
        console.log('[Exportar]', { reporte: activeReport, fi, ff, pv, sedeId, isDetallado });
        const s  = sedeId || undefined;

        try {
            let data: any[] = [];

            if (activeReport === 'ventas-administrativo') {
                data = isDetallado
                    ? await reportesVentasService.getVentasGeneralDetallado(E, fi, ff, pv, s)
                    : await reportesVentasService.getVentasGeneral(E, fi, ff, pv, s);
            } else if (activeReport === 'ventas-contable') {
                data = await reportesVentasService.getVentasContable(E, fi, ff, pv, s);
            } else if (activeReport === 'ncnd') {
                data = isDetallado
                    ? await reportesVentasService.getNcNdGeneralDetallado(E, fi, ff, pv, s)
                    : await reportesVentasService.getNcNdGeneral(E, fi, ff, pv, s);
            } else if (activeReport === 'comprobantes-gratuitos') {
                data = await reportesVentasService.getComprobantesGratuitos(E, fi, ff);
            } else if (activeReport === 'importar-sistema-contable') {
                data = await reportesVentasService.getReporteImportarSisContable(E, fi, ff, parseInt(asientoAnterior));
            } else if (activeReport === 'pedido-venta') {
                const result = await pedidoventaService.getAll(
                    E, 1, 9999, undefined,
                    { fechaDesde: fi, fechaHasta: ff } as any
                );
                data = result.data;
            } else if (activeReport === 'cotizacion') {
                const result = await cotizacionService.getAll(
                    E, 1, 9999, undefined,
                    { fechaDesde: fi, fechaHasta: ff }
                );
                data = result.data;
            }

            if (data.length === 0) {
                setError('No se encontraron datos con los filtros indicados.');
                return;
            }

            exportToExcel(data, REPORT_TITLES[activeReport]);
            setActiveReport(null);
        } catch (err: any) {
            setError(err.response?.data?.message ?? err.message ?? 'Error al exportar el reporte.');
        } finally {
            setExporting(false);
        }
    }, [activeReport, fechaInicial, fechaFinal, puntoventaId, sedeId, asientoAnterior, isDetallado]);

    const soloFechas    = activeReport === 'pedido-venta' || activeReport === 'cotizacion';
    const showSedeField = !soloFechas
        && activeReport !== 'comprobantes-gratuitos'
        && activeReport !== 'importar-sistema-contable';
    const currentTab    = tabs.find((t) => t.id === activeTab)!;

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Breadcrumb */}
            <div className="border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center gap-1.5 text-sm">
                    <IconChartBar size={15} className="text-blue-600" />
                    <span className="text-blue-600">Modulo Ventas</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-semibold text-slate-600">Reportes</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-semibold text-slate-800">Reportes de Ventas</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 bg-white px-6">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {currentTab.sections.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                        Próximamente disponible.
                    </div>
                ) : (
                    <div className="max-w-5xl space-y-2">
                        {currentTab.sections.map((section) => {
                            const isOpen = expandedSections.has(section.id);
                            return (
                                <div key={section.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(section.id)}
                                        className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50"
                                    >
                                        <span className="text-sm font-semibold text-slate-700">{section.title}</span>
                                        {section.items.length > 0 && (
                                            <IconChevronDown
                                                size={18}
                                                className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </button>

                                    {isOpen && section.items.length > 0 && (
                                        <div className="border-t border-slate-100">
                                            {section.items.map((item, idx) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleOpenReport(item.id)}
                                                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm text-blue-600 transition hover:bg-blue-50 ${idx !== section.items.length - 1 ? 'border-b border-slate-50' : ''}`}
                                                >
                                                    <IconFileSpreadsheet size={18} className="shrink-0 text-orange-400" />
                                                    {item.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Export Modal */}
            <div
                className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity ${activeReport ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={() => !exporting && setActiveReport(null)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-200 ${activeReport ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header verde */}
                    <div className="flex items-center justify-between bg-emerald-600 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <IconFileSpreadsheet size={22} className="shrink-0 text-white" />
                            <h3 className="text-base font-bold text-white">
                                {activeReport ? REPORT_TITLES[activeReport] : ''}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => !exporting && setActiveReport(null)}
                            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                        >
                            <IconX size={18} />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="space-y-4 px-6 py-5">
                        {/* Sede — siempre primero */}
                        {showSedeField && (
                            <SearchableSelect
                                label="Sede"
                                name="sedeId"
                                value={sedeId}
                                options={sedeOptions}
                                disabled={loadingSede}
                                placeholder={loadingSede ? 'Cargando...' : 'Seleccione una sede'}
                                onChange={(e: any) => setSedeId(String(e.target.value))}
                            />
                        )}

                        {/* Punto de Venta — bloqueado hasta tener sede */}
                        {!soloFechas && (
                            <div className="relative">
                                <SearchableSelect
                                    label="Punto de Venta"
                                    name="puntoventaId"
                                    value={puntoventaId}
                                    options={pvOptions}
                                    disabled={loadingPv || !sedeId}
                                    placeholder={
                                        loadingPv  ? 'Cargando...' :
                                        !sedeId    ? 'Seleccione primero una sede' :
                                                     'Todos'
                                    }
                                    onChange={(e: any) => setPuntoventaId(String(e.target.value))}
                                />
                            </div>
                        )}

                        {/* Fechas */}
                        <DateInput
                            label="Fecha Inicial"
                            name="fechaInicial"
                            value={fechaInicial}
                            separator="-"
                            onChange={(e) => setFechaInicial(e.target.value)}
                        />
                        <DateInput
                            label="Fecha Final"
                            name="fechaFinal"
                            value={fechaFinal}
                            separator="-"
                            onChange={(e) => setFechaFinal(e.target.value)}
                        />

                        {/* Asiento Anterior (solo importar-sistema-contable) */}
                        {activeReport === 'importar-sistema-contable' && (
                            <div>
                                <label className={labelClass}>Asiento Anterior</label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    placeholder="Ej: 1500"
                                    min={0}
                                    value={asientoAnterior}
                                    onChange={(e) => setAsientoAnterior(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Checkbox Detallado — solo para ventas-administrativo y ncnd */}
                        {(activeReport === 'ventas-administrativo' || activeReport === 'ncnd') && (
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700">
                                <input
                                    type="checkbox"
                                    checked={isDetallado}
                                    onChange={(e) => setIsDetallado(e.target.checked)}
                                    className="rounded border-slate-300 accent-emerald-600"
                                />
                                Detallado
                            </label>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => !exporting && setActiveReport(null)}
                            disabled={exporting}
                            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleExportar}
                            disabled={isExportarDisabled()}
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exporting
                                ? <IconLoader size={16} className="animate-spin" />
                                : <IconDownload size={16} />
                            }
                            {exporting ? 'Exportando...' : 'Exportar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
