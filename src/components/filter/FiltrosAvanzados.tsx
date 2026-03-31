"use client";
import { IconFilter, IconX, IconCheck, IconFilterOff } from '@tabler/icons-react';

interface FiltrosAvanzadosProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
    onClear: () => void;
    children: React.ReactNode;
    totalActive?: number;
}

export default function FiltrosAvanzados({ 
    isOpen, 
    onClose, 
    onApply, 
    onClear, 
    children, 
    totalActive = 0 
}: FiltrosAvanzadosProps) {
    return (
        <>
            {/* Backdrop - Fondo oscuro con desenfoque */}
            <div 
                className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[60] transition-opacity duration-300 
                    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Panel Lateral (Drawer) */}
            <div className={`fixed inset-y-0 right-0 z-[70] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col 
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header del Panel */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <IconFilter size={20} className="text-blue-600"/> Filtros
                        </h3>
                        {totalActive > 0 && (
                            <span className="text-xs text-blue-600 font-semibold">{totalActive} activos</span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors">
                        <IconX size={20} />
                    </button>
                </div>

                {/* Cuerpo del Panel (Contenedor de los Selects) */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
                    {children}
                </div>

                {/* Footer con Botones de Acción */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                    <button 
                        onClick={() => { onApply(); onClose(); }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                        <IconCheck size={18} /> Aplicar Filtros
                    </button>
                    <button 
                        onClick={onClear}
                        className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        <IconFilterOff size={16} /> Limpiar todo
                    </button>
                </div>
            </div>
        </>
    );
}