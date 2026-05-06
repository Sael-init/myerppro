// src/hooks/useCatalogs.ts
import { useState, useEffect } from 'react';
import { catalogService } from '@/services/catalogService';
import { CatalogDictionary } from '@/types/catalog.types';

export interface CatalogRequest {
    endpoint: string;
    params?: Record<string, unknown>;
}

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

export function useCatalogs(requests: (string | CatalogRequest)[]) {
    const [catalogs, setCatalogs] = useState<CatalogDictionary>({});
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshCatalogs = () => {
        catalogService.clearCache();
        setRefreshTrigger(prev => prev + 1);
    };

    // Normalizamos requests mixtos (string | objeto) en una sola estructura.
    // Serialización estable para dependencias y evitar refetch por identidad de objetos.
    const serializedRequests = stableStringify(
        requests.map((req) =>
            typeof req === 'string'
                ? { endpoint: req, params: {} }
                : { endpoint: req.endpoint, params: req.params || {} }
        )
    );

    useEffect(() => {
        let isMounted = true;
        const normalizedRequests = JSON.parse(serializedRequests) as CatalogRequest[];
        
        const fetchAllCatalogs = async () => {
            setLoadingCatalogs(true);
            try {
                // Gracias a nuestro nuevo servicio, si piden el mismo endpoint, 
                // se resolverá de inmediato sin llamar a la API doble vez.
                const results = await Promise.all(
                    normalizedRequests.map((req) =>
                        catalogService.getDynamicCatalog(req.endpoint, req.params)
                    )
                );
                
                if (isMounted) {
                    const newCatalogs: CatalogDictionary = {};
                    normalizedRequests.forEach((req, index) => {
                        newCatalogs[req.endpoint] = results[index];
                    });
                    setCatalogs(newCatalogs);
                }
            } catch (error) {
                console.error("Error fetching catalogs", error);
            } finally {
                if (isMounted) setLoadingCatalogs(false);
            }
        };

        if (normalizedRequests.length > 0) fetchAllCatalogs();
        else {
            setCatalogs({});
            setLoadingCatalogs(false);
        }

        return () => { isMounted = false; };
    }, [serializedRequests, refreshTrigger]);

    return { catalogs, loadingCatalogs, refreshCatalogs };
}
