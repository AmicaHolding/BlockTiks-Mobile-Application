import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class PromoCodesController extends GetxController {
  final RxList<Map<String, dynamic>> ready = <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> used = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final TextEditingController codeController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.accountPromos();
      ready.value = ((res['ready'] as List?) ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      used.value = ((res['used'] as List?) ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  String discountLabel(Map<String, dynamic> promo) {
    final percent = promo['percentOff'];
    if (percent is num)
      return '${percent.toStringAsFixed(percent % 1 == 0 ? 0 : 1)}%';
    final amount = promo['amountOffCents'];
    if (amount is num) return 'AED ${(amount / 100).toStringAsFixed(0)}';
    if (promo['kind']?.toString() == 'PERCENT') {
      return '${promo['value'] ?? 0}%';
    }
    final value = promo['value'];
    if (value is num) return 'AED ${(value / 100).toStringAsFixed(0)}';
    return 'CODE';
  }

  String detailLabel(Map<String, dynamic> promo) {
    final parts = <String>[];
    final scope = promo['scope']?.toString() ?? 'ALL';
    if (scope == 'TIER' && promo['tierName'] != null) {
      parts.add('Tier · ${promo['tierName']}');
    } else if (scope == 'EVENT') {
      parts.add('Event promo');
    } else {
      parts.add('All events');
    }
    final maxUses = promo['maxUses'];
    if (maxUses is num)
      parts.add('${promo['usedCount'] ?? 0}/${maxUses.toInt()} uses');
    return parts.join(' · ');
  }

  String expiryLabel(Map<String, dynamic> promo) {
    final raw = promo['endsAt'] ?? promo['expiresAt'];
    final dt = DateTime.tryParse(raw?.toString() ?? '');
    if (dt == null)
      return promo['state']?.toString() == 'used' ? 'Used' : 'No expiry';
    return 'Ends ${dt.toLocal().day}/${dt.toLocal().month}/${dt.toLocal().year}';
  }
}
