import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/otp_text_feild.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/otp_verification_screen_controller.dart';

class OtpVerificationScreenView
    extends GetView<OtpVerificationScreenController> {
  OtpVerificationScreenView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Check your ${controller.channel.value == 'email' ? 'email' : 'phone'}',
      subtitle:
          'We sent a code to ${HelperFunction.maskString(controller.contact.value)}. It expires in 10 minutes.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          OtpTextField(
            controller: controller.otpController,
            onChanged: (v) {},
            onComplete: (String v) => controller.verifyOtp(),
          ),
          const SizedBox(height: 12),
          Obx(
            () => Text(
              'Resend in 0:${controller.sec.value.toString().padLeft(2, '0')}',
              style: sahraText(color: ColorConstant.nightMuted, size: 13),
            ),
          ),
          const SizedBox(height: 24),
          AuthPillButton(
            controller: controller.btnController,
            text: 'Verify',
            onTap: controller.verifyOtp,
          ),
          const SizedBox(height: 16),
          Center(
            child: Text('Verifies on its own once all 6 digits are in',
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 12, height: 1.4)),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: controller.resendOtp,
              child: Text('Send a new code',
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 14,
                      weight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}
