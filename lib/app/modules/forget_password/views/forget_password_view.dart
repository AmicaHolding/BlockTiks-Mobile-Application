import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/forget_password_controller.dart';

class ForgetPasswordView extends GetView<ForgetPasswordController> {
  ForgetPasswordView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Forgot your password?',
      subtitle:
          'Enter the email on your account. We’ll send a 6-digit code to reset it.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SahraAuthField(
              controller: controller.emailController,
              label: 'Email',
              hint: 'you@example.com',
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              validator: (value) => HelperFunction.validateEmailOrPhone(value!),
            ),
            const SizedBox(height: 24),
            AuthPillButton(
              controller: controller.btnController,
              text: 'Send code',
              onTap: () {
                if (_formKey.currentState!.validate()) {
                  controller.forgetPasswordAPI();
                }
              },
            ),
            const SizedBox(height: 18),
            Center(
              child: TextButton(
                onPressed: () => Get.back(),
                child: Text('Remembered it? Sign in',
                    style: sahraText(
                        color: ColorConstant.gold,
                        size: 14,
                        weight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
