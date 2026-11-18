import 'dart:io' show Platform;

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'widgets/auth_pill_button.dart';
import '../controllers/sign_in_controller.dart';

/// v2 merged sign-in: one phone-or-email field → OTP. Apple on iOS.
/// No password fields, no forgot/reset links (passwords are gone).
class SignInView extends GetView<SignInController> {
  SignInView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Welcome back',
      subtitle: 'One code, no password.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SahraAuthField(
                  controller: controller.contactController,
                  label: 'Email or phone',
                  hint: 'you@example.com or +9715…',
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  validator: (value) =>
                      HelperFunction.validateEmailOrPhone(value!),
                ),
                const SizedBox(height: 24),
                AuthPillButton(
                  controller: controller.btnController,
                  text: 'Send code',
                  onTap: _onTapSendCode,
                ),
                const SizedBox(height: 18),
                if (Platform.isIOS) ...[
                  Row(children: [
                    Expanded(child: Divider(color: ColorConstant.nightBorder)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('or',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 13)),
                    ),
                    Expanded(child: Divider(color: ColorConstant.nightBorder)),
                  ]),
                  const SizedBox(height: 14),
                  AuthPillButton(
                    text: 'Continue with Apple',
                    variant: AuthPillButtonVariant.secondary,
                    prefix: CustomImageView(
                        svgPath: ImageConstant.imgAppleLogo,
                        height: 18,
                        width: 18),
                    margin: const EdgeInsets.only(bottom: 10),
                    onTap: () => controller.loginApple(context),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _onTapSendCode() {
    if (_formKey.currentState!.validate()) controller.sendCode();
  }
}
