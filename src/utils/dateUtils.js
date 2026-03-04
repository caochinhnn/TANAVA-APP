/**
 * Returns a date string in YYYY-MM-DD format based on local time.
 * This avoids timezone shifts associated with .toISOString()
 */
export const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Converts a YYYY-MM-DD string or Date object to DD/MM/YYYY format
 */
export const formatDateVN = (dateInput) => {
    if (!dateInput || dateInput === 'N/A') return dateInput;

    let date;
    if (typeof dateInput === 'string') {
        // If string is YYYY-MM-DD
        const parts = dateInput.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        date = new Date(dateInput);
    } else {
        date = dateInput;
    }

    if (isNaN(date.getTime())) return dateInput;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};
