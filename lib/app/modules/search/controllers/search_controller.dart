import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';

class MySearchController extends GetxController {
  final TextEditingController searchController = TextEditingController();
  Timer? _debounce;

  final Rxn<String> selectedCategory = Rxn<String>();
  final RxList<Map<String, dynamic>> recentEvents =
      <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> searchResults =
      <Map<String, dynamic>>[].obs;
  final RxBool searchLoading = false.obs;
  final Rxn<String> searchError = Rxn<String>();
  final RxBool isEmpty = true.obs;

  void onSearchChanged(String query) {
    _debounce?.cancel();
    final q = query.trim();
    isEmpty.value = q.isEmpty;
    if (q.isEmpty) {
      searchResults.clear();
      searchError.value = null;
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _search(q);
    });
  }

  Future<void> _search(String q) async {
    searchLoading.value = true;
    searchError.value = null;
    try {
      searchResults.value = await ApiService.events(q: q);
    } catch (e) {
      searchError.value = e.toString().replaceFirst('Exception: ', '');
      searchResults.clear();
    } finally {
      searchLoading.value = false;
    }
  }

  Future<void> fetchRecentEvents() async {
    try {
      recentEvents.value = await ApiService.events();
    } catch (_) {
      // Recent events are best-effort — leave the list empty on failure.
    }
  }

  @override
  void onInit() {
    super.onInit();
    fetchRecentEvents();
  }

  @override
  void onClose() {
    _debounce?.cancel();
    searchController.dispose();
    super.onClose();
  }
}
