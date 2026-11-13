import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class SignUpController extends GetxController {
  TextEditingController firstNameController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController referralController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  RxBool isSelectedSwitch = false.obs;

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
    referralController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
  }

  Future<dynamic> signUp(BuildContext context) async {
    final firstName = firstNameController.text.trim();
    final email = emailController.text.trim();
    final password = passwordController.text;
    if (firstName.isEmpty || email.isEmpty || password.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: "Please fill in all fields".tr);
      return;
    }
    if (password != confirmPasswordController.text) {
      CustomSnackBar.showCustomErrorToast(message: "Passwords do not match".tr);
      return;
    }
    if (password.length < 8) {
      CustomSnackBar.showCustomErrorToast(message: "Password must be at least 8 characters".tr);
      return;
    }
    btnController.start();
    try {
      final res = await ApiService.signup(
        firstName: firstName,
        email: email,
        password: password,
        role: isSelectedSwitch.value ? 'creator' : 'user',
      );
      btnController.stop();
      await ApiService.saveSession(res);
      ApiService.goToDashboard();
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(message: e.toString().replaceFirst('Exception: ', ''));
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
}
