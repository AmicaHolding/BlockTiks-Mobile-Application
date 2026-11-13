import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/upcoming_event_controller.dart';

class UpcomingEventView extends GetView<UpcomingEventController> {
  const UpcomingEventView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: false,
      showNotification: true,
      bottomNavigationBar: SafeArea(
        child: PrimaryPillButton(
          text: "Remind me".tr,
          prefixWidget: Icon(
            Icons.calendar_month,
            color: ColorConstant.canvas,
            size: 20,
          ),
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          onTap: () {
            Get.toNamed(Routes.REMIND_ME);
          },
        ),
      ),
      child: Obx(() {
        if (controller.isLoading.value && !controller.hasEvent) {
          return const Center(child: CircularProgressIndicator());
        }
        if (controller.loadError.value != null && !controller.hasEvent) {
          return Center(
            child: Padding(
              padding: getPadding(all: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  MyText(
                    title: "Couldn't load event",
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                  const SizedBox(height: 8),
                  MyText(
                    title: controller.loadError.value ?? '',
                    family: 'Inter',
                    fontSize: 13,
                    clr: ColorConstant.white60,
                    center: true,
                  ),
                  const SizedBox(height: 16),
                  PrimaryPillButton(
                    text: 'Retry',
                    onTap: () => controller.fetchEvent(),
                  ),
                ],
              ),
            ),
          );
        }
        return SingleChildScrollView(
        child: Column(
          children: [
            const StageViewScreen(height: 380,showCircles: false,),
            Padding(
              padding: getPadding(all: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      MyText(
                        title: controller.hasEvent
                            ? (controller.categoryText.isNotEmpty
                                ? controller.categoryText
                                : 'Event')
                            : 'Music Concert',
                        family: 'Inter',
                        customWeight: FontWeight.w400,
                        fontSize: 13,
                        clr: ColorConstant.white60,
                      ),
                      Container(
                        padding: getPadding(left: 10,right: 10,top: 4,bottom: 4),
                        margin: getMargin(left: 10),
                        decoration: BoxDecoration(
                            border: Border.all(color: ColorConstant.hairline),
                            borderRadius: BorderRadius.circular(999)
                        ),
                        child: MyText(title: "Not live yet",family: 'Inter',fontSize: 12,clr: ColorConstant.white60),
                      )
                    ],
                  ),
                  MyText(
                    title: controller.hasEvent
                        ? controller.titleText
                        : 'DJ Maksmellow Orignawa',
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 26,
                    height: 1.15,
                    clr: ColorConstant.whiteA700,
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  controller.hasEvent
                      ? const Offstage()
                      : const MyText(
                          title: 'Japan Night Festival 2021',
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 14,
                          clr: Color(0xFFFFFFFF),
                        ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.calendar_month,
                                  color: ColorConstant.white60,
                                  size: 22,
                                ),
                                const SizedBox(
                                  width: 16,
                                ),
                                Expanded(
                                  child: Text(
                                    controller.hasEvent
                                        ? controller.formattedDate
                                        : 'Sunday, 14 February 2021',
                                    style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w400,
                                      fontSize: 14,
                                      color: ColorConstant.white60,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(
                              height: getSize(15),
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.location_on,
                                  color: ColorConstant.white60,
                                  size: 22,
                                ),
                                const SizedBox(
                                  width: 16,
                                ),
                                Expanded(
                                  child: Text(
                                    controller.hasEvent
                                        ? (controller.locationText.isNotEmpty
                                            ? controller.locationText
                                            : '—')
                                        : 'Japan, 〒604-8122 Kyoto, Nakagyo Ward, 錦小路下る瀬戸 屋町474',
                                    style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w400,
                                      fontSize: 14,
                                      color: ColorConstant.white60,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: (){
                          Utils.openGoogleMapDirections(25.197525, 55.274288);
                        },
                        child: Container(
                          margin: const EdgeInsets.fromLTRB(20, 50, 0, 36),
                          child: Text(
                            'Direction',
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: ColorConstant.primaryAccentBright,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  MyText(
                    title: 'Event Details',
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    fontSize: 17,
                  ),
                  SizedBox(
                    height: getSize(10),
                  ),
                  Text(
                    controller.hasEvent
                        ? controller.descriptionText
                        : 'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.',
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.w400,
                      fontSize: 14,
                      height: 1.5,
                      color: ColorConstant.white60,
                    ),
                  ),
                  Container(
                    padding: getPadding(left: 18,right: 18,top: 15,bottom: 15),
                    margin: getMargin(top: 20,bottom: 20,left: 10,right: 10),
                    decoration: BoxDecoration(
                      color: ColorConstant.elevated,
                      border: Border.all(color: ColorConstant.hairline),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        CustomImageView(
                          imagePath: ImageConstant.sandClock,
                          height: getSize(30),
                        ),
                        SizedBox(width: getSize(15),),
                        Expanded(
                          child: Column(
                            children: [
                              MyText(
                                title: 'This event will be live in: ',
                                  family: 'Inter',
                                  customWeight: FontWeight.w400,
                                  fontSize: 14,
                                  clr: ColorConstant.white60,
                              ),
                              Obx(() => MyText(
                                title: controller.formatDuration(controller.totalDuration - controller.elapsedTime.value),
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: 14,
                                clr: ColorConstant.whiteA700,
                              ),)
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        );
      }),
    );
  }
}
