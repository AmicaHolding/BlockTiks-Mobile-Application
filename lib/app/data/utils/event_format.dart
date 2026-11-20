import 'package:intl/intl.dart';

/// Small formatting helpers for BlockTiks MVP API payloads (events, orders,
/// tickets). All functions are defensive, they return '' / null rather than
/// throwing when backend fields are missing or malformed.

/// Fixed UTC offsets (minutes) for the IANA venue zones of supported
/// regions. The Gulf/Arabian zones below do not observe daylight saving,
/// so a fixed offset is exact year-round. Zones not listed fall back to
/// the device's local time.
const Map<String, int> _venueZoneOffsets = {
  'Asia/Dubai': 240,
  'Asia/Muscat': 240,
  'Asia/Riyadh': 180,
  'Asia/Qatar': 180,
  'Asia/Kuwait': 180,
  'Asia/Bahrain': 180,
  'Asia/Baghdad': 180,
  'Asia/Aden': 180,
};

/// Parses an ISO timestamp for DISPLAY: when [tz] is a known venue IANA
/// zone the result is shifted to venue wall-clock time, otherwise the
/// device's local time is used. Note: a venue-shifted result is only for
/// formatting, it is not a real instant, never compare it to DateTime.now().
DateTime? _parseIso(String? iso, [String? tz]) {
  if (iso == null || iso.isEmpty) return null;
  final parsed = DateTime.tryParse(iso);
  if (parsed == null) return null;
  final offset = _venueZoneOffsets[tz];
  if (offset != null) {
    return parsed.toUtc().add(Duration(minutes: offset));
  }
  return parsed.toLocal();
}

/// Public form of [_parseIso] for call sites that need a display DateTime
/// (e.g. date badges). Display-only, see [_parseIso].
DateTime? parseEventDateTime(String? iso, [String? tz]) => _parseIso(iso, tz);

/// Whether an event falls in the current local weekend (Saturday 00:00
/// through Monday 00:00). Once Monday arrives, the next weekend is used.
bool isThisWeekend(String? iso) {
  final event = _parseIso(iso);
  if (event == null) return false;

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final daysSinceSaturday = (now.weekday + 1) % 7;
  var saturday = DateTime(today.year, today.month, today.day - daysSinceSaturday);
  var monday = DateTime(saturday.year, saturday.month, saturday.day + 2);
  if (!now.isBefore(monday)) {
    saturday = DateTime(saturday.year, saturday.month, saturday.day + 7);
    monday = DateTime(saturday.year, saturday.month, saturday.day + 2);
  }
  return !event.isBefore(saturday) && event.isBefore(monday);
}

/// Whether an event is still available to browse/buy: its end time (or start
/// time when no end is set) has not passed yet.
bool isAvailable(String? startsAt, [String? endsAt]) {
  final end = _parseIso(endsAt) ?? _parseIso(startsAt);
  return end != null && !end.isBefore(DateTime.now());
}

/// e.g. "Sat, March 24, 2026 · 8:00 PM" (with time) or "March 24, 2026".
/// Pass the event's `venueTimezone` (IANA name) as [tz] when available so
/// times read in venue time.
String formatEventDate(String? iso,
    {bool includeTime = true, String? tz}) {
  final dt = _parseIso(iso, tz);
  if (dt == null) return '';
  return includeTime
      ? DateFormat('EEE, MMMM d, yyyy · h:mm a').format(dt)
      : DateFormat('MMMM d, yyyy').format(dt);
}

/// e.g. "8:00 PM"
String formatEventTime(String? iso, {String? tz}) {
  final dt = _parseIso(iso, tz);
  if (dt == null) return '';
  return DateFormat('h:mm a').format(dt);
}

/// e.g. "March 24"
String formatEventDayMonth(String? iso, {String? tz}) {
  final dt = _parseIso(iso, tz);
  if (dt == null) return '';
  return DateFormat('MMMM d').format(dt);
}

/// e.g. "04/20", used on small card badges.
String formatEventShortDate(String? iso, {String? tz}) {
  final dt = _parseIso(iso, tz);
  if (dt == null) return '';
  return DateFormat('MM/dd').format(dt);
}

/// Order timestamp, e.g. "March 24, 2026 · 9:51 PM"
String formatOrderDate(String? iso, {String? tz}) {
  final dt = _parseIso(iso, tz);
  if (dt == null) return '';
  return DateFormat('MMMM d, yyyy · h:mm a').format(dt);
}

/// Whole-dollar-ish price label from a `price` (dollars) field.
/// e.g. 110.0 -> "$110", 19.99 -> "$19.99"
String formatDollars(num? dollars) {
  if (dollars == null) return '';
  final d = dollars.toDouble();
  if (d == d.roundToDouble()) return '\$${d.toStringAsFixed(0)}';
  return '\$${d.toStringAsFixed(2)}';
}

/// Money from integer cents, e.g. 40500 -> "$405.00" trimmed to "$405".
String formatCents(num? cents) {
  if (cents == null) return '';
  return formatDollars(cents.toDouble() / 100);
}

/// Currency-aware money from integer cents, e.g.
/// formatMoney(40500, 'usd') -> "$405", formatMoney(40500, 'aed') -> "AED 405.00".
/// Falls back to [formatCents] for USD/unknown currencies.
String formatMoney(num? cents, [String? currency]) {
  final code = (currency ?? 'usd').trim().toLowerCase();
  if (cents == null) return '';
  if (code.isEmpty || code == 'usd') return formatCents(cents);
  try {
    final value = NumberFormat.currency(
      locale: 'en_US',
      name: code.toUpperCase(),
      symbol: '',
    ).format(cents.toDouble() / 100);
    return '${code.toUpperCase()} ${value.trim()}';
  } catch (_) {
    return '${code.toUpperCase()} ${(cents.toDouble() / 100).toStringAsFixed(2)}';
  }
}

/// Lowest tier all-in price in dollars for an event map (face × 1.07), or
/// null when unknown. v3: displayed price = paid price.
double? lowestTierPrice(Map<String, dynamic> event) {
  final tiers = event['tiers'];
  if (tiers is! List || tiers.isEmpty) return null;
  double? min;
  for (final t in tiers) {
    if (t is! Map) continue;
    final price = t['price'];
    final cents = t['priceCents'];
    double? v;
    if (price is num) {
      v = price.toDouble();
    } else if (cents is num) {
      v = cents.toDouble() / 100;
    }
    if (v == null) continue;
    v *= 1.07; // all-in
    if (min == null || v < min) min = v;
  }
  return min;
}

/// Network image URL for an event, or null.
String? eventImageUrl(Map<String, dynamic> event) {
  final url = event['imageUrl']?.toString();
  if (url == null || url.isEmpty) return null;
  return url;
}

/// First character of the event title, uppercased, used as image fallback.
String eventInitial(Map<String, dynamic> event) {
  final title = event['title']?.toString().trim() ?? '';
  if (title.isEmpty) return 'B';
  return String.fromCharCode(title.runes.first).toUpperCase();
}
