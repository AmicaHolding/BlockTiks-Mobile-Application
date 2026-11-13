import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';

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
        child: PrimaryPillButton(
          text: "lbl_next".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          onTap: () {
            if (!controller.validateForm()) {
              CustomSnackBar.showCustomErrorToast(
                  message: "Select a ticket type, quantity and a valid price");
              return;
            }
            Get.toNamed(Routes.PAYMENT_PAGE, arguments: {
              Constants.paramPlaceBid: true,
              'title': controller.eventTitle,
              'type': controller.eventType,
              'ticketType': controller.selectedType.value,
              'quantity': controller.quantity.value,
              'price': controller.unitPrice,
            });
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
                    title: controller.eventType,
                    family: 'Inter',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.white60,
                  ),
                  MyText(
                    title: controller.eventTitle,
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
                      color: ColorConstant.elevated,
                      border: Border.all(color: ColorConstant.hairline),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Obx(() => DropdownButton<String>(
                          value: controller.selectedType.value,
                          dropdownColor: ColorConstant.elevated,
                          hint: const MyText(title: 'Select type'),
                          icon: Icon(Icons.keyboard_arrow_down_sharp,
                              color: ColorConstant.white60),
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
                      color: ColorConstant.elevated,
                      border: Border.all(color: ColorConstant.hairline),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Obx(() => DropdownButton<int>(
                          value: controller.quantity.value,
                          hint: const MyText(title: 'Select quantity'),
                          icon: Icon(Icons.keyboard_arrow_down_sharp,
                              color: ColorConstant.white60),
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
                          dropdownColor: ColorConstant.elevated,
                          onChanged: (int? newValue) {
                            controller.quantity.value = newValue!;
                          },
                        )),
                  ),
                  const SizedBox(
                    height: 20,
                  ),
                  Form(
                    key: controller.formKey,
                    child: CustomTextFormField(
                      controller: controller.priceController,
                      prefix: Padding(
                        padding: getPadding(top: 10, left: 15),
                        child: const MyText(
                          title: "\$ ",
                          fontSize: 18,
                        ),
                      ),
                      labelText: "Or Name your price",
                      hintText: '0.00',
                      textInputType: TextInputType.number,
                      variant: TextFormFieldVariant.OutlineNewGray,
                      validator: (val) {
                        final text = (val ?? '').trim();
                        if (text.isEmpty) return null; // optional override
                        final parsed = double.tryParse(text);
                        if (parsed == null || parsed <= 0) {
                          return 'Enter a valid amount';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(
                    height: 15,
                  ),
                  MyText(
                    title:
                    'This is a competitive price that is more likely to match with a seller',
                    family: 'Inter',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.white60,
                  ),
                  const CustomDivider(
                    height: 0.3,
                  ),
                  Obx(() {
                    // priceVersion bumps on each keystroke so the subtotal
                    // recomputes while the user types.
                    return Row(
                      key: ValueKey(controller.priceVersion.value),
                      children: [
                        const MyText(
                          title: 'Subtotal',
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                        const Spacer(),
                        MyText(
                          title: '\$${controller.subtotal.toStringAsFixed(2)}',
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 18,
                          clr: ColorConstant.successGreen,
                        ),
                      ],
                    );
                  }),
                  const SizedBox(
                    height: 15,
                  ),
                  MyText(
                    title:
                    'Includes processing fee. Final price calculated at checkout',
                    family: 'Inter',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.white60,
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
