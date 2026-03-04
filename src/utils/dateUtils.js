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
