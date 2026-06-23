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
          onTap: () {},
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            MyText(
              title: 'Referrals',
              clr: ColorConstant.whiteA700,
              fontSize: 18,
              customWeight: FontWeight.w600,
            ),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.topLeft,
              child: MyText(
                title: 'Get \$10 when your friends join BlockTix',
                family: 'Manrope',
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 7),
            const MyText(
              title:
                  'Share your unique link or code to invite friends. They will get \$10 when they join, and you will get \$10 after they send \$5.',
              family: 'Manrope',
              customWeight: FontWeight.w500,
              fontSize: 12,
            ),
            SizedBox(
              height: getSize(40),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.fromLTRB(0, 1, 0, 7),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        margin: const EdgeInsets.fromLTRB(1, 0, 17.7, 2),
                        child: const MyText(
                          title: 'Your code',
                          family: 'Manrope',
                          fontSize: 16,
                        ),
                      ),
                      const MyText(
                        title: 'Copy to cliboard',
                        family: 'Manrope',
                        customWeight: FontWeight.w500,
                        fontSize: 12,
                      ),
                    ],
                  ),
                ),
                CustomButton(
                  text: 'Copy',
                  width: 150,
                ),
              ],
            ),
            SizedBox(
              height: getSize(30),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.fromLTRB(0, 1, 0, 7),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        margin: const EdgeInsets.fromLTRB(1, 0, 17.7, 2),
                        child: const MyText(
                          title: 'Referral Rewards',
                          family: 'Manrope',
                          fontSize: 16,
                        ),
                      ),
                      const MyText(
                        title: 'You\'ve earned \$0',
                        family: 'Manrope',
                        customWeight: FontWeight.w500,
                        fontSize: 12,
                      ),
                    ],
                  ),
                ),
                CustomButton(
                  text: 'See Details',
                  width: 150,
                  variant: ButtonVariant.FillGray300,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
