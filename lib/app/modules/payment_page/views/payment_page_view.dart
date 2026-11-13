import 'package:block_tix/app/data/core/app_export.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/payment_page_controller.dart';

class PaymentPageView extends GetView<PaymentPageController> {
  const PaymentPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: false,
      hideAppBar: true,
      sidePadding: false,
      safeTopArea: false,
      resizeToAvoidBottomInset: true,
      bottomNavigationBar: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Honest labeling: Stripe TEST mode — real PaymentSheet, but
            // test card numbers only (no real money moves).
            Container(
              margin: getMargin(left: 20, right: 20, bottom: 8),
              padding: getPadding(left: 12, right: 12, top: 10, bottom: 10),
              decoration: BoxDecoration(
                color: ColorConstant.warningOrange.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: ColorConstant.warningOrange.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  Icon(Icons.science_outlined,
                      size: 16, color: ColorConstant.warningOrange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: MyText(
                      title: controller.hasBackendContext
                          ? 'Test mode — pay with 4242 4242 4242 4242'
                          : 'Test checkout — no real payment yet',
                      family: 'Inter',
                      fontSize: 12,
                      clr: ColorConstant.warningOrange,
                    ),
                  ),
                ],
              ),
            ),
            PrimaryPillButton(
              text: controller.fromPlaceBid ? "Place" : "lbl_buy_now".tr,
              margin: getMargin(right: 20, left: 20, bottom: 30, top: 4),
              onTap: () {
                // Card details must validate before we proceed — but only
                // for the manual-entry/simulated path. Real checkouts use
                // the Stripe PaymentSheet for card entry instead.
                if (!controller.hasBackendContext &&
                    controller.selectedPayment.value == 4 &&
                    !controller.validateCard()) {
                  CustomSnackBar.showCustomErrorToast(
                      message: "Please complete your card details");
                  return;
                }
                // Real checkout: creates order intents on the backend when
                // event context is present; simulated fallback otherwise.
                controller.checkout();
              },
            ),
          ],
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            SizedBox(
              height: getSize(342),
              child: Stack(
                children: [
                  CustomImageView(
                    imagePath: ImageConstant.splashBg,
                    height: getSize(343),
                    width: size.width,
                    fit: BoxFit.cover,
                  ),
                  Positioned(
                    top: 42,
                    left: 0,
                    child: Padding(
                      padding: getPadding(left: 16,right: 16,top: 8,bottom: 8),
                      child: GestureDetector(
                        onTap:() {
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
                    ),
                  ),
                  Positioned(
                    bottom: 10,
                    left: 16,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText(
                          title: controller.eventType,
                          family: 'Inter',
                          clr: ColorConstant.white60,
                          fontSize: 14,
                        ),
                        const SizedBox(height: 5),
                        MyText(
                          title: controller.eventTitle,
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 24,
                          height: 1.15,
                        ),
                        controller.platinum>0 ? _ticketWidget(controller.platinum,"Platinum Ticket") : Offstage(),
                        controller.gold>0 ? _ticketWidget(controller.gold,"Gold Ticket") : Offstage(),
                        controller.silver>0 ? _ticketWidget(controller.silver,"Silver Ticket") : Offstage(),
                        controller.bronze>0 ? _ticketWidget(controller.bronze,"Bronze Ticket") : Offstage(),
                        controller.selections.isNotEmpty
                            ? _ticketWidget(
                                controller.selections.fold<int>(0, (s, t) =>
                                    s + ((t['quantity'] as num?)?.toInt() ?? 1)),
                                'Ticket',
                                isLast: true,
                                totalLabel: controller.subtotalCents > 0
                                    ? '\$${(controller.subtotalCents / 100).toStringAsFixed(2)}'
                                    : null,
                              )
                            : Offstage(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: getPadding(left: 16, right: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: getSize(15),
                  ),
                  Text(
                    'Choose payment method',
                    style: AppStyle.heading2Manrope,
                  ),
                  SizedBox(
                    height: getSize(15),
                  ),
                  CardWidget(
                    image: ImageConstant.mini,
                    title: 'BlockTix wallet',
                    desc: 'Balance: \$24.03',
                    index: 0,
                  ),
                  CardWidget(
                    image: ImageConstant.applePay,
                    title: 'Apple Pay',
                    desc: 'Takes minutes to complete',
                    index: 1,
                  ),
                  CardWidget(
                    image: ImageConstant.googlePay,
                    title: 'Google Pay',
                    desc: 'Takes minutes to complete',
                    index: 2,
                  ),
                  CardWidget(
                    image: ImageConstant.googlePay,
                    title: 'Chase Debit',
                    desc: 'VISA ****4493',
                    index: 3,
                  ),
                  CardWidget(
                    image: ImageConstant.addCard,
                    title: 'Add Debit/Credit Card',
                    desc: 'Takes minutes to complete',
                    colorWhite: true,
                    index: 4,
                  ),
                  SizedBox(
                    height: getSize(15),
                  ),
                  Obx(() => controller.selectedPayment.value == 4
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText(
                              title: 'Card Information',
                              family: 'Manrope',
                              fontSize: 14,
                              customWeight: FontWeight.w600,
                              clr: ColorConstant.whiteA700,
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            Form(
                              key: controller.cardFormKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CustomTextFormField(
                                    controller: controller.cardNumberController,
                                    labelText: 'Card Number',
                                    hintText: 'XXXX XXXX XXXX XXXX',
                                    textInputType: TextInputType.number,
                                    variant: TextFormFieldVariant.OutlineNewGray,
                                    validator: (val) {
                                      final digits =
                                          (val ?? '').replaceAll(RegExp(r'\D'), '');
                                      if (digits.length < 13) {
                                        return 'Enter a valid card number';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: CustomTextFormField(
                                          controller: controller.expiryController,
                                          labelText: 'Expiry (MM/YY)',
                                          hintText: 'MM/YY',
                                          textInputType: TextInputType.number,
                                          variant: TextFormFieldVariant.OutlineNewGray,
                                          validator: (val) {
                                            final text = (val ?? '').trim();
                                            if (!RegExp(r'^(0[1-9]|1[0-2])/\d{2}$')
                                                .hasMatch(text)) {
                                              return 'Use MM/YY';
                                            }
                                            return null;
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: CustomTextFormField(
                                          controller: controller.cvvController,
                                          labelText: 'CVV',
                                          hintText: 'XXX',
                                          textInputType: TextInputType.number,
                                          variant: TextFormFieldVariant.OutlineNewGray,
                                          validator: (val) {
                                            final cvv = (val ?? '').trim();
                                            if (cvv.length < 3) {
                                              return 'Enter CVV';
                                            }
                                            return null;
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  CustomTextFormField(
                                    controller: controller.nameController,
                                    labelText: 'Card Holder',
                                    hintText: 'Name on card',
                                    variant: TextFormFieldVariant.OutlineNewGray,
                                    validator: (val) {
                                      if ((val ?? '').trim().length < 2) {
                                        return 'Enter the name on the card';
                                      }
                                      return null;
                                    },
                                  ),
                                ],
                              ),
                            ),
                            SizedBox(
                              height: getSize(30),
                            ),
                          ],
                        )
                      : const Offstage()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ticketWidget(int count,String type,{bool isLast = false, String? totalLabel}){
    return Container(
      padding: getPadding(bottom: isLast ? 0:5),
      child: Row(
        children: [
          MyText(
            title: '$count $type${count > 1 ? 's':''}',
            family: 'Inter',
            clr: ColorConstant.white60,
            fontSize: 14,
          ),
          Container(
            margin: getMargin(left: 10,right: 10),
            height: 14,
            width: 1,
            decoration: BoxDecoration(
              color: ColorConstant.white60
            ),
          ),
          MyText(
            title: 'Total:  ',
            family: 'Inter',
            clr: ColorConstant.white60,
            fontSize: 14,
          ),
          MyText(
            title: totalLabel ?? '\$${count * 405}',
            family: 'Inter',
            clr: ColorConstant.successGreen,
            fontSize: 14,
          ),
        ],
      ),
    );
  }
}

class CardWidget extends StatelessWidget {
  CardWidget(
      {super.key,
      required this.image,
      required this.title,
      required this.index,
      required this.desc,
      this.isPng = false,
      this.colorWhite = false});

  final String image;
  final String title;
  final String desc;
  final int index;
  final bool isPng;
  final bool colorWhite;

  final controller = Get.put(PaymentPageController());

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        controller.selectedPayment.value = index;
      },
      child: Obx(() => Container(
            decoration: BoxDecoration(
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: controller.selectedPayment.value == index
                        ? ColorConstant.primaryAccent
                        : ColorConstant.hairline)),
            margin: getMargin(bottom: 10),
            padding: getPadding(left: 15, right: 15, top: 8, bottom: 8),
            child: Row(
              children: [
                SizedBox(
                  height: 36,
                  width: 36,
                  child: CustomImageView(
                    svgPath: isPng ? null : image,
                    imagePath: isPng ? image : null,
                    height: 36,
                    width: 36,
                    color: colorWhite ? ColorConstant.whiteA700 : null,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(
                  width: 20,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText(
                        title: title,
                        family: 'Manrope',
                        fontSize: 16,
                        customWeight: FontWeight.w600,
                        clr: ColorConstant.whiteA700,
                      ),
                      const SizedBox(
                        width: 5,
                      ),
                      MyText(
                        title: desc,
                        family: 'Inter',
                        fontSize: 12,
                        clr: ColorConstant.white60,
                      ),
                    ],
                  ),
                ),
                const SizedBox(
                  width: 10,
                ),
                Container(
                  width: 30,
                  height: 30,

                  decoration: BoxDecoration(
                    shape: BoxShape.circle,

                    border: Border.all(
                        color: controller.selectedPayment.value == index
                            ? ColorConstant.primaryAccent
                            : ColorConstant.hairline),
                  ),
                  child: Padding(
                    padding: getPadding(all: 3),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                      color: controller.selectedPayment.value == index
                          ? ColorConstant.primaryAccent
                          : Colors.transparent,
                      )
                    ),
                  ),
                )
              ],
            ),
          )),
    );
  }
}

/// Sahra primary CTA: gold pill with Night text — the brand signature.
class PrimaryPillButton extends StatelessWidget {
  const PrimaryPillButton({
    super.key,
    required this.text,
    required this.onTap,
    this.margin,
    this.prefixWidget,
  });

  final String text;
  final VoidCallback onTap;
  final EdgeInsetsGeometry? margin;
  final Widget? prefixWidget;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: SizedBox(
        width: double.maxFinite,
        height: getVerticalSize(48),
        child: TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            backgroundColor: ColorConstant.gold,
            foregroundColor: ColorConstant.night,
            shape: const StadiumBorder(),
            padding: EdgeInsets.zero,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (prefixWidget != null) ...[
                prefixWidget!,
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  text,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.bricolageGrotesque(
                    color: ColorConstant.night,
                    fontSize: getFontSize(16),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
