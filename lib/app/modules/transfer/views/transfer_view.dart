import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import '../controllers/transfer_controller.dart';

class TransferView extends GetView<TransferController> {
  const TransferView({Key? key}) : super(key: key);

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
          text: "Confirm Transform".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            if(controller.selectedUser.value != -1 || controller.formKey.currentState!.validate()){
              var map = {
                Constants.paramEmail: "abc@gmail.com",
                Constants.paramComingFrom: Constants.paramTransform
              };
              Get.toNamed(Routes.OTP_VERIFICATION_SCREEN, arguments: map);
            }else{
              CustomSnackBar.showCustomErrorToast(message: "Please type or select user to continue");
            }

          },
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: getSize(15),),
            MyText(title: "Transfer"),
            SizedBox(height: getSize(5),),
            BidWidget(
              title: "Cyberpunk",
              type: "Platinum",
              date: "15/6/24",
              showTrailing: false,
              // fromSearch: true,
              onTap: () => Get.toNamed(Routes.EVENT_DETAIL),
            ),
            SizedBox(
              height: getSize(15),
            ),
            Form(
              key: controller.formKey,
              child: CustomTextFormField(
                hintText: "User name or user address",
                labelText: 'To',
                variant: TextFormFieldVariant.None,
                validator: (val){
                  return HelperFunction.stringValidate(val);
                },
              ),
            ),
            SizedBox(
              height: getSize(30),
            ),
            const MyText(title: "Recent users transferred to"),
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
                    controller.selectedUser.value = index;
                  },
                  child: Obx(()=> Container(
                    padding:
                    getPadding(left: 15, right: 15, top: 10, bottom: 10),
                    margin: getMargin(bottom: 15),
                    decoration: BoxDecoration(
                        color: ColorConstant.gray50.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: controller.selectedUser.value == index ? ColorConstant.primaryPink : ColorConstant.gray50.withValues(alpha: 0.05))
                    ),
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
                          fontSize: 16,
                        ),
                        Spacer(),
                        Icon(Icons.check_circle,color: controller.selectedUser.value == index ? ColorConstant.primaryPink : Colors.transparent,)
                      ],
                    ),
                  )),
                );
              },
            )
          ],
        ),
      ),
    );
  }
}
