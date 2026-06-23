import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import '../controllers/send_tickets_controller.dart';

class SendTicketsView extends GetView<SendTicketsController> {
  const SendTicketsView({super.key});
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
          text: "Send Tickets".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            if(controller.selectedUser.value != -1 || controller.formKey.currentState!.validate()){
              Get.back();
              CustomSnackBar.showCustomToast(message: "Tickets sent to selected user");
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
            ListView.builder(
              itemCount: controller.tickets.length,
              physics: NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemBuilder: (context, index) {
                final ticket = controller.tickets[index];
                return Card(
                  color: Colors.grey[900],
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        CustomImageView(
                          imagePath: ImageConstant.splashBg,
                          width: 50,
                          height: 50,
                          fit: BoxFit.cover,
                          radius: BorderRadius.circular(8.0),
                          margin: getMargin(right: 10),
                        ),
                        // Ticket Name
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8.0),
                            child: Text(
                              ticket['name'],
                              style: TextStyle(color: Colors.white, fontSize: 18),
                            ),
                          ),
                        ),
                        Container(
                          height: getSize(35),
                          decoration: BoxDecoration(
                            color: ColorConstant.whiteA700.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(5)
                          ),
                          padding: getPadding(left: 10,right: 10),
                          child: DropdownButton<int>(
                            value: ticket['quantity'],
                            hint: Text(
                              'Qty',
                              style: TextStyle(color: Colors.grey),
                            ),
                            icon: Icon(Icons.keyboard_arrow_down,color: ColorConstant.whiteA700,),
                            dropdownColor: Colors.black,
                            underline:Offstage(),
                            items: List.generate(10, (i) => i + 1)
                                .map((int value) {
                              return DropdownMenuItem<int>(
                                value: value,
                                child: Text(
                                  value.toString(),
                                  style: TextStyle(color: Colors.white),
                                ),
                              );
                            }).toList(),

                            onChanged: (newValue) {
                              ticket['quantity'] = newValue;
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
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
                        color: ColorConstant.gray50.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: controller.selectedUser.value == index ? ColorConstant.primaryPink : ColorConstant.gray50.withOpacity(0.05))
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
