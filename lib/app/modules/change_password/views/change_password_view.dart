import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/change_password_controller.dart';

class ChangePasswordView extends GetView<ChangePasswordController> {
  ChangePasswordView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      light: true,
      title: 'Change password',
      subtitle: 'Use a strong password you don’t use elsewhere.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Obx(
              () => SahraAuthField(
                light: true,
                controller: controller.currentPasswordController,
                label: 'Current password',
                obscure: controller.isShowCurrentPassword.value,
                validator: (value) => HelperFunction.passwordValidate(value!,
                    isCurrentPassword: true),
                suffix: IconButton(
                  onPressed: () => controller.isShowCurrentPassword.value =
                      !controller.isShowCurrentPassword.value,
                  icon: Icon(
                    controller.isShowCurrentPassword.value
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
                light: true,
                controller: controller.passwordController,
                label: 'New password',
                obscure: controller.isShowPassword.value,
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
                light: true,
                controller: controller.confController,
                label: 'Confirm new password',
                obscure: controller.isShowPassword1.value,
                validator: (value) => HelperFunction.confirmPasswordValidate(
                    value!, controller.passwordController.text),
                suffix: IconButton(
                  onPressed: () => controller.isShowPassword1.value =
                      !controller.isShowPassword1.value,
                  icon: Icon(
                    controller.isShowPassword1.value
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
              text: 'Change password',
              onTap: () {
                if (_formKey.currentState!.validate()) {
                  controller.changePasswordApi(context);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
