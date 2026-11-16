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

  Future<void> send() async {
    final message = messageController.text.trim();
    if (message.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Write a message first');
      return;
    }
    if (eventId.value.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Missing event');
      return;
    }
    isSending.value = true;
    try {
      final specific = selectedAudience
          .where((audience) => audience != 'All ticket holders')
          .toList();
      final audienceFilter =
          specific.length == 1 ? {'tierName': specific.first} : null;
      await ApiService.createBroadcast(
        eventId.value,
        message: message,
        audienceFilter: audienceFilter,
        channels: const {'push': true, 'email': true, 'sms': false},
      );
      CustomSnackBar.showCustomSnackBar(
        title: 'Broadcast queued',
        message: 'Attendees will see this in their Sahra updates.',
      );
      messageController.clear();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSending.value = false;
    }
  }

  @override
  void onClose() {
    messageController.dispose();
    super.onClose();
  }
}
