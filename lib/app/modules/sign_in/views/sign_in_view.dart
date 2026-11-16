import 'dart:io' show Platform;

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'widgets/auth_pill_button.dart';
import '../controllers/sign_in_controller.dart';

class SignInView extends GetView<SignInController> {
  SignInView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Welcome back',
      subtitle: 'Sign in to your Sahra account.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SahraAuthTabs(isSignUp: false),
          const SizedBox(height: 24),
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SahraAuthField(
                  controller: controller.emailController,
                  label: 'Email or phone',
                  hint: 'you@example.com',
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  validator: (value) =>
                      HelperFunction.validateEmailOrPhone(value!),
                ),
                const SizedBox(height: 16),
                Obx(
                  () => SahraAuthField(
                    controller: controller.passwordController,
                    label: 'Password',
                    obscure: controller.isShowPassword.value,
                    textInputAction: TextInputAction.done,
                    validator: (value) => HelperFunction.passwordValidate(
                        value!,
                        isCurrentPassword: true),
                    suffix: IconButton(
                      onPressed: () => controller.isShowPassword.value =
                          !controller.isShowPassword.value,
                      icon: Icon(
                        controller.isShowPassword.value
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: ColorConstant.gold,
                        size: 20,
                      ),
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Get.toNamed(Routes.FORGET_PASSWORD),
                    child: Text('Forgot password?',
                        style: sahraText(
                            color: ColorConstant.gold,
                            size: 14,
                            weight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 8),
                AuthPillButton(
                  controller: controller.btnController,
                  text: 'Sign in',
                  onTap: _onTapSignIn,
                ),
                const SizedBox(height: 18),
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
                if (Platform.isIOS)
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
                AuthPillButton(
                  text: 'Continue with Google',
                  variant: AuthPillButtonVariant.secondary,
                  prefix: CustomImageView(
                      imagePath: ImageConstant.imgGoogle,
                      height: 20,
                      width: 20),
                  onTap: () => controller.loginGoogle(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _onTapSignIn() {
    if (_formKey.currentState!.validate()) controller.loginAPI();
  }
}
