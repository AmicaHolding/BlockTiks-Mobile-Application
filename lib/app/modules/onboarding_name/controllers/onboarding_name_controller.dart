import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

/// v2 onboarding: new accounts only need a name (the one required field),
/// then what-brings-you-here, then personalize (city + ≥1 interest).
class OnboardingNameController extends GetxController {
  final TextEditingController nameController = TextEditingController();
  final RxBool isSaving = false.obs;
  final RxString intent = ''.obs;

  /// what-brings-you-here options (A3). Empty = skipped.
  static const intents = ['going_out', 'hosting_friends', 'running_events'];

  Future<void> saveName() async {
    final name = nameController.text.trim();
    if (name.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Add your name');
      return;
    }
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      await ApiService.updateMe({
        'name': name,
        if (intent.value.isNotEmpty) 'intent': [intent.value],
      });
      Get.offAllNamed(Routes.PERSONALIZE);
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSaving.value = false;
    }
  }
}
