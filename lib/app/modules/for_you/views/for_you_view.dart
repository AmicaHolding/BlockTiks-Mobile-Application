import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import '../controllers/for_you_controller.dart';

class ForYouView extends StatelessWidget {
  final ForYouController controller = Get.put(ForYouController());
  final UserDashboardController userDashboardController = Get.put(UserDashboardController());

  ForYouView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
              child: Column(
    children: [
      SizedBox(
        height: getSize(450),
        child: Stack(
          children: [
            CarouselSlider(
              options: CarouselOptions(
                height: getSize(420),
                autoPlay: true,
                enlargeCenterPage: false,
                viewportFraction: 1,
                // p,
                aspectRatio: MediaQuery.of(context).size.aspectRatio,
                initialPage: 0,
                onPageChanged: (index, reason) {
                  controller.currentImage.value = index;
                },
              ),
              items: controller.imageList.map((imageUrl) {
                return Container(
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage(imageUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                );
              }).toList(),
            ),
            Column(
              children: [
                SizedBox(height: getSize(58),),
                Padding(
                  padding: const EdgeInsets.only(
                      top: 10.0,
                      left: 25,
                      right: 16,
                      bottom: 10),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        mainAxisSize: MainAxisSize.max,
                        children: [
                          Container(),
                          Expanded(
                            flex: 1,
                            child: CustomImageView(
                              imagePath:
                              ImageConstant.logo,
                              height: getSize(Constants.appbarIconSize),
                              fit: BoxFit.fitHeight,
                            )
                          ),
                          Obx(
                                () => Stack(
                              children: [
                                CustomImageView(
                                  svgPath: ImageConstant
                                      .notificationBellIcon,
                                  height: getVerticalSize(23),
                                  onTap: () {
                                    Get.toNamed(Routes
                                        .NOTIFICATIONS_PAGE)!
                                        .then((value) {
                                      //userDashboardController.notificationUnreadCount.value = 0;
                                      // userDashboardController
                                      //     .fetchNotifications();
                                    });
                                    // CustomToast().showToast("in_progress".tr,false,context);
                                  },
                                ),
                                userDashboardController
                                    .notificationUnreadCount
                                    .value !=
                                    0
                                    ? Container(
                                  margin: const EdgeInsets
                                      .only(left: 7),
                                  height: 17,
                                  width: 17,
                                  decoration: BoxDecoration(
                                      borderRadius:
                                      BorderRadius
                                          .circular(
                                          100),
                                      color: ColorConstant
                                          .orangeA200),
                                  child: Center(
                                    child: Text(
                                      "${userDashboardController.notificationUnreadCount.value > 9 ? "9+" : userDashboardController.notificationUnreadCount.value}",
                                      style: AppStyle
                                          .txtAgeoMedium10BlackA500,
                                      textAlign: TextAlign
                                          .center,
                                    ),
                                  ),
                                )
                                    : const SizedBox.shrink()
                              ],
                            ),
                          )
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: getPadding(all: 16),
                  child: SearchField(
                    onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
                    readOnly: true,
                  ),
                ),
              ],
            ),
            Positioned(
              bottom: 0,
              left: 16,
              right: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const MyText(
                    title: 'Music Concert',
                    clr: Colors.white60,
                    fontSize: 14,
                  ),
                  const SizedBox(height: 8),
                  const MyText(
                    title: 'DJ MaksMellow Orignawa',
                    clr: Colors.white,
                    fontSize: 24,
                    customWeight: FontWeight.bold,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      RichText(
                          text: TextSpan(children: [
                            TextSpan(
                                text: "\$450   ".tr,
                                style: AppStyle.whiteInterBold18),
                            TextSpan(
                                text: "/person".tr,
                                style: AppStyle.white60InterNormal14),
                          ]),
                          textAlign: TextAlign.left),
                      SizedBox(
                        width: 100,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: controller.imageList
                              .asMap()
                              .entries
                              .map((entry) {
                            return GestureDetector(
                              onTap: () => controller.goToSlide(entry.key),
                              child: Obx(() => Container(
                                width: 8.0,
                                height: 8.0,
                                margin: const EdgeInsets.symmetric(
                                    vertical: 3.0, horizontal: 4.0),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: controller.currentImage.value ==
                                      entry.key
                                      ? Colors.purpleAccent
                                      : Colors.grey,
                                ),
                              )),
                            );
                          }).toList(),
                        ),
                      ),
                      MyText(
                        title: "April 20, 2024".tr,
                        clr: ColorConstant.white60,
                        fontSize: getFontSize(
                          14,
                        ),
                        customWeight: FontWeight.w400,
                      )
                    ],
                  ),
                  SizedBox(
                    height: getSize(10),
                  ),
                  CustomButton(
                    onTap: () {
                      Get.toNamed(Routes.EVENT_DETAIL);
                    },
                    text: 'Event Details',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      const SizedBox(height: 16),
      const CustomListView(title: "Trending",showDate: true,),
      const CustomListView(title: "Sporting",showDate: true),
      const CustomListView(title: "Concerts",showDate: true),
    ],
              ),
            );
  }
}

class CustomListView extends StatelessWidget {
  final String title;
  final bool fromMarketPlace;
  final bool showDate;
  final bool showPrice;
  final bool showOptions;
  final void Function()? onTap;
  final void Function()? onOptionsTap;

  const CustomListView(
      {super.key, required this.title, this.fromMarketPlace = false,this.onTap,this.showDate = false,this.showPrice = true, this.showOptions = false,this.onOptionsTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: getPadding(
          left: fromMarketPlace ? 0 : 16, right: fromMarketPlace ? 0 : 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MyText(
            title: title,
            clr: Colors.white,
            fontSize: getFontSize(16),
            customWeight: FontWeight.bold,
          ),
          const SizedBox(height: 16),
          SizedBox(
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
                  fromMarketPlace: fromMarketPlace,
                  onTap: onTap,
                  showDate: showDate,
                  showPrice: showPrice,
                  showOptions: showOptions,
                  onOptionsTap: onOptionsTap,
                ),
                TrendingCard(
                  imageUrl: ImageConstant.splashBg,
                  // Replace with your image URL
                  title: 'Rock N Roll',
                  type: "Music Concert",
                  price: '\$140',
                  fromMarketPlace: fromMarketPlace,
                  onTap: onTap,
                  showDate: showDate,
                  showPrice: showPrice,
                  showOptions: showOptions,
                  onOptionsTap: onOptionsTap,
                ),
                TrendingCard(
                  imageUrl: ImageConstant.splashBg,
                  // Replace with your image URL
                  title: 'Epic Bass',
                  type: "Music Concert",
                  price: '\$60',
                  fromMarketPlace: fromMarketPlace,
                  isLast: true,
                  onTap: onTap,
                  showDate: showDate,
                  showPrice: showPrice,
                  showOptions: showOptions,
                  onOptionsTap: onOptionsTap,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class TrendingCard extends StatelessWidget {
  final String imageUrl;
  final String title;
  final String type;
  final String price;
  final bool fromMarketPlace;
  final bool isExpanded;
  final bool isLast;
  final bool showDate;
  final bool showPrice;
  final bool showOptions;
  final void Function()? onTap;
  final void Function()? onOptionsTap;

  TrendingCard(
      {super.key,
      required this.imageUrl,
      required this.title,
      required this.type,
      required this.price,
        this.onTap,
        this.onOptionsTap,
      this.fromMarketPlace = false,
      this.showDate = false,
      this.isLast = false,
      this.showPrice = true,
      this.showOptions = false,
      this.isExpanded = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: (){
        if(onTap == null){
          Get.toNamed(Routes.UPCOMING_EVENT);
        }else{
          onTap!();
        }
      },
      child: Padding(
        padding: isLast ? getPadding(right: 0): getPadding(right: fromMarketPlace ? 15 : 10),
        child: SizedBox(
          width: getSize(fromMarketPlace ? 160 : 150),
          child: Stack(
            children: [
              Container(
                width: isExpanded ? size.width : getSize(150),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(getSize(10)),
                  image: DecorationImage(
                    image: AssetImage(imageUrl),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      bottom: getSize(8),
                      left: getSize(8),
                      right: getSize(showOptions ? 20 : 0),
                      child: Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              showPrice ? MyText(
                                title: price,
                                clr: ColorConstant.whiteA700,
                                fontSize: (14),
                              ): Offstage(),
                              SizedBox(height: getSize(4)),
                              MyText(
                                title: type,
                                clr: ColorConstant.white60,
                                fontSize: (10),
                              ),
                              SizedBox(height: getSize(4)),
                              Container(
                                width: getSize(120),
                                child: MyText(
                                  title: title,
                                  clr: Colors.white,
                                  fontSize: 14,
                                  customWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  ],
                ),
              ),
              showOptions ? Positioned(
                right: 0,
                  bottom: 20,
                  child: CustomImageView(
                onTap: onOptionsTap,
                svgPath: ImageConstant.options,
                height: 15,
                width: 15,
              )): Offstage(),
              fromMarketPlace
                  ? Positioned(
                top: 5,
                right: 0,
                child: Container(
                  width: getSize(35),
                  height: getSize(35),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: ColorConstant.bg,
                    border: Border.all(
                        color: ColorConstant.primaryPink, width: 3),
                  ),
                  child: Center(
                    child: MyText(
                      title: "${Random().nextInt(100)}",
                        clr: Colors.white,
                        fontSize: 16,
                        customWeight: FontWeight.bold,
                    ),
                  ),
                ),
              )
                  : const Offstage(),
              showDate && !fromMarketPlace
                  ? Positioned(
                top: 5,
                right: 5,
                child: Container(
                  // width: getSize(35),
                  height: getSize(35),
                  decoration: BoxDecoration(
                    // shape: BoxShape.circle,
                    color: ColorConstant.white60.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: getPadding(left: 10,right: 10),
                  child: const Center(
                    child: MyText(
                      title: "07/28",
                        clr: Colors.white,
                        fontSize: 16,
                        customWeight: FontWeight.bold,
                    ),
                  ),
                ),
              )
                  : const Offstage(),
            ],
          ),
        ),
      ),
    );
  }
}
