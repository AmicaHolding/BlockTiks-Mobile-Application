import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';

class ForgetPasswordController extends GetxController {
  TextEditingController emailController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  FocusNode? emailNode = FocusNode();

  // final AppPreferences _appPreferences = AppPreferences();

  Future<dynamic> forgetPasswordAPI() async {
    Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: {
      Constants.paramEmail: emailController.text.trim(),
      Constants.paramComingFrom: Constants.paramForget
    });

  }
}
