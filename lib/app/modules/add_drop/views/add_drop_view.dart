import 'dart:math';

import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/utils/model/ticket_model.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../data/core/app_export.dart';
import '../controllers/add_drop_controller.dart';

class AddDropView extends GetView<AddDropController> {
  const AddDropView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: false,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      showBackBtn: true,
      // screenName: "Tickets",
      centerTitle: true,
      child: Form(
      key: controller.formKey,
        child: Column(
          children: [
            SizedBox(height: getSize(16),),
            // Container(
            //   padding: getPadding(left: 16, right: 16),
            //   margin: getMargin(bottom: 20),
            //   decoration: BoxDecoration(
            //     color: Colors.white.withValues(alpha: 0.1),
            //     borderRadius: BorderRadius.circular(10),
            //   ),
            //   alignment: Alignment.center,
            //   child: TextField(
            //     controller: controller.dropName,
            //     // onTap: onTap,
            //     style: GoogleFonts.getFont("Inter",
            //         fontSize: 18, color: ColorConstant.whiteA700,fontWeight: FontWeight.bold),
            //     // onChanged: onChanged,
            //     // readOnly: readOnly,
            //     textAlign: TextAlign.center,
            //     decoration: InputDecoration(
            //       contentPadding: getPadding(
            //       ),
            //       hintText:  "Drop Name",
            //       hintStyle: const TextStyle(color: ColorConstant.whiteColor),
            //       border: InputBorder.none,
            //     ),
            //   ),
            // ),
            Obx(() => ListView.builder(
              padding: EdgeInsets.zero,
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemCount: controller.ticketTypes.length,
              itemBuilder: (context, index) {
                final item = controller.ticketTypes[index];
                return GestureDetector(
                  onTap: ()=> Get.back(),
                  child: Container(
                    padding: getPadding(left: 16,right: 16,top: 10,bottom: 10),
                    margin: getMargin(bottom: 15),
                    decoration: BoxDecoration(
                        color: ColorConstant.whiteA700.withValues(alpha: .15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: ColorConstant.grayBorder)
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              // child: MyText(title: item.name??"",),
                              child: MyText(title: "Gold Exclusive Drop",fontSize: 16,customWeight: FontWeight.bold,),
                            ),
                            CustomImageView(
                              onTap: (){
                                controller.showSheet(context);
                              },
                              svgPath: ImageConstant.optionsTicket,
                              height: getSize(15),
                              width: getSize(15),
                              fit: BoxFit.fitHeight,
                            ),
                          ],
                        ),
                        SizedBox(height: getSize(8),),
                        MyText(title:"3 Ticket Types | " +HelperFunction.convertDateIntoTicketFormat(),fontSize: 14,),
                      ],
                    ),
                  ),
                );
              },
            )),
            SizedBox(height: getSize(30),),
            Obx(() => controller.isTicketAddClick.value?
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: ColorConstant.grayBorder.withValues(alpha: .5)),
                borderRadius: BorderRadius.circular(getSize(10)),
              ),
              padding: getPadding(all: 15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CustomTextFormField(
                    controller: controller.nameController,
                    variant: TextFormFieldVariant.OutlineNewGray,
                    hintText: 'Enter ticket name',
                    validator: (value) {
                      return HelperFunction.stringValidate(value);
                    },
                  ),
                  SizedBox(height: getSize(10),),
                  Row(
                    children: [
                      Expanded(
                        child: CustomTextFormField(
                          controller: controller.priceController,
                          variant: TextFormFieldVariant.OutlineNewGray,
                          hintText: 'Price \$',
                          textInputType: TextInputType.number,
                          validator: (value) {
                            return HelperFunction.stringValidate(value);
                          },
                        ),
                      ),
                      SizedBox(width: getSize(10),),
                      Expanded(
                        child: CustomTextFormField(
                          controller: controller.quantityController,
                          variant: TextFormFieldVariant.OutlineNewGray,
                          hintText: 'Quantity #',
                          textInputType: TextInputType.number,
                          validator: (value) {
                            return HelperFunction.stringValidate(value);
                          },
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: getSize(10),),
                  CustomTextFormField(
                    controller: controller.reserveController,
                    variant: TextFormFieldVariant.OutlineNewGray,
                    hintText: 'Reserve # of tickets',
                    textInputType: TextInputType.number,
                    suffix: GestureDetector(
                      onTap: (){
                        controller.showDetailDialog(context);
                      },
                      child: Icon(Icons.info_outline_rounded,color: ColorConstant.whiteA700,),
                    ),
                  ),
                  SizedBox(height: getSize(10),),
                  GestureDetector(
                    onTap: () async {
                      await Get.toNamed(Routes.SET_DATE)!.then((value) {
                        if(value!= null ){
                          controller.selectedTime.value = value["selectedTime"];
                          if(value["selectedEndTime"]!= null ){
                            controller.selectedEndTime.value = value["selectedEndTime"];
                          }
                        }

                      });

                    },
                    child: Container(
                      padding: getPadding(left: 16, right: 16,bottom: 12,top: 12),
                      margin: getMargin(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.centerLeft,
                      child:Obx(()=>  MyText(
                        title:controller.selectedTime.value.isEmpty ? "Set a date" : controller.selectedTime.value + (controller.selectedEndTime.value.isNotEmpty ? "\n${controller.selectedEndTime.value}":""),
                        family: "Inter",
                        fontSize: 16, clr: ColorConstant.whiteA700,
                      )),
                    ),
                  ),
                  SizedBox(height: getSize(15),),
                  CustomButton(
                    onTap: (){
                      if(controller.formKey.currentState!.validate()){
                        if(controller.selectedTime.value.isNotEmpty){
                          controller.isTicketAddClick.value = false;
                          controller.ticketTypes.add(TicketModel(
                            id: Random().nextInt(100),
                            name: controller.nameController.text,
                            price: num.parse(controller.priceController.text),
                            quantity: int.parse(controller.quantityController.text),
                            reserveTickets: int.parse(controller.reserveController.text),
                            date: controller.selectedTime.value,
                          ));
                          controller.ticketTypes.refresh();
                          // Get.back(result: {
                          //   "name": controller.dropName.text,
                          //   "model": TicketModel(
                          //     id: Random().nextInt(100),
                          //     name: controller.nameController.text,
                          //     price: num.parse(controller.priceController.text),
                          //     quantity: int.parse(controller.quantityController.text),
                          //     reserveTickets: int.parse(controller.reserveController.text),
                          //     date: controller.selectedTime.value,
                          //   ).toJson(),
                          // });
                        }else{
                          CustomSnackBar.showCustomErrorToast(message: "Please select date first");
                        }
                      }

                    },
                    text: "Add Ticket Type",
                    width: getSize(150),
                  )
                ],
              ),
            ):
            Offstage()),

            Obx(()=> Visibility(
              visible:! controller.isTicketAddClick.value,
              child: GestureDetector(
                onTap: (){
                  controller.isTicketAddClick.value = true;
                },
                child: Container(
                  width:size.width,
                  height: getSize(50),
                  padding: getPadding(left: 20),
                  decoration: BoxDecoration(
                      color: ColorConstant.whiteA700.withValues(alpha: .05),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: ColorConstant.grayBorder)
                  ),
                  alignment: Alignment.centerLeft,
                  child: MyText(title:"+ Add Ticket Type",fontSize: 20,),
                ),
              ),
            )),
            SizedBox(height: getSize(20),),

          ],
        ),
      ),
    );
  }
}
