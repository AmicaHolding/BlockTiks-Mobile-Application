import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/reset_password_screen_controller.dart';

class ResetPasswordScreenView extends GetView<ResetPasswordScreenController> {
  ResetPasswordScreenView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Set a new password',
      subtitle: 'Choose a strong password you don’t use elsewhere.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Obx(
              () => SahraAuthField(
                controller: controller.newPasswordController,
                label: 'New password',
                obscure: controller.isShowPassword.value,
                textInputAction: TextInputAction.next,
                validator: (value) => HelperFunction.passwordValidate(value!),
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
            const SizedBox(height: 16),
            Obx(
              () => SahraAuthField(
                controller: controller.confirmPasswordController,
                label: 'Confirm new password',
                obscure: controller.isShowConfirmPassword.value,
                textInputAction: TextInputAction.done,
                validator: (value) => HelperFunction.confirmPasswordValidate(
                    value!, controller.newPasswordController.text),
                suffix: IconButton(
                  onPressed: () => controller.isShowConfirmPassword.value =
                      !controller.isShowConfirmPassword.value,
                  icon: Icon(
                    controller.isShowConfirmPassword.value
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: ColorConstant.gold,
                    size: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            AuthPillButton(
              controller: controller.btnController,
              text: 'Save and sign in',
              onTap: () {
                if (_formKey.currentState!.validate()) {
                  controller.resetPasswordApi(context);
                }
              },
            ),
            const SizedBox(height: 16),
            Center(
              child: Text('Other devices will be signed out',
                  style: sahraText(
                      color: ColorConstant.nightMuted, size: 12, height: 1.4)),
            ),
          ],
        ),
      ),
    );
  }
}
