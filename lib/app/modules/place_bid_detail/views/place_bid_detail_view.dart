import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../../event_detail/views/event_detail_view.dart';
import '../controllers/place_bid_detail_controller.dart';

class PlaceBidDetailView extends GetView<PlaceBidDetailController> {
  const PlaceBidDetailView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: false,
      showNotification: true,
      extendBodyBehindAppBar: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_next".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.toNamed(Routes.PAYMENT_PAGE,arguments: {Constants.paramPlaceBid: true});
          },
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            const StageViewScreen(height: 350,),
            Padding(
              padding: getPadding(all: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: 'Music Concert',
                    family: 'Manrope',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.whiteA700,
                  ),
                  MyText(
                    title: 'DJ Maksmellow Orignawa',
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 22,
                    clr: ColorConstant.whiteA700,
                  ),
                  const CustomDivider(
                    height: 0.3,
                  ),
                  SizedBox(
                    height: getSize(10),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Obx(() => DropdownButton<String>(
                          value: controller.selectedType.value,
                          dropdownColor: ColorConstant.black900,
                          hint: const MyText(title: 'Select type'),
                          icon: const Icon(Icons.keyboard_arrow_down_sharp),
                          // The down arrow icon
                          isExpanded: true,
                          underline: const SizedBox(),
                          // Remove the default underline
                          items: controller.ticketType.map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: MyText(title: value),
                            );
                          }).toList(),
                          onChanged: (String? newValue) {
                            controller.selectedType.value = newValue!;
                          },
                        )),
                  ),
                  const SizedBox(
                    height: 15,
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Obx(() => DropdownButton<int>(
                          value: controller.quantity.value,
                          hint: const MyText(title: 'Select quantity'),
                          icon: const Icon(Icons.keyboard_arrow_down_sharp),
                          // The down arrow icon
                          isExpanded: true,
                          underline: const SizedBox(),
                          // Remove the default underline
                          items: controller.numbers.map((int value) {
                            return DropdownMenuItem<int>(
                              value: value,
                              child: MyText(
                                  title: value == 0
                                      ? "Select Quantity"
                                      : value.toString()),
                            );
                          }).toList(),
                          dropdownColor: ColorConstant.black900,
                          onChanged: (int? newValue) {
                            controller.quantity.value = newValue!;
                          },
                        )),
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  CustomTextFormField(
                    prefix: Padding(
                      padding: getPadding(top: 10, left: 15),
                      child: const MyText(
                        title: "\$ ",
                        fontSize: 18,
                      ),
                    ),
                    labelText: "Or Name your price",
                    textInputType: TextInputType.number,
                  ),
                  const SizedBox(
                    height: 15,
                  ),
                  MyText(
                    title:
                    'This is a competitive price that is more likely to match with a seller',
                    family: 'Manrope',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.whiteA700,
                  ),
                  const CustomDivider(
                    height: 0.3,
                  ),
                  Row(
                    children: [
                      MyText(
                        title: 'Subtotal',
                        family: 'Manrope',
                        customWeight: FontWeight.w800,
                        fontSize: 18,
                        clr: ColorConstant.whiteA700,
                      ),
                      const Spacer(),
                      MyText(
                        title: '\$280.00',
                        family: 'Manrope',
                        customWeight: FontWeight.w800,
                        fontSize: 18,
                        clr: ColorConstant.green,
                      ),
                    ],
                  ),
                  const SizedBox(
                    height: 15,
                  ),
                  MyText(
                    title:
                    'Includes processing fee. Final price calculated at checkout',
                    family: 'Manrope',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.whiteA700,
                  ),
                  const SizedBox(
                    height: 30,
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
