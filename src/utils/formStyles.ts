// src/utils/formStyles.ts

export const FORM_STYLES = {
    // Estilo base para todos los inputs
    base: "w-full p-2.5 border rounded-lg outline-none transition-all text-xs font-medium font-mono disabled:opacity-70",
    
    // Estados
    normal: "bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-700",
    error: "bg-red-50 border-red-500 focus:ring-2 focus:ring-red-200 text-red-800 placeholder-red-300",
    disabled: "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed",
    
    // Labels
    label: "text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block",
    labelError: "text-red-500",
    
    // Mensaje de error (texto pequeño abajo)
    errorMessage: "text-[10px] text-red-500 mt-1 ml-1 flex items-center gap-1",
};

// Función helper para combinar clases limpiamente
export const getInputClasses = (hasError: boolean, disabled: boolean = false, extraClasses: string = "") => {
    const stateClass = disabled ? FORM_STYLES.disabled : hasError ? FORM_STYLES.error : FORM_STYLES.normal;
    return `${FORM_STYLES.base} ${stateClass} ${extraClasses}`;
};