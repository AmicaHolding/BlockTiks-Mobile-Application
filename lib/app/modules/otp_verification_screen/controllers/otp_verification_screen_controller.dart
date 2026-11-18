import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/sign_in/controllers/sign_in_controller.dart';
import 'package:block_tix/app/services/api_service.dart';

/// v2 code screen: verifies against POST /auth/otp/verify with the
/// challenge_id from /auth/otp/start. Errors: code_invalid (attempts_left),
/// code_expired, too_many_attempts.
class OtpVerificationScreenController extends GetxController {
  TextEditingController otpController = TextEditingController();
  RxString contact = ''.obs;
  RxString channel = 'email'.obs;
  String challengeId = '';
  String comingFrom = '';
  RxBool resendOtpBool = false.obs;
  var arguments = Get.arguments;
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  @override
  Future<void> onInit() async {
    challengeId = arguments?['challengeId']?.toString() ?? '';
    contact.value = arguments?['contact']?.toString() ??
        arguments?[Constants.paramEmail]?.toString() ??
        '';
    channel.value = arguments?['channel']?.toString() ?? 'email';
    comingFrom = arguments?['comingFrom']?.toString() ??
        arguments?[Constants.paramComingFrom]?.toString() ??
        '';
    final devCode = arguments?['devCode']?.toString();
    if (devCode != null && devCode.isNotEmpty) {
      otpController.text = devCode;
    }
    countDown();
    super.onInit();
  }

  RxInt sec = 60.obs;

  void countDown() {
    resendOtpBool.value = false;
    sec.value = 60;
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (sec.value != 0) {
        sec.value = sec.value - 1;
      } else {
        timer.cancel();
        resendOtpBool.value = true;
      }
    });
  }

  /// Verify the code → save session → A2/A4 landing.
  Future<dynamic> verifyOtp() async {
    final code = otpController.text.trim();
    if (code.length != Constants.otpLength) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Please enter the 6-digit code'.tr);
      return;
    }
    btnController.start();
    try {
      final res = await ApiService.otpVerify(
          challengeId: challengeId, code: code);
      btnController.stop();
      await ApiService.saveSession(res);
      await SignInController.afterAuth(res, comingFrom: comingFrom);
    } catch (e) {
      btnController.error();
      btnController.stop();
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  /// Resend → new challenge_id replaces the old one (A6).
  Future<dynamic> resendOtp() async {
    try {
      final res = await ApiService.otpStart(contact.value);
      challengeId = res['challenge_id']?.toString() ?? challengeId;
      final devCode = res['dev_code']?.toString();
      if (devCode != null && devCode.isNotEmpty) {
        otpController.text = devCode;
      }
      countDown();
      CustomSnackBar.showCustomSnackBar(
        title: 'Code sent',
        message: 'A new code is on its way.',
      );
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }
}
