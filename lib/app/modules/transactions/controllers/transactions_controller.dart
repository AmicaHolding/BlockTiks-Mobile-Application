import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class TransactionsController extends GetxController {
  RxInt selectedTab = 0.obs;
  final RxList<Map<String, dynamic>> transactions =
      <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  final List<String> tabs = const ['All', 'Purchases', 'Sales', 'Refunds'];

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      transactions.value = await ApiService.transactions();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  List<Map<String, dynamic>> get filtered {
    switch (selectedTab.value) {
      case 1:
        return transactions.where((t) => t['type'] == 'purchase').toList();
      case 2:
        return transactions.where((t) => t['type'] == 'sale').toList();
      case 3:
        return transactions.where((t) => t['type'] == 'refund').toList();
      default:
        return transactions;
    }
  }

  String amountLabel(Map<String, dynamic> t) {
    final cents = (t['amountCents'] as num?)?.toInt() ?? 0;
    final amount = formatMoney(cents, t['currency']?.toString());
    return t['direction'] == 'in' ? '+$amount' : '-$amount';
  }

  Color amountColor(Map<String, dynamic> t) =>
      t['direction'] == 'in' ? ColorConstant.gold : ColorConstant.whiteA700;

  String dateLabel(String? iso) {
    final dt = DateTime.tryParse(iso ?? '');
    if (dt == null) return '';
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }
}
