import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class PurchasedTicketController extends GetxController {
  int tickets = 1;
  List<RxBool> rxBoolList = [false.obs];
  bool showBack = false;

  // Ticket details — populated from route arguments when provided, with
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
      if (data[Constants.paramTicket] != null) {
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
    // Only treat it as a real order lookup when an explicit id was passed —
    // the 'EBP139920AC' fallback must not trigger a network call.
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
      if (rows.isNotEmpty) {
        tickets = rows.length;
        rxBoolList = List.generate(tickets, (index) => false.obs);
      }
    } catch (e) {
      orderError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoadingOrder.value = false;
    }
  }

  void _applyOrderHeader(Map<String, dynamic> order) {
    final event = order['event'];
    if (event is Map) {
      eventTitle = event['title']?.toString() ?? eventTitle;
      final startsAt = event['startsAt']?.toString() ?? '';
      if (startsAt.isNotEmpty) {
        ticketDate = formatEventDate(startsAt, includeTime: false);
        ticketTime = formatEventTime(startsAt);
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
              includeTime: false),
          'time': formatEventTime(t['eventStartsAt']?.toString() ?? startsAt),
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

    // PENDING/preview orders have no issued tickets yet — render items.
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
            'date': formatEventDate(startsAt, includeTime: false),
            'time': formatEventTime(startsAt),
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
