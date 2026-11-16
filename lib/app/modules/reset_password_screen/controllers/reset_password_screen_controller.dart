import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class ResetPasswordScreenController extends GetxController {
  TextEditingController newPasswordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  FocusNode? newPasswordNode = FocusNode();
  FocusNode? confirmPasswordNode = FocusNode();

  String? email;
  String? code;

  RxBool isLoading = false.obs;

  Rx<bool> isShowPassword = true.obs;
  Rx<bool> isShowConfirmPassword = true.obs;

  @override
  void onInit() {
    super.onInit();
    var arguments = Get.arguments;
    if (arguments != null && arguments[Constants.paramEmail] != null) {
      email = Get.arguments[Constants.paramEmail];
    }
    if (arguments != null && arguments['code'] != null) {
      code = Get.arguments['code'].toString();
    }
  }

  @override
  void onClose() {
    super.onClose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
  }

  Future<dynamic> resetPasswordApi(BuildContext context) async {
    if (email == null || code == null) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Reset session expired. Please request a new code.'.tr);
      return;
    }
    if (newPasswordController.text != confirmPasswordController.text) {
      CustomSnackBar.showCustomErrorToast(message: 'Passwords do not match'.tr);
      return;
    }
    if (newPasswordController.text.length < 8) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Password must be at least 8 characters'.tr);
      return;
    }
    btnController.start();
    try {
      await ApiService.resetPassword(
        email: email!,
        code: code!,
        password: newPasswordController.text,
      );
      btnController.stop();
      CustomSnackBar.showCustomSnackBar(
        title: 'Password updated',
        message: 'You can sign in with your new password.',
      );
      Get.offAllNamed(Routes.SIGN_IN);
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }
}
