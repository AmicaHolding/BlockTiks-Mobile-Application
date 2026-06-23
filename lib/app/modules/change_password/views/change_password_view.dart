import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_floating_edit_text.dart';

import '../controllers/change_password_controller.dart';

class ChangePasswordView extends GetView<ChangePasswordController> {
  ChangePasswordView({Key? key}) : super(key: key);
  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return BaseViewPageScreen(
      basicAppBar: true,
      showBackBtn: true,
      sidePadding: false,
      showDivider: true,
      screenName: 'lbl_change_password'.tr,
      child: SingleChildScrollView(
        child: Form(
          key: controller.formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Obx(
                () => CustomFloatingEditText(
                  focusNode: controller.currentPasswordNode,
                  controller: controller.currentPasswordController,
                  labelText: "msg_current_password".tr,
                  hintText: "msg_current_password".tr,
                  variant: FloatingEditTextVariant.OutlineGray300_1,
                  shape: FloatingEditTextShape.RoundedBorder10,
                  padding: FloatingEditTextPadding.PaddingTB16_1,
                  textInputAction: TextInputAction.next,
                  fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                  textInputType: TextInputType.visiblePassword,
                  limit: Constants.PASSWORD_VALIDATION,
                  isObscureText: controller.isShowCurrentPassword.value,
                  suffix: InkWell(
                    onTap: () {
                      controller.isShowCurrentPassword.value =
                          !controller.isShowCurrentPassword.value;
                    },
                    child: Container(
                      margin: getMargin(
                        left: 16,
                        right: 16,
                      ),
                      child: CustomImageView(
                        svgPath: controller.isShowCurrentPassword.value
                            ? ImageConstant.imgEyeOpen
                            : ImageConstant.imgEyeClose,
                      ),
                    ),
                  ),
                  suffixConstraints: BoxConstraints(
                    maxHeight: getVerticalSize(
                      56,
                    ),
                  ),
                  validator: (value) {
                    return HelperFunction.passwordValidate(value!,
                        isCurrentPassword: true);
                  },
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              Obx(
                () => CustomFloatingEditText(
                  focusNode: controller.passwordNode,
                  controller: controller.passwordController,
                  labelText: "lbl_new_password".tr,
                  hintText: "lbl_new_password".tr,
                  variant: FloatingEditTextVariant.OutlineGray300_1,
                  shape: FloatingEditTextShape.RoundedBorder10,
                  padding: FloatingEditTextPadding.PaddingTB16_1,
                  textInputAction: TextInputAction.next,
                  fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                  textInputType: TextInputType.visiblePassword,
                  limit: Constants.PASSWORD_VALIDATION,
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
                () => CustomFloatingEditText(
                  focusNode: controller.confirmPasswordNode,
                  controller: controller.confController,
                  labelText: "msg_confirm_new_password2".tr,
                  hintText: "msg_confirm_new_password2".tr,
                  variant: FloatingEditTextVariant.OutlineGray300_1,
                  shape: FloatingEditTextShape.RoundedBorder10,
                  padding: FloatingEditTextPadding.PaddingTB16_1,
                  textInputAction: TextInputAction.done,
                  fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                  textInputType: TextInputType.visiblePassword,
                  limit: Constants.PASSWORD_VALIDATION,
                  isObscureText: controller.isShowPassword1.value,
                  suffix: InkWell(
                    onTap: () {
                      controller.isShowPassword1.value =
                          !controller.isShowPassword1.value;
                    },
                    child: Container(
                      margin: getMargin(
                        left: 16,
                        right: 16,
                      ),
                      child: CustomImageView(
                        svgPath: controller.isShowPassword1.value
                            ? ImageConstant.imgEyeOpen
                            : ImageConstant.imgEyeClose,
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
                        value!, controller.passwordController.text);
                  },
                ),
              ),
              SizedBox(
                height: getVerticalSize(30),
              ),
              CustomButton(
                controller: controller.btnController,
                text: "lbl_update".tr,
                fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
                variant: ButtonVariant.FillOrangeA20033,
                onTap: () {
                  if (controller.formKey.currentState!.validate()) {
                    // controller.changePasswordApi(context);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
