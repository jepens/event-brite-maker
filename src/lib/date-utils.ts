import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { id } from 'date-fns/locale';

// Default timezone untuk Indonesia (WIB)
const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Utility functions untuk handling tanggal dan waktu dengan timezone yang konsisten
 */

/**
 * Parse tanggal dari string ISO dengan timezone
 */
export function parseDateWithTimezone(dateString: string, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    // Jika sudah ada timezone info, gunakan parseISO
    if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
      return parseISO(dateString);
    }
    
    // Jika tidak ada timezone info, asumsikan WIB
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
}

/**
 * Format tanggal untuk display di UI (tanpa timezone conversion)
 */
export function formatDateForDisplay(dateString: string, formatString: string = 'EEEE, MMMM d, yyyy'): string {
  try {
    const date = parseDateWithTimezone(dateString);
    return format(date, formatString, { locale: id });
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return 'Invalid Date';
  }
}

/**
 * Format waktu untuk display di UI
 */
export function formatTimeForDisplay(dateString: string, formatString: string = 'h:mm a'): string {
  try {
    const date = parseDateWithTimezone(dateString);
    return format(date, formatString, { locale: id });
  } catch (error) {
    console.error('Error formatting time for display:', error);
    return 'Invalid Time';
  }
}

/**
 * Format tanggal dan waktu lengkap untuk display
 */
export function formatDateTimeForDisplay(dateString: string): string {
  try {
    const date = parseDateWithTimezone(dateString);
    return format(date, 'EEEE, MMMM d, yyyy h:mm a', { locale: id });
  } catch (error) {
    console.error('Error formatting datetime for display:', error);
    return 'Invalid Date';
  }
}

/**
 * Format tanggal untuk input datetime-local (tanpa timezone)
 */
export function formatDateForInput(dateString: string): string {
  try {
    const date = parseDateWithTimezone(dateString);
    // Format untuk input datetime-local: YYYY-MM-DDTHH:mm
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Convert tanggal ke ISO string dengan timezone WIB
 */
export function toISOStringWithTimezone(dateString: string): string {
  try {
    const date = parseDateWithTimezone(dateString);
    // Convert ke WIB timezone
    return formatInTimeZone(date, DEFAULT_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
  } catch (error) {
    console.error('Error converting to ISO string:', error);
    return new Date().toISOString();
  }
}

/**
 * Format tanggal untuk WhatsApp (Indonesia locale)
 */
export function formatDateForWhatsApp(dateString: string, useShort: boolean = false): string {
  try {
    const date = parseDateWithTimezone(dateString);
    
    if (useShort) {
      // Format pendek: "25 Jan 2024"
      return format(date, 'd MMM yyyy', { locale: id });
    }
    
    // Format default: "Jumat, 8 Agustus 2025"
    return format(date, 'EEEE, d MMMM yyyy', { locale: id });
  } catch (error) {
    console.error('Error formatting date for WhatsApp:', error);
    return 'Invalid Date';
  }
}

/**
 * Format waktu untuk WhatsApp
 */
export function formatTimeForWhatsApp(dateString: string): string {
  try {
    const date = parseDateWithTimezone(dateString);
    return format(date, 'HH:mm', { locale: id });
  } catch (error) {
    console.error('Error formatting time for WhatsApp:', error);
    return 'Invalid Time';
  }
}

/**
 * Format tanggal untuk email
 */
export function formatDateForEmail(dateString: string): string {
  try {
    const date = parseDateWithTimezone(dateString);
    return format(date, 'EEEE, MMMM d, yyyy h:mm a', { locale: id });
  } catch (error) {
    console.error('Error formatting date for email:', error);
    return 'Invalid Date';
  }
}

/**
 * Get current timezone offset untuk debugging
 */
export function getCurrentTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? '+' : '-';
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Validate apakah string adalah tanggal yang valid
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = parseDateWithTimezone(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Get timezone info untuk debugging
 */
export function getTimezoneInfo(): {
  timezone: string;
  offset: string;
  currentTime: string;
} {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: getCurrentTimezoneOffset(),
    currentTime: new Date().toISOString()
  };
} 