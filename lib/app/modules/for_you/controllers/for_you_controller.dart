import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class ForYouController extends GetxController {
  RxInt currentImage = 0.obs;

  final RxList<Map<String, dynamic>> events = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  @override
  void onInit() {
    super.onInit();
    fetchEvents();
  }

  Future<void> fetchEvents() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      events.value = await ApiService.events();
      if (currentImage.value >= events.length && events.isNotEmpty) {
        currentImage.value = 0;
      }
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  // Method to jump to the specific slide (optional)
  void goToSlide(int index) {
    if (index >= 0 && index < events.length) {
      currentImage.value = index;
    }
  }

  /// Currently visible hero event (falls back to the first event).
  Map<String, dynamic>? get currentEvent {
    if (events.isEmpty) return null;
    final i = currentImage.value.clamp(0, events.length - 1);
    return events[i];
  }

  void openEvent(Map<String, dynamic> event) {
    Get.toNamed(Routes.EVENT_DETAIL, arguments: {
      'id': event['id']?.toString() ?? '',
      'title': event['title']?.toString() ?? '',
    });
  }
}
