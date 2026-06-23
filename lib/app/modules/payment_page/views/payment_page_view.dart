import 'package:block_tix/app/data/core/app_export.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_credit_card/flutter_credit_card.dart';
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
        child: CustomButton(
          text: controller.fromPlaceBid? "Place":"lbl_buy_now".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.toNamed(Routes.LOADER, arguments: {
              'todo': () {
                if(controller.fromPlaceBid){
                  Get.offAllNamed(Routes.USER_DASHBOARD);
                }else{
                  Get.offNamed(Routes.PURCHASED_TICKET,arguments:{Constants.paramTicket:  (controller.platinum)+(controller.gold)+(controller.silver)+(controller.bronze)});
                }
              },
            });
          },
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
                        const MyText(
                          title: 'Music Concert',
                          clr: Colors.white60,
                          fontSize: 14,
                        ),
                        const SizedBox(height: 5),
                        const MyText(
                          title: 'DJ MaksMellow Orignawa',
                          clr: Colors.white,
                          fontSize: 24,
                          customWeight: FontWeight.bold,
                        ),
                        controller.platinum>0 ? _ticketWidget(controller.platinum,"Platinum Ticket") : Offstage(),
                        controller.gold>0 ? _ticketWidget(controller.gold,"Gold Ticket") : Offstage(),
                        controller.silver>0 ? _ticketWidget(controller.silver,"Silver Ticket") : Offstage(),
                        controller.bronze>0 ? _ticketWidget(controller.bronze,"Bronze Ticket",isLast: true) : Offstage(),
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
                    style: GoogleFonts.getFont(
                      'Manrope',
                      fontWeight: FontWeight.w700,
                      fontSize: 22,
                      color: const Color(0xFFFFFFFF),
                    ),
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
                              clr: ColorConstant.whiteA700,
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            CreditCardForm(
                              cardNumber: '', // Add initial card number here if needed
                              expiryDate: '', // Add initial expiry date here if needed
                              cardHolderName: '', // Add initial card holder name here if needed
                              cvvCode: '', // Add initial CVV code here if needed
                              themeColor: Colors.white,
                              textColor: ColorConstant.whiteA700,
                              formKey: GlobalKey<FormState>(), // Use GlobalKey<FormState> for validation
                              cardNumberDecoration: InputDecoration(
                                labelText: 'Card Number',
                                labelStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.whiteA700,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                hintText: 'XXXX XXXX XXXX XXXX',
                                hintStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.white60,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(
                                    color: ColorConstant.gray300,
                                    width: 1,
                                  ),
                                ),
                                contentPadding: getPadding(all: 15),
                              ),
                              expiryDateDecoration: InputDecoration(
                                labelText: 'Expiry Date',
                                hintText: 'MM/YY',
                                labelStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.whiteA700,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                hintStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.white60,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(
                                    color: ColorConstant.gray300,
                                    width: 1,
                                  ),
                                ),
                                contentPadding: getPadding(all: 15),
                              ),
                              cvvCodeDecoration: InputDecoration(
                                labelText: 'CVV',
                                hintText: 'XXX',
                                labelStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.whiteA700,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                hintStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.white60,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(
                                    color: ColorConstant.gray300,
                                    width: 1,
                                  ),
                                ),
                                contentPadding: getPadding(all: 15),
                              ),
                              cardHolderDecoration: InputDecoration(
                                labelText: 'Card Holder',
                                hintText: 'Your Name',
                                labelStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.whiteA700,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                hintStyle: GoogleFonts.getFont(
                                  "Inter",
                                  color: ColorConstant.white60,
                                  fontSize: getFontSize(14),
                                  fontWeight: FontWeight.w400,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(
                                    color: ColorConstant.gray300,
                                    width: 1,
                                  ),
                                ),
                                contentPadding: getPadding(all: 15),
                              ),
                              onCreditCardModelChange: (creditCardModel) {
                                // You can handle card model changes here, for example:
                                // _cardNumber = creditCardModel.cardNumber;
                                // _expiryDate = creditCardModel.expiryDate;
                                // _cvvCode = creditCardModel.cvvCode;
                                // _cardHolderName = creditCardModel.cardHolderName;
                              },
                            ),
                            // CardField(
                            //   style: GoogleFonts.getFont(
                            //     "Inter",
                            //     color: ColorConstant.whiteA700,
                            //     fontSize: getFontSize(
                            //       14,
                            //     ),
                            //     fontWeight: FontWeight.w400,
                            //   ),
                            //   decoration: InputDecoration(
                            //     hintText: 'Add Debit/Credit Card',
                            //     hintStyle: GoogleFonts.getFont(
                            //       "Inter",
                            //       color: ColorConstant.white60,
                            //       fontSize: getFontSize(
                            //         14,
                            //       ),
                            //       fontWeight: FontWeight.w400,
                            //     ),
                            //     border: OutlineInputBorder(
                            //       borderRadius: BorderRadius.circular(10),
                            //       borderSide: BorderSide(
                            //         color: ColorConstant.gray300,
                            //         width: 1,
                            //       ),
                            //     ),
                            //     enabledBorder: OutlineInputBorder(
                            //       borderRadius: BorderRadius.circular(10),
                            //       borderSide: BorderSide(
                            //         color: ColorConstant.gray300,
                            //         width: 1,
                            //       ),
                            //     ),
                            //     focusedBorder: OutlineInputBorder(
                            //       borderRadius: BorderRadius.circular(10),
                            //       borderSide: BorderSide(
                            //         color: ColorConstant.gray300,
                            //         width: 1,
                            //       ),
                            //     ),
                            //     disabledBorder: OutlineInputBorder(
                            //       borderRadius: BorderRadius.circular(10),
                            //       borderSide: BorderSide(
                            //         color: ColorConstant.gray300,
                            //         width: 1,
                            //       ),
                            //     ),
                            //     contentPadding: getPadding(
                            //       all: 15,
                            //     ),
                            //   ),
                            //   onCardChanged: (card) {
                            //     // setState(() {
                            //     //   _cardFieldInputDetails = card;
                            //     // });
                            //   },
                            // ),
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

  Widget _ticketWidget(int count,String type,{bool isLast = false}){
    return Container(
      padding: getPadding(bottom: isLast ? 0:5),
      child: Row(
        children: [
          MyText(
            title: '$count $type${count > 1 ? 's':''}',
            clr: Colors.white60,
            fontSize: 14,
          ),
          Container(
            margin: getMargin(left: 10,right: 10),
            height: 14,
            width: 1,
            decoration: const BoxDecoration(
              color: Colors.white60
            ),
          ),
          const MyText(
            title: 'Total:  ',
            clr: Colors.white60,
            fontSize: 14,
          ),
          MyText(
            title: '\$${count * 405}',
            clr: ColorConstant.green,
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
                color: ColorConstant.whiteA700.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: controller.selectedPayment.value == index
                        ? ColorConstant.primaryPink
                        : Colors.transparent)),
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
                        clr: ColorConstant.whiteA700,
                      ),
                      const SizedBox(
                        width: 5,
                      ),
                      MyText(
                        title: desc,
                        family: 'Manrope',
                        fontSize: 12,
                        clr: ColorConstant.whiteA700,
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
                            ? ColorConstant.primaryPink
                            : ColorConstant.gray50),
                  ),
                  child: Padding(
                    padding: getPadding(all: 3),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                      color: controller.selectedPayment.value == index
                          ? ColorConstant.primaryPink
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
