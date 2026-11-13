import 'package:block_tix/app/data/widgets/custom_switch.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';

import '../../../data/core/app_export.dart';
import '../../../data/widgets/custom_text_form_field.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/sign_up_controller.dart';
import 'dart:io' show Platform;

class SignUpView extends GetView<SignUpController> {
  SignUpView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: 'lbl_register'.tr,
      sidePadding: false,
      basicAppBar: true,
      showBackBtn: true,
      leadingImagePath: ImageConstant.imgBackIcon,
      resizeToAvoidBottomInset: true,
      child: Form(
          key: _formKey,
          child: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        height: getSize(30),
                      ),
                      Text(
                        "Welcome Back!".tr,
                        style: AppStyle.heading1Manrope,
                      ),
                      SizedBox(
                        height: getSize(10),
                      ),
                      Text(
                        "All your needs for event experience.".tr,
                        style: AppStyle.bodySmallInter,
                      ),
                      SizedBox(
                        height: getSize(30),
                      ),
                      CustomTextFormField(
                          focusNode: controller.firstNameNode,
                          controller: controller.firstNameController,
                          labelText: "lbl_name".tr,
                          hintText: "lbl_your_name".tr,
                          textInputType: TextInputType.name,
                          textInputAction: TextInputAction.next,
                          // limit: Constants.NAME_VALIDATION,
                          // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                          validator: (value) {
                            return HelperFunction.nameValidate(value!,
                                fieldName: "lbl_first_name2".tr);
                          }),
                      SizedBox(
                        height: getVerticalSize(20),
                      ),
                      CustomTextFormField(
                          focusNode: controller.emailNode,
                          controller: controller.emailController,
                          labelText: "lbl_email_address2".tr,
                          hintText: "lbl_your_email".tr,
                          textInputType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          // limit: Constants.EMAIL_VALIDATION,
                          // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                          validator: (value) {
                            return HelperFunction.validateEmailOrPhone(value!);
                          }),
                      SizedBox(
                        height: getVerticalSize(20),
                      ),
                      Obx(
                        () => CustomTextFormField(
                          focusNode: controller.passwordNode,
                          controller: controller.passwordController,
                          labelText: "lbl_password2".tr,
                          hintText: "lbl_password2".tr,
                          // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                          textInputAction: TextInputAction.next,
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
                                value!, controller.passwordController.text);
                          },
                        ),
                      ),
                      SizedBox(
                        height: getVerticalSize(20),
                      ),
                      CustomTextFormField(
                        focusNode: controller.referralNode,
                        controller: controller.referralController,
                        labelText: "Referral".tr,
                        hintText: "Referral Code (Optional)".tr,
                        textInputType: TextInputType.name,
                        textInputAction: TextInputAction.next,
                        // limit: Constants.NAME_VALIDATION,
                        // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                        // validator: (value) {
                        //   return HelperFunction.nameValidate(value!,fieldName: "lbl_first_name2".tr);
                        // }
                      ),
                      SizedBox(
                        height: getVerticalSize(20),
                      ),
                      Row(
                        children: [
                          Text(
                            "Event Promoter".tr,
                            style: AppStyle.bodyInter.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Obx(() => CustomSwitch(
                              margin: getMargin(left: 10),
                              value: controller.isSelectedSwitch.value,
                              onChanged: (value) {
                                controller.updateNotificationToggle(context);
                              })),
                        ],
                      ),
                      SizedBox(
                        height: getVerticalSize(30),
                      ),
                      AuthPillButton(
                        controller: controller.btnController,
                        text: "lbl_sign_up".tr,
                        onTap: () {
                          if (_formKey.currentState!.validate()) {
                            controller.signUp(context);
                          }
                        },
                      ),
                      AuthPillButton(
                          text: "msg_continue_with_google".tr,
                          margin: getMargin(left: 0, top: 15, right: 0),
                          variant: AuthPillButtonVariant.secondary,
                          prefix: CustomImageView(
                              imagePath: ImageConstant.imgGoogle,
                              height: getSize(20),
                              width: getSize(20)),
                          onTap: () {
                            controller.loginGoogle(context);
                          }),
                      Platform.isIOS
                          ? AuthPillButton(
                              text: "msg_continue_with_apple".tr,
                              margin: getMargin(left: 0, top: 15, right: 0),
                              variant: AuthPillButtonVariant.secondary,
                              prefix: CustomImageView(
                                  svgPath: ImageConstant.imgAppleLogo,
                                  height: getSize(18),
                                  width: getSize(18)),
                              onTap: () {
                                controller.loginApple(context);
                              })
                          : Container(),
                      Align(
                        alignment: Alignment.center,
                        child: GestureDetector(
                            onTap: () {
                              Get.back();
                            },
                            child: Padding(
                                padding: getPadding(top: 29, bottom: 5),
                                child: RichText(
                                    text: TextSpan(children: [
                                      TextSpan(
                                          text: "msg_already_have_an".tr,
                                          style: AppStyle.bodySmallInter),
                                      TextSpan(
                                          text: " ",
                                          style: AppStyle.bodySmallInter),
                                      TextSpan(
                                          text: "lbl_sign_in".tr,
                                          style: AppStyle.pinkInterNormal16)
                                    ]),
                                    textAlign: TextAlign.left))),
                      ),
                      SizedBox(
                        height: getVerticalSize(20),
                      ),
                    ]),
              ))),
    );
  }
}
