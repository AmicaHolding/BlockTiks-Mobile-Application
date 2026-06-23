import 'dart:math';

import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';
import '../../../data/core/app_export.dart';
import '../controllers/profile_tab_controller.dart';

class ProfileTabView extends GetView<ProfileTabController> {
  ProfileTabView({Key? key}) : super(key: key);

  final controller = Get.put(ProfileTabController());

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.delayed(
            const Duration(milliseconds: Constants.refreshDelay));
        controller.getMyProfile();
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
                      Colors.black.withOpacity(0.1),
                      Colors.black.withOpacity(0.9),
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
                            color: Colors.black,
                            border: Border.all(color: Colors.black, width: 3))))
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
                              topLeft: Radius.circular(30),
                              topRight: Radius.circular(30),
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
                    SizedBox(height: getSize(42),),
                    SizedBox(
                      height: size.height * 0.095,
                      width: size.width,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Align(
                            alignment: Alignment.bottomRight,
                            child: GestureDetector(
                              onTap: () => Get.toNamed(Routes.PROFILE_SETTINGS),
                              child: Container(
                                margin: getMargin(bottom: 15),
                                child: CustomImageView(
                                  svgPath: ImageConstant.optionProfile,
                                  height: getSize(40),
                                  // width: 30,
                                  fit: BoxFit.fitHeight,
                                ),
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    CustomImageView(
                      imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                      height: size.height * 0.12,
                      radius: BorderRadius.circular(200),
                      margin: getMargin(bottom: 20),
                    ),
                    MyText(
                      title: "123 Clouds Music",
                      customWeight: FontWeight.w600,
                      fontSize: (18),
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    MyText(
                      title: "User",
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
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText(
                              title: "Bio",
                              customWeight: FontWeight.w600,
                              fontSize:(16),
                            ),
                            SizedBox(
                              height: getSize(5),
                            ),
                            MyText(
                              title:
                                  "Dubai event creator who hosts the best DJ sets and parties in the Middle East.",
                              fontSize: (14),
                            ),
                            SizedBox(
                              height: getSize(5),
                            ),
                            Row(
                              children: [
                                MyText(
                                  title: "cloudmusic.com",
                                  clr: ColorConstant.primaryPink.withOpacity(0.8),
                                  fontSize: (15),
                                ),
                                Container(
                                  width: 1,
                                  height: 15,
                                  margin: getPadding(left: 15,right: 15),
                                  color: ColorConstant.dividerColor,
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
                            SizedBox(
                              height: getSize(20),
                            ),
                            TabBar(
                              controller: controller.tabController,
                              indicatorColor: ColorConstant.primaryPink,
                              // Set indicator color
                              indicatorWeight: 3.0,
                              // Set indicator thickness
                              isScrollable: false,
                              indicatorSize: TabBarIndicatorSize.tab,
                              labelColor: Colors.white,
                              // Set label color
                              unselectedLabelColor: ColorConstant.answerColor,
                              // Set unselected label color
                              tabs: Constants.isUserCreator ? const [
                                Tab(text: 'Hosted'),
                                Tab(text: 'Attended'),
                              ]: const [
                                Tab(text: 'Hosted'),
                                // Tab(text: 'Attended'),
                              ],
                            ),
                            SizedBox(
                              height: 230,
                              child: Constants.isUserCreator?
                                TabBarView(
                                physics: const NeverScrollableScrollPhysics(),
                                controller: controller.tabController,
                                children: [
                                  Container(
                                    margin: getMargin(top: 20, bottom: 20),
                                    height: 200,
                                    child: ListView(
                                      scrollDirection: Axis.horizontal,
                                      children: [
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Cyberpunk',
                                          type: "Music Concert",
                                          price: '\$110',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Rock N Roll',
                                          type: "Music Concert",
                                          price: '\$140',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Epic Bass',
                                          type: "Music Concert",
                                          price: '\$60',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    margin: getMargin(top: 20, bottom: 20),
                                    height: 200,
                                    child: ListView(
                                      scrollDirection: Axis.horizontal,
                                      children: [
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Cyberpunk',
                                          type: "Music Concert",
                                          price: '\$110',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Rock N Roll',
                                          type: "Music Concert",
                                          price: '\$140',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Epic Bass',
                                          type: "Music Concert",
                                          price: '\$60',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ):
                                TabBarView(
                                physics: const NeverScrollableScrollPhysics(),
                                controller: controller.tabController,
                                children: [
                                  Container(
                                    margin: getMargin(top: 20, bottom: 20),
                                    height: 200,
                                    child: ListView(
                                      scrollDirection: Axis.horizontal,
                                      children: [
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Cyberpunk',
                                          type: "Music Concert",
                                          price: '\$110',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Rock N Roll',
                                          type: "Music Concert",
                                          price: '\$140',
                                          // fromMarketPlace: fromMarketPlace,
                                        ),
                                        TrendingCard(
                                          imageUrl: ImageConstant.splashBg,
                                          // Replace with your image URL
                                          title: 'Epic Bass',
                                          type: "Music Concert",
                                          price: '\$60',
                                          // fromMarketPlace: fromMarketPlace,
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
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
