import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';

import '../controllers/other_user_profile_controller.dart';

class OtherUserProfileView extends GetView<OtherUserProfileController> {
  const OtherUserProfileView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      bodyPadding: false,
      sidePadding: false,
      safeTopArea: false,
      child: RefreshIndicator(
        onRefresh: () async {
          await Future.delayed(
              const Duration(milliseconds: Constants.refreshDelay));
          // controller.getMyProfile();
        },
        child: Stack(
          children: [
            SizedBox(
              width: size.width,
              height: size.height,
              child: Column(
                children: [
                  Container(
                    width: size.width,
                    foregroundDecoration: BoxDecoration(
                        gradient: LinearGradient(
                      colors: [
                        Colors.black.withValues(alpha: 0.1),
                        Colors.black.withValues(alpha: 0.9),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    )),
                    child: CustomImageView(
                      width: size.width,
                      fit: BoxFit.fitWidth,
                      imagePath: ImageConstant.splashBg,
                    ),
                  ),
                  Expanded(
                      child: Container(
                          width: size.width,
                          decoration: BoxDecoration(
                              color: ColorConstant.bg,
                              border: Border.all(
                                  color: ColorConstant.hairline, width: 1))))
                ],
              ),
            ),
            SizedBox(
              width: size.width,
              height: size.height,
              child: Column(
                children: [
                  SizedBox(
                    height: size.height * 0.22,
                  ),
                  Expanded(
                      child: Container(
                          width: size.width,
                          decoration: BoxDecoration(
                              color: ColorConstant.bg,
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(24),
                                topRight: Radius.circular(24),
                              ))))
                ],
              ),
            ),
            Container(
              padding: getPadding(all: HelperFunction.SCREENS_SIDE_PADDING),
              child: Stack(
                children: <Widget>[
                  ListView(),
                  Column(
                    children: [
                      SizedBox(
                        height: getSize(42),
                      ),
                      SizedBox(
                        height: size.height * 0.095,
                        width: size.width,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Align(
                              alignment: Alignment.topLeft,
                              child: GestureDetector(
                                onTap: () => Get.back(),
                                child: Icon(
                                  Icons.arrow_back_ios,
                                  color: ColorConstant.whiteA700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      CustomImageView(
                        imagePath: DummyContent.images[
                            Random().nextInt(DummyContent.images.length)],
                        height: size.height * 0.12,
                        radius: BorderRadius.circular(200),
                        margin: getMargin(bottom: 20),
                      ),
                      MyText(
                        title: "123 Clouds Music",
                        family: 'Manrope',
                        customWeight: FontWeight.w700,
                        fontSize: (20),
                      ),
                      SizedBox(
                        height: getSize(10),
                      ),
                      MyText(
                        title: "User",
                        family: 'Inter',
                        customWeight: FontWeight.w400,
                        fontSize: (16),
                        clr: ColorConstant.white60,
                      ),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => Get.toNamed(Routes.FOLLOW_FOLLOWING),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            Column(
                              children: [
                                MyText(
                                  title: "Followers",
                                  customWeight: FontWeight.w400,
                                  fontSize: (16),
                                  clr: ColorConstant.white60,
                                ),
                                SizedBox(
                                  height: getSize(5),
                                ),
                                MyText(
                                  title: "37",
                                  customWeight: FontWeight.w600,
                                  fontSize: (18),
                                ),
                              ],
                            ),
                            Column(
                              children: [
                                MyText(
                                  title: "Following",
                                  customWeight: FontWeight.w400,
                                  fontSize: (16),
                                  clr: ColorConstant.white60,
                                ),
                                SizedBox(
                                  height: getSize(5),
                                ),
                                MyText(
                                  title: "41k",
                                  customWeight: FontWeight.w600,
                                  fontSize: (18),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        height: getSize(15),
                      ),
                      Obx(() => CustomButton(
                            onTap: () {
                              controller.isFollowing.value =
                                  !controller.isFollowing.value;
                            },
                            text: controller.isFollowing.value
                                ? "Following"
                                : "Follow",
                            variant: controller.isFollowing.value
                                ? ButtonVariant.FillGray300
                                : null,
                            width: 200,
                          )),
                      Obx(() => controller.isFollowing.value
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                MyText(
                                  title: "Bio",
                                  family: 'Manrope',
                                  customWeight: FontWeight.w600,
                                  fontSize: (16),
                                ),
                                SizedBox(
                                  height: getSize(5),
                                ),
                                MyText(
                                  title:
                                      "Dubai event creator who hosts the best DJ sets and parties in the Middle East.",
                                  fontSize: (14),
                                  family: 'Inter',
                                  clr: ColorConstant.white60,
                                ),
                                SizedBox(
                                  height: getSize(5),
                                ),
                                Row(
                                  children: [
                                    MyText(
                                      title: "cloudmusic.com",
                                      family: 'Inter',
                                      clr: ColorConstant.primaryAccent,
                                      fontSize: (15),
                                    ),
                                    Container(
                                      width: 1,
                                      height: 15,
                                      margin: getPadding(left: 15, right: 15),
                                      color: ColorConstant.hairline,
                                    ),
                                    CustomImageView(
                                      imagePath: ImageConstant.twitterClr,
                                      height: 18,
                                      margin: getMargin(right: 10),
                                    ),
                                    CustomImageView(
                                      imagePath: ImageConstant.instaClr,
                                      height: 18,
                                      margin: getMargin(right: 10),
                                    ),
                                    CustomImageView(
                                      imagePath: ImageConstant.fbClr,
                                      height: 18,
                                      margin: getMargin(right: 10),
                                    ),
                                  ],
                                ),
                              ],
                            )
                          : Offstage()),
                      SizedBox(
                        height: getSize(20),
                      ),
                      TabBar(
                        controller: controller.tabController,
                        indicatorColor: ColorConstant.primaryAccent,
                        // Set indicator color
                        indicatorWeight: 3.0,
                        // Set indicator thickness
                        isScrollable: false,
                        indicatorSize: TabBarIndicatorSize.tab,
                        labelColor: ColorConstant.whiteA700,
                        // Set label color
                        unselectedLabelColor: ColorConstant.white60,
                        // Set unselected label color
                        tabs: const [
                          Tab(text: 'Hosted'),
                          Tab(text: 'Attended'),
                        ],
                      ),
                      Expanded(
                        child: TabBarView(
                          controller: controller.tabController,
                          children: [
                            Container(
                              margin: getMargin(top: 20, bottom: 20),
                              height: 200,
                              child: ListView(
                                scrollDirection: Axis.horizontal,
                                children: [
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                ],
                              ),
                            ),
                            Container(
                              margin: getMargin(top: 20, bottom: 20),
                              height: 200,
                              child: ListView(
                                scrollDirection: Axis.horizontal,
                                children: [
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                  Container(
                                      width: 150,
                                      height: 170,
                                      margin: const EdgeInsets.only(right: 12),
                                      decoration: BoxDecoration(
                                          color: ColorConstant.nightSurface,
                                          borderRadius:
                                              BorderRadius.circular(16)),
                                      child: Center(
                                          child: Icon(
                                              Icons.event_available_outlined,
                                              color: ColorConstant.gold))),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        height: getSize(30),
                      ),
                    ],
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
