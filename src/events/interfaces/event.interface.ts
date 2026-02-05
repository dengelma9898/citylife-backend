/**
 * Täglicher Zeitslot für ein Event
 */
export interface DailyTimeSlot {
  /**
   * Datum im ISO-Format (YYYY-MM-DD)
   */
  date: string;
  /**
   * Optionale Startzeit (HH:mm)
   */
  from?: string;
  /**
   * Optionale Endzeit (HH:mm)
   */
  to?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  /**
   * @deprecated Verwende stattdessen dailyTimeSlots für die Zeitplanung
   */
  startDate?: string;
  /**
   * @deprecated Verwende stattdessen dailyTimeSlots für die Zeitplanung
   */
  endDate?: string;
  titleImageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  favoriteCount?: number;
  ticketsNeeded?: boolean;
  /**
   * @deprecated
   * Preis als Zahl (für Rückwärtskompatibilität mit der App)
   * Die App erwartet ausschließlich Zahlen oder null
   */
  price?: number | null;
  /**
   * Preis als String für komplexe Preisstrukturen (z.B. "ab 10,00€", "Kostenlos", "15,00€ - 25,00€")
   * Wenn vorhanden, sollte dieser Wert für die Anzeige verwendet werden
   */
  priceString?: string;
  categoryId: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  isPromoted?: boolean;
  dailyTimeSlots?: DailyTimeSlot[];
  /**
   * Monat und Jahr des Events im Format MM.YYYY (z.B. "11.2024" für November 2024)
   * Wird verwendet, wenn nur der Monat/Jahr bekannt ist, aber nicht das genaue Datum
   */
  monthYear?: string;
}
