import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

class TransactionsController extends GetxController {
  RxInt selectedTab = 0.obs;

  Rx<RangeValues> _currentRangeValues = const RangeValues(10, 150).obs; // Price range from 1 to 500

  Rxn<String> selectedCategory = Rxn<String>();
  Rxn<String> selectedSort = Rxn<String>();

  Rxn<int> selectedQuantity = Rxn<int>(); // To hold the selected date as a string

  List<String> ticketTypes = [
    "Platinum Ticket",
    "Gold Ticket",
    "Silver Ticket",
    "Bronze Ticket",
  ];
  List<int> quantities = List.generate(10, (index) => index+1);
  List<String> sorts = [
    "A-Z",
    "Z-A",
  ];


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
                      //         color: ColorConstant.whiteA700.withOpacity(0.1),
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
                          color: ColorConstant.whiteA700.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8)
                      ),
                      child: Obx(() => DropdownButton<String>(
                        value: selectedCategory.value,
                        dropdownColor: ColorConstant.black900,
                        hint: const MyText(title: 'Choose Ticket Type'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: ticketTypes.map((String value) {
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
                      padding: getPadding(left: 15,right: 15,),
                      decoration: BoxDecoration(
                          color: ColorConstant.whiteA700.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8)
                      ),
                      child: Obx(() => DropdownButton<int>(
                        value: selectedQuantity.value,
                        dropdownColor: ColorConstant.black900,
                        hint: const MyText(title: 'Quantity'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: quantities.map((int value) {
                          return DropdownMenuItem<int>(
                            value: value,
                            child: MyText(title: "$value"),
                          );
                        }).toList(),
                        onChanged: (int? newValue) {
                          selectedQuantity.value = newValue;  // No need to assign null before assigning newValue
                        },
                      )),
                    ),
                    Container(
                      margin: getMargin(bottom: 30),
                      padding: getPadding(left: 15,right: 15,),
                      decoration: BoxDecoration(
                          color: ColorConstant.whiteA700.withOpacity(0.1),
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
                      activeColor: ColorConstant.primaryPink, // Customize the active color
                      inactiveColor: ColorConstant.primaryPink.withOpacity(0.2), // Customize the inactive color
                      labels: RangeLabels(
                        '${_currentRangeValues.value.start.toInt()}',
                        '${_currentRangeValues.value.end.toInt()}',
                      ),
                      onChanged: (RangeValues values) {
                        _currentRangeValues.value = values;
                      },
                    ),),
                    Padding(
                      padding: getPadding(all: 16),
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
  void resetFilter(){
    // Define the initial range of the price picker
    _currentRangeValues.value = const RangeValues(10, 150); // Price range from 1 to 500

    selectedCategory = Rxn<String>();
    selectedQuantity = Rxn<int>();
    selectedSort = Rxn<String>();


  }
}
