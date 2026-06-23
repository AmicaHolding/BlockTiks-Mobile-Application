import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

class CreatorPromoCodeController extends GetxController {

  TextEditingController promoController = TextEditingController();
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();


  RxString selectedTime = "".obs;
  RxString selectedEndTime = "".obs;


  void showAddPromoDialog(){
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
                        GestureDetector(
                          onTap: () {
                            Get.back();
                          },
                          child: Container(
                            height:getSize(30),
                            width:getSize(30),
                            decoration: BoxDecoration(
                                color: ColorConstant.whiteA700.withValues(alpha: 0.1),
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
                            flex: 2,
                            child: Center(
                              child: AppbarTitle(
                                text: "Add Promo",
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
                Form(
                  key: formKey,
                  child: Padding(
                    padding: getPadding(left: 10,right: 16,top: 20,bottom: 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: getPadding(left: 16, right: 16),
                          margin: getMargin(bottom: 15),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: TextFormField(
                            controller: promoController,
                            keyboardAppearance: Brightness.dark,
                            // onTap: onTap,
                            style: GoogleFonts.getFont("Inter",
                                fontSize: 16, color: ColorConstant.whiteA700),
                            // onChanged: onChanged,
                            // readOnly: readOnly,
                            textAlign: TextAlign.center,
                            decoration: InputDecoration(
                              contentPadding: getPadding(
                                right: getSize(15),
                              ),
                              hintText:  "Promo Code",
                              hintStyle: const TextStyle(color: ColorConstant.whiteColor),
                              border: InputBorder.none,
                            ),
                            validator: (value) {
                              return HelperFunction.stringValidate(value);
                            },
                          ),
                        ),

                        Row(
                          children: [
                            MyText(
                              title: 'Discount',
                              clr: ColorConstant.white60,
                              customWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                            Spacer(),
                            SizedBox(
                              width: 100,
                              child: Container(
                                padding: getPadding(left: 16,right: 16 ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: TextFormField(
                                  style: GoogleFonts.getFont("Inter",
                                      fontSize: 16, color: ColorConstant.whiteA700),
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: "0",
                                    hintStyle: const TextStyle(color: Colors.white70),
                                    border: InputBorder.none,
                                    suffix: Padding(
                                      padding: getPadding(right:10),
                                      child: MyText(title: '%',fontSize: 18,customWeight: FontWeight.bold,),
                                    ),
                                  ),
                                  validator: (value){
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter a value';
                                    }
                                    final number = int.tryParse(value);
                                    if (number == null) {
                                      return 'Please enter a valid number';
                                    }
                                    if (number < 0 || number > 100) {
                                      return 'Please enter a number between 0 and 100';
                                    }
                                    return null; // Return null if the input is valid
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: getSize(15),),
                        GestureDetector(
                          onTap: () async {
                            await Get.toNamed(Routes.SET_DATE)!.then((value) {
                              if(value!= null ){
                                selectedTime.value = value["selectedTime"];
                                if(value["selectedEndTime"]!= null ){
                                  selectedEndTime.value = value["selectedEndTime"];
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
                              title:selectedTime.value.isEmpty ? "Set a date" : selectedTime.value + (selectedEndTime.value.isNotEmpty ? "\n${selectedEndTime.value}":""),
                              family: "Inter",
                              fontSize: 16, clr: ColorConstant.whiteA700,
                            )),
                          ),
                        ),
                        Padding(
                          padding: getPadding(top: 16,bottom: 10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              Expanded(
                                  child: Container()),
                              const SizedBox(
                                width: 10,
                              ),
                              Expanded(
                                  child: CustomButton(
                                    text: "Save Promo",
                                    onTap: () {
                                      if(formKey.currentState!.validate()){
                                        Get.back();
                                        CustomSnackBar.showCustomToast(message: "New promo code added");
                                      }
                                    },
                                  )),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
