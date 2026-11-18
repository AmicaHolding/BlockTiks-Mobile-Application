import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class SignUpController extends GetxController {
  TextEditingController firstNameController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  TextEditingController referralController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  RxBool isSelectedSwitch = false.obs;
  RxBool acceptTerms = false.obs;

  /// Host intent: "Go to events and host them", the account then creates an
  /// organisation on the next screen instead of going to personalization.
  final RxBool hostIntent = false.obs;

  FocusNode? firstNameNode = FocusNode();
  FocusNode? emailNode = FocusNode();
  FocusNode? referralNode = FocusNode();
  FocusNode? passwordNode = FocusNode();
  FocusNode? confirmPasswordNode = FocusNode();

  Rx<bool> isShowPassword = true.obs;
  Rx<bool> isShowConfirmPassword = true.obs;

  dynamic argumentData = Get.arguments;
  String comingFrom = "";

  // final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  // final _auth = fb.FirebaseAuth.instance;
  // final _database = FirebaseDatabase.instance.reference();
  RxBool absorb = false.obs;

  // String? _loginPlatform;
  // final AppPreferences _appPreferences = AppPreferences();

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
    firstNameController.dispose();
    emailController.dispose();
    phoneController.dispose();
    referralController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
  }

  Future<dynamic> signUp(BuildContext context) async {
    final firstName = firstNameController.text.trim();
    final email = emailController.text.trim();
    final password = passwordController.text;
    final phone = phoneController.text.trim();
    if (firstName.isEmpty || email.isEmpty || password.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: "Please fill in all fields".tr);
      return;
    }
    if (!acceptTerms.value) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Please accept the Terms and Resale policy'.tr);
      return;
    }
    if (phone.isNotEmpty && phone.replaceAll(RegExp(r'\D'), '').length < 8) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Enter a valid mobile number'.tr);
      return;
    }
    if (password != confirmPasswordController.text) {
      CustomSnackBar.showCustomErrorToast(message: "Passwords do not match".tr);
      return;
    }
    if (password.length < 8) {
      CustomSnackBar.showCustomErrorToast(
          message: "Password must be at least 8 characters".tr);
      return;
    }
    btnController.start();
    try {
      // TODO(api-gap: contract is `intent:"fan"|"host"` returning
      // `next:"personalize"|"create_org"`; the MVP backend uses `role`,
      // so host intent maps to the creator role until it ships)
      final res = await ApiService.signup(
        firstName: firstName,
        email: email,
        phone: phone.isEmpty ? null : phone,
        password: password,
        role: hostIntent.value ? 'creator' : 'user',
        referralCode: referralController.text.trim(),
      );
      btnController.stop();
      await ApiService.saveSession(res);
      if (hostIntent.value) {
        await ApiService.setLastModeLocal('creator');
        Get.offAllNamed(Routes.HOST_ORG,
            arguments: {'fromSignup': true});
      } else {
        await ApiService.setLastModeLocal('fan');
        Get.offAllNamed(Routes.PERSONALIZE);
      }
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  loginGoogle(context) async {
    Get.offAllNamed(Routes.USER_DASHBOARD);
  }

  loginApple(BuildContext context) async {
    Get.offAllNamed(Routes.USER_DASHBOARD);
  }

  void updateNotificationToggle(context) async {
    isSelectedSwitch.value = !isSelectedSwitch.value;
  }

  void toggleTerms() => acceptTerms.value = !acceptTerms.value;
}
