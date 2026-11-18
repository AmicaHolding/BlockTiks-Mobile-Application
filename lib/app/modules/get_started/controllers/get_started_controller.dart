import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';

class GetStartedController extends GetxController {
  /// UI language preview toggle. Persisted so later screens can read it.
  final RxString lang = 'en'.obs;

  @override
  void onInit() {
    super.onInit();
    _restore();
    lang.listen((v) async {
      try {
        final prefs = AppPreferences();
        await prefs.isPreferenceReady;
        prefs.setLanguage(language: v);
      } catch (_) {}
    });
  }

  Future<void> _restore() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final saved = await prefs.getLanguage();
      if (saved.isNotEmpty) lang.value = saved;
    } catch (_) {}
  }
}
