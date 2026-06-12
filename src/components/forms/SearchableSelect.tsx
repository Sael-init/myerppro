"use client";
import { useState, useEffect, useLayoutEffect, useCallback, useRef, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown, IconSearch, IconCheck } from '@tabler/icons-react';

interface Option {
    key: string | number;
    value: string;
    aux?: string | number;
}

interface Props {
    label?: string;
    name: string;
    value: string | number;
    onChange: (e: any) => void;
    options: Option[] | undefined;
    disabled?: boolean;
    placeholder?: string;
}

export default function SearchableSelect({ label, name, value, onChange, options = [], disabled, placeholder = "-- Seleccione --" }: Props) {
    const [isOpen,        setIsOpen]        = useState(false);
    const [searchTerm,    setSearchTerm]    = useState("");
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({ visibility: 'hidden' });
    const [mounted,       setMounted]       = useState(false);

    const containerRef  = useRef<HTMLDivElement>(null);
    const triggerRef    = useRef<HTMLDivElement>(null);
    const dropdownRef   = useRef<HTMLDivElement>(null);

    const filteredOptions = options?.filter(opt =>
        opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedLabel = options?.find(opt => String(opt.key) === String(value))?.value;

    useEffect(() => { setMounted(true); }, []);

    const updateDropdownPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
            position:   'fixed',
            top:        rect.bottom + 4,
            left:       rect.left,
            width:      Math.max(rect.width, 300),
            zIndex:     9999,
            visibility: 'visible',
        });
    }, []);

    // Corre sincrónicamente antes del paint → el dropdown ya tiene position:fixed
    // y coordenadas correctas en el primer frame, sin doble-paint
    useLayoutEffect(() => {
        if (!isOpen) return;
        updateDropdownPosition();
    }, [isOpen, updateDropdownPosition]);

    // Los listeners de reposicionamiento van en un useEffect separado
    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('scroll', updateDropdownPosition, true);
        window.addEventListener('resize', updateDropdownPosition);
        return () => {
            window.removeEventListener('scroll', updateDropdownPosition, true);
            window.removeEventListener('resize', updateDropdownPosition);
        };
    }, [isOpen, updateDropdownPosition]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideContainer = containerRef.current?.contains(target);
            const insideDropdown  = dropdownRef.current?.contains(target);
            if (!insideContainer && !insideDropdown) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dropdown = (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                    <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <ul className="min-h-[5rem] max-h-52 overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                        <li
                            key={opt.key}
                            onClick={() => {
                                onChange({ target: { name, value: opt.key } });
                                setIsOpen(false);
                                setSearchTerm("");
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between
                                ${String(opt.key) === String(value) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span>{opt.value}</span>
                            {String(opt.key) === String(value) && <IconCheck size={14} />}
                        </li>
                    ))
                ) : (
                    <li className="px-4 py-6 text-center text-xs text-slate-400 italic">No hay resultados</li>
                )}
            </ul>
        </div>
    );

    return (
        <div className="flex flex-col gap-1.5 relative text-left" ref={containerRef}>
            {label && <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>}
            <div
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(v => !v)}
                className={`w-full border p-2.5 rounded-lg flex justify-between items-center text-sm cursor-pointer transition-all
                    ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' :
                      isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
                <span className={`truncate ${!selectedLabel ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                    {selectedLabel || placeholder}
                </span>
                <IconChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {mounted && isOpen && createPortal(dropdown, document.body)}
        </div>
    );
}
