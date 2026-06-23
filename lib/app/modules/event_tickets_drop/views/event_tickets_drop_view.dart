import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/utils/model/ticket_model.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/event_tickets_drop_controller.dart';

class EventTicketsDropView extends GetView<EventTicketsDropController> {
  const EventTicketsDropView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: false,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      showBackBtn: true,
      screenName: "Tickets",
      centerTitle: true,
      child: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(height: getSize(16),),
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
            GestureDetector(
              onTap: (){
                Get.toNamed(Routes.ADD_DROP)!.then((value) {
                  if(value != null && value['model']!= null){
                    controller.ticketTypes.add(TicketModel.fromJson(value['model']));
                    controller.ticketTypes.refresh();
                  }
                });
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
                child: MyText(title:"+ Add Drop",fontSize: 20,customWeight: FontWeight.bold,),
              ),
            )
          ],
        ),
      ),
    );
  }
}
