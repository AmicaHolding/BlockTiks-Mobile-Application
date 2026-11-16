import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class BroadcastMessageController extends GetxController {
  final TextEditingController messageController = TextEditingController();
  final RxString eventId = ''.obs;
  final RxString eventTitle = ''.obs;
  final RxList<Map<String, dynamic>> audiences = <Map<String, dynamic>>[].obs;
  final RxString selectedAudience = 'Everyone'.obs;
  final RxBool pushEnabled = true.obs;
  final RxBool emailEnabled = true.obs;
  final RxBool smsEnabled = false.obs;
  final RxInt recipientCount = 0.obs;
  final RxString lastSent = ''.obs;
  final RxBool isSending = false.obs;
  final RxInt version = 0.obs;

  bool get canSend =>
      messageController.text.trim().isNotEmpty &&
      (pushEnabled.value || emailEnabled.value || smsEnabled.value) &&
      !isSending.value;

  @override
  void onInit() {
    super.onInit();
    messageController.addListener(() => version.value++);
    final data = Get.arguments;
    if (data is Map) {
      eventId.value = data['eventId']?.toString() ?? '';
      eventTitle.value = data['title']?.toString() ?? '';
    }
    load();
  }

  Future<void> load() async {
    final id = eventId.value;
    if (id.isEmpty) return;
    await Future.wait(
        [loadAudiences(id), loadLastSent(id), loadRecipientCount(id)]);
  }

  Future<void> loadAudiences(String id) async {
    try {
      final event = await ApiService.event(id);
      final options = <Map<String, dynamic>>[
        {'label': 'Everyone', 'filter': null},
        {
          'label': 'Not checked in',
          'filter': {'checkedIn': false}
        },
        {
          'label': 'Checked in',
          'filter': {'checkedIn': true}
        },
      ];
      final tiers = event['tiers'];
      if (tiers is List) {
        for (final tier in tiers.whereType<Map>()) {
          final name = tier['name']?.toString() ?? '';
          if (name.isNotEmpty) {
            options.add({
              'label': name,
              'filter': {'tierName': name}
            });
          }
        }
      }
      final sections = event['venueSections'];
      if (sections is List) {
        for (final section in sections.whereType<Map>()) {
          final name = section['name']?.toString() ?? '';
          if (name.isNotEmpty) {
            options.add({
              'label': name,
              'filter': {'sectionName': name}
            });
          }
        }
      }
      audiences.value = options;
      if (!options.any((o) => o['label'] == selectedAudience.value)) {
        selectedAudience.value = 'Everyone';
      }
    } catch (_) {
      audiences.value = [
        {'label': 'Everyone', 'filter': null},
        {
          'label': 'Not checked in',
          'filter': {'checkedIn': false}
        },
        {
          'label': 'Checked in',
          'filter': {'checkedIn': true}
        },
      ];
    }
  }

  Future<void> loadLastSent(String id) async {
    try {
      final broadcasts = await ApiService.eventBroadcasts(id);
      if (broadcasts.isEmpty) return;
      final latest = broadcasts.first;
      final at = latest['createdAt']?.toString() ?? '';
      lastSent.value = at.isEmpty ? '' : 'Last sent ${_relative(at)}';
    } catch (_) {}
  }

  Future<void> loadRecipientCount(String id) async {
    try {
      final res = await ApiService.eventGuests(id);
      recipientCount.value = (res['total'] as num?)?.toInt() ?? 0;
    } catch (_) {}
  }

  String _relative(String iso) {
    final date = DateTime.tryParse(iso);
    if (date == null) return iso;
    final diff = DateTime.now().difference(date.toLocal());
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  Map<String, dynamic>? get selectedFilter {
    for (final audience in audiences) {
      if (audience['label'] == selectedAudience.value) {
        final filter = audience['filter'];
        return filter is Map ? Map<String, dynamic>.from(filter) : null;
      }
    }
    return null;
  }

  Future<void> send() async {
    final message = messageController.text.trim();
    if (message.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Write a message first');
      return;
    }
    if (!(pushEnabled.value || emailEnabled.value || smsEnabled.value)) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Choose at least one channel');
      return;
    }
    if (eventId.value.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Missing event');
      return;
    }
    isSending.value = true;
    try {
      await ApiService.createBroadcast(
        eventId.value,
        audience: selectedAudience.value,
        message: message,
        audienceFilter: selectedFilter,
        channels: {
          'push': pushEnabled.value,
          'email': emailEnabled.value,
          'sms': smsEnabled.value,
        },
      );
      CustomSnackBar.showCustomSnackBar(
        title: 'Broadcast sent',
        message: 'Attendees will see this in their Sahra updates.',
      );
      messageController.clear();
      await loadLastSent(eventId.value);
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
