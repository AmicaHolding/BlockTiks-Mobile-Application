import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/otp_text_feild.dart';

import '../../../data/core/app_export.dart';
import '../../../data/widgets/custom_toast.dart';
import '../controllers/otp_verification_screen_controller.dart';

class OtpVerificationScreenView
    extends GetView<OtpVerificationScreenController> {
  const OtpVerificationScreenView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: 'msg_otp_verification'.tr,
      sidePadding: false,
      basicAppBar: true,
      showBackBtn: true,
      leadingImagePath: ImageConstant.imgBackIcon,
      child: SizedBox(
          width: double.maxFinite,
          child: Column(mainAxisAlignment: MainAxisAlignment.start, children: [
            SizedBox(
              height: getSize(30),
            ),
            MyText(
              title: "Enter 6 digit verification".tr,
              fontSize: 18,
            ),
            SizedBox(
              height: getSize(10),
            ),
            MyText(
              title: "Code sent to  ".tr +
                  HelperFunction.maskString(controller.email.value),
              clr: ColorConstant.white60,
            ),
            SizedBox(
              height: getSize(30),
            ),
            Container(
              margin: getPadding(left: getSize(20), right: getSize(20)),
              child: OtpTextField(
                //semanticsLabel: SemanticsLabel.LAB_OTP_FIELD,
                controller: controller.otpController,
                onChanged: (a) {
                  if (a.length == Constants.otpLength) {
                    // onComplete();
                  }
                },
                onComplete: (a) {
                  if (a.length == Constants.otpLength) {
                    onComplete();
                  }
                },
                validator: (value) {
                  return HelperFunction.otpValidate(value!);
                },
              ),
            ),
            Obx(
              () => Padding(
                  padding: getPadding(top: 10, bottom: 5),
                  child: Text(
                      '${"msg_request_new_code".tr}0${controller.min}:${controller.sec.toString().length == 1 ? '0${controller.sec}' : controller.sec}',
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.left,
                      style: AppStyle.txtAgeoMedium14Gray700.copyWith(
                          letterSpacing: getHorizontalSize(0.05),
                          color: ColorConstant.whiteA700))),
            ),
            SizedBox(
              height: getVerticalSize(60),
            ),
            CustomButton(
              controller: controller.btnController,
              text: "lbl_verify".tr,
              fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
              onTap: () {
                onComplete();
              },
            ),
            SizedBox(
              height: getVerticalSize(10),
            ),
            GestureDetector(
                onTap: () {
                  onResend(context);
                },
                child: Padding(
                    padding: getPadding(top: 20, bottom: 5),
                    child: Obx(() => RichText(
                        text: TextSpan(children: [
                          TextSpan(
                              text: "msg_didn_t_get_code".tr + " ",
                              style: AppStyle.white60InterNormal14),
                          TextSpan(
                              text: "lbl_resend".tr,
                              style: AppStyle.pinkInterNormal16.copyWith(
                                color: ColorConstant.primaryPink.withValues(alpha: controller.sec.value != 0 ? 0.5 : 1),
                              ))
                        ]),
                        textAlign: TextAlign.left))))
          ])),
    );
  }

  onComplete() async {
    controller.btnController.start();
    if (controller.navigationFrom == Constants.paramForget) {
      await controller.verifyOtp();
    } else if (controller.navigationFrom == Constants.paramTransform) {
      await controller.verifyTransform();
    } else if (controller.navigationFrom == Constants.paramLogin) {
      await controller.loginUser();
    } else {
      await controller.verifyUser();
    }
    controller.btnController.stop();
  }

  onResend(context) async {
    if (controller.sec.value == 00) {
      controller.btnController.start();
      if (controller.navigationFrom == Constants.paramForget) {
        // await controller.resendOtp();
      } else {
        // await controller.resendVerificationOtp();
      }
      CustomToast().showToast(
          "OTP has been sent successfully on ${controller.email}".tr,
          false,
          context);
      controller.btnController.stop();
      controller.min.value = 00;
      controller.sec.value = 60;
      controller.countDown();
    }
  }
}
