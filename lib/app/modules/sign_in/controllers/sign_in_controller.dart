import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class SignInController extends GetxController {
  TextEditingController emailController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();
  FocusNode? passwordNode = FocusNode();
  FocusNode? emailNode = FocusNode();
  Rx<bool> isShowPassword = true.obs;
  dynamic argumentData = Get.arguments;
  String comingFrom = "";
  // final AppPreferences _appPreferences = AppPreferences();
  RxBool isloading = false.obs;

  // final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  // final _auth = fb.FirebaseAuth.instance;
  // final _database = FirebaseDatabase.instance.reference();
  RxBool absorb = false.obs;
  // String? _loginPlatform;

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
    emailController.dispose();
    passwordController.dispose();
  }

  Future<dynamic> loginAPI() async {
    final email = emailController.text.trim();
    final password = passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: "Please enter email and password".tr);
      return;
    }
    btnController.start();
    try {
      final res = await ApiService.login(email: email, password: password);
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

}
