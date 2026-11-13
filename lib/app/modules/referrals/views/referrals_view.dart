import 'package:block_tix/app/data/core/app_export.dart';

import '../controllers/referrals_controller.dart';

class ReferralsView extends GetView<ReferralsController> {
  const ReferralsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      sidePadding: false,
      showLogo: true,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "Share Link".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () => controller.copyReferralLink(),
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText(
              title: 'Referrals',
              family: 'Manrope',
              clr: ColorConstant.whiteA700,
              fontSize: 20,
              customWeight: FontWeight.w700,
            ),
            const SizedBox(height: 20),
            MyText(
              title: 'Get \$10 when your friends join BlockTix',
              family: 'Manrope',
              customWeight: FontWeight.w600,
              fontSize: 16,
            ),
            const SizedBox(height: 7),
            MyText(
              title:
                  'Share your unique link or code to invite friends. They will get \$10 when they join, and you will get \$10 after they send \$5.',
              family: 'Inter',
              fontSize: 13,
              clr: ColorConstant.white60,
            ),
            SizedBox(
              height: getSize(24),
            ),
            Container(
              padding: getPadding(all: 16),
              decoration: BoxDecoration(
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText(
                          title: 'Your code',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                        SizedBox(height: getSize(4)),
                        MyText(
                          title: ReferralsController.referralCode,
                          family: 'Inter',
                          customWeight: FontWeight.w600,
                          fontSize: 15,
                          clr: ColorConstant.primaryAccent,
                        ),
                        const SizedBox(height: 2),
                        MyText(
                          title: 'Tap copy to clipboard',
                          family: 'Inter',
                          fontSize: 12,
                          clr: ColorConstant.white60,
                        ),
                      ],
                    ),
                  ),
                  CustomButton(
                    text: 'Copy',
                    width: 110,
                    height: 36,
                    onTap: () => controller.copyReferralCode(),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: getSize(16),
            ),
            Container(
              padding: getPadding(all: 16),
              decoration: BoxDecoration(
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText(
                          title: 'Referral link',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                        SizedBox(height: getSize(4)),
                        MyText(
                          title: ReferralsController.referralLink,
                          family: 'Inter',
                          fontSize: 13,
                          clr: ColorConstant.white60,
                          toverflow: TextOverflow.ellipsis,
                          line: 1,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  CustomButton(
                    text: 'Copy',
                    width: 110,
                    height: 36,
                    variant: ButtonVariant.FillGray300,
                    onTap: () => controller.copyReferralLink(),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: getSize(24),
            ),
            Container(
              padding: getPadding(all: 16),
              decoration: BoxDecoration(
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText(
                          title: 'Referral Rewards',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                        const SizedBox(height: 2),
                        MyText(
                          title: 'You\'ve earned \$0',
                          family: 'Inter',
                          fontSize: 13,
                          clr: ColorConstant.white60,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
