import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../../../data/utils/helper_functions.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/forget_password_controller.dart';

class ForgetPasswordView extends GetView<ForgetPasswordController> {
  ForgetPasswordView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return BaseViewPageScreen(
      screenName: 'lbl_forgot_password'.tr,
      sidePadding: false,
      basicAppBar: true,
      showDivider: true,
      showBackBtn: true,
      leadingImagePath: ImageConstant.imgBackIcon,
      child: Form(
          key: _formKey,
          child: SizedBox(
              width: double.maxFinite,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: getSize(30),
                    ),
                    Text(
                      "${'lbl_forgot_password'.tr} ?",
                      style: AppStyle.heading1Manrope,
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    Text(
                      "enter_email".tr,
                      style: AppStyle.bodySmallInter,
                    ),
                    SizedBox(
                      height: getSize(30),
                    ),
                    CustomTextFormField(
                        focusNode: controller.emailNode,
                        controller: controller.emailController,
                        labelText: "lbl_email_address2".tr,
                        hintText: "lbl_your_email".tr,
                        textInputType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.done,
                        // limit: Constants.EMAIL_VALIDATION,
                        // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                        validator: (value) {
                          return HelperFunction.validateEmailOrPhone(value!);
                        }),
                    AuthPillButton(
                        controller: controller.btnController,
                        text: "lbl_continue".tr,
                        margin: getMargin(top: 40, bottom: 5),
                        onTap: () {
                          if (_formKey.currentState!.validate()) {
                            controller.forgetPasswordAPI();
                          }
                        }),
                    // CustomButton(
                    //     text: "lbl_continue".tr,
                    //     margin: getMargin(top: 20, bottom: 5),
                    //     shape: ButtonShape.RoundedBorder14,
                    //     fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
                  ]))),
    );
  }
}
