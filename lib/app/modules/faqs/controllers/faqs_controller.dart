import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class FaqsController extends GetxController {
  final RxString searchQuery = ''.obs;
  final RxString category = 'All'.obs;
  final RxList<Map<String, dynamic>> categories = <Map<String, dynamic>>[].obs;
  final RxSet<int> expanded = <int>{}.obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      categories.value = await ApiService.faqs();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  List<Map<String, dynamic>> get flatFaqs {
    final q = searchQuery.value.trim().toLowerCase();
    final out = <Map<String, dynamic>>[];
    var index = 0;
    for (final cat in categories) {
      final catName = cat['name']?.toString() ?? '';
      if (category.value != 'All' && category.value != catName) continue;
      final faqs = (cat['faqs'] as List?) ?? [];
      for (final faq in faqs.whereType<Map>()) {
        final question = faq['q']?.toString() ?? '';
        final answer = faq['a']?.toString() ?? '';
        if (q.isNotEmpty &&
            !question.toLowerCase().contains(q) &&
            !answer.toLowerCase().contains(q) &&
            !catName.toLowerCase().contains(q)) {
          index++;
          continue;
        }
        out.add(
            {'index': index, 'category': catName, 'q': question, 'a': answer});
        index++;
      }
    }
    return out;
  }

  List<String> get categoryNames =>
      ['All', ...categories.map((c) => c['name']?.toString() ?? '')];

  void toggle(int index) {
    if (expanded.contains(index)) {
      expanded.remove(index);
    } else {
      expanded.add(index);
    }
  }
}
