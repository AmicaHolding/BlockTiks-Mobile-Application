import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/api_utils.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/services/base_client.dart';

class OtpVerificationScreenController extends GetxController {
  TextEditingController otpController = TextEditingController();
  RxString email = "".obs;
  String? navigationFrom;
  RxBool resendOtpBool = false.obs;
  var arguments = Get.arguments;
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  bool toCreator = false;

  // final AppPreferences _appPreferences = AppPreferences();

  @override
  Future<void> onInit() async {
    if (arguments != null && arguments[Constants.paramEmail] != null) {
      email.value = Get.arguments[Constants.paramEmail];
      //print(email.value);
    }

    if (arguments != null && arguments[Constants.paramComingFrom] != null) {
      navigationFrom = Get.arguments[Constants.paramComingFrom];
    }
    if (arguments != null && arguments[Constants.paramCreator] != null) {
      toCreator = Get.arguments[Constants.paramCreator];
    }

    countDown();
    super.onInit();
  }

  TextEditingController otp = TextEditingController(text: "");
  Rx<String>? otpCode = "".obs;
  RxInt min = 00.obs;
  RxInt sec = 60.obs;

  void countDown() {
    resendOtpBool.value = false;
    debugPrint("${sec.value}");
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (sec.value != 0) {
        sec.value = sec.value - 1;
      } else {
        timer.cancel();
        resendOtpBool.value = true;
      }
    });
    // sec.value = 60;
  }

  Future<dynamic> verifyUser() async {
    if(toCreator){
      Constants.isUserCreator  = true;
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    }else{
      Constants.isUserCreator  = false;
      Get.offAllNamed(Routes.PERSONALIZE);
    }
  }


  Future<dynamic> loginUser() async {
    if(toCreator){
      Constants.isUserCreator  = true;
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    }else{
      Constants.isUserCreator  = false;
      Get.offAllNamed(Routes.USER_DASHBOARD);
    }

  }


  Future<dynamic> verifyOtp() async {
    Get.offNamed(Routes.RESET_PASSWORD_SCREEN, arguments: {
      Constants.paramEmail: email.value,
      Constants.paramComingFrom: Constants.paramForget
    });

  }

  Future<dynamic> verifyTransform() async {
    Get.offAllNamed(Routes.USER_DASHBOARD,arguments: {"index": 2});
  }
}
