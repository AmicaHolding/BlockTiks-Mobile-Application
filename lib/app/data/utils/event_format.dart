import 'package:intl/intl.dart';

/// Small formatting helpers for BlockTiks MVP API payloads (events, orders,
/// tickets). All functions are defensive — they return '' / null rather than
/// throwing when backend fields are missing or malformed.

DateTime? _parseIso(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  return DateTime.tryParse(iso)?.toLocal();
}

/// Whether an event falls in the current local weekend (Saturday 00:00
/// through Monday 00:00). Once Monday arrives, the next weekend is used.
bool isThisWeekend(String? iso) {
  final event = _parseIso(iso);
  if (event == null) return false;

  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final daysSinceSaturday = (now.weekday + 1) % 7;
  var saturday = today.subtract(Duration(days: daysSinceSaturday));
  var monday = saturday.add(const Duration(days: 3));
  if (!now.isBefore(monday)) {
    saturday = saturday.add(const Duration(days: 7));
    monday = monday.add(const Duration(days: 7));
  }
  return !event.isBefore(saturday) && event.isBefore(monday);
}

/// e.g. "Sat, Apr 20 · 8:00 PM"
String formatEventDate(String? iso, {bool includeTime = true}) {
  final dt = _parseIso(iso);
  if (dt == null) return '';
  return includeTime
      ? DateFormat('EEE, MMM d · h:mm a').format(dt)
      : DateFormat('EEE, MMM d').format(dt);
}

/// e.g. "8:00 PM"
String formatEventTime(String? iso) {
  final dt = _parseIso(iso);
  if (dt == null) return '';
  return DateFormat('h:mm a').format(dt);
}

/// e.g. "Apr 20"
String formatEventDayMonth(String? iso) {
  final dt = _parseIso(iso);
  if (dt == null) return '';
  return DateFormat('MMM d').format(dt);
}

/// e.g. "04/20" — used on small card badges.
String formatEventShortDate(String? iso) {
  final dt = _parseIso(iso);
  if (dt == null) return '';
  return DateFormat('MM/dd').format(dt);
}

/// Order timestamp, e.g. "09:51 PM, Apr 20"
String formatOrderDate(String? iso) {
  final dt = _parseIso(iso);
  if (dt == null) return '';
  return DateFormat('hh:mm:ss a, MMM d').format(dt);
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

/// Lowest tier price in dollars for an event map, or null when unknown.
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

/// First character of the event title, uppercased — used as image fallback.
String eventInitial(Map<String, dynamic> event) {
  final title = event['title']?.toString().trim() ?? '';
  if (title.isEmpty) return 'B';
  return String.fromCharCode(title.runes.first).toUpperCase();
}
