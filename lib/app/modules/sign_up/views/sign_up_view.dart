import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/sign_up_controller.dart';

class SignUpView extends GetView<SignUpController> {
  SignUpView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'Create your account',
      subtitle: 'One account for tickets and hosting.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SahraAuthTabs(isSignUp: true),
          const SizedBox(height: 20),
          // Host intent picker, hosting adds an organisation on the same
          // account (it is never a second login).
          Obx(() => Column(children: [
                _intentCard(
                  title: 'Go to events',
                  subtitle: 'Buy, sell and send tickets.',
                  selected: !controller.hostIntent.value,
                  onTap: () => controller.hostIntent.value = false,
                ),
                const SizedBox(height: 10),
                _intentCard(
                  title: 'Go to events and host them',
                  subtitle:
                      'Everything above, plus an organisation to sell tickets and run the door. You’ll name it next.',
                  selected: controller.hostIntent.value,
                  onTap: () => controller.hostIntent.value = true,
                ),
              ])),
          const SizedBox(height: 20),
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SahraAuthField(
                  controller: controller.firstNameController,
                  label: 'Full name',
                  hint: 'Layla Al-Amin',
                  keyboardType: TextInputType.name,
                  textInputAction: TextInputAction.next,
                  validator: (value) => HelperFunction.nameValidate(value!,
                      fieldName: 'Full name'),
                ),
                const SizedBox(height: 16),
                SahraAuthField(
                  controller: controller.emailController,
                  label: 'Email',
                  hint: 'you@example.com',
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  validator: (value) =>
                      HelperFunction.validateEmailOrPhone(value!),
                ),
                const SizedBox(height: 16),
                SahraAuthField(
                  controller: controller.phoneController,
                  label: 'Mobile · for ticket transfers',
                  hint: '+971 50 412 8890',
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 16),
                Obx(
                  () => SahraAuthField(
                    controller: controller.passwordController,
                    label: 'Password',
                    obscure: controller.isShowPassword.value,
                    textInputAction: TextInputAction.next,
                    validator: (value) =>
                        HelperFunction.passwordValidate(value!),
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
                    label: 'Confirm password',
                    obscure: controller.isShowConfirmPassword.value,
                    textInputAction: TextInputAction.done,
                    validator: (value) =>
                        HelperFunction.confirmPasswordValidate(
                            value!, controller.passwordController.text),
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
                const SizedBox(height: 18),
                Obx(
                  () => GestureDetector(
                    onTap: controller.toggleTerms,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          margin: const EdgeInsets.only(top: 1),
                          decoration: BoxDecoration(
                            color: controller.acceptTerms.value
                                ? ColorConstant.gold
                                : ColorConstant.nightSurface,
                            borderRadius: BorderRadius.circular(7),
                            border: Border.all(
                                color: controller.acceptTerms.value
                                    ? ColorConstant.gold
                                    : ColorConstant.nightBorder),
                          ),
                          child: controller.acceptTerms.value
                              ? Icon(Icons.check,
                                  size: 16, color: ColorConstant.night)
                              : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'I agree to the Terms and Resale policy',
                            style: sahraText(
                                color: ColorConstant.whiteA700
                                    .withValues(alpha: 0.85),
                                size: 13,
                                height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                AuthPillButton(
                  controller: controller.btnController,
                  text: 'Create account',
                  onTap: () {
                    if (_formKey.currentState!.validate()) {
                      controller.signUp(context);
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _intentCard({
    required String title,
    required String subtitle,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? ColorConstant.gold : ColorConstant.nightBorder,
            width: 1.5,
          ),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style:
                          sahraText(size: 15, weight: FontWeight.w700)),
                  const SizedBox(height: 3),
                  Text(subtitle,
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 13,
                          height: 1.4)),
                ]),
          ),
          const SizedBox(width: 10),
          Container(
            width: 20,
            height: 20,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                  color: selected
                      ? ColorConstant.gold
                      : ColorConstant.nightBorder,
                  width: 2),
              color: Colors.transparent,
            ),
            child: selected
                ? Center(
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: ColorConstant.gold),
                    ),
                  )
                : null,
          ),
        ]),
      ),
    );
  }
}
