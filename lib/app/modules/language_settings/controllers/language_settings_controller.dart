import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';

/// Language & numbers, app language + Latin/Western-Arabic numerals.
class LanguageSettingsController extends GetxController {
  final RxString lang = 'en'.obs;
  final RxString nums = 'latn'.obs;

  String get langNote => lang.value == 'ar'
      ? 'The app switches to right-to-left. (Arabic copy isn’t in this build yet.)'
      : 'Arabic flips the whole app to right-to-left.';

  /// e.g. "AED 1,240 · 29 Nov"
  String get numPreview => nums.value == 'arab'
      ? 'AED ١٢٤٠ · ٢٩ Nov'
      : 'AED 1,240 · 29 Nov';

  @override
  void onInit() {
    super.onInit();
    _restore();
  }

  Future<void> _restore() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final l = await prefs.getLanguage();
      if (l.isNotEmpty) lang.value = l;
      final n = await prefs.getNumbers();
      if (n.isNotEmpty) nums.value = n;
    } catch (_) {}
  }

  void setLang(String v) {
    lang.value = v;
    _save();
  }

  void setNums(String v) {
    nums.value = v;
    _save();
  }

  Future<void> _save() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      prefs.setLanguage(language: lang.value);
      prefs.setNumbers(numbers: nums.value);
    } catch (_) {}
  }
}
