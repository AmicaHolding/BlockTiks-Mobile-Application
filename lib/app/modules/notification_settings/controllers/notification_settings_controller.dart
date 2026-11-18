import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';

/// Notification preferences, channels (push/email/SMS) plus per-category
/// toggles. Tickets & orders are always on (they're needed at the gate).
class NotificationSettingsController extends GetxController {
  final RxBool push = true.obs;
  final RxBool email = true.obs;
  final RxBool sms = false.obs;
  final RxBool selling = true.obs;
  final RxBool remind = true.obs;
  final RxBool weekly = false.obs;

  @override
  void onInit() {
    super.onInit();
    _hydrate();
  }

  Future<void> _hydrate() async {
    try {
      final res = await ApiService.me();
      final prefs = (res['user']?['notificationPrefs'] ??
              res['notificationPrefs']) as Map<String, dynamic>?;
      if (prefs == null) return;
      void set(String key, RxBool target) {
        final v = prefs[key];
        if (v is bool) target.value = v;
      }

      set('push', push);
      set('email', email);
      set('sms', sms);
      set('selling', selling);
      set('remind', remind);
      set('weekly', weekly);
    } catch (_) {
      // Keep defaults when the profile can't be fetched.
    }
  }

  static const channels = <List<String>>[
    ['push', 'Push notifications'],
    ['email', 'Email'],
    ['sms', 'SMS'],
  ];
  static const categories = <List<String>>[
    ['selling', 'Selling updates', 'When a listing sells or expires'],
    ['remind', 'Reminders', 'Sales opening, doors, gates'],
    ['weekly', 'Weekly picks', 'Events we think you’ll like'],
  ];

  RxBool valueFor(String key) => switch (key) {
        'push' => push,
        'email' => email,
        'sms' => sms,
        'selling' => selling,
        'remind' => remind,
        'weekly' => weekly,
        _ => push,
      };

  /// Summary line shown on the Settings row, e.g. "Push, Email" or "Off".
  String get channelSummary {
    final on = [
      if (push.value) 'Push',
      if (email.value) 'Email',
      if (sms.value) 'SMS',
    ];
    return on.isEmpty ? 'Off' : on.join(', ');
  }

  void toggle(String key) {
    final v = valueFor(key);
    v.value = !v.value;
    _persist();
  }

  void _persist() {
    ApiService.updateNotificationSettings({
      'push': push.value,
      'email': email.value,
      'sms': sms.value,
      'selling': selling.value,
      'remind': remind.value,
      'weekly': weekly.value,
    }).catchError((_) {});
  }
}
