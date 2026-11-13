import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/creator_search_controller.dart';

class CreatorSearchView extends GetView<CreatorSearchController> {
  const CreatorSearchView({Key? key}) : super(key: key);
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
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Stack(
                children: [
                  TextField(
                    controller: controller.searchController,
                    style: GoogleFonts.getFont("Inter",
                        fontSize: 16, color: ColorConstant.whiteA700),
                    onChanged: controller.onSearchChanged,
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
                        // onTap: ()=> controller.showFilterDialog(context),
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
                      title: "Upcoming Events",
                      fontSize: 18,
                      customWeight: FontWeight.bold,
                    ),
                    Obx(() {
                      if (controller.suggestions.isEmpty) {
                        return Padding(
                          padding: getPadding(top: 16),
                          child: MyText(
                            title: "No events found",
                            clr: ColorConstant.white60,
                            fontSize: 14,
                          ),
                        );
                      }
                      return ListView.builder(
                        itemCount: controller.suggestions.length,
                        scrollDirection: Axis.vertical,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (_, index) {
                          final event = controller.suggestions[index];
                          return BidWidget(
                            title: (event['title'] ?? 'Untitled Event').toString(),
                            type: CreatorSearchController.eventSubtitle(event),
                            date: CreatorSearchController.eventSubtitle(event),
                            fromSearch: true,
                            onTap: () => Get.toNamed(Routes.EVENT_DETAIL,
                                arguments: {
                                  'id': event['id']?.toString(),
                                  'title': event['title']?.toString(),
                                }),
                          );
                        });
                    }),
                  ],
                ),
              )
                  :  Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: getSize(20),),
                  const MyText(
                    title: "Events",
                    fontSize: 18,
                    customWeight: FontWeight.bold,
                  ),
                  SizedBox(height: getSize(20),),
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
                  Obx(() {
                    if (controller.isSearching.value) {
                      return const Padding(
                        padding: EdgeInsets.all(30),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (controller.results.isEmpty) {
                      return Padding(
                        padding: getPadding(top: 20, bottom: 20),
                        child: MyText(
                          title: "No events found",
                          clr: ColorConstant.white60,
                          fontSize: 14,
                        ),
                      );
                    }
                    return ListView.builder(
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                      itemCount: controller.results.length,
                      scrollDirection: Axis.vertical,
                      padding: EdgeInsets.zero,
                      itemBuilder: (context, index) {
                        final event = controller.results[index];
                        return GestureDetector(
                          onTap: () {
                            Get.toNamed(Routes.EVENT_DETAIL,
                                arguments: {
                                  'id': event['id']?.toString(),
                                  'title': event['title']?.toString(),
                                });
                          },
                          child: Container(
                            margin: getMargin(bottom: 10),
                            decoration: BoxDecoration(
                                color: ColorConstant.surface,
                                borderRadius:
                                BorderRadius.circular(16)),
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
                                    url: event['imageUrl']?.toString() ?? '',
                                    imagePath: event['imageUrl'] == null ||
                                            (event['imageUrl']?.toString() ?? '')
                                                .isEmpty
                                        ? ImageConstant.splashBg
                                        : null,
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
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      MyText(
                                        title: (event['title'] ??
                                                'Untitled Event')
                                            .toString(),
                                        fontSize: 16,
                                      ),
                                      MyText(
                                        title:
                                            CreatorSearchController.eventSubtitle(
                                                event),
                                        fontSize: 12,
                                        clr: ColorConstant.white60,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  }),
                ],
              ),
                // ListView.builder(
                //   physics: const NeverScrollableScrollPhysics(),
                //   shrinkWrap: true,
                //   itemCount: 3,
                //   scrollDirection: Axis.vertical,
                //   padding: EdgeInsets.zero,
                //   itemBuilder: (context, index) {
                //     return GestureDetector(
                //       onTap: () {
                //         Get.toNamed(Routes.OTHER_USER_PROFILE);
                //       },
                //       child: Container(
                //         padding: getPadding(
                //             left: 15,
                //             right: 15,
                //             top: 10,
                //             bottom: 10),
                //         margin: getMargin(bottom: 15),
                //         decoration: BoxDecoration(
                //             color: ColorConstant.gray50
                //                 .withValues(alpha: 0.05),
                //             borderRadius:
                //             BorderRadius.circular(10)),
                //         child: Row(
                //           children: [
                //             SizedBox(
                //               width: 30,
                //               height: 30,
                //               child: CustomImageView(
                //                 imagePath:
                //                 DummyContent.images[Random().nextInt(DummyContent.images.length)],
                //                 width: 30,
                //                 height: 30,
                //                 radius:
                //                 BorderRadius.circular(5),
                //               ),
                //             ),
                //             const SizedBox(
                //               width: 15,
                //             ),
                //             MyText(
                //               title: "Name $index",
                //               fontSize: 20,
                //             ),
                //           ],
                //         ),
                //       ),
                //     );
                //   },
                // ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
