import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Honest labeling: card entry is validated but no real payment
            // is processed in this build.
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
                      title: 'Test checkout — no real payment yet',
                      family: 'Inter',
                      fontSize: 12,
                      clr: ColorConstant.warningOrange,
                    ),
                  ),
                ],
              ),
            ),
            PrimaryPillButton(
              text: "lbl_save".tr,
              margin: getMargin(right: 20, left: 20, bottom: 30, top: 4),
              onTap: () {
                // When a new card is being added, its details must validate
                // before we accept them.
                if (controller.selectedPayment.value == 4 &&
                    !controller.validateCard()) {
                  CustomSnackBar.showCustomErrorToast(
                      message: "Please complete your card details");
                  return;
                }
                Get.back();
              },
            ),
          ],
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
}
