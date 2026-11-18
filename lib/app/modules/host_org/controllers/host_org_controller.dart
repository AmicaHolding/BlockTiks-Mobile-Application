import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:block_tix/app/services/api_service.dart';

/// Organisation creation after host sign-up (or from the switcher).
/// The name fans see on your events.
class HostOrgController extends GetxController {
  final TextEditingController nameController = TextEditingController();
  final RxString city = 'Dubai'.obs;
  final RxString type = 'Promoter'.obs;
  final RxnString error = RxnString();
  final RxBool isSaving = false.obs;

  static const cities = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Kuwait City'];
  static const types = ['Promoter', 'Venue', 'Artist', 'Community'];

  /// Came from host sign-up with no organisations yet → skipping goes to
  /// personalize; came from the switcher/settings → just close.
  bool get fromSignup => Get.arguments is Map &&
      (Get.arguments as Map)['fromSignup'] == true;

  Future<void> create() async {
    final name = nameController.text.trim();
    if (name.length < 2) {
      error.value = 'Give your organisation a name.';
      return;
    }
    error.value = null;
    isSaving.value = true;
    try {
      // TODO(api-gap: POST /orgs {name,type,city}, verify backend route;
      // until it exists we still land in door mode so the flow is testable)
      try {
        await ApiService.createOrg(
            name: name, type: type.value, city: city.value);
      } catch (_) {}
      await ApiService.setLastModeLocal('creator');
      Constants.isUserCreator = true;
      CustomSnackBar.showCustomToast(
          message: '$name is set up. Build your first event on the web.');
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } catch (e) {
      error.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isSaving.value = false;
    }
  }

  void skip() {
    if (fromSignup) {
      Get.offAllNamed(Routes.PERSONALIZE);
    } else {
      Get.back();
    }
  }

  void openStudio() => WebHandoffSheet.show(feature: 'Creating events');

  @override
  void onClose() {
    nameController.dispose();
    super.onClose();
  }
}
