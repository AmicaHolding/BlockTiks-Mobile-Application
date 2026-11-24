import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';

class PurchasedTicketController extends GetxController {
  int tickets = 1;
  List<RxBool> rxBoolList = [false.obs];
  bool showBack = false;

  // Ticket details, populated from route arguments when provided, with
  // sensible fallbacks so the screen still renders standalone.
  String eventTitle = 'DJ Maksmellow Orignawa';
  String eventType = 'Music Concert';
  String ticketTier = 'VIP A';
  String ticketDate = '14 February 2021';
  String ticketTime = '12.30 PM';
  String orderId = 'EBP139920AC';
  String venue = 'Japan, 〒604-8122 Kyoto, Nakagyo Ward, 錦小路下る瀬戸屋町474';

  // Real order state: each entry renders one ticket-like row.
  final RxList<Map<String, dynamic>> ticketRows = <Map<String, dynamic>>[].obs;
  final RxBool isLoadingOrder = false.obs;
  final Rxn<String> orderError = Rxn<String>();
  bool isPreview = false;
  bool isSimulated = false;
  // The specific ticket the wallet tile opened — Send uses its row, not
  // the first ticket of a multi-ticket order.
  String focusTicketCode = '';
  Map<String, dynamic>? _passedTicket;
  // True only when /orders/:id actually answered — a gift recipient gets a
  // 404 and falls back to the passed ticket, so buyer-only UI (group pay)
  // must key off this, not orderId.
  bool orderAccessible = false;

  String _readString(dynamic data, String key, String fallback) {
    if (data is Map && data[key] != null) return data[key].toString();
    return fallback;
  }

  @override
  void onInit() {
    var data = Get.arguments;
    if (data is Map) {
      if (data[Constants.paramShowBack] != null) {
        showBack = data[Constants.paramShowBack];
      }
      if (data[Constants.paramTicket] is int) {
        tickets = data[Constants.paramTicket];
        rxBoolList = List.generate(tickets, (index) => false.obs);
      }
      eventTitle = _readString(data, 'title', eventTitle);
      eventType = _readString(data, 'type', eventType);
      ticketTier = _readString(data, 'tier', ticketTier);
      ticketDate = _readString(data, 'date', ticketDate);
      ticketTime = _readString(data, 'time', ticketTime);
      orderId = _readString(data, 'orderId', orderId);
      venue = _readString(data, 'venue', venue);
      isPreview = data['preview'] == true;
      isSimulated = data['simulated'] == true;
      focusTicketCode = data['ticketCode']?.toString() ?? '';
      final t = data['ticketRow'];
      if (t is Map) _passedTicket = Map<String, dynamic>.from(t);
    }
    super.onInit();
    _loadOrders(data);
  }

  List<String> _orderIdsFrom(dynamic data) {
    final ids = <String>[];
    if (data is! Map) return ids;
    final list = data['orderIds'];
    if (list is List) {
      ids.addAll(list.map((e) => e.toString()).where((e) => e.isNotEmpty));
    } else if (list != null && list.toString().isNotEmpty) {
      ids.addAll(list
          .toString()
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty));
    }
    if (ids.isEmpty) {
      final single = data['orderId'];
      if (single != null && single.toString().isNotEmpty) {
        ids.add(single.toString());
      }
    }
    // Only treat it as a real order lookup when an explicit id was passed,     // the 'EBP139920AC' fallback must not trigger a network call.
    if (data['orderId'] == null && data['orderIds'] == null) return const [];
    return ids;
  }

  Future<void> _loadOrders(dynamic data) async {
    final ids = _orderIdsFrom(data);
    if (ids.isEmpty) return;
    isLoadingOrder.value = true;
    orderError.value = null;
    try {
      final rows = <Map<String, dynamic>>[];
      for (final id in ids) {
        final order = await ApiService.order(id);
        _applyOrderHeader(order);
        rows.addAll(_rowsFromOrder(order));
      }
      ticketRows.value = rows;
      orderAccessible = rows.isNotEmpty;
      if (rows.isNotEmpty) {
        tickets = rows.length;
        rxBoolList = List.generate(tickets, (index) => false.obs);
      }
    } catch (e) {
      // Gifted tickets: /orders/:id only serves the buyer, so a
      // recipient's lookup fails — render the ticket the wallet passed.
      final t = _passedTicket;
      if (t != null && t['code'] != null) {
        _applyTicketHeader(t);
        ticketRows.value = [_rowFromTicket(t)];
      } else {
        orderError.value = e.toString().replaceFirst('Exception: ', '');
      }
    } finally {
      isLoadingOrder.value = false;
    }
  }

  void _applyTicketHeader(Map<String, dynamic> ticket) {
    eventTitle = ticket['eventTitle']?.toString() ?? eventTitle;
    final tz = ticket['venueTimezone']?.toString();
    final startsAt = ticket['eventStartsAt']?.toString() ?? '';
    if (startsAt.isNotEmpty) {
      ticketDate = formatEventDate(startsAt, includeTime: false, tz: tz);
      ticketTime = formatEventTime(startsAt, tz: tz);
    }
    final loc = ticket['eventLocation']?.toString() ?? '';
    if (loc.isNotEmpty) venue = loc;
    orderId = ticket['orderId']?.toString() ?? orderId;
  }

  /// One display row from a /me/tickets entry — same shape _rowsFromOrder
  /// produces so the view renders identically.
  Map<String, dynamic> _rowFromTicket(Map<String, dynamic> t) {
    final tz = t['venueTimezone']?.toString();
    final startsAt = t['eventStartsAt']?.toString() ?? '';
    return {
      'code': t['code']?.toString() ?? '',
      'title': t['eventTitle']?.toString().isNotEmpty == true
          ? t['eventTitle'].toString()
          : eventTitle,
      'tier': t['tierName']?.toString() ?? '',
      'date': formatEventDate(startsAt, includeTime: false, tz: tz),
      'time': formatEventTime(startsAt, tz: tz),
      'venue': t['eventLocation']?.toString().isNotEmpty == true
          ? t['eventLocation'].toString()
          : venue,
      'section': t['sectionName']?.toString() ?? '',
      'seat': t['seatLabel']?.toString() ?? '',
      'status': t['status']?.toString() ?? '',
      'orderId': t['orderId']?.toString() ?? '',
    };
  }

  void _applyOrderHeader(Map<String, dynamic> order) {
    final event = order['event'];
    if (event is Map) {
      eventTitle = event['title']?.toString() ?? eventTitle;
      final tz = event['venueTimezone']?.toString();
      final startsAt = event['startsAt']?.toString() ?? '';
      if (startsAt.isNotEmpty) {
        ticketDate = formatEventDate(startsAt, includeTime: false, tz: tz);
        ticketTime = formatEventTime(startsAt, tz: tz);
      }
      final loc = event['location']?.toString() ?? '';
      if (loc.isNotEmpty) venue = loc;
    }
    orderId = order['id']?.toString() ?? orderId;
  }

  /// Builds display rows from an order: real tickets when PAID, otherwise
  /// one row per order item so the preview still shows what was reserved.
  List<Map<String, dynamic>> _rowsFromOrder(Map<String, dynamic> order) {
    final rows = <Map<String, dynamic>>[];
    final event = order['event'];
    final eventTitle = event is Map
        ? (event['title']?.toString() ?? this.eventTitle)
        : this.eventTitle;
    final startsAt = event is Map ? (event['startsAt']?.toString() ?? '') : '';
    final eventTz = event is Map ? event['venueTimezone']?.toString() : null;
    final location =
        event is Map ? (event['location']?.toString() ?? venue) : venue;
    final status = order['status']?.toString() ?? '';

    final tickets = order['tickets'];
    if (tickets is List && tickets.isNotEmpty) {
      for (final t in tickets) {
        if (t is! Map) continue;
        rows.add({
          'code': t['code']?.toString() ?? '',
          'title': t['eventTitle']?.toString().isNotEmpty == true
              ? t['eventTitle'].toString()
              : eventTitle,
          'tier': t['tierName']?.toString() ?? '',
          'date': formatEventDate(t['eventStartsAt']?.toString() ?? startsAt,
              includeTime: false,
              tz: t['venueTimezone']?.toString() ?? eventTz),
          'time': formatEventTime(t['eventStartsAt']?.toString() ?? startsAt,
              tz: t['venueTimezone']?.toString() ?? eventTz),
          'venue': t['eventLocation']?.toString().isNotEmpty == true
              ? t['eventLocation'].toString()
              : location,
          'section': t['sectionName']?.toString() ?? '',
          'seat': t['seatLabel']?.toString() ?? '',
          'status': t['status']?.toString() ?? status,
          'orderId': t['orderId']?.toString() ?? order['id']?.toString() ?? '',
        });
      }
      return rows;
    }

    // PENDING/preview orders have no issued tickets yet, render items.
    final items = order['items'];
    if (items is List) {
      for (final item in items) {
        if (item is! Map) continue;
        final qty =
            item['quantity'] is num ? (item['quantity'] as num).toInt() : 1;
        for (var i = 0; i < qty; i++) {
          rows.add({
            'code': '',
            'title': eventTitle,
            'tier': item['tierName']?.toString() ?? '',
            'date': formatEventDate(startsAt,
                includeTime: false, tz: eventTz),
            'time': formatEventTime(startsAt, tz: eventTz),
            'venue': location,
            'section': '',
            'seat': '',
            'status': status,
            'orderId': order['id']?.toString() ?? '',
          });
        }
      }
    }
    return rows;
  }
}
