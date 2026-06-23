import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter_credit_card/flutter_credit_card.dart';
import '../controllers/payment_options_controller.dart';

class PaymentOptionsView extends GetView<PaymentOptionsController> {
  const PaymentOptionsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: false,
      sidePadding: false,
      showLogo: true,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_save".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.back();
          },
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
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
}
