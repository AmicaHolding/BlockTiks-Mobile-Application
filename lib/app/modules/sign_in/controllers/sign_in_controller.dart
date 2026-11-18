import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

/// v2 OTP sign-in. One entry for sign-in/sign-up (A1): a single phone-or-email
/// field → POST /auth/otp/start → code screen → /auth/otp/verify. No passwords.
class SignInController extends GetxController {
  TextEditingController contactController = TextEditingController();
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();
  FocusNode? contactNode = FocusNode();
  dynamic argumentData = Get.arguments;
  String comingFrom = "";
  RxBool isloading = false.obs;
  RxBool absorb = false.obs;

  @override
  void onInit() {
    if (argumentData != null && argumentData['comingFrom'] != null) {
      comingFrom = argumentData['comingFrom'];
    }
    super.onInit();
  }

  @override
  void onClose() {
    super.onClose();
    contactController.dispose();
  }

  /// Send the code. Errors: contact_invalid, rate_limited.
  Future<dynamic> sendCode() async {
    final contact = contactController.text.trim();
    if (contact.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: "Enter an email or phone number".tr);
      return;
    }
    btnController.start();
    try {
      final res = await ApiService.otpStart(contact);
      btnController.stop();
      Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: {
        'challengeId': res['challenge_id']?.toString(),
        'contact': contact,
        'channel': res['channel']?.toString() ?? 'email',
        'devCode': res['dev_code']?.toString() ?? res['devCode']?.toString(),
        'comingFrom': comingFrom,
      });
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  /// Sign in with Apple → POST /auth/apple {identity_token,name?}.
  // TODO(api-gap): sign_in_with_apple is commented out in pubspec.yaml —
  // enable it (needs ≥ Dart 3.12 toolchain) then wire the credential's
  // identityToken into ApiService.appleAuth here.
  Future<void> loginApple(BuildContext context) async {
    CustomSnackBar.showCustomErrorToast(
        message: 'Apple sign-in is not enabled in this build yet');
  }

  /// Shared post-auth landing (A2/A4). New accounts collect a name first.
  static Future<void> afterAuth(Map<String, dynamic> res) async {
    final isNew = res['is_new'] == true;
    final landing = res['landing'] as Map?;
    if (isNew) {
      Get.offAllNamed(Routes.ONBOARDING_NAME);
      return;
    }
    final mode = landing?['mode']?.toString() ?? 'personal';
    final screen = landing?['screen']?.toString() ?? 'home';
    Constants.isUserCreator = mode == 'org';
    if (mode == 'org' && screen == 'door_scan') {
      Get.offAllNamed(Routes.MY_SCANNER);
    } else if (mode == 'org' && screen == 'door_events') {
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } else {
      Get.offAllNamed(Routes.USER_DASHBOARD);
    }
  }
}
