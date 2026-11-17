import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
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
      final collected = <Map<String, dynamic>>[];
      String? cursor;
      for (var page = 0; page < 3 && collected.length < 100; page++) {
        final res = await ApiService.eventsPage(cursor: cursor, limit: 100);
        final items = ((res['items'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        collected.addAll(items.where((e) =>
            isAvailable(e['startsAt']?.toString(), e['endsAt']?.toString())));
        final next = res['nextCursor'];
        if (next is String && next.isNotEmpty) {
          cursor = next;
        } else {
          break;
        }
      }
      events.value = collected.take(100).toList();
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
