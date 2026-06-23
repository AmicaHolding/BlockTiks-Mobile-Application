import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';

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
    var map = {
      Constants.paramEmail: emailController.text,
      Constants.paramComingFrom: Constants.paramLogin,
      Constants.paramCreator: emailController.text.contains("creator")
    };
    Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: map);
  }

  loginGoogle(context) async {
    Get.offAllNamed(Routes.USER_DASHBOARD);
  }

  loginApple(BuildContext context) async {
    Get.offAllNamed(Routes.USER_DASHBOARD);
  }

}
