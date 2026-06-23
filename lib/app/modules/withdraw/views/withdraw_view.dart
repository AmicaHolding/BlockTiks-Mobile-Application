import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../controllers/withdraw_controller.dart';

class WithdrawView extends GetView<WithdrawController> {
  const WithdrawView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      sidePadding: false,
      showLogo: true,
      basicAppBar: true,
      showBackBtn: true,
      showNotification: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: controller.fromDeposit ? "Confirm Deposit":"Confirm Transform".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
           if(controller.formKey.currentState!.validate()){
             var map = {
               Constants.paramEmail: "abc@gmail.com",
               Constants.paramComingFrom: Constants.paramTransform
             };
             Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: map);
           }else{
             CustomSnackBar.showCustomErrorToast(message: "Please provide complete details to continue");
           }
          },
        ),
      ),
      child: Form(
        key: controller.formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CustomTextFormField(
                hintText: "Type in amount",
                labelText: controller.fromDeposit ? "Deposit":'Withdraw',
                variant: TextFormFieldVariant.None,
                textInputType: TextInputType.number,
                suffix: Container(
                  padding: getPadding(top: 12, bottom: 12),
                  child: const MyText(
                    title: 'Max',
                    family: 'Roboto Condensed',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: Color(0xFFFFFFFF),
                  ),
                ),
                validator: (value) {
                  return HelperFunction.stringValidate(value!);
                },
              ),
              SizedBox(
                height: getSize(15),
              ),
              CustomTextFormField(
                hintText: "Account Name*",
                labelText: controller.fromDeposit ? "From":'To',
                variant: TextFormFieldVariant.None,
                validator: (value) {
                  return HelperFunction.nameValidate(value!);
                },
              ),
              const SizedBox(
                height: 5,
              ),
              CustomTextFormField(
                hintText: "Account Number*",
                variant: TextFormFieldVariant.None,
                validator: (value) {
                  return HelperFunction.nameValidate(value!);
                },
              ),
              const SizedBox(
                height: 5,
              ),
              CustomTextFormField(
                hintText: "IBAN Number*",
                variant: TextFormFieldVariant.None,
                validator: (value) {
                  return HelperFunction.nameValidate(value!);
                },
              ),
              const SizedBox(
                height: 5,
              ),
              CustomTextFormField(
                hintText: "Bank Address*",
                variant: TextFormFieldVariant.None,
                validator: (value) {
                  return HelperFunction.nameValidate(value!);
                },
              ),
              const SizedBox(
                height: 5,
              ),
              CustomTextFormField(
                hintText: "Account Nick Name*",
                variant: TextFormFieldVariant.None,
                validator: (value) {
                  return HelperFunction.nameValidate(value!);
                },
              ),
              SizedBox(
                height: getSize(30),
              ),
               MyText(title: controller.fromDeposit ? "Recent Accounts":"Recent users transferred to"),
              SizedBox(
                height: getSize(10),
              ),
              ListView.builder(
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                itemCount: 3,
                scrollDirection: Axis.vertical,
                padding: EdgeInsets.zero,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: () {
                      var map = {
                        Constants.paramEmail: "abc@gmail.com",
                        Constants.paramComingFrom: Constants.paramTransform
                      };
                      Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: map);
                    },
                    child: Container(
                      padding:
                          getPadding(left: 15, right: 15, top: 10, bottom: 10),
                      margin: getMargin(bottom: 15),
                      decoration: BoxDecoration(
                          color: ColorConstant.gray50.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(10)),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 30,
                            height: 30,
                            child: CustomImageView(
                              imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                              width: 30,
                              height: 30,
                              radius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(
                            width: 15,
                          ),
                          MyText(
                            title: "Name $index",
                            fontSize: 20,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              )
            ],
          ),
        ),
      ),
    );
  }
}
