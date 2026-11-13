import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

class SetDateController extends GetxController {

  Rx<DateTime> selectedDate = DateTime.now().obs;
  Rx<TimeOfDay> selectedTime = TimeOfDay(hour: 20, minute: 0).obs;
  Rx<DateTime> selectedEndDate = DateTime.now().obs;
  Rx<TimeOfDay> selectedEndTime = TimeOfDay(hour: 20, minute: 0).obs;
  List<TimeOfDay> timeSlots = [];

  RxBool isStartDateSelected = true.obs;

  String? title;
  bool fromCreate = false;

  @override
  void onInit() {
    var data= Get.arguments;
    if(data!= null && data['title']!= null){
      title = data['title'];
    }
    if(data!= null && data['fromCreate']!= null){
      fromCreate = data['fromCreate'];
    }
    super.onInit();
    timeSlots = _generateTimeSlots();
  }



  Widget buildDateTimeDisplay(String date, String time,{bool fromStart = true}) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isStartDateSelected.value == fromStart ? ColorConstant.elevated : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(date, style: TextStyle(color: Colors.white)),
                  SizedBox(height: 5),
                  Text(time, style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget buildEndDateOptional() {
    return Center(
      child: GestureDetector(
        onTap: (){
          isStartDateSelected.value = false;
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('Optional', style: TextStyle(color: ColorConstant.white60)),
            SizedBox(height: 5),
            Text('End Date', style: TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget buildFooter(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.language, color: Colors.white),
              SizedBox(width: 8),
              const Text('ET', style: TextStyle(color: Colors.white)),
              SizedBox(width: 5),
              const Text('Eastern Time', style: TextStyle(color: Colors.white)),
            ],
          ),
          ElevatedButton(
            onPressed: () {
              print("Selected date: ${selectedDate.value}");
              print("Selected time: ${selectedTime.value.format(context)}");
              Get.back(
                result: {
                  "selectedTime":"${DateFormat('EEE MMM d').format(selectedDate.value)} ${selectedTime.value.format(context)}",
                  "selectedEndTime":"${DateFormat('EEE MMM d').format(selectedEndDate.value)} ${selectedEndTime.value.format(context)}",
                  // ISO-8601 strings so callers can submit real timestamps to the API.
                  "selectedIso": DateTime(
                    selectedDate.value.year,
                    selectedDate.value.month,
                    selectedDate.value.day,
                    selectedTime.value.hour,
                    selectedTime.value.minute,
                  ).toIso8601String(),
                  "selectedEndIso": DateTime(
                    selectedEndDate.value.year,
                    selectedEndDate.value.month,
                    selectedEndDate.value.day,
                    selectedEndTime.value.hour,
                    selectedEndTime.value.minute,
                  ).toIso8601String(),
                },
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ColorConstant.whiteA700,
              padding: EdgeInsets.symmetric(horizontal: 40, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: Text('Done', style: TextStyle(color: ColorConstant.bg, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  List<TimeOfDay> _generateTimeSlots({int interval = 15}) {
    List<TimeOfDay> timeSlots = [];
    for (int hour = 0; hour < 24; hour++) {
      for (int minute = 0; minute < 60; minute += interval) {
        timeSlots.add(TimeOfDay(hour: hour, minute: minute));
      }
    }
    return timeSlots;
  }
}
