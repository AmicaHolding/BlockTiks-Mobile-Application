import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class ChangePasswordController extends GetxController {
  GlobalKey<FormState> formKey = GlobalKey();
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  TextEditingController currentPasswordController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confController = TextEditingController();
  FocusNode? currentPasswordNode = FocusNode();
  FocusNode? passwordNode = FocusNode();
  FocusNode? confirmPasswordNode = FocusNode();
  String? email;
  Rx<bool> isShowCurrentPassword = true.obs;
  Rx<bool> isShowPassword = true.obs;
  Rx<bool> isShowPassword1 = true.obs;

  String token = "";
  AppPreferences appPreferences = AppPreferences();

  @override
  void onInit() {
    email = Get.arguments;
    super.onInit();
  }

  Future<void> changePasswordApi(BuildContext context) async {
    if (passwordController.text != confController.text) {
      CustomSnackBar.showCustomErrorToast(message: "Passwords do not match".tr);
      return;
    }
    btnController.start();
    try {
      await ApiService.changePassword(
        currentPassword: currentPasswordController.text,
        newPassword: passwordController.text,
      );
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(message: "Password updated successfully".tr);
      Get.back();
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }
}
