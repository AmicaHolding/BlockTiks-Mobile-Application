import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class CreatorSearchController extends GetxController {
  TextEditingController searchController = TextEditingController();

  /// Published events shown as suggestions when the query is empty.
  RxList<Map<String, dynamic>> suggestions = <Map<String, dynamic>>[].obs;

  /// Events matching the current search query (`GET /events?q=`).
  RxList<Map<String, dynamic>> results = <Map<String, dynamic>>[].obs;
  RxBool isSearching = false.obs;
  Timer? _debounce;

  // Define the initial range of the price picker
  Rx<RangeValues> _currentRangeValues = const RangeValues(10, 150).obs; // Price range from 1 to 500

  Rxn<String> selectedCategory = Rxn<String>();
  Rxn<String> selectedSort = Rxn<String>();

  Rxn<String> selectedDate = Rxn<String>(); // To hold the selected date as a string
  DateTime? selectedDateTime;

  RxInt index = 0.obs;

  final kGradientBoxDecoration = BoxDecoration(
      borderRadius: BorderRadius.circular(12), color: ColorConstant.primaryAccent);

  List<String> latestSearches = [
    "Funky Music",
    "Pop Music",
    "Rock Music",
  ];
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

  RxBool isEmpty = true.obs;

  final tabs = ["Events".tr, "Users".tr];

  @override
  void onInit() {
    super.onInit();
    _loadSuggestions();
  }

  @override
  void onClose() {
    _debounce?.cancel();
    super.onClose();
  }

  Future<void> _loadSuggestions() async {
    try {
      suggestions.assignAll(await ApiService.events());
    } catch (_) {
      // Suggestions are best-effort; search still works without them.
    }
  }

  /// Called from the search field's `onChanged`. Debounces the request and
  /// queries `GET /events?q=` for published events.
  void onSearchChanged(String value) {
    _debounce?.cancel();
    final q = value.trim();
    if (q.isEmpty) {
      isEmpty.value = true;
      isSearching.value = false;
      results.clear();
      return;
    }
    isEmpty.value = false;
    isSearching.value = true;
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        results.assignAll(await ApiService.events(q: q));
      } catch (_) {
        results.clear();
      } finally {
        isSearching.value = false;
      }
    });
  }

  static String formatEventDate(Map<String, dynamic> event) {
    final raw = event['startsAt']?.toString();
    final dt = raw == null ? null : DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return '';
    return DateFormat('dd MMM yyy').format(dt);
  }

  static String eventSubtitle(Map<String, dynamic> event) {
    final parts = <String>[
      if ((event['category']?.toString() ?? '').isNotEmpty)
        event['category'].toString(),
      if ((event['location']?.toString() ?? '').isNotEmpty)
        event['location'].toString(),
      formatEventDate(event),
    ];
    return parts.join(' | ');
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
              color: ColorConstant.bg),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  color: ColorConstant.bg,
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
                        //         color: ColorConstant.whiteA700.withValues(alpha: 0.1),
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
                          dropdownColor: ColorConstant.black900,
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
                          dropdownColor: ColorConstant.black900,
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
                      Container(
                        margin: getMargin(bottom: 30),
                        padding: getPadding(left: 15,right: 15,),
                        decoration: BoxDecoration(
                            color: ColorConstant.elevated,
                            borderRadius: BorderRadius.circular(8)
                        ),
                        child: TextField(
                          style: GoogleFonts.getFont("Inter",
                              fontSize: 16, color: ColorConstant.whiteA700),
                          onChanged: (String val) {
                            if (val.isEmpty) {
                              // controller.isEmpty.value = true;
                            } else {
                              // controller.isEmpty.value = false;
                            }
                          },
                          decoration: InputDecoration(
                            hintText: 'Location',
                            hintStyle: const TextStyle(color: Colors.white70),
                            border: InputBorder.none,
                          ),
                        ),
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

    selectedCategory = Rxn<String>();
    selectedSort = Rxn<String>();

    selectedDate = Rxn<String>(); // To hold the selected date as a string
    selectedDateTime = null;
  }
}
