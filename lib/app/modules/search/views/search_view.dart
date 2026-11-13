import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:block_tix/app/modules/search/controllers/search_controller.dart';
import 'package:google_fonts/google_fonts.dart';

class SearchView extends GetView<MySearchController> {
  const SearchView({Key? key, this.embedded = false}) : super(key: key);

  /// When true the view renders without its own scaffold/app bar so it can
  /// live inside the fan dashboard's Search tab.
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
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
                    onChanged: (String val) {
                      controller.onSearchChanged(val);
                    },
                    decoration: InputDecoration(
                      contentPadding: getPadding(
                        right: 30,
                      ),
                      icon: CustomImageView(
                        svgPath: ImageConstant.search,
                      ),
                      hintText: 'Search',
                      hintStyle: TextStyle(color: ColorConstant.white60),
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
                            family: 'Manrope',
                            fontSize: 18,
                            customWeight: FontWeight.w700,
                          ),
                          Container(
                            margin: getMargin(top: 15),
                            height: getSize(40),
                            child: ListView.builder(
                                itemCount: controller.latestSearches.length,
                                scrollDirection: Axis.horizontal,
                                itemBuilder: (_, index) {
                                  return GestureDetector(
                                    onTap: () => controller
                                        .applyPopularSearch(controller
                                            .latestSearches[index]),
                                    child: Container(
                                        padding: getPadding(
                                            left: 14,
                                            right: 14,
                                            top: 6,
                                            bottom: 6),
                                        decoration: BoxDecoration(
                                          color: ColorConstant.elevated,
                                          borderRadius:
                                              BorderRadius.circular(999),
                                        ),
                                        margin: getMargin(right: 10),
                                        alignment: Alignment.center,
                                        child: MyText(
                                          title: controller.latestSearches[index],
                                          family: 'Inter',
                                          fontSize: 13,
                                          clr: ColorConstant.white60,
                                        )));
                                }),
                          ),
                          const SizedBox(
                            height: 20,
                          ),
                          const MyText(
                            title: "Recent Search",
                            family: 'Manrope',
                            fontSize: 18,
                            customWeight: FontWeight.w700,
                          ),
                          Obx(() {
                            if (controller.recentEvents.isEmpty) {
                              return Padding(
                                padding: getPadding(top: 16, bottom: 8),
                                child: MyText(
                                  title: 'No events yet',
                                  family: 'Inter',
                                  fontSize: 13,
                                  clr: ColorConstant.white60,
                                ),
                              );
                            }
                            return ListView.builder(
                                itemCount: controller.recentEvents.length,
                                scrollDirection: Axis.vertical,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemBuilder: (_, index) {
                                  final e = controller.recentEvents[index];
                                  return BidWidget(
                                    title: e['title']?.toString() ?? 'Event',
                                    type: e['category']?.toString().isNotEmpty == true
                                        ? e['category'].toString()
                                        : 'Event',
                                    date: formatEventDate(
                                        e['startsAt']?.toString()),
                                    fromSearch: true,
                                    onTap: () => Get.toNamed(Routes.EVENT_DETAIL,
                                        arguments: {
                                          'id': e['id']?.toString() ?? '',
                                          'title': e['title']?.toString() ?? '',
                                        }),
                                  );
                                });
                          }),
                        ],
                      ),
                    )
                  : Column(
                      children: [
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
                                    Obx(() {
                                      if (controller.searchLoading.value) {
                                        return Padding(
                                          padding: getPadding(top: 40),
                                          child: Center(
                                            child: SizedBox(
                                              height: 28,
                                              width: 28,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2.5,
                                                color: ColorConstant
                                                    .primaryAccent,
                                              ),
                                            ),
                                          ),
                                        );
                                      }
                                      if (controller.searchError.value !=
                                          null) {
                                        return Padding(
                                          padding: getPadding(top: 40),
                                          child: Center(
                                            child: MyText(
                                              title: controller
                                                      .searchError.value ??
                                                  "Couldn't search events",
                                              family: 'Inter',
                                              fontSize: 13,
                                              clr: ColorConstant.white60,
                                            ),
                                          ),
                                        );
                                      }
                                      if (controller.searchResults.isEmpty) {
                                        return Padding(
                                          padding: getPadding(top: 40),
                                          child: Center(
                                            child: Text(
                                              'No events found',
                                              style: AppStyle.bodySmallInter,
                                            ),
                                          ),
                                        );
                                      }
                                      return ListView.builder(
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        shrinkWrap: true,
                                        itemCount:
                                            controller.searchResults.length,
                                        scrollDirection: Axis.vertical,
                                        padding: EdgeInsets.zero,
                                        itemBuilder: (context, index) {
                                          final e = controller
                                              .searchResults[index];
                                          final price =
                                              lowestTierPrice(e);
                                          final imageUrl = eventImageUrl(e);
                                          return GestureDetector(
                                            onTap: () {
                                              Get.toNamed(
                                                  Routes.EVENT_DETAIL,
                                                  arguments: {
                                                    'id': e['id']
                                                            ?.toString() ??
                                                        '',
                                                    'title': e['title']
                                                            ?.toString() ??
                                                        '',
                                                  });
                                            },
                                            child: Container(
                                              margin: getMargin(bottom: 10),
                                              decoration: BoxDecoration(
                                                  color: ColorConstant
                                                      .elevated,
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          16)),
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
                                                      url: imageUrl,
                                                      imagePath:
                                                          imageUrl == null
                                                              ? ImageConstant
                                                                  .splashBg
                                                              : null,
                                                      width: 40,
                                                      height: 40,
                                                      radius:
                                                          BorderRadius.circular(
                                                              12),
                                                    ),
                                                  ),
                                                  const SizedBox(
                                                    width: 10,
                                                  ),
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      children: [
                                                        MyText(
                                                          title: e['title']
                                                                  ?.toString() ??
                                                              'Event',
                                                          family: 'Manrope',
                                                          customWeight:
                                                              FontWeight.w600,
                                                          fontSize: 15,
                                                        ),
                                                        MyText(
                                                          title:
                                                              '${e['category']?.toString().isNotEmpty == true ? e['category'] : 'Event'} · ${formatEventDate(e['startsAt']?.toString())}',
                                                          family: 'Inter',
                                                          fontSize: 11,
                                                          clr: ColorConstant
                                                              .white60,
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(
                                                    width: 10,
                                                  ),
                                                  Container(
                                                    width: 60,
                                                    height: 60,
                                                    margin:
                                                        getMargin(right: 15),
                                                    alignment:
                                                        Alignment.center,
                                                    decoration: BoxDecoration(
                                                        color: ColorConstant
                                                            .surface,
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                                10)),
                                                    child: MyText(
                                                      title: price == null
                                                          ? '—'
                                                          : formatDollars(
                                                              price),
                                                      fontSize: 14,
                                                      family: 'Inter',
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          );
                                        });
                                      }),
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
                                            color: ColorConstant.elevated,
                                            borderRadius:
                                                BorderRadius.circular(16)),
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
                                                    BorderRadius.circular(20),
                                              ),
                                            ),
                                            const SizedBox(
                                              width: 15,
                                            ),
                                            MyText(
                                              title: "Name $index",
                                              family: 'Manrope',
                                              customWeight: FontWeight.w600,
                                              fontSize: 15,
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
      );

    if (embedded) return content;
    return BaseviewScreen(
      showLogo: true,
      showBackBtn: true,
      sidePadding: false,
      showBottomBar: false,
      child: content,
    );
  }
}
