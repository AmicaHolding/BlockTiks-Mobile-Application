import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/constants.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:get/get.dart';

import '../controllers/creator_home_tab_controller.dart';

class CreatorHomeTabView extends StatelessWidget {
  CreatorHomeTabView({Key? key}) : super(key: key);

  final CreatorHomeTabController controller = Get.put(CreatorHomeTabController());
  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: controller.loadEvents,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            Padding(
              padding: getPadding(all: 16),
              child: SearchField(
                onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
                readOnly: true,
              ),
            ),
            CustomButton(
              // Door mode: event creation/editing hands off to Sahra Studio.
              onTap: () => WebHandoffSheet.show(feature: 'Creating events'),
              text: '+ Create new event',
              margin: getMargin(left: 16,right: 16),
            ),

            const SizedBox(height: 20),
            Obx(() {
              if (controller.isLoading.value) {
                return const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (controller.loadError.value != null) {
                return Padding(
                  padding: getPadding(all: 24),
                  child: Column(
                    children: [
                      MyText(
                        title: "Couldn't load your events",
                        clr: ColorConstant.whiteA700,
                        fontSize: 16,
                        customWeight: FontWeight.w600,
                      ),
                      SizedBox(height: getSize(8)),
                      MyText(
                        title: controller.loadError.value ?? '',
                        clr: ColorConstant.white60,
                        fontSize: 12,
                        line: 3,
                      ),
                      SizedBox(height: getSize(15)),
                      CustomButton(
                        text: "Retry",
                        width: getSize(140),
                        onTap: controller.loadEvents,
                      ),
                    ],
                  ),
                );
              }
              return Column(
                children: [
                  _upcomingSection(context),
                  _pastSection(context),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _upcomingSection(BuildContext context) {
    final upcoming = controller.upcomingEvents;
    return Padding(
      padding: getPadding(left: 16, right: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MyText(
            title: "Upcoming Events",
            clr: Colors.white,
            fontSize: 20,
            customWeight: FontWeight.bold,
          ),
          const SizedBox(height: 16),
          upcoming.isEmpty
              ? Padding(
                  padding: getPadding(bottom: 20),
                  child: MyText(
                    title: "No upcoming events",
                    clr: ColorConstant.white60,
                    fontSize: 14,
                  ),
                )
              : SizedBox(
                  height: 200,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: upcoming.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, index) =>
                        _upcomingEventCard(context, upcoming[index]),
                  ),
                ),
        ],
      ),
    );
  }

  Widget _pastSection(BuildContext context) {
    final past = controller.pastEvents;
    return Padding(
      padding: getPadding(all: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MyText(
            title: "Past Events",
            clr: Colors.white,
            fontSize: 20,
            customWeight: FontWeight.bold,
          ),
          SizedBox(
            height: getSize(15),
          ),
          past.isEmpty
              ? MyText(
                  title: "No past events yet",
                  clr: ColorConstant.white60,
                  fontSize: 14,
                )
              : Column(
                  children: past
                      .map((e) => BidWidget(
                            title: (e['title'] ?? 'Untitled Event').toString(),
                            date:
                                "${CreatorHomeTabController.statusLabel(e)} • ${CreatorHomeTabController.formatEventDate(e)}",
                            fromCreator: true,
                            onTap: () => Get.toNamed(
                              Routes.CREATOR_EVENT,
                              arguments: {
                                'id': e['id']?.toString(),
                                'title': e['title']?.toString(),
                              },
                            ),
                            onOptionsTap: () {
                              controller.showSheet(context);
                            },
                          ))
                      .toList(),
                ),
        ],
      ),
    );
  }

  Widget _upcomingEventCard(BuildContext context, Map<String, dynamic> event) {
    final imageUrl = event['imageUrl']?.toString() ?? '';
    final startsAt = CreatorHomeTabController.eventStartsAt(event);
    final status = CreatorHomeTabController.statusLabel(event);
    final isDraft = status == 'DRAFT';
    return GestureDetector(
      onTap: () => Get.toNamed(
        Routes.CREATOR_EVENT,
        arguments: {
          'id': event['id']?.toString(),
          'title': event['title']?.toString(),
        },
      ),
      child: SizedBox(
        width: getSize(150),
        height: 200,
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(getSize(12)),
              child: imageUrl.isNotEmpty
                  ? CustomImageView(
                      url: imageUrl,
                      fit: BoxFit.cover,
                      width: getSize(150),
                      height: 200,
                    )
                  : CustomImageView(
                      imagePath: ImageConstant.splashBg,
                      fit: BoxFit.cover,
                      width: getSize(150),
                      height: 200,
                    ),
            ),
            // Bottom scrim so overlay text stays legible.
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: getSize(90),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(getSize(12)),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      ColorConstant.canvas.withValues(alpha: 0.85),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: getSize(10),
              left: getSize(8),
              right: getSize(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: (event['category'] ?? 'Event').toString(),
                    clr: ColorConstant.white60,
                    fontSize: 10,
                  ),
                  SizedBox(height: getSize(4)),
                  SizedBox(
                    width: getSize(120),
                    child: MyText(
                      title: (event['title'] ?? 'Untitled Event').toString(),
                      family: 'Manrope',
                      customWeight: FontWeight.w600,
                      clr: ColorConstant.whiteA700,
                      fontSize: 13,
                    ),
                  ),
                  SizedBox(height: getSize(4)),
                  Row(
                    children: [
                      if (startsAt != null)
                        Container(
                          height: getSize(20),
                          padding: getPadding(left: 8, right: 8),
                          decoration: BoxDecoration(
                            color: ColorConstant.elevated,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: MyText(
                              title: DateFormat('MM/dd').format(startsAt),
                              family: 'Manrope',
                              customWeight: FontWeight.w600,
                              clr: ColorConstant.whiteA700,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      SizedBox(width: getSize(6)),
                      Container(
                        padding: getPadding(left: 8, right: 8, top: 2, bottom: 2),
                        decoration: BoxDecoration(
                          color: isDraft
                              ? ColorConstant.orangeA200.withValues(alpha: 0.2)
                              : ColorConstant.successGreen.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: MyText(
                          title: status,
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          clr: isDraft
                              ? ColorConstant.orangeA200
                              : ColorConstant.successGreen,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Positioned(
              right: 0,
              bottom: 20,
              child: CustomImageView(
                onTap: () => controller.showUpcomingEventSheet(context),
                svgPath: ImageConstant.options,
                height: 15,
                width: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
