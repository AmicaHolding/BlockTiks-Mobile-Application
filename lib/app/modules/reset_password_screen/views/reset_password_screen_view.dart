import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../../../data/core/app_export.dart';
import '../controllers/reset_password_screen_controller.dart';

class ResetPasswordScreenView extends GetView<ResetPasswordScreenController> {
  ResetPasswordScreenView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: 'msg_create_new_password'.tr,
      sidePadding: false,
      basicAppBar: true,
      showBackBtn: true,
      leadingImagePath: ImageConstant.imgBackIcon,
      child: Form(
          key: _formKey,
          child: SizedBox(
              width: double.maxFinite,
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: getSize(30),
                    ),
                    MyText(
                      title: 'msg_create_new_password'.tr,
                      fontSize: 18,
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    MyText(
                      title: "msg_your_new_password".tr,
                      clr: ColorConstant.white60,
                    ),
                    SizedBox(
                      height: getSize(30),
                    ),
                    Obx(
                      () => CustomTextFormField(
                        focusNode: controller.newPasswordNode,
                        controller: controller.newPasswordController,
                        labelText: "lbl_new_password".tr,
                        hintText: "lbl_new_password".tr,
                        textInputAction: TextInputAction.next,
                        // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                        textInputType: TextInputType.visiblePassword,
                        // limit: Constants.PASSWORD_VALIDATION,
                        isObscureText: controller.isShowPassword.value,
                        suffix: InkWell(
                          onTap: () {
                            controller.isShowPassword.value =
                                !controller.isShowPassword.value;
                          },
                          child: Container(
                            margin: getMargin(
                              left: 16,
                              right: 16,
                            ),
                            child: CustomImageView(
                              svgPath: controller.isShowPassword.value
                                  ? ImageConstant.imgEyeOpen
                                  : ImageConstant.imgEyeClose,
                              color: ColorConstant.whiteA700,
                            ),
                          ),
                        ),
                        suffixConstraints: BoxConstraints(
                          maxHeight: getVerticalSize(
                            56,
                          ),
                        ),
                        validator: (value) {
                          return HelperFunction.passwordValidate(value!);
                        },
                      ),
                    ),
                    SizedBox(
                      height: getVerticalSize(20),
                    ),
                    Obx(
                      () => CustomTextFormField(
                        focusNode: controller.confirmPasswordNode,
                        controller: controller.confirmPasswordController,
                        labelText: "msg_confirm_password".tr,
                        hintText: "msg_confirm_password".tr,
                        textInputAction: TextInputAction.done,
                        // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                        textInputType: TextInputType.visiblePassword,
                        // limit: Constants.PASSWORD_VALIDATION,
                        isObscureText: controller.isShowConfirmPassword.value,
                        suffix: InkWell(
                          onTap: () {
                            controller.isShowConfirmPassword.value =
                                !controller.isShowConfirmPassword.value;
                          },
                          child: Container(
                            margin: getMargin(
                              left: 16,
                              right: 16,
                            ),
                            child: CustomImageView(
                              svgPath: controller.isShowConfirmPassword.value
                                  ? ImageConstant.imgEyeOpen
                                  : ImageConstant.imgEyeClose,
                              color: ColorConstant.whiteA700,
                            ),
                          ),
                        ),
                        suffixConstraints: BoxConstraints(
                          maxHeight: getVerticalSize(
                            56,
                          ),
                        ),
                        validator: (value) {
                          return HelperFunction.confirmPasswordValidate(
                              value!, controller.newPasswordController.text);
                        },
                      ),
                    ),
                    CustomButton(
                      controller: controller.btnController,
                      margin: getMargin(top: 30, bottom: 5),
                      text: "lbl_update_password".tr,
                      fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
                      onTap: () {
                        if (_formKey.currentState!.validate()) {
                          controller.resetPasswordApi(context);
                        }
                      },
                    ),
                  ]))),
    );
  }
}
