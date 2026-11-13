import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class PlaceBidController extends GetxController {

  final List<String> ticketType = [
    "Platinum Ticket",
    "Gold Ticket",
    "Silver Ticket",
    "Bronze Ticket",
  ];

  RxInt selectedBid = (-1).obs;

  // Event context — populated from route arguments when provided.
  String eventTitle = 'DJ Maksmellow Orignawa';
  String eventType = 'Music Concert';
  String eventDate = 'Sunday, 14 February 2021';
  String eventVenue = 'Japan, 〒604-8122 Kyoto, Nakagyo Ward, 錦小路下る瀬戸 屋町474';
  String eventDescription =
      'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.';

  // Define the initial range of the price picker
  Rx<RangeValues> _currentRangeValues = const RangeValues(10, 150).obs; // Price range from 1 to 500

  Rxn<String> selectedCategory = Rxn<String>();
  Rxn<String> selectedSort = Rxn<String>();

  Rxn<String> selectedDate = Rxn<String>(); // To hold the selected date as a string
  DateTime? selectedDateTime;

  List<String> categories = [
    "Funky Music",
    "Pop Music",
    "Rock Music",
    "Stage Shows",
  ];
  List<String> sorts = [
    "A-Z",
    "Z-A",
  ];

  void showDetailDialog(BuildContext context){
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.surface),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                color: ColorConstant.surface,
                padding: const EdgeInsets.only(top: 8.0),
                margin: const EdgeInsets.only(bottom: 0),
                child: Padding(
                  padding: const EdgeInsets.only(
                      top: 10.0, left: 16, right: 16, bottom: 10),
                  child: Row(
                    crossAxisAlignment:
                    CrossAxisAlignment.center,
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      GestureDetector(
                        onTap: () {
                          Get.back();
                        },
                        child: Container(
                          height:getSize(30),
                          width:getSize(30),
                          margin: getMargin(right: 10),
                          decoration: BoxDecoration(
                              color: ColorConstant.elevated,
                              borderRadius: BorderRadius.circular(8)
                          ),
                          alignment: Alignment.center,
                          child: Padding(
                            padding: getPadding(left: 8),
                            child: Icon(Icons.arrow_back_ios,
                              color: ColorConstant.whiteA700,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              MyText(
                                title: eventType,
                                family: 'Manrope',
                                customWeight: FontWeight.w400,
                                fontSize: 14,
                                clr: ColorConstant.whiteA700,
                              ),
                              MyText(
                                title: eventTitle,
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: 18,
                                clr: ColorConstant.whiteA700,
                              ),
                            ],
                          )
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: getPadding(left: 16,right: 16,top: 20,bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: getSize(20),
                    ),
                    const MyText(
                      title: 'Japan Night Festival 2021',
                      family: 'Manrope',
                      customWeight: FontWeight.w700,
                      fontSize: 14,
                      clr: Color(0xFFFFFFFF),
                    ),
                    SizedBox(
                      height: getSize(20),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.calendar_month,
                              color: ColorConstant.white60,
                              size: 24,
                            ),
                            const SizedBox(
                              width: 20,
                            ),
                            Expanded(
                              child: Row(
                                children: [
                                  MyText(
                                    title:'$eventDate',
                                      family: 'Inter',
                                      customWeight: FontWeight.w400,
                                      fontSize: 14,
                                      clr: ColorConstant.white60,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: getSize(10),),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.location_on,
                              color: ColorConstant.white60,
                              size: 24,
                            ),
                            const SizedBox(
                              width: 5,
                            ),
                            Expanded(
                              child: Text(
                                eventVenue,
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w400,
                                  fontSize: 14,
                                  color: ColorConstant.white60,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: (){
                        Utils.openGoogleMapDirections(25.197525, 55.274288);
                      },
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(0, 10, 0, 15),
                        child: Text(
                          'Direction',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: ColorConstant.primaryAccentBright,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(
                      height: getSize(20),
                    ),
                    Text(
                      'Event Details',
                      style: GoogleFonts.getFont(
                        'Manrope',
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: const Color(0xFFFFFFFF),
                      ),
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    Text(
                      eventDescription,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w400,
                        fontSize: 14,
                        height: 1.5,
                        color: ColorConstant.white60,
                      ),
                    ),

                    SizedBox(
                      height: getSize(20),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void showFilterDialog(BuildContext context){
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.surface),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                color: ColorConstant.surface,
                padding: const EdgeInsets.only(top: 8.0),
                margin: const EdgeInsets.only(bottom: 0),
                child: Padding(
                  padding: const EdgeInsets.only(
                      top: 10.0, left: 16, right: 16, bottom: 10),
                  child: Row(
                    crossAxisAlignment:
                    CrossAxisAlignment.center,
                    mainAxisSize: MainAxisSize.max,
                    children: [
                      // GestureDetector(
                      //   onTap: () {
                      //     Get.back();
                      //   },
                      //   child: Container(
                      //     height:getSize(30),
                      //     width:getSize(30),
                      //     decoration: BoxDecoration(
                      //         color: ColorConstant.elevated,
                      //         borderRadius: BorderRadius.circular(8)
                      //     ),
                      //     alignment: Alignment.center,
                      //     child: Padding(
                      //       padding: getPadding(left: 8),
                      //       child: Icon(Icons.arrow_back_ios,
                      //         color: ColorConstant.whiteA700,
                      //         size: 18,
                      //       ),
                      //     ),
                      //   ),
                      // ),
                      Expanded(
                          flex: 2,
                          child: Center(
                            child: AppbarTitle(
                              text: "Filter",
                              margin: EdgeInsets.only(
                                  right:
                                  getHorizontalSize(
                                      28.0),
                                  left: 20),
                            ),
                          )
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: getPadding(left: 10,right: 16,top: 20,bottom: 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      margin: getMargin(bottom: 30),
                      padding: getPadding(left: 15,right: 15,),
                      decoration: BoxDecoration(
                          color: ColorConstant.elevated,
                          borderRadius: BorderRadius.circular(8)
                      ),
                      child: Obx(() => DropdownButton<String>(
                        value: selectedCategory.value,
                        dropdownColor: ColorConstant.elevated,
                        hint: const MyText(title: 'Categories'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: categories.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: MyText(title: value),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          selectedCategory.value = newValue;  // No need to assign null before assigning newValue
                        },
                      )),
                    ),
                    Container(
                      margin: getMargin(bottom: 30),
                      padding: getPadding(left: 15, right: 15,top: 16,bottom: 16),
                      decoration: BoxDecoration(
                        color: ColorConstant.elevated,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Obx(() => GestureDetector(
                        onTap: () {
                          _selectDate(context); // Call the DatePicker on single tap
                        },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            MyText(
                              title: selectedDate.value ?? 'Pick a Date',
                              clr: ColorConstant.whiteA700,
                            ),
                            Icon(
                              Icons.keyboard_arrow_down_sharp,
                              color: ColorConstant.whiteA700,
                            ),
                          ],
                        ),
                      )),
                    ),
                    Container(
                      margin: getMargin(bottom: 30),
                      padding: getPadding(left: 15,right: 15,),
                      decoration: BoxDecoration(
                          color: ColorConstant.elevated,
                          borderRadius: BorderRadius.circular(8)
                      ),
                      child: Obx(() => DropdownButton<String>(
                        value: selectedSort.value,
                        dropdownColor: ColorConstant.elevated,
                        hint: const MyText(title: 'Sort By'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: sorts.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: MyText(title: value),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          selectedSort.value = newValue;  // No need to assign null before assigning newValue
                        },
                      )),
                    ),
                    MyText(
                      title: 'Price',
                      fontSize: 18,
                    ),

                    // Create the price range slider
                    Obx(() => RangeSlider(
                      values: _currentRangeValues.value,
                      min: 1, // Minimum price
                      max: 500, // Maximum price
                      divisions: 100, // Number of steps in the slider
                      activeColor: ColorConstant.primaryAccent, // Customize the active color
                      inactiveColor: ColorConstant.primaryAccent.withValues(alpha: 0.2), // Customize the inactive color
                      labels: RangeLabels(
                        '${_currentRangeValues.value.start.toInt()}',
                        '${_currentRangeValues.value.end.toInt()}',
                      ),
                      onChanged: (RangeValues values) {
                        _currentRangeValues.value = values;
                      },
                    ),),
                    Padding(
                      padding: getPadding(top: 16,bottom: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          Expanded(
                              child: CustomButton(
                                  text: "Reset",
                                  variant: ButtonVariant.OutlinePink,
                                  onTap: () {
                                    Get.back();
                                    resetFilter();

                                  })),
                          const SizedBox(
                            width: 10,
                          ),
                          Expanded(
                              child: CustomButton(
                                text: "Apply",
                                onTap: () {
                                  Get.back();
                                },
                              )),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  // This function will open the date picker dialog
  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: selectedDateTime ?? DateTime.now(), // Initial selected date
      firstDate: DateTime(2000), // Earliest date the user can select
      lastDate: DateTime(2101),  // Latest date the user can select
      builder: (BuildContext context, Widget? child) {
        return Theme(
          data: ThemeData.dark(), // Dark theme for the picker
          child: child!,
        );
      },
    );
    if (picked != null && picked != selectedDateTime) {
      selectedDateTime = picked;
      selectedDate.value = DateFormat('yyyy-MM-dd').format(picked); // Format the date as a string
    }
  }

  void resetFilter(){
    // Define the initial range of the price picker
    _currentRangeValues.value = const RangeValues(10, 150); // Price range from 1 to 500

    selectedCategory.value = null;
    selectedSort.value = null;

    selectedDate.value = null; // To hold the selected date as a string
    selectedDateTime = null;
  }

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if (data is Map) {
      if (data['title'] != null) eventTitle = data['title'].toString();
      if (data['type'] != null) eventType = data['type'].toString();
      if (data['date'] != null) eventDate = data['date'].toString();
      if (data['venue'] != null) eventVenue = data['venue'].toString();
      if (data['description'] != null) {
        eventDescription = data['description'].toString();
      }
    }
  }

}
