"use client";
import { useState } from 'react';
import { apiExternalService } from '@/services/apiExternalService';
import { IconAlertCircle, IconLoader, IconWorldSearch } from '@tabler/icons-react';
import { toast } from 'sonner';
import { FORM_STYLES, getInputClasses } from '@/utils/formStyles';

// Ampliamos los tipos soportados según tu nueva API
export type SearchType = 'RUC' | 'DNI' | 'CARNET' | 'PLACA' | 'LICENCIA';

interface Props {
    label?: string;
    name?: string;
    value: string;
    onChange: (e: any) => void;
    onSuccess: (data: any) => void; 
    type: SearchType;               
    empresaId: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    error?: boolean;
    errorText?: string;
}

export default function ExternalSearchInput({ 
    label, name, value, onChange, onSuccess, type, empresaId, 
    required, disabled, placeholder, className, error = false, errorText
}: Props) {
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!value) {
            toast.warning(`Ingrese un valor para buscar`);
            return;
        }

        setSearching(true);
        try {
            let response: any = null;

            // Switch actualizado con tus nuevos métodos del servicio
            switch (type) {
                case 'RUC':
                    response = await apiExternalService.getRuc(value, empresaId);
                    break;
                case 'DNI':
                    response = await apiExternalService.getDni(value, empresaId);
                    break;
                case 'CARNET':
                    response = await apiExternalService.getCarnetExtranjeria(value, empresaId);
                    break;
                case 'PLACA':
                    response = await apiExternalService.getPlaca(value, empresaId);
                    break;
                case 'LICENCIA':
                    response = await apiExternalService.getLicencia(value, empresaId);
                    break;
            }

            if (response?.isSuccess && response.data) {
                toast.success(`Datos de ${type} encontrados`);
                onSuccess(response.data);
            } else {
                toast.error(`No se encontraron datos para: ${value}`);
            }

        } catch (error) {
            toast.error("Error de conexión con el servicio externo");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className={`flex flex-col gap-1.5 text-left w-full ${className || ''}`}>
            {label && (
                <label className={`${FORM_STYLES.label} ${error ? FORM_STYLES.labelError : ''}`}>
                    {label} {error && '*'}
                </label>
            )}
            
            <div className="flex gap-2">
                <div className="relative w-full">
                    <input 
                        name={name}
                        value={value} 
                        onChange={onChange} 
                        required={required}
                        disabled={disabled || searching} 
                        placeholder={placeholder || `Buscar ${type}...`}
                        className={getInputClasses(
                            error,
                            !!(disabled || searching),
                            "font-mono font-bold uppercase pr-8"
                        )}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearch();
                            }
                        }}
                    />
                    {error && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                            <IconAlertCircle size={16} />
                        </div>
                    )}
                </div>
                
                {!disabled && (
                    <button 
                        type="button"
                        onClick={handleSearch}
                        disabled={searching || !value}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 rounded-lg px-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm active:scale-95"
                        title="Buscar datos"
                    >
                        {searching ? <IconLoader className="animate-spin" size={20}/> : <IconWorldSearch size={20}/>}
                    </button>
                )}
            </div>

            {error && errorText && (
                <span className={FORM_STYLES.errorMessage}>
                    {errorText}
                </span>
            )}
        </div>
    );
}
