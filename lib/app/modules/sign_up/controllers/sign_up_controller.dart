import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';

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
    var map = {
      Constants.paramEmail: emailController.text,
      Constants.paramComingFrom: Constants.paramSignup,
      Constants.paramCreator: isSelectedSwitch.value
    };
    Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: map);
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
