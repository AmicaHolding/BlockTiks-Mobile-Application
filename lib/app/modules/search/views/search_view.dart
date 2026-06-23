import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:block_tix/app/modules/search/controllers/search_controller.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class SearchView extends GetView<MySearchController> {
  const SearchView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseviewScreen(
      showLogo: true,
      showBackBtn: true,
      sidePadding: false,
      showBottomBar: false,
      child: Padding(
        padding: getPadding(left: 16, right: 16, bottom: 20),
        child: Column(
          children: [
            Container(
              padding: getPadding(left: 16, right: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Stack(
                children: [
                  TextField(
                    style: GoogleFonts.getFont("Inter",
                        fontSize: 16, color: ColorConstant.whiteA700),
                    onChanged: (String val) {
                      if (val.isEmpty) {
                        controller.isEmpty.value = true;
                      } else {
                        controller.isEmpty.value = false;
                      }
                    },
                    decoration: InputDecoration(
                      contentPadding: getPadding(
                        right: 30,
                      ),
                      icon: CustomImageView(
                        svgPath: ImageConstant.search,
                      ),
                      hintText: 'Search',
                      hintStyle: const TextStyle(color: Colors.white70),
                      border: InputBorder.none,
                    ),
                  ),
                  Positioned(
                      right: 0,
                      top: 12,
                      child: CustomImageView(
                        onTap: ()=> controller.showFilterDialog(context),
                        svgPath: ImageConstant.filter,
                        height: 24,
                      )),
                ],
              ),
            ),
            Expanded(
              child: Obx(() => controller.isEmpty.value
                  ? SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(
                            height: 20,
                          ),
                          const MyText(
                            title: "Popular Search",
                            fontSize: 18,
                            customWeight: FontWeight.bold,
                          ),
                          Container(
                            margin: getMargin(top: 15),
                            height: getSize(40),
                            child: ListView.builder(
                                itemCount: controller.latestSearches.length,
                                scrollDirection: Axis.horizontal,
                                itemBuilder: (_, index) {
                                  return Container(
                                      padding: getPadding(
                                          left: 10,
                                          right: 10,
                                          top: 5,
                                          bottom: 5),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(5),
                                      ),
                                      margin: getMargin(right: 10),
                                      alignment: Alignment.center,
                                      child: MyText(
                                        title: controller.latestSearches[index],
                                      ));
                                }),
                          ),
                          const SizedBox(
                            height: 20,
                          ),
                          const MyText(
                            title: "Recent Search",
                            fontSize: 18,
                            customWeight: FontWeight.bold,
                          ),
                          ListView.builder(
                              itemCount: controller.events.length,
                              scrollDirection: Axis.vertical,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemBuilder: (_, index) {
                                return BidWidget(
                                  title: controller.events[index],
                                  type: "Pak Event Organizers",
                                  date: "Islamabad | ${DateFormat("dd MMM yyy").format(DateTime.now())}",
                                  fromSearch: true,
                                  onTap: () => Get.toNamed(Routes.EVENT_DETAIL),
                                );
                              }),
                        ],
                      ),
                    )
                  : Column(
                      children: [
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
                          tabs: [
                            Tab(text: controller.tabs[0]),
                            Tab(text: controller.tabs[1]),
                          ],
                        ),
                        Expanded(
                          child: Container(
                            margin: getMargin(top: 16, bottom: 16),
                            child: TabBarView(
                              physics: const NeverScrollableScrollPhysics(),
                              controller: controller.tabController,
                              children: [
                                Column(
                                  children: [
                                    Row(
                                      children: [
                                        const Spacer(),
                                        Container(
                                          width: 60,
                                          margin: getMargin(right: 15),
                                          alignment: Alignment.center,
                                          child: MyText(
                                            title: "Store",
                                            fontSize: 12,
                                            clr: ColorConstant.white60,
                                          ),
                                        ),
                                        Container(
                                          width: 60,
                                          alignment: Alignment.center,
                                          child: MyText(
                                            title: "Market",
                                            fontSize: 12,
                                            clr: ColorConstant.white60,
                                          ),
                                        )
                                      ],
                                    ),
                                    SizedBox(
                                      height: getSize(10),
                                    ),
                                    ListView.builder(
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      shrinkWrap: true,
                                      itemCount: controller.events.length,
                                      scrollDirection: Axis.vertical,
                                      padding: EdgeInsets.zero,
                                      itemBuilder: (context, index) {
                                        return GestureDetector(
                                          onTap: () {
                                            Get.toNamed(Routes.PLACE_BID);
                                          },
                                          child: Container(
                                            margin: getMargin(bottom: 10),
                                            decoration: BoxDecoration(
                                                color: ColorConstant.gray50
                                                    .withOpacity(0.05),
                                                borderRadius:
                                                    BorderRadius.circular(10)),
                                            child: Row(
                                              children: [
                                                Container(
                                                  margin: getPadding(
                                                      left: 15,
                                                      right: 15,
                                                      top: 10,
                                                      bottom: 10),
                                                  width: 40,
                                                  height: 40,
                                                  child: CustomImageView(
                                                    imagePath:
                                                        ImageConstant.splashBg,
                                                    width: 40,
                                                    height: 40,
                                                    radius:
                                                        BorderRadius.circular(
                                                            5),
                                                  ),
                                                ),
                                                const SizedBox(
                                                  width: 10,
                                                ),
                                                MyText(
                                                  title:
                                                      controller.events[index],
                                                  fontSize: 16,
                                                ),
                                                const SizedBox(
                                                  width: 10,
                                                ),
                                                const Spacer(),
                                                Container(
                                                  width: 60,
                                                  height: 60,
                                                  margin: getMargin(right: 15),
                                                  alignment: Alignment.center,
                                                  decoration: BoxDecoration(
                                                      color: ColorConstant.whiteA700.withOpacity(0.05),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              10)),
                                                  child: MyText(
                                                    title:
                                                        "${Random().nextInt(1000)}",
                                                    fontSize: 16,
                                                  ),
                                                ),
                                                Container(
                                                  width: 60,
                                                  height: 60,
                                                  alignment: Alignment.center,
                                                  decoration: BoxDecoration(
                                                      color: ColorConstant.whiteA700.withOpacity(0.05),
                                                      borderRadius: BorderRadius.circular(10)),
                                                  child: MyText(
                                                    title:
                                                        "${Random().nextInt(1000)}",
                                                    fontSize: 16,
                                                  ),
                                                )
                                              ],
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                                ListView.builder(
                                  physics: const NeverScrollableScrollPhysics(),
                                  shrinkWrap: true,
                                  itemCount: 3,
                                  scrollDirection: Axis.vertical,
                                  padding: EdgeInsets.zero,
                                  itemBuilder: (context, index) {
                                    return GestureDetector(
                                      onTap: () {
                                        Get.toNamed(Routes.OTHER_USER_PROFILE);
                                      },
                                      child: Container(
                                        padding: getPadding(
                                            left: 15,
                                            right: 15,
                                            top: 10,
                                            bottom: 10),
                                        margin: getMargin(bottom: 15),
                                        decoration: BoxDecoration(
                                            color: ColorConstant.gray50
                                                .withOpacity(0.05),
                                            borderRadius:
                                                BorderRadius.circular(10)),
                                        child: Row(
                                          children: [
                                            SizedBox(
                                              width: 30,
                                              height: 30,
                                              child: CustomImageView(
                                                imagePath:
                                                DummyContent.images[Random().nextInt(DummyContent.images.length)],
                                                width: 30,
                                                height: 30,
                                                radius:
                                                    BorderRadius.circular(5),
                                              ),
                                            ),
                                            const SizedBox(
                                              width: 15,
                                            ),
                                            MyText(
                                              title: "Name $index",
                                              fontSize: 20,
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )),
            ),
          ],
        ),
      ),
    );
  }
}
