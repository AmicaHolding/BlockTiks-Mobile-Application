import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_toast.dart';

class ResetPasswordScreenController extends GetxController {
  TextEditingController newPasswordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  FocusNode? newPasswordNode = FocusNode();
  FocusNode? confirmPasswordNode = FocusNode();

  String? email;

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
  }

  @override
  void onClose() {
    super.onClose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
  }

  Future<dynamic> resetPasswordApi(BuildContext context) async {
    CustomToast().showToast("msg_password_changed".tr, false, context);
    Get.offAllNamed(Routes.GET_STARTED);
  }
}
