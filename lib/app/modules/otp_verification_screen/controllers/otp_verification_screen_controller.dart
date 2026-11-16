import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

class OtpVerificationScreenController extends GetxController {
  TextEditingController otpController = TextEditingController();
  RxString email = ''.obs;
  String? navigationFrom;
  RxBool resendOtpBool = false.obs;
  var arguments = Get.arguments;
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  bool toCreator = false;

  @override
  Future<void> onInit() async {
    if (arguments != null && arguments[Constants.paramEmail] != null) {
      email.value = Get.arguments[Constants.paramEmail];
    }

    if (arguments != null && arguments[Constants.paramComingFrom] != null) {
      navigationFrom = Get.arguments[Constants.paramComingFrom];
    }
    if (arguments != null && arguments[Constants.paramCreator] != null) {
      toCreator = Get.arguments[Constants.paramCreator];
    }
    final devCode = arguments?['devCode']?.toString();
    if (devCode != null && devCode.isNotEmpty) {
      otpController.text = devCode;
    }

    countDown();
    super.onInit();
  }

  TextEditingController otp = TextEditingController(text: '');
  Rx<String>? otpCode = ''.obs;
  RxInt min = 0.obs;
  RxInt sec = 60.obs;

  void countDown() {
    resendOtpBool.value = false;
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (sec.value != 0) {
        sec.value = sec.value - 1;
      } else {
        timer.cancel();
        resendOtpBool.value = true;
      }
    });
  }

  Future<dynamic> verifyUser() async {
    if (toCreator) {
      Constants.isUserCreator = true;
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } else {
      Constants.isUserCreator = false;
      Get.offAllNamed(Routes.PERSONALIZE);
    }
  }

  Future<dynamic> loginUser() async {
    if (toCreator) {
      Constants.isUserCreator = true;
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } else {
      Constants.isUserCreator = false;
      Get.offAllNamed(Routes.USER_DASHBOARD);
    }
  }

  Future<dynamic> verifyOtp() async {
    final code = otpController.text.trim();
    if (code.length != Constants.otpLength) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Please enter the 6-digit code'.tr);
      return;
    }
    try {
      await ApiService.verifyResetCode(email: email.value, code: code);
      Get.offNamed(Routes.RESET_PASSWORD_SCREEN, arguments: {
        Constants.paramEmail: email.value,
        Constants.paramComingFrom: Constants.paramForget,
        'code': code,
      });
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<dynamic> resendForgotPassword() async {
    try {
      final res = await ApiService.forgotPassword(email.value);
      final devCode = res['devCode']?.toString();
      if (devCode != null && devCode.isNotEmpty) {
        otpController.text = devCode;
      }
      min.value = 0;
      sec.value = 60;
      countDown();
      CustomSnackBar.showCustomSnackBar(
        title: 'Code sent',
        message: 'Check your email for the reset code.',
      );
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<dynamic> verifyTransform() async {
    Get.offAllNamed(Routes.USER_DASHBOARD, arguments: {'index': 2});
  }
}
