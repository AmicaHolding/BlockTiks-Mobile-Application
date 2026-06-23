import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../../../data/utils/helper_functions.dart';
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
                    MyText(
                      title: "${'lbl_forgot_password'.tr} ?",
                      fontSize: 18,
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    MyText(
                      title: "enter_email".tr,
                      clr: ColorConstant.white60,
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
                    CustomButton(
                        controller: controller.btnController,
                        text: "lbl_continue".tr,
                        margin: getMargin(top: 40, bottom: 5),
                        fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
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
