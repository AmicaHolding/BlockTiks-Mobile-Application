import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/api_utils.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_toast.dart';
import 'package:block_tix/app/services/base_client.dart';

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

}
