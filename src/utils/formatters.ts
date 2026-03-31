/**
 * Formatea un número a moneda peruana (Soles)
 */
export const formatMoney = (amount: number | null | undefined): string => {
    if (amount === undefined || amount === null) return "S/ 0.00";
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
    }).format(amount);
};

/**
 * Formatea fechas para mostrar en tablas (DD/MM/YYYY)
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE');
};