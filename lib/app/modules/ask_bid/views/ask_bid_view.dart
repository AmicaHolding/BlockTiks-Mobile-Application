import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';

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
        child: CustomButton(
          text: controller.fromSell ? "Sell now".tr : "lbl_next".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            if(controller.fromSell){
              Get.offAllNamed(
                Routes.USER_DASHBOARD,
              );
            }else{
              Get.toNamed(
                Routes.PAYMENT_PAGE,);
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
                                  color: ColorConstant.whiteA700),
                              borderRadius: BorderRadius.circular(5)),
                          padding: getPadding(left: 3, right: 3),
                          child: const MyText(
                            title: 'View all transactions',
                            clr: Colors.white,
                            fontSize: 16,
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
                  Obx(() => CustomTextFormField(
                    labelText: "Or name your price",
                    hintText: '',
                    readOnly:  controller.selectedBid.value != -1,
                    controller: controller.bidController,
                    variant: controller.selectedBid.value == -1 ? TextFormFieldVariant.None : TextFormFieldVariant.FillGray50,
                    textInputType: TextInputType.number,
                    prefix: Container(
                      margin: getMargin(left: 15),
                      padding: getPadding(top: 12, bottom: 12),
                      child: const MyText(
                        title: '\$',
                        family: 'Roboto Condensed',
                        customWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  )),
                  SizedBox(
                    height: getSize(15),
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
                borderRadius: BorderRadius.circular(8),
                color: controller.selectedBid.value == index
                    ? ColorConstant.primaryPink
                    : null,
                border: Border.all(color: ColorConstant.primaryPink)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                MyText(
                  title: price,
                  fontSize: 18,
                  customWeight: FontWeight.bold,
                ),
                MyText(
                  title: name,
                  fontSize: 12,
                ),
              ],
            ),
          )),
    );
  }
}
