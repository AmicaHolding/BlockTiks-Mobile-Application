import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_page_screen.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/creator_promo_code_controller.dart';

class CreatorPromoCodeView extends GetView<CreatorPromoCodeController> {
  const CreatorPromoCodeView({super.key});
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      sidePadding: false,
      showLogo: true,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: true,
      child: SingleChildScrollView(
        child: Column(
          children: [
            MyText(
              title: 'Promo Codes',
              clr: ColorConstant.whiteA700,
              fontSize: 18,
              customWeight: FontWeight.w600,
            ),
            const SizedBox(height: 20),
            CustomButton(
              onTap: () => controller.showAddPromoDialog(),
              text: '+ Create new promo',
              margin: getMargin(left: 16,right: 16),
            ),
            const SizedBox(height: 30),
            Align(
              alignment: Alignment.centerLeft,
              child: MyText(
                title: 'Active Promo Codes',
                clr: ColorConstant.whiteA700,
              ),
            ),
            const SizedBox(height: 10),
            promoCodeWidget(),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget promoCodeWidget({bool isUsed = false}) {
    return Container(
      decoration: BoxDecoration(
          color: ColorConstant.gray50.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10)),
      padding: const EdgeInsets.fromLTRB(12, 12, 13.8, 9),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.fromLTRB(0, 1, 10.8, 0),
                child: CustomImageView(
                  width: 51,
                  height: 51,
                  svgPath: ImageConstant.mini,
                ),
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.fromLTRB(0, 0, 0, 5),
                      child: const MyText(
                        title: 'Tix 50%',
                        family: 'Manrope',
                        fontSize: 16,
                      ),
                    ),
                    const MyText(
                      title:
                      '50 % discount on ticket, this will be used on the next purchase once used',
                      family: 'Manrope',
                      fontSize: 12,
                    ),
                  ],
                ),
              ),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.fromLTRB(0, 11, 34.8, 15),
                child: const MyText(
                  title: 'Valid until 19-09-2024',
                  family: 'Manrope',
                  fontSize: 16,
                ),
              ),
              const SizedBox(
                width: 30,
              ),
              Expanded(
                child: CustomButton(
                  height: getSize(30),
                  text: "NBDAKAS23",
                  variant: isUsed ? ButtonVariant.FillGray300 : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
