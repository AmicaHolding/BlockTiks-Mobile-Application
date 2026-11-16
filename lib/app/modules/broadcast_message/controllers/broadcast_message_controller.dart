import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class BroadcastMessageController extends GetxController {
  final TextEditingController messageController = TextEditingController();
  final RxString eventId = ''.obs;
  final RxString eventTitle = ''.obs;
  final RxList<String> audienceOptions = <String>['All ticket holders'].obs;
  final RxList<String> selectedAudience = <String>['All ticket holders'].obs;
  final RxBool isSending = false.obs;
  final RxInt version = 0.obs;

  bool get canSend =>
      messageController.text.trim().isNotEmpty && !isSending.value;

  @override
  void onInit() {
    super.onInit();
    messageController.addListener(() => version.value++);
    final data = Get.arguments;
    if (data is Map) {
      eventId.value = data['eventId']?.toString() ?? '';
      eventTitle.value = data['title']?.toString() ?? '';
    }
    loadAudience();
  }

  Future<void> loadAudience() async {
    final id = eventId.value;
    if (id.isEmpty) return;
    try {
      final event = await ApiService.event(id);
      final tiers = event['tiers'];
      if (tiers is List) {
        final names = tiers
            .whereType<Map>()
            .map((t) => t['name']?.toString() ?? '')
            .where((n) => n.isNotEmpty)
            .toList();
        audienceOptions.value = ['All ticket holders', ...names];
        if (!selectedAudience.contains('All ticket holders')) {
          selectedAudience.value = ['All ticket holders'];
        }
      }
    } catch (_) {
      // Audience options are additive; keep the default if the event fails.
    }
  }

  void toggleAudience(String audience) {
    if (selectedAudience.contains(audience)) {
      if (selectedAudience.length > 1) selectedAudience.remove(audience);
      return;
    }
    if (audience == 'All ticket holders') {
      selectedAudience.value = ['All ticket holders'];
      return;
    }
    selectedAudience.remove('All ticket holders');
    selectedAudience.add(audience);
  }

  void send() {
    if (messageController.text.trim().isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Write a message first');
      return;
    }
    isSending.value = true;
    CustomSnackBar.showCustomErrorToast(
        message:
            'Broadcasts are not connected yet. Guest messaging needs a backend notification endpoint.');
    isSending.value = false;
  }

  @override
  void onClose() {
    messageController.dispose();
    super.onClose();
  }
}
