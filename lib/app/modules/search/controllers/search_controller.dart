import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class MySearchController extends GetxController
    with GetSingleTickerProviderStateMixin {
  TextEditingController searchController = TextEditingController();
  late TabController tabController;

  // Define the initial range of the price picker
  Rx<RangeValues> _currentRangeValues = const RangeValues(10, 150).obs; // Price range from 1 to 500

  Rxn<String> selectedCategory = Rxn<String>();
  Rxn<String> selectedSort = Rxn<String>();

  Rxn<String> selectedDate = Rxn<String>(); // To hold the selected date as a string
  DateTime? selectedDateTime;

  RxInt index = 0.obs;

  final kGradientBoxDecoration = BoxDecoration(
      borderRadius: BorderRadius.circular(12), color: ColorConstant.elevated);

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

  // Real events from the backend (recent list + search results).
  final RxList<Map<String, dynamic>> recentEvents =
      <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> searchResults =
      <Map<String, dynamic>>[].obs;
  final RxBool searchLoading = false.obs;
  final Rxn<String> searchError = Rxn<String>();
  Timer? _debounce;

  RxBool isEmpty = true.obs;

  void onSearchChanged(String query) {
    _debounce?.cancel();
    final q = query.trim();
    isEmpty.value = q.isEmpty;
    if (q.isEmpty) {
      searchResults.clear();
      searchError.value = null;
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _search(q);
    });
  }

  Future<void> _search(String q) async {
    searchLoading.value = true;
    searchError.value = null;
    try {
      searchResults.value = await ApiService.events(q: q);
    } catch (e) {
      searchError.value = e.toString().replaceFirst('Exception: ', '');
      searchResults.clear();
    } finally {
      searchLoading.value = false;
    }
  }

  Future<void> fetchRecentEvents() async {
    try {
      recentEvents.value = await ApiService.events();
    } catch (_) {
      // Recent events are best-effort — leave the list empty on failure.
    }
  }

  void applyPopularSearch(String term) {
    searchController.text = term;
    onSearchChanged(term);
  }

  final tabs = ["Events".tr, "Users".tr];

  @override
  void onInit() {
    super.onInit();
    tabController = Get.put(
      TabController(vsync: this, length: 2),
    );
    fetchRecentEvents();
  }

  @override
  void onClose() {
    _debounce?.cancel();
    super.onClose();
  }

  void onTapSelectIndex(int ind) {
    index.value = ind;
    tabController.index = ind;
    switch (ind) {
      case 0:
        return;
      case 1:
        return;
      default:
        return;
    }
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
          child: SingleChildScrollView(
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
                        //         borderRadius: BorderRadius.circular(12)
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
                            borderRadius: BorderRadius.circular(12)
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
                          borderRadius: BorderRadius.circular(12),
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
                            borderRadius: BorderRadius.circular(12)
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
                      Container(
                        margin: getMargin(bottom: 30),
                        padding: getPadding(left: 15,right: 15,),
                        decoration: BoxDecoration(
                            color: ColorConstant.elevated,
                            borderRadius: BorderRadius.circular(12)
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
                            hintStyle: TextStyle(color: ColorConstant.white60),
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

    selectedCategory.value = null;
    selectedSort.value = null;

    selectedDate.value = null; // To hold the selected date as a string
    selectedDateTime = null;
  }
}
