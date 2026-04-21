// utils/dateUtils.ts

/**
 * Format a UTC date string to Indian Standard Time (IST)
 */
export function formatToIST(dateString: string): string {
    try {
        const date = new Date(dateString);

        // Format in Indian locale with IST timezone
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        console.error('Error formatting date to IST:', e);
        return dateString; // Return original on error
    }
}

/**
 * Check if a date is today (in IST)
 */
export function isToday(dateString: string): boolean {
    const today = new Date();
    const date = new Date(dateString);

    const todayIST = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const dateIST = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    return (
        todayIST.getDate() === dateIST.getDate() &&
        todayIST.getMonth() === dateIST.getMonth() &&
        todayIST.getFullYear() === dateIST.getFullYear()
    );
}