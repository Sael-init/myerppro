// src/types/catalog.types.ts
export interface SelectOption {
    value: string | number;
    label: string;
    aux?: string;
    groupKey?: string | number; // CLAVE para combos dependientes (ej. marcaId para modelos)
    originalData?: any; 
}

export interface CatalogDictionary {
    [key: string]: SelectOption[];
}