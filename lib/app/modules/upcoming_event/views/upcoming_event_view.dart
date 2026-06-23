import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
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
        child: CustomButton(
          text: "Remind me".tr,
          prefixWidget: Container(
              margin: getMargin(right: 10),
              child: Icon(
                Icons.calendar_month,
                color: ColorConstant.whiteA700,
              )),
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.toNamed(Routes.REMIND_ME);
          },
        ),
      ),
      child: SingleChildScrollView(
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
                        title: 'Music Concert',
                        family: 'Manrope',
                        customWeight: FontWeight.w400,
                        fontSize: 14,
                        clr: ColorConstant.whiteA700,
                      ),
                      Container(
                        padding: getPadding(left: 8,right: 8,top: 4,bottom: 4),
                        margin: getMargin(left: 10),
                        decoration: BoxDecoration(
                            border: Border.all(color: ColorConstant.white60),
                            borderRadius: BorderRadius.circular(20)
                        ),
                        child: MyText(title: "Not live yet",fontSize: 13,clr: ColorConstant.white60),
                      )
                    ],
                  ),
                  MyText(
                    title: 'DJ Maksmellow Orignawa',
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 22,
                    clr: ColorConstant.whiteA700,
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  const MyText(
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
                                  color: ColorConstant.primaryPink,
                                  size: 24,
                                ),
                                const SizedBox(
                                  width: 20,
                                ),
                                Expanded(
                                  child: Text(
                                    'Sunday, 14 February 2021',
                                    style: GoogleFonts.getFont(
                                      'Manrope',
                                      fontWeight: FontWeight.w400,
                                      fontSize: 14,
                                      color: const Color(0xB2FFFFFF),
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
                                  color: ColorConstant.primaryPink,
                                  size: 24,
                                ),
                                const SizedBox(
                                  width: 20,
                                ),
                                Expanded(
                                  child: Text(
                                    'Japan, 〒604-8122 Kyoto, Nakagyo Ward, 錦小路下る瀬戸 屋町474',
                                    style: GoogleFonts.getFont(
                                      'Manrope',
                                      fontWeight: FontWeight.w400,
                                      fontSize: 14,
                                      color: const Color(0xB2FFFFFF),
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
                            style: GoogleFonts.getFont(
                              'Manrope',
                              fontWeight: FontWeight.w400,
                              fontSize: 14,
                              color: const Color(0xFFB620E0),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  Text(
                    'Event Details',
                    style: GoogleFonts.getFont(
                      'Manrope',
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: const Color(0xFFFFFFFF),
                    ),
                  ),
                  SizedBox(
                    height: getSize(10),
                  ),
                  Text(
                    'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.',
                    style: GoogleFonts.getFont(
                      'Manrope',
                      fontWeight: FontWeight.w400,
                      fontSize: 14,
                      color: const Color(0xB2FFFFFF),
                    ),
                  ),
                  Container(
                    padding: getPadding(left: 18,right: 18,top: 15,bottom: 15),
                    margin: getMargin(top: 20,bottom: 20,left: 10,right: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: ColorConstant.whiteA700)
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
                                  customWeight: FontWeight.w400,
                                  fontSize: 14,
                                  clr: ColorConstant.white60,
                              ),
                              Obx(() => MyText(
                                title: controller.formatDuration(controller.totalDuration - controller.elapsedTime.value),
                                customWeight: FontWeight.w600,
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
      ),
    );
  }
}
