import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';

import '../controllers/ask_bid_controller.dart';

class AskBidView extends GetView<AskBidController> {
  const AskBidView({Key? key}) : super(key: key);

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
          text: controller.fromSell ? "Sell now".tr : "lbl_next".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          onTap: () {
            if (controller.fromSell) {
              Get.offAllNamed(
                Routes.USER_DASHBOARD,
              );
            } else {
              // Manual price entry must be a valid amount before checkout.
              if (!controller.validateForm()) {
                CustomSnackBar.showCustomErrorToast(
                    message: "Enter a valid price or pick an option");
                return;
              }
              Get.toNamed(
                Routes.PAYMENT_PAGE,
                arguments: {
                  'title': controller.eventTitle,
                  'type': controller.eventType,
                  if (controller.ticketTier.isNotEmpty)
                    'tier': controller.ticketTier,
                  'price': controller.currentPrice,
                },
              );
            }
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

              !controller.fromSell ? MyText(
                title: 'Pricing Options',
                family: 'Manrope',
                customWeight: FontWeight.w600,
                fontSize: 18,
                clr: ColorConstant.whiteA700,):
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      MyText(
                        title: 'Pricing Options',
                        family: 'Manrope',
                        customWeight: FontWeight.w600,
                        fontSize: 18,
                        clr: ColorConstant.whiteA700,
                      ),
                      GestureDetector(
                        onTap: () => Get.toNamed(Routes.TRANSACTIONS),
                        child: Container(
                          decoration: BoxDecoration(
                              border: Border.all(
                                  color: ColorConstant.hairline),
                              borderRadius: BorderRadius.circular(8)),
                          padding: getPadding(left: 8, right: 8, top: 4, bottom: 4),
                          child: MyText(
                            title: 'View all transactions',
                            family: 'Inter',
                            clr: ColorConstant.white60,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  Row(
                    children: [
                      Expanded(
                          child: offerWidget(
                              name: !controller.fromSell ? "Good Bid" : "Good Ask", price: "\$222", index: 0)),
                      SizedBox(
                        width: getSize(10),
                      ),
                      Expanded(
                          child: offerWidget(
                              name: controller.fromSell ? "Better Ask" : "Better Bid",  price: "\$232", index: 1)),
                      SizedBox(
                        width: getSize(10),
                      ),
                      Expanded(
                          child: offerWidget(
                              name: controller.fromSell? "Sell Now" : "Buy Now", price: "\$280", index: 2)),
                    ],
                  ),
                  SizedBox(
                    height: getSize(15),
                  ),
                  Obx(() => Form(
                    key: controller.formKey,
                    child: CustomTextFormField(
                      labelText: "Or name your price",
                      hintText: '',
                      controller: controller.bidController,
                      readOnly:  controller.selectedBid.value != -1,
                      variant: TextFormFieldVariant.OutlineNewGray,
                      textInputType: TextInputType.number,
                      validator: controller.validatePrice,
                      prefix: Container(
                        margin: getMargin(left: 15),
                        padding: getPadding(top: 12, bottom: 12),
                        child: const MyText(
                          title: '\$',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  )),
                  SizedBox(
                    height: getSize(15),
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
                          title: controller.currentPrice > 0
                              ? '\$${controller.currentPrice.toStringAsFixed(2)}'
                              : '\$0.00',
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 18,
                          clr: ColorConstant.successGreen,
                        ),
                      ],
                    );
                  }),
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

  Widget offerWidget(
      {required String name, required String price, required int index}) {
    return GestureDetector(
      onTap: () {
        if(controller.selectedBid.value != index){
          controller.selectedBid.value = index;
        }else{
          controller.selectedBid.value = -1;
        }

      },
      child: Obx(() => Container(
            height:65,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: controller.selectedBid.value == index
                    ? ColorConstant.primaryAccent
                    : ColorConstant.elevated,
                border: Border.all(
                    color: controller.selectedBid.value == index
                        ? ColorConstant.primaryAccent
                        : ColorConstant.hairline)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                MyText(
                  title: price,
                  family: 'Manrope',
                  fontSize: 18,
                  customWeight: FontWeight.w700,
                ),
                MyText(
                  title: name,
                  family: 'Inter',
                  fontSize: 12,
                  clr: controller.selectedBid.value == index
                      ? ColorConstant.whiteA700
                      : ColorConstant.white60,
                ),
              ],
            ),
          )),
    );
  }
}
