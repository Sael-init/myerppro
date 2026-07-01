"use client";
import { useState, useRef, useEffect } from 'react';
import {
    IconEdit,
    IconBan,
    IconEye,
    IconTrash,
    IconDotsVertical,
    IconCloudUpload,
    IconReceipt,
    IconPrinter,
    IconDownload,
    IconRoute,
} from '@tabler/icons-react';

interface ActionMenuProps {
    onEdit?:          () => void;
    onAnular?:        () => void;
    onDelete?:        () => void;
    onView:           () => void;
    onValidarSunat?:  () => void;
    onBoletear?:      () => void;
    onImprimir?:      () => void;
    onDescargar?:     () => void;
    onTrazabilidad?:  () => void;
    isAnulado?:       boolean;
    label?:           string;
}

export default function ActionMenu({
    onEdit,
    onAnular,
    onDelete,
    onView,
    onValidarSunat,
    onBoletear,
    onImprimir,
    onDescargar,
    onTrazabilidad,
    isAnulado = false,
    label,
}: ActionMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const opciones = [
        {
            label:    'Ver detalle',
            icon:     <IconEye size={15} />,
            onClick:  onView,
            disabled: false,
            color:    'text-slate-700 hover:bg-slate-50',
        },
        {
            label:    'Editar',
            icon:     <IconEdit size={15} />,
            onClick:  onEdit,
            disabled: isAnulado || !onEdit,
            color:    !isAnulado && onEdit
                ? 'text-blue-700 hover:bg-blue-50'
                : 'text-slate-300 cursor-not-allowed',
        },
        {
            label:    'Anular',
            icon:     <IconBan size={15} />,
            onClick:  onAnular,
            disabled: isAnulado || !onAnular,
            color:    !isAnulado && onAnular
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-slate-300 cursor-not-allowed',
        },
        {
            label:    'Validar en SUNAT',
            icon:     <IconCloudUpload size={15} />,
            onClick:  onValidarSunat,
            disabled: isAnulado || !onValidarSunat,
            color:    !isAnulado && onValidarSunat
                ? 'text-emerald-700 hover:bg-emerald-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onValidarSunat,
        },
        {
            label:    'Boletear',
            icon:     <IconReceipt size={15} />,
            onClick:  onBoletear,
            disabled: isAnulado || !onBoletear,
            color:    !isAnulado && onBoletear
                ? 'text-violet-700 hover:bg-violet-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onBoletear,
        },
        {
            label:    'Imprimir',
            icon:     <IconPrinter size={15} />,
            onClick:  onImprimir,
            disabled: !onImprimir,
            color:    onImprimir
                ? 'text-sky-700 hover:bg-sky-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onImprimir,
        },
        {
            label:    'Trazabilidad',
            icon:     <IconRoute size={15} />,
            onClick:  onTrazabilidad,
            disabled: !onTrazabilidad,
            color:    onTrazabilidad
                ? 'text-indigo-700 hover:bg-indigo-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onTrazabilidad,
        },
        {
            label:    'Descargar Sunat',
            icon:     <IconDownload size={15} />,
            onClick:  onDescargar,
            disabled: !onDescargar,
            color:    onDescargar
                ? 'text-teal-700 hover:bg-teal-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onDescargar,
        },
        {
            label:    'Eliminar',
            icon:     <IconTrash size={15} />,
            onClick:  onDelete,
            disabled: !isAnulado || !onDelete,
            color:    isAnulado && onDelete
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-300 cursor-not-allowed',
            hidden:   !onDelete,
        },
    ];

    return (
        <div className="relative flex justify-center" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
                <IconDotsVertical size={18} />
            </button>

            {open && (
                <div className="absolute right-0 top-8 z-[200] w-52 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {label && (
                        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase border-b ${
                            isAnulado
                                ? 'bg-red-50 text-red-500 border-red-100'
                                : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                            {label}
                        </div>
                    )}

                    {opciones
                        .filter((op) => !op.hidden)
                        .map((op, i) => (
                            <button
                                key={i}
                                disabled={op.disabled}
                                onClick={() => {
                                    if (op.disabled) return;
                                    setOpen(false);
                                    op.onClick?.();
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${op.color}`}
                            >
                                {op.icon}
                                {op.label}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}