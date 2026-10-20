/**
 * Tulipános Porta és Vendégház - Booking Calendar
 * Backend: Public Google Calendar (iCal .ics or Google Calendar API v3)
 * Feature: Exclusively booking events starting at the day of arrival, ending at the day of leave.
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. CONFIGURATION
    // =========================================================================
    const CALENDAR_CONFIG = {
        /**
         * Your Google Calendar ID.
         * Example: 'tulipanosporta@gmail.com' or 'c_xxxxxxxx@group.calendar.google.com'
         * To get this from Google Calendar:
         * 1. Go to Google Calendar > Settings > Settings for my calendars > [Your Calendar]
         * 2. Ensure "Access permissions for events" has "Make available to public" checked.
         * 3. Copy the "Calendar ID" from the "Integrate calendar" section.
         */
        calendarId: '03e8ff330ee8f5ea4e06c5d0072677d647cf17c429b47702189c68ad1e808827@group.calendar.google.com',

        /**
         * Optional: Direct public iCal address.
         * If left empty, will be auto-generated from calendarId:
         * https://calendar.google.com/calendar/ical/{calendarId}/public/basic.ics
         */
        icalUrl: 'https://calendar.google.com/calendar/ical/03e8ff330ee8f5ea4e06c5d0072677d647cf17c429b47702189c68ad1e808827%40group.calendar.google.com/public/basic.ics',

        /**
         * Optional: Google Calendar API v3 Key (if you prefer Google API over iCal).
         */
        apiKey: '',

        /**
         * Netlify proxy path configured in `_redirects` to avoid CORS issues on Netlify.
         */
        netlifyProxyPath: '/api/calendar/',

        /**
         * In Google Calendar web UI, all-day events set from Oct 12 to Oct 16 are exported
         * by Google with DTEND=Oct 17 (RFC 5545 exclusive date).
         * If you entered your bookings with end date = departure date in Google's UI,
         * set this to true to subtract 1 day from Google's exclusive DTEND for all-day events.
         * If your events in iCal already have DTEND = leave date, set this to false.
         */
        googleAllDayEndIsExclusive: true,

        /**
         * Minimum consecutive nights policy
         */
        minNights: 2,

        /**
         * Pricing per night (matching the website's prices)
         */
        pricing: {
            preSeason: { start: '01-01', end: '04-15', price: 34000 },
            mainSeason: { start: '04-16', end: '10-15', price: 40000 },
            postSeason: { start: '10-16', end: '12-31', price: 34000 },
            taxPerPersonPerNight: 600
        }
    };

    // =========================================================================
    // 2. TRANSLATIONS (HU, EN, DE)
    // =========================================================================
    const CALENDAR_I18N = {
        hu: {
            bookingSectionTitle: 'Foglaltsági Naptár',
            bookingSectionSubtitle: 'Tekintse meg szabad időpontjainkat, vagy válassza ki a tervezett érkezés és távozás napját (minimum 2 éjszaka)!',
            today: 'Ma',
            prevMonth: 'Előző hónap',
            nextMonth: 'Következő hónap',
            syncLive: 'Naptár szinkronizálva',
            syncDemo: 'Hiba a naptár betöltésekor. A tényleges foglaltsági adatok nem látszanak, de érdeklődését továbbra is szívesen fogadjuk.',
            legendAvailable: 'Szabad',
            legendBooked: 'Foglalt',
            legendCheckIn: 'Érkezési nap (délután)',
            legendCheckOut: 'Távozási nap (délelőtt)',
            legendSelected: 'Kiválasztva',
            promptSelectDates: 'Kattintson az érkezési és távozási napra a naptárban a foglalási igényhez (minimum 2 éjszaka).',
            promptSelectDeparture: 'Most kattintson a távozás napjára (legalább 2 éjszaka)!',
            selectedArrival: 'Érkezés',
            selectedDeparture: 'Távozás',
            selectedNights: 'Éjszakák',
            estimatedTotal: 'Becsült szállásdíj',
            touristTaxNotice: '+ IFA: 600 Ft / fő / éj (18 év felett)',
            btnBookNow: 'Foglalási érdeklődés elküldése',
            btnClear: 'Kijelölés törlése',
            conflictAlert: 'A kiválasztott időszak már foglalt napot tartalmaz! Kérjük válasszon másik időpontot.',
            minNightsAlert: 'A minimális foglalási idő 2 éjszaka! Kérjük, válasszon későbbi távozási napot.',
            minNightsUnavailableAlert: 'Ezen a napon nem indítható foglalás, mert legalább 2 egymást követő szabad éjszaka szükséges.',
            nightUnit: 'éjszaka',
            weekdays: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],
            months: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'],
            inquirySubject: (arrival, departure, nights) => `Foglalási érdeklődés (${arrival} - ${departure}, ${nights} éjszaka)`,
            inquiryMessage: (arrival, departure, nights, price) =>
                `Kedves Dr. Belser Barbara!

Érdeklődni szeretnék a Tulipános Porta foglalásával kapcsolatban:
- Érkezés napja: ${arrival}
- Távozás napja: ${departure}
- Éjszakák száma: ${nights} éjszaka
- Becsült szállásdíj: ${price} Ft (+ IFA)

Kérném az időpont megerősítését és a foglalás részleteit.

Üdvözlettel,`
        },
        en: {
            bookingSectionTitle: 'Availability Calendar',
            bookingSectionSubtitle: 'Check our available dates or select your planned arrival and departure days (minimum 2 nights)!',
            today: 'Today',
            prevMonth: 'Previous month',
            nextMonth: 'Next month',
            syncLive: 'Calendar synced',
            syncDemo: 'Error loading calendar data. The actual availability data is not visible, but we are still happy to receive your inquiry.',
            legendAvailable: 'Available',
            legendBooked: 'Booked',
            legendCheckIn: 'Check-in day (afternoon)',
            legendCheckOut: 'Check-out day (morning)',
            legendSelected: 'Selected',
            promptSelectDates: 'Click on your arrival and departure dates on the calendar to make a reservation request (minimum 2 nights).',
            promptSelectDeparture: 'Now click on your departure date (minimum 2 nights)!',
            selectedArrival: 'Arrival',
            selectedDeparture: 'Departure',
            selectedNights: 'Nights',
            estimatedTotal: 'Estimated total',
            touristTaxNotice: '+ Tourist tax: 600 HUF / adult / night',
            btnBookNow: 'Send Booking Inquiry',
            btnClear: 'Clear Selection',
            conflictAlert: 'The selected period overlaps with already booked dates! Please choose different dates.',
            minNightsAlert: 'Minimum stay is 2 consecutive nights! Please select a later departure date.',
            minNightsUnavailableAlert: 'A reservation cannot start on this day because at least 2 consecutive available nights are required.',
            nightUnit: 'nights',
            weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            inquirySubject: (arrival, departure, nights) => `Booking Inquiry (${arrival} to ${departure}, ${nights} nights)`,
            inquiryMessage: (arrival, departure, nights, price) =>
                `Dear Dr. Barbara Belser,

I would like to inquire about booking Tulipános Porta:
- Arrival date: ${arrival}
- Departure date: ${departure}
- Number of nights: ${nights} nights
- Estimated total: ${price} HUF (+ tourist tax)

Please let me know if these dates are available and how we can proceed with the booking.

Kind regards,`
        },
        de: {
            bookingSectionTitle: 'Belegungskalender',
            bookingSectionSubtitle: 'Sehen Sie sich freie Termine an oder wählen Sie Ihr geplantes An- und Abreisedatum (mindestens 2 Nächte)!',
            today: 'Heute',
            prevMonth: 'Vorheriger Monat',
            nextMonth: 'Nächster Monat',
            syncLive: 'Kalender synchronisiert',
            syncDemo: 'Fehler beim Laden des Kalenders. Die tatsächlichen Belegungsdaten sind nicht sichtbar, aber wir freuen uns weiterhin über Ihre Anfrage.',
            legendAvailable: 'Frei',
            legendBooked: 'Belegt',
            legendCheckIn: 'Anreisetag (Nachmittag)',
            legendCheckOut: 'Abreisetag (Vormittag)',
            legendSelected: 'Ausgewählt',
            promptSelectDates: 'Klicken Sie auf Anreise- und Abreisedatum im Kalender für eine Buchungsanfrage (mindestens 2 Nächte).',
            promptSelectDeparture: 'Wählen Sie nun das Abreisedatum (mindestens 2 Nächte)!',
            selectedArrival: 'Anreise',
            selectedDeparture: 'Abreise',
            selectedNights: 'Nächte',
            estimatedTotal: 'Geschätzter Gesamtpreis',
            touristTaxNotice: '+ Kurtaxe: 600 HUF / Erwachsener / Nacht',
            btnBookNow: 'Buchungsanfrage senden',
            btnClear: 'Zurücksetzen',
            conflictAlert: 'Der gewählte Zeitraum überschneidet sich mit belegten Tagen! Bitte wählen Sie andere Daten.',
            minNightsAlert: 'Mindestaufenthalt: 2 aufeinanderfolgende Nächte! Bitte wählen Sie ein späteres Abreisedatum.',
            minNightsUnavailableAlert: 'Eine Buchung kann an diesem Tag nicht beginnen, da mindestens 2 aufeinanderfolgende freie Nächte erforderlich sind.',
            nightUnit: 'Nächte',
            weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
            months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
            inquirySubject: (arrival, departure, nights) => `Buchungsanfrage (${arrival} bis ${departure}, ${nights} Nächte)`,
            inquiryMessage: (arrival, departure, nights, price) =>
                `Sehr geehrte Frau Dr. Barbara Belser,

ich möchte mich nach einer Buchung für die Tulipános Porta erkundigen:
- Anreisetag: ${arrival}
- Abreisetag: ${departure}
- Anzahl der Nächte: ${nights} Nächte
- Geschätzter Gesamtpreis: ${price} HUF (+ Kurtaxe)

Bitte teilen Sie mir mit, ob dieser Zeitraum verfügbar ist und wie wir mit der Buchung fortfahren können.

Mit freundlichen Grüßen,`
        }
    };

    // =========================================================================
    // 3. DATE UTILITIES (Timezone-safe YYYY-MM-DD operations)
    // =========================================================================
    function formatDateKey(year, month, day) {
        const y = String(year);
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function parseDateKey(key) {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function addDays(key, days) {
        const d = parseDateKey(key);
        d.setDate(d.getDate() + days);
        return formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    function diffDays(keyA, keyB) {
        const a = parseDateKey(keyA);
        const b = parseDateKey(keyB);
        return Math.round((b - a) / (1000 * 60 * 60 * 24));
    }

    function getTodayKey() {
        const now = new Date();
        return formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    function formatDisplayDate(key, lang) {
        const [y, m, d] = key.split('-').map(Number);
        if (lang === 'hu') {
            return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')}.`;
        } else if (lang === 'de') {
            return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
        }
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // =========================================================================
    // 4. CALENDAR STATE
    // =========================================================================
    const state = {
        currentLang: document.documentElement.lang || 'hu',
        viewYear: new Date().getFullYear(),
        viewMonth: new Date().getMonth() + 1, // 1 - 12
        bookings: [], // [{ arrival: 'YYYY-MM-DD', leave: 'YYYY-MM-DD', summary: '...' }]
        arrivalsSet: new Set(),
        leavesSet: new Set(),
        bookedNightsSet: new Set(),
        isLiveSynced: false,
        selectedArrival: null,
        selectedDeparture: null,
        hoverDate: null
    };

    // Rebuild quick lookup sets from bookings array
    function rebuildBookingSets() {
        state.arrivalsSet.clear();
        state.leavesSet.clear();
        state.bookedNightsSet.clear();

        state.bookings.forEach(b => {
            if (!b.arrival || !b.leave) return;
            state.arrivalsSet.add(b.arrival);
            state.leavesSet.add(b.leave);

            // Nights from arrival up to (and excluding) leave day
            let current = b.arrival;
            while (current < b.leave) {
                state.bookedNightsSet.add(current);
                current = addDays(current, 1);
            }
        });
    }

    // =========================================================================
    // 5. GOOGLE CALENDAR & iCAL FETCHING & PARSING
    // =========================================================================

    /**
     * Parse raw iCalendar RFC 5545 string into bookings.
     */
    function parseIcsFeed(icsData) {
        // Unfold lines per RFC 5545 (lines beginning with space or tab are continuations)
        const unfolded = icsData.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
        const lines = unfolded.split(/\r\n|\n|\r/);

        const bookings = [];
        let inEvent = false;
        let event = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'BEGIN:VEVENT') {
                inEvent = true;
                event = { isAllDay: false };
            } else if (line === 'END:VEVENT') {
                if (inEvent && event.dtstart && event.dtend) {
                    let arrival = event.dtstart;
                    let leave = event.dtend;

                    // If all-day event and configured to subtract Google's exclusive DTEND
                    if (event.isAllDay && CALENDAR_CONFIG.googleAllDayEndIsExclusive) {
                        leave = addDays(leave, -1);
                    }

                    if (arrival <= leave && event.status !== 'CANCELLED') {
                        bookings.push({
                            arrival,
                            leave,
                            summary: event.summary || 'Booking'
                        });
                    }
                }
                inEvent = false;
            } else if (inEvent) {
                if (line.startsWith('DTSTART')) {
                    const matchDate = line.match(/(\d{4})(\d{2})(\d{2})/);
                    if (matchDate) {
                        event.dtstart = `${matchDate[1]}-${matchDate[2]}-${matchDate[3]}`;
                        if (line.includes('VALUE=DATE')) event.isAllDay = true;
                    }
                } else if (line.startsWith('DTEND')) {
                    const matchDate = line.match(/(\d{4})(\d{2})(\d{2})/);
                    if (matchDate) {
                        event.dtend = `${matchDate[1]}-${matchDate[2]}-${matchDate[3]}`;
                    }
                } else if (line.startsWith('STATUS:')) {
                    event.status = line.replace('STATUS:', '').trim().toUpperCase();
                } else if (line.startsWith('SUMMARY:')) {
                    event.summary = line.replace('SUMMARY:', '').trim();
                }
            }
        }

        return bookings;
    }

    /**
     * Fetch calendar events from configured Google Calendar or fallback to realistic demo bookings.
     */
    async function loadCalendarData() {
        const rawCalendarId = (CALENDAR_CONFIG.calendarId || '').trim();
        let rawIcalUrl = (CALENDAR_CONFIG.icalUrl || '').trim();

        // Safely decode in case user entered with %40
        const cleanCalendarId = rawCalendarId ? decodeURIComponent(rawCalendarId) : '';
        let directIcalUrl = rawIcalUrl ? decodeURIComponent(rawIcalUrl) : '';

        if (!directIcalUrl && cleanCalendarId) {
            directIcalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cleanCalendarId)}/public/basic.ics`;
        }

        // If Google Calendar API Key is configured
        if (cleanCalendarId && CALENDAR_CONFIG.apiKey) {
            try {
                const now = new Date();
                const timeMin = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
                const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cleanCalendarId)}/events?key=${CALENDAR_CONFIG.apiKey}&singleEvents=true&timeMin=${timeMin}&maxResults=250`;
                const res = await fetch(apiUrl);
                if (res.ok) {
                    const json = await res.json();
                    const bookings = (json.items || []).filter(item => item.status !== 'cancelled').map(item => {
                        const start = item.start.date || (item.start.dateTime ? item.start.dateTime.slice(0, 10) : null);
                        let end = item.end.date || (item.end.dateTime ? item.end.dateTime.slice(0, 10) : null);
                        if (item.start.date && CALENDAR_CONFIG.googleAllDayEndIsExclusive && end) {
                            end = addDays(end, -1);
                        }
                        return { arrival: start, leave: end, summary: item.summary };
                    }).filter(b => b.arrival && b.leave && b.arrival <= b.leave);

                    state.bookings = bookings;
                    state.isLiveSynced = true;
                    rebuildBookingSets();
                    renderCalendar();
                    console.info('[Tulipános Porta Calendar] Google Calendar API connected successfully. Bookings:', bookings.length);
                    return;
                }
            } catch (err) {
                console.warn('[Tulipános Porta Calendar] Google Calendar API error:', err);
            }
        }

        // Helper to extract text from direct response or base64 JSON proxy payload
        async function fetchIcsContent(url) {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await res.json();
                let contents = data.contents;
                if (contents && contents.startsWith('data:')) {
                    const base64 = contents.split(',')[1];
                    const binaryStr = atob(base64);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    contents = new TextDecoder('utf-8').decode(bytes);
                }
                return contents;
            }
            return await res.text();
        }

        // Try iCal via Netlify proxy, direct fetch, or CORS fallback
        if (directIcalUrl) {
            const fetchUrls = [
                // 1. Same-origin proxy (Netlify in production / server.py in local dev)
                cleanCalendarId ? `${CALENDAR_CONFIG.netlifyProxyPath}${encodeURIComponent(cleanCalendarId)}` : null,
                // 2. Direct fetch (works if same origin or server allows)
                directIcalUrl,
                // 3. Fallback proxy
                `https://api.allorigins.win/get?url=${encodeURIComponent(directIcalUrl)}`
            ].filter(Boolean);

            for (const url of fetchUrls) {
                try {
                    const text = await fetchIcsContent(url);
                    if (text && text.includes('BEGIN:VCALENDAR')) {
                        const bookings = parseIcsFeed(text);
                        state.bookings = bookings;
                        state.isLiveSynced = true;
                        rebuildBookingSets();
                        renderCalendar();
                        console.info('[Tulipános Porta Calendar] Live Google Calendar synced successfully! Active bookings count:', bookings.length);
                        return;
                    }
                } catch (e) {
                    // Try next fallback
                }
            }
        }

        // Demo fallback: realistic bookings around current date
        console.warn('Could not fetch booking calendar data.');
        renderCalendar();
    }

    // =========================================================================
    // 6. PRICE CALCULATION
    // =========================================================================
    function calculatePriceForRange(arrivalKey, departureKey) {
        let total = 0;
        let nights = 0;
        let cur = arrivalKey;

        while (cur < departureKey) {
            nights++;
            const monthDay = cur.slice(5); // 'MM-DD'
            let nightPrice = CALENDAR_CONFIG.pricing.mainSeason.price;

            if (monthDay >= CALENDAR_CONFIG.pricing.preSeason.start && monthDay <= CALENDAR_CONFIG.pricing.preSeason.end) {
                nightPrice = CALENDAR_CONFIG.pricing.preSeason.price;
            } else if (monthDay >= CALENDAR_CONFIG.pricing.mainSeason.start && monthDay <= CALENDAR_CONFIG.pricing.mainSeason.end) {
                nightPrice = CALENDAR_CONFIG.pricing.mainSeason.price;
            } else {
                nightPrice = CALENDAR_CONFIG.pricing.postSeason.price;
            }

            total += nightPrice;
            cur = addDays(cur, 1);
        }

        return { total, nights };
    }

    // =========================================================================
    // 7. DATE SELECTION LOGIC
    // =========================================================================
    function canStartBookingOn(dateKey, dayStatus) {
        const todayKey = getTodayKey();
        if (dateKey < todayKey) return false;
        if (dayStatus === 'booked' || dayStatus === 'arrival' || dayStatus === 'turnover') return false;
        if (state.bookedNightsSet.has(dateKey)) return false;

        // For a minimum 2 consecutive nights policy, Night 0 (dateKey) and Night 1 (dateKey + 1 day) must both be free
        const nextDayKey = addDays(dateKey, 1);
        if (state.bookedNightsSet.has(nextDayKey)) return false;
        // If someone else arrives on nextDayKey, checkout would be forced on nextDayKey morning (only 1 night)
        if (state.arrivalsSet.has(nextDayKey)) return false;

        // And day after next (checkout day) cannot be in the middle of a booking or a turnover
        const day2Key = addDays(dateKey, 2);
        const day2Status = getDayStatus(day2Key);
        if (day2Status === 'booked' || day2Status === 'turnover') return false;

        return true;
    }

    function handleDayClick(dateKey, dayStatus) {
        const todayKey = getTodayKey();
        if (dateKey < todayKey) return; // past date

        hideAlert();

        // 1. If no arrival is selected yet, or if both arrival and departure were already selected: start fresh
        if (!state.selectedArrival || (state.selectedArrival && state.selectedDeparture)) {
            if (dayStatus === 'booked' || dayStatus === 'arrival' || dayStatus === 'turnover') {
                showAlert(CALENDAR_I18N[state.currentLang].conflictAlert);
                return;
            }
            if (!canStartBookingOn(dateKey, dayStatus)) {
                showAlert(CALENDAR_I18N[state.currentLang].minNightsUnavailableAlert);
                return;
            }
            state.selectedArrival = dateKey;
            state.selectedDeparture = null;
            renderCalendar();
            return;
        }

        // 2. We have selectedArrival, now picking selectedDeparture
        if (state.selectedArrival && !state.selectedDeparture) {
            // If user clicks an earlier day, reset arrival to this day if valid
            if (dateKey < state.selectedArrival) {
                if (dayStatus === 'booked' || dayStatus === 'arrival' || dayStatus === 'turnover') {
                    showAlert(CALENDAR_I18N[state.currentLang].conflictAlert);
                    return;
                }
                if (!canStartBookingOn(dateKey, dayStatus)) {
                    showAlert(CALENDAR_I18N[state.currentLang].minNightsUnavailableAlert);
                    return;
                }
                state.selectedArrival = dateKey;
                state.selectedDeparture = null;
                renderCalendar();
                return;
            }

            // If user clicks the same day or only 1 night from arrival:
            const nights = diffDays(state.selectedArrival, dateKey);
            if (nights < 2) {
                showAlert(CALENDAR_I18N[state.currentLang].minNightsAlert);
                return;
            }

            // Verify that all nights from selectedArrival to dateKey - 1 are NOT booked!
            let check = state.selectedArrival;
            let hasConflict = false;
            while (check < dateKey) {
                if (state.bookedNightsSet.has(check)) {
                    hasConflict = true;
                    break;
                }
                if (check > state.selectedArrival && state.arrivalsSet.has(check)) {
                    hasConflict = true;
                    break;
                }
                check = addDays(check, 1);
            }

            // Also check that the departure day itself is not in the middle of a booking or turnover
            const depStatus = getDayStatus(dateKey);
            if (depStatus === 'booked' || depStatus === 'turnover') {
                hasConflict = true;
            }

            if (hasConflict) {
                showAlert(CALENDAR_I18N[state.currentLang].conflictAlert);
                return;
            }

            state.selectedDeparture = dateKey;
            hideAlert();
            renderCalendar();
        }
    }

    function clearSelection() {
        state.selectedArrival = null;
        state.selectedDeparture = null;
        hideAlert();
        renderCalendar();
    }

    function showAlert(msg) {
        const alertEl = document.getElementById('calendar-booking-alert');
        if (alertEl) {
            alertEl.textContent = msg;
            alertEl.style.display = 'block';
        }
    }

    function hideAlert() {
        const alertEl = document.getElementById('calendar-booking-alert');
        if (alertEl) {
            alertEl.style.display = 'none';
        }
    }

    // =========================================================================
    // 8. FORM PRE-FILL & BOOKING REQUEST
    // =========================================================================
    function handleBookNowClick() {
        if (!state.selectedArrival || !state.selectedDeparture) return;

        const i18n = CALENDAR_I18N[state.currentLang];
        const pricingData = calculatePriceForRange(state.selectedArrival, state.selectedDeparture);
        if (pricingData.nights < 2) {
            showAlert(i18n.minNightsAlert);
            return;
        }

        const arrivalFmt = formatDisplayDate(state.selectedArrival, state.currentLang);
        const departureFmt = formatDisplayDate(state.selectedDeparture, state.currentLang);
        const priceFmt = formatNumber(pricingData.total);

        // Pre-fill contact form
        const subjectEl = document.getElementById('subject');
        const messageEl = document.getElementById('message');

        if (subjectEl) {
            subjectEl.value = i18n.inquirySubject(arrivalFmt, departureFmt, pricingData.nights);
        }
        if (messageEl) {
            messageEl.value = i18n.inquiryMessage(arrivalFmt, departureFmt, pricingData.nights, priceFmt);
        }

        // Smooth scroll to the contact form section
        const contactSection = document.getElementById('contact-us');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
            // Focus on name input
            const nameEl = document.getElementById('name');
            if (nameEl) {
                setTimeout(() => nameEl.focus(), 600);
            }
        }
    }

    // =========================================================================
    // 9. RENDERING MONTH VIEWS
    // =========================================================================
    function getDayStatus(dateKey) {
        const isArr = state.arrivalsSet.has(dateKey);
        const isLeave = state.leavesSet.has(dateKey);
        const isBookedNight = state.bookedNightsSet.has(dateKey);

        if (isArr && isLeave) return 'turnover';
        if (isArr) return 'arrival';
        if (isLeave) return 'leave';
        if (isBookedNight) return 'booked';
        return 'available';
    }

    function renderMonthGrid(year, month) {
        const i18n = CALENDAR_I18N[state.currentLang];
        const todayKey = getTodayKey();

        const card = document.createElement('div');
        card.className = 'month-card';

        // Month Title (e.g. "2026 Október" / "October 2026")
        const title = document.createElement('h4');
        title.className = 'month-card-title';
        if (state.currentLang === 'hu') {
            title.textContent = `${year} ${i18n.months[month - 1]}`;
        } else {
            title.textContent = `${i18n.months[month - 1]} ${year}`;
        }
        card.appendChild(title);

        // Weekdays Header Row (Monday to Sunday)
        const weekdaysRow = document.createElement('div');
        weekdaysRow.className = 'weekdays-row';
        i18n.weekdays.forEach(dayName => {
            const d = document.createElement('div');
            d.textContent = dayName;
            weekdaysRow.appendChild(d);
        });
        card.appendChild(weekdaysRow);

        // Days Grid
        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        // First day of month (0 = Sun, 1 = Mon ... 6 = Sat)
        const firstDayObj = new Date(year, month - 1, 1);
        let firstDayOfWeek = firstDayObj.getDay();
        // Convert to Mon=0, Tue=1 ... Sun=6
        const padCount = (firstDayOfWeek + 6) % 7;

        // Empty padding cells before 1st of month
        for (let i = 0; i < padCount; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            daysGrid.appendChild(emptyCell);
        }

        // Total days in this month
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = formatDateKey(year, month, day);
            const status = getDayStatus(dateKey);

            const dayCell = document.createElement('button');
            dayCell.type = 'button';
            dayCell.className = `day-cell is-${status}`;
            dayCell.setAttribute('data-date', dateKey);

            if (dateKey === todayKey) {
                dayCell.classList.add('is-today');
            }
            if (dateKey < todayKey) {
                dayCell.classList.add('is-past');
            }

            // Selection range highlighting
            if (state.selectedArrival && state.selectedArrival === dateKey) {
                dayCell.classList.add('is-range-start');
            }
            if (state.selectedDeparture && state.selectedDeparture === dateKey) {
                dayCell.classList.add('is-range-end');
            }
            if (state.selectedArrival && state.selectedDeparture) {
                if (dateKey > state.selectedArrival && dateKey < state.selectedDeparture) {
                    dayCell.classList.add('is-in-range');
                }
            }

            // Visual feedback for minimum nights policy
            if (state.selectedArrival && !state.selectedDeparture && dateKey === addDays(state.selectedArrival, 1)) {
                dayCell.classList.add('is-min-nights-short');
                dayCell.setAttribute('title', i18n.minNightsAlert);
            } else if (!state.selectedArrival && dateKey >= todayKey && (status === 'available' || status === 'leave') && !canStartBookingOn(dateKey, status)) {
                dayCell.classList.add('is-min-nights-unavailable');
                dayCell.setAttribute('title', i18n.minNightsUnavailableAlert);
            }

            // Accessibility labels
            let accessibleLabel = `${dateKey}, ${i18n['legend' + status.charAt(0).toUpperCase() + status.slice(1)] || status}`;
            dayCell.setAttribute('aria-label', accessibleLabel);

            const numSpan = document.createElement('span');
            numSpan.className = 'day-number';
            numSpan.textContent = day;
            dayCell.appendChild(numSpan);

            dayCell.addEventListener('click', () => handleDayClick(dateKey, status));

            daysGrid.appendChild(dayCell);
        }

        card.appendChild(daysGrid);
        return card;
    }

    function renderCalendar() {
        const i18n = CALENDAR_I18N[state.currentLang];
        const container = document.getElementById('booking-calendar-wrapper');
        if (!container) return;

        container.innerHTML = '';

        // Month 1: viewYear, viewMonth
        const m1Card = renderMonthGrid(state.viewYear, state.viewMonth);
        container.appendChild(m1Card);

        // Month 2: viewYear, viewMonth + 1
        let m2Year = state.viewYear;
        let m2Month = state.viewMonth + 1;
        if (m2Month > 12) {
            m2Month = 1;
            m2Year++;
        }
        const m2Card = renderMonthGrid(m2Year, m2Month);
        container.appendChild(m2Card);

        // Update Prev Button disabled state (cannot navigate prior to current month)
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const prevBtn = document.getElementById('btn-prev-month');
        if (prevBtn) {
            prevBtn.disabled = (state.viewYear < currentYear || (state.viewYear === currentYear && state.viewMonth <= currentMonth));
        }

        // Update Sync Badge
        const syncBadge = document.getElementById('calendar-sync-badge');
        if (syncBadge) {
            const badgeText = syncBadge.querySelector('.badge-text');
            if (state.isLiveSynced) {
                syncBadge.classList.remove('demo-mode');
                if (badgeText) badgeText.textContent = i18n.syncLive;
            } else {
                syncBadge.classList.add('demo-mode');
                if (badgeText) badgeText.textContent = i18n.syncDemo;
            }
        }

        // Update Selection Summary Card
        renderSelectionSummary();
    }

    function renderSelectionSummary() {
        const i18n = CALENDAR_I18N[state.currentLang];
        const actionCard = document.getElementById('booking-action-card');
        const summaryContainer = document.getElementById('booking-selection-summary');
        const bookBtn = document.getElementById('btn-book-now');
        const clearBtn = document.getElementById('btn-clear-selection');

        if (!actionCard || !summaryContainer || !bookBtn) return;

        if (!state.selectedArrival) {
            actionCard.classList.remove('has-selection');
            summaryContainer.innerHTML = `
                <div class="selection-prompt-msg">
                    <span>📅</span>
                    <span>${i18n.promptSelectDates}</span>
                </div>
            `;
            bookBtn.disabled = true;
            if (clearBtn) clearBtn.style.display = 'none';
        } else if (state.selectedArrival && !state.selectedDeparture) {
            actionCard.classList.add('has-selection');
            const arrFmt = formatDisplayDate(state.selectedArrival, state.currentLang);
            summaryContainer.innerHTML = `
                <div class="selection-dates-summary">
                    <div class="selection-pill">
                        <span class="selection-pill-label">${i18n.selectedArrival}</span>
                        <span class="selection-pill-val">${arrFmt}</span>
                    </div>
                    <div class="selection-prompt-msg" style="color: var(--primary-green, #4A6B2F); font-weight: 600;">
                        <span>👉</span>
                        <span>${i18n.promptSelectDeparture}</span>
                    </div>
                </div>
            `;
            bookBtn.disabled = true;
            if (clearBtn) clearBtn.style.display = 'inline-block';
        } else {
            actionCard.classList.add('has-selection');
            const arrFmt = formatDisplayDate(state.selectedArrival, state.currentLang);
            const depFmt = formatDisplayDate(state.selectedDeparture, state.currentLang);
            const pricing = calculatePriceForRange(state.selectedArrival, state.selectedDeparture);
            const totalFmt = formatNumber(pricing.total);

            summaryContainer.innerHTML = `
                <div class="selection-dates-summary">
                    <div class="selection-pill">
                        <span class="selection-pill-label">${i18n.selectedArrival}</span>
                        <span class="selection-pill-val">${arrFmt}</span>
                    </div>
                    <div class="selection-pill">
                        <span class="selection-pill-label">${i18n.selectedDeparture}</span>
                        <span class="selection-pill-val">${depFmt}</span>
                    </div>
                    <div class="selection-pill">
                        <span class="selection-pill-label">${i18n.selectedNights}</span>
                        <span class="selection-pill-val">${pricing.nights} ${i18n.nightUnit}</span>
                    </div>
                </div>
                <div class="selection-pricing">
                    <div class="selection-pricing-label">${i18n.estimatedTotal}</div>
                    <div class="selection-pricing-amount">${totalFmt} Ft</div>
                    <div class="selection-pricing-tax">${i18n.touristTaxNotice}</div>
                </div>
            `;
            bookBtn.disabled = false;
            if (clearBtn) clearBtn.style.display = 'inline-block';
        }
    }

    // =========================================================================
    // 10. NAVIGATION CONTROLS & EVENT LISTENERS
    // =========================================================================
    function setupControls() {
        const prevBtn = document.getElementById('btn-prev-month');
        const nextBtn = document.getElementById('btn-next-month');
        const todayBtn = document.getElementById('btn-calendar-today');
        const bookBtn = document.getElementById('btn-book-now');
        const clearBtn = document.getElementById('btn-clear-selection');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                state.viewMonth--;
                if (state.viewMonth < 1) {
                    state.viewMonth = 12;
                    state.viewYear--;
                }
                renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                state.viewMonth++;
                if (state.viewMonth > 12) {
                    state.viewMonth = 1;
                    state.viewYear++;
                }
                renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                const now = new Date();
                state.viewYear = now.getFullYear();
                state.viewMonth = now.getMonth() + 1;
                renderCalendar();
            });
        }

        if (bookBtn) {
            bookBtn.addEventListener('click', handleBookNowClick);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', clearSelection);
        }
    }

    // =========================================================================
    // 11. PUBLIC API FOR LANGUAGE SWITCHING
    // =========================================================================
    window.updateCalendarLanguage = function (lang) {
        if (!CALENDAR_I18N[lang]) return;
        state.currentLang = lang;

        // Update static calendar titles and legends in HTML
        const i18n = CALENDAR_I18N[lang];
        const titleEl = document.getElementById('title-booking');
        const subtitleEl = document.getElementById('booking-subtitle');
        const todayBtn = document.getElementById('btn-calendar-today');
        const bookBtn = document.getElementById('btn-book-now');
        const clearBtn = document.getElementById('btn-clear-selection');

        if (titleEl) titleEl.textContent = i18n.bookingSectionTitle;
        if (subtitleEl) subtitleEl.textContent = i18n.bookingSectionSubtitle;
        if (todayBtn) todayBtn.textContent = i18n.today;
        if (bookBtn) {
            const icon = '<span style="font-size:1.1rem">📩</span> ';
            bookBtn.innerHTML = `${icon}<span>${i18n.btnBookNow}</span>`;
        }
        if (clearBtn) clearBtn.textContent = i18n.btnClear;

        // Legend items
        const lAvail = document.getElementById('legend-label-available');
        const lBooked = document.getElementById('legend-label-booked');
        const lArr = document.getElementById('legend-label-arrival');
        const lLeave = document.getElementById('legend-label-leave');
        const lSel = document.getElementById('legend-label-selected');

        if (lAvail) lAvail.textContent = i18n.legendAvailable;
        if (lBooked) lBooked.textContent = i18n.legendBooked;
        if (lArr) lArr.textContent = i18n.legendCheckIn;
        if (lLeave) lLeave.textContent = i18n.legendCheckOut;
        if (lSel) lSel.textContent = i18n.legendSelected;

        renderCalendar();
    };

    // Expose config for easy debugging or customization in console
    window.TULIPAN_CALENDAR_CONFIG = CALENDAR_CONFIG;
    window.reloadTulipanCalendar = loadCalendarData;

    // =========================================================================
    // 12. INITIALIZATION
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        setupControls();
        window.updateCalendarLanguage(document.documentElement.lang || 'hu');
        loadCalendarData();
    });
})();
