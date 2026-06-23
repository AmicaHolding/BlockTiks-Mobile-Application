import 'dart:io' show Platform;

import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../../../data/core/app_export.dart';
import '../../../data/utils/helper_functions.dart';
import '../controllers/sign_in_controller.dart';

class
SignInView extends GetView<SignInController> {
  SignInView({Key? key}) : super(key: key);

  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: 'lbl_login'.tr,
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
                      MyText(
                        title: "Welcome Back!".tr,
                        fontSize: 18,
                      ),
                      SizedBox(
                        height: getSize(10),
                      ),
                      MyText(
                        title: "All your needs for event experience.".tr,
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
                          textInputAction: TextInputAction.next,
                          textInputType: TextInputType.emailAddress,
                          // fontStyle: FloatingEditTextFontStyle.AgeoRegular14,
                          // limit: Constants.EMAIL_VALIDATION,
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
                          textInputAction: TextInputAction.done,
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
                            return HelperFunction.passwordValidate(value!,
                                isCurrentPassword: true);
                          },
                        ),
                      ),
                      Align(
                          alignment: Alignment.centerLeft,
                          child: GestureDetector(
                              onTap: () {
                                Get.toNamed(Routes.FORGET_PASSWORD);
                              },
                              child: Padding(
                                  padding: getPadding(left: 0, top: 19),
                                  child: MyText(
                                    title: "msg_forgot_password".tr,
                                    clr: ColorConstant.primaryPink,
                                  )))),
                      Padding(
                        padding: getMargin(left: 0, top: 32, right: 0),
                        child: CustomButton(
                          controller: controller.btnController,
                          height: getVerticalSize(46),
                          text: "lbl_sign_in".tr,
                          fontStyle: ButtonFontStyle.AgeoSemiBold14Black900,
                          onTap: _onTapSignIn,
                        ),
                      ),
                      CustomButton(
                          text: "msg_continue_with_google".tr,
                          margin: getMargin(left: 0, top: 15, right: 0),
                          variant: ButtonVariant.OutlineWhite,
                          prefixWidget: Container(
                              margin: getMargin(right: 14),
                              child: CustomImageView(
                                  imagePath: ImageConstant.imgGoogle)),
                          onTap: () async {

                                controller.loginGoogle(context);
                          }),
                      Platform.isIOS
                          ?
                          // iOS-specific code
                          CustomButton(
                              text: "msg_continue_with_apple".tr,
                              margin: getMargin(left: 0, top: 15, right: 0),
                              variant: ButtonVariant.OutlineBlack900,
                              shape: ButtonShape.RoundedBorder14,
                              padding: ButtonPadding.PaddingT14,
                              fontStyle: ButtonFontStyle.AgeoRegular14,
                              prefixWidget: Container(
                                  margin: getMargin(right: 14),
                                  child: CustomImageView(
                                      svgPath: ImageConstant.imgAppleLogo)),
                              onTap: () async {
                                // Get.toNamed(Routes.ROLE_SELECTION,arguments: {Constants.paramComingFrom : "login"})!.then((value) {
                                //   if(value!= null && value){
                                //     controller.loginApple(context);
                                //   }
                                // });
                                Get.toNamed(Routes.USER_DASHBOARD);
                              })
                          : Container(),
                      Align(
                        alignment: Alignment.center,
                        child: GestureDetector(
                            onTap: () {
                              // Get.toNamed(Routes.ROLE_SELECTION,
                              //     arguments: {Constants.paramComingFrom: "signUp"});
                              Get.toNamed(Routes.SIGN_UP);
                            },
                            child: Padding(
                                padding: getPadding(top: 40, bottom: 15),
                                child: RichText(
                                    text: TextSpan(children: [
                                      TextSpan(
                                          text: "lbl_don_t".tr,
                                          style: AppStyle.white60InterNormal14),
                                      TextSpan(
                                          text: "lbl_have_an_acc".tr,
                                          style: AppStyle.white60InterNormal14),
                                      TextSpan(
                                          text: "lbl_ount".tr + " ",
                                          style: AppStyle.white60InterNormal14),
                                      TextSpan(
                                          text: "lbl_register".tr,
                                          style: AppStyle.pinkInterNormal16)
                                    ]),
                                    textAlign: TextAlign.left))),
                      )
                    ]),
              ))),
    );
  }

  _onTapSignIn() {
    if (_formKey.currentState!.validate()) {
      controller.loginAPI();
    }
  }
}
