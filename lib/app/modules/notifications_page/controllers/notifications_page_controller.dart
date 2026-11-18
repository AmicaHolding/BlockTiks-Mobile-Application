import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class NotificationsPageController extends GetxController {
  final RxList<Map<String, dynamic>> items = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxInt unreadCount = 0.obs;
  final RxSet<String> readIds = <String>{}.obs;

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.notifications();
      final list = (res['notifications'] as List?) ?? [];
      items.value = list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      unreadCount.value = (res['unreadCount'] as num?)?.toInt() ?? 0;
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  bool isRead(Map<String, dynamic> item) =>
      readIds.contains(item['id']?.toString());

  void markRead(Map<String, dynamic> item) {
    final id = item['id']?.toString() ?? '';
    if (id.isEmpty || readIds.contains(id)) return;
    readIds.add(id);
    if (unreadCount.value > 0) unreadCount.value -= 1;
  }

  Future<void> markAllRead() async {
    readIds.addAll(items.map((e) => e['id']?.toString() ?? ''));
    unreadCount.value = 0;
    try {
      await ApiService.markNotificationsRead();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  IconData iconFor(String? type) {
    switch (type) {
      case 'sale':
        return Icons.sell_outlined;
      case 'broadcast':
        return Icons.campaign_outlined;
      default:
        return Icons.confirmation_number_outlined;
    }
  }

  String timeLabel(String? iso) {
    final dt = DateTime.tryParse(iso ?? '');
    if (dt == null) return '';
    final local = dt.toLocal();
    final now = DateTime.now();
    final diff = now.difference(local);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return formatEventDate(iso, includeTime: false);
  }
}
