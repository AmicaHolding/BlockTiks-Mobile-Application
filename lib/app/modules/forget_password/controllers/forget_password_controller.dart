import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class ForgetPasswordController extends GetxController {
  TextEditingController emailController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  FocusNode? emailNode = FocusNode();

  Future<dynamic> forgetPasswordAPI() async {
    final email = emailController.text.trim();
    if (email.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Please enter your email'.tr);
      return;
    }
    btnController.start();
    try {
      final res = await ApiService.forgotPassword(email);
      btnController.stop();
      Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: {
        Constants.paramEmail: email,
        Constants.paramComingFrom: Constants.paramForget,
        'devCode': res['devCode'],
      });
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }
}
