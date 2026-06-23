import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_page_screen.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../controllers/set_date_controller.dart';

class SetDateView extends GetView<SetDateController> {
  const SetDateView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      child: Column(
        children: [
          Container(
            height: getSize(60),
            width: size.width,
            child: Stack(
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: () {
                      controller.selectedDate.value = DateTime.now();
                      controller.selectedTime.value = TimeOfDay.now();
                      controller.selectedEndDate.value = DateTime.now();
                      controller.selectedEndTime.value = TimeOfDay.now();
                      Get.back();
                    },
                    child: const Text('Clear', style: TextStyle(color: Colors.white)),
                  ),
                ),
                Center(
                  child: MyText(title: controller.title ?? 'Date & Time',fontSize: 18,customWeight: FontWeight.w600,),
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              children: [
                // Selected Date and Time Widget
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: (){
                            controller.isStartDateSelected.value = true;
                          },
                          child: Obx(() => controller.buildDateTimeDisplay(
                            DateFormat('EEE MMM d').format(controller.selectedDate.value),
                            controller.selectedTime.value.format(context),
                            fromStart: true
                          ),),
                        ),
                      ),
                      controller.fromCreate ? Offstage() : Padding(
                        padding: getPadding(left: 10,right: 10),
                        child: Icon(Icons.arrow_forward_ios,color: ColorConstant.whiteA700,),
                      ),
                      Expanded(child: controller.fromCreate ? Offstage() : Obx(() => controller.isStartDateSelected.value == false ?
                      GestureDetector(
                        onTap: (){
                          controller.isStartDateSelected.value = false;
                        },
                        child: Obx(() => controller.buildDateTimeDisplay(
                            DateFormat('EEE MMM d').format(controller.selectedEndDate.value),
                            controller.selectedEndTime.value.format(context),
                            fromStart: false
                        ),),
                      ):
                      controller.buildEndDateOptional())),
                    ],
                  ),
                ),
                // Calendar Picker
                Obx(() => Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: ColorScheme.light(
                      primary: ColorConstant.primaryPink, // Header background color
                      onPrimary: Colors.white, // Header text color
                      onSurface: Colors.white, // Default text color
                    ),
                    textTheme: TextTheme(
                      bodyMedium: TextStyle(color: Colors.red), // Dates text color
                    ),
                  ),
                  child: CalendarDatePicker(
                    initialDate: controller.isStartDateSelected.value? controller.selectedDate.value : controller.selectedEndDate.value,
                    firstDate: DateTime.now(),
                    lastDate: DateTime(2025),
                    onDateChanged: (date) {
                      if(controller.isStartDateSelected.value){
                        controller.selectedDate.value = date;
                      }else{
                        controller.selectedEndDate.value = date;
                      }
                    },
                  ),
                )),
                SizedBox(height: 10),
                // Time Slots List
                Expanded(
                  child: ListView.builder(
                    itemCount: controller.timeSlots.length,
                    itemBuilder: (context, index) {
                      TimeOfDay time = controller.timeSlots[index];
                      return Obx(() => Container(
                        decoration: BoxDecoration(
                          color: time == (controller.isStartDateSelected.value ? controller.selectedTime.value : controller.selectedEndTime.value) ? Colors.white.withValues(alpha: 0.1) : Colors.transparent,
                        ),
                        child: ListTile(
                          title: Center(
                            child: MyText(
                              title:time.format(context),
                                clr: time == (controller.isStartDateSelected.value ? controller.selectedTime.value : controller.selectedEndTime.value) ? ColorConstant.primaryPink : Colors.white,
                                customWeight: time == (controller.isStartDateSelected.value ? controller.selectedTime.value : controller.selectedEndTime.value) ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          onTap: () {
                            if(controller.isStartDateSelected.value){
                              controller.selectedTime.value = time;
                            }else{
                              controller.selectedEndTime.value = time;
                            }
                          },
                        ),
                      ));
                    },
                  ),
                ),
                // Time Zone & Done Button
                controller.buildFooter(context),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
