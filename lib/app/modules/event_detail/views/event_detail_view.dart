import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/event_detail_controller.dart';

class EventDetailView extends GetView<EventDetailController> {
  const EventDetailView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: false,
      showNotification: true,
      bottomNavigationBar: Constants.isUserCreator ? const Offstage() : SafeArea(
        child: Row(
          children: [
            SizedBox(width: getSize(20)),
            Expanded(
              flex: 2,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const MyText(
                        title: 'Subtotal',
                        family: 'Manrope',
                        customWeight: FontWeight.w700,
                        fontSize: 14,
                        clr: Color(0xFFFFFFFF),
                      ),
                      SizedBox(width: getSize(30),),
                      Obx(() => MyText(
                        title: '\$${controller.platinumCount.value *405 +controller.goldCount.value *405 + controller.silverCount.value *405+ controller.bronzeCount.value *405}',
                        family: 'Manrope',
                        customWeight: FontWeight.w700,
                        fontSize: 14,
                        clr: ColorConstant.green,
                      ),)
                    ],
                  ),
                  SizedBox(height: getSize(5),),
                  const MyText(
                    title:"All-inclusive price",
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: Color(0xB2FFFFFF),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 1,
              child: CustomButton(
                text: "lbl_next".tr,
                height: 40,
                margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
                shape: ButtonShape.RoundedBorder10,
                onTap: () {
                 if((controller.platinumCount.value+controller.goldCount.value+controller.silverCount.value+controller.bronzeCount.value) > 0){
                   final map = {
                     'platinum': controller.platinumCount.value,
                     'gold': controller.goldCount.value,
                     'silver': controller.silverCount.value,
                     'bronze': controller.bronzeCount.value,
                   };
                   Get.toNamed(Routes.PAYMENT_PAGE,arguments:map);
                 }else{
                   CustomSnackBar.showCustomErrorToast(message: "Please select at least one ticket");
                 }
                },
              ),
            ),
          ],
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
                  MyText(
                    title: 'Music Concert',
                    family: 'Manrope',
                    customWeight: FontWeight.w400,
                    fontSize: 14,
                    clr: ColorConstant.whiteA700,
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

                  SizedBox(
                    height: getSize(20),
                  ),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.platinumCount.value,
                    title: "Platinum Ticket",
                    color: Colors.blue,
                    onMinusTap: () {
                      if (controller.platinumCount.value > 0) {
                        controller.platinumCount.value =
                            controller.platinumCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.platinumCount.value < 10) {
                        controller.platinumCount.value =
                            controller.platinumCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.goldCount.value,
                    title: "Gold Ticket",
                    color: Colors.orange,
                    onMinusTap: () {
                      if (controller.goldCount.value > 0) {
                        controller.goldCount.value =
                            controller.goldCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.goldCount.value < 10) {
                        controller.goldCount.value =
                            controller.goldCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.silverCount.value,
                    title: "Silver Ticket",
                    color: Colors.grey,
                    onMinusTap: () {
                      if (controller.silverCount.value > 0) {
                        controller.silverCount.value =
                            controller.silverCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.silverCount.value < 10) {
                        controller.silverCount.value =
                            controller.silverCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.bronzeCount.value,
                    title: "Bronze Ticket",
                    color: Colors.brown,
                    onMinusTap: () {
                      if (controller.bronzeCount.value > 0) {
                        controller.bronzeCount.value =
                            controller.bronzeCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.bronzeCount.value < 10) {
                        controller.bronzeCount.value =
                            controller.bronzeCount.value + 1;
                      }
                    },
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TicketCounter extends StatelessWidget {
  const TicketCounter({super.key,
    required this.title,
    required this.count,
    required this.color,
    this.onMinusTap,
    this.onPlusTap});

  final String title;
  final int count;
  final Color color;
  final void Function()? onMinusTap;
  final void Function()? onPlusTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: getMargin(bottom: 10,left: 20,right: 20),
      child: Row(
        children: [
          Container(
            margin: getMargin(right: 8),
            decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10)
            ),
            height: 40,
            padding: getPadding(left: 8,right: 8),
            alignment: Alignment.center,
            child: const MyText(
              title: '\$405',
              clr: Colors.white,
              fontSize: 15,
              customWeight: FontWeight.bold,
            ),
          ),
          Expanded(
            child: Container(
                margin: getMargin(right: 8,left: 8,top: 4,bottom: 4),
                padding: getPadding(top: 5, bottom: 5,left: 5,right: 5),
                decoration: BoxDecoration(
                    color: ColorConstant.containerBg.withValues(alpha: .3),
                    borderRadius: BorderRadius.circular(10)
            ),
            child: Row(
              children: [
                Expanded(
                  child: MyText(
                    title: title,
                    clr: Colors.white,
                    fontSize: 14,
                    customWeight: FontWeight.bold,
                  ),
                ),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onMinusTap,
                  child: Container(
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(5),
                        color: count > 0
                            ? ColorConstant.primaryPink
                            : ColorConstant.gray50.withValues(alpha: 0.5),
                        // border: Border.all(
                        //     color: count > 0
                        //         ? ColorConstant.primaryPink
                        //         : ColorConstant.gray50.withValues(alpha: 0.5)
                        // )
                    ),
                    padding: getPadding(left: 8, right: 8,),
                    child: const MyText(title: "-", fontSize: 22,),

                  ),
                ),
                Padding(
                  padding: getPadding(left: 10,right: 10),
                  child: MyText(
                    title: count.toString(),
                    clr: Colors.white,
                    fontSize: 18,
                    customWeight: FontWeight.bold,
                  ),
                ),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onPlusTap,
                  child: Container(
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(5),
                        color: count < 10
                            ? ColorConstant.primaryPink
                            : ColorConstant.gray50.withValues(alpha: 0.5),
                        // border: Border.all(
                        //     color: count < 10
                        //         ? ColorConstant.primaryPink
                        //         : ColorConstant.gray50.withValues(alpha: 0.5)
                        // )
                    ),
                    padding: getPadding(left: 8, right: 8,),
                    child: const MyText(
                      title: "+",
                      fontSize: 22,
                    ),
                    // padding: getPadding(left: 12,right: 12,top: 6,bottom: 6),
                    // child: const MyText(title: "+",fontSize: 22,),
                  ),
                )
              ],
            ),
          ),
          ),
        ],
      ),
    );
  }

}


class StageViewScreen extends StatelessWidget {
  const StageViewScreen({super.key,this.height = 320,this.showCircles = true});

  final double height;
  final bool showCircles;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                ColorConstant.primaryPink.withValues(alpha: 0.01),
                ColorConstant.primaryPink.withValues(alpha: 0.5),
              ])),
      height: height,
      child: Stack(
        children: [
          Align(
            alignment: Alignment.center,
            child: Column(
              children: [
                SizedBox(height: getSize(20),),
                CustomImageView(
                  imagePath: ImageConstant.stageCinema,
                  width: size.width,
                  height: 120,
                  fit: BoxFit.fill,
                  // height: 70,
                ),
                SizedBox(height: getSize(20),),
                CustomImageView(
                  svgPath: ImageConstant.stageComplete,
                  width: size.width,
                  height: height - 160,
                  fit: BoxFit.fill,
                  // height: 70,
                ),
              ],
            ),
          ),
          Column(
            children: [
              const SizedBox(height: 70,),
             Expanded(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Platinum
                    const Positioned(
                      top: 100,
                      child: MyText(title:"Platinum",fontSize: 12,),
                    ),
                    // Gold
                    const Positioned(
                      top: 200,
                      child: MyText(title:"Gold",fontSize: 12,),
                    ),
                    // Silver Left
                    Positioned(
                      top: 150,
                      left: MediaQuery.of(context).size.width / 4 - 20,
                      child: const MyText(title:"Silver",fontSize: 12,),
                    ),
                    // Silver Right
                    Positioned(
                      top: 150,
                      right: MediaQuery.of(context).size.width / 4 - 28,
                      child: const MyText(title:"Silver",fontSize: 12,),
                    ),
                    // Bronze
                    const Positioned(
                      bottom: 15,
                      child: MyText(title:"Bronze",fontSize: 12,),
                    ),


                    // Platinum
                    !showCircles ? Container() : Positioned(
                      top: 60,
                      // left: MediaQuery.of(context).size.width / 2 - 40,
                      child: _buildTappableCircle(
                          context, '1'),
                    ),
                    // Gold
                    !showCircles ? Container() :Positioned(
                      top: 150,
                      // left: MediaQuery.of(context).size.width / 2 - 30,
                      child:
                      _buildTappableCircle(context, '3'),
                    ),
                    // Silver Left
                    !showCircles ? Container() :Positioned(
                      top: 110,
                      left: MediaQuery.of(context).size.width / 4 - 20,
                      child: _buildTappableCircle(
                          context, '12',),
                    ),
                    // Silver Right
                    !showCircles ? Container() : Positioned(
                      top: 110,
                      right: MediaQuery.of(context).size.width / 4 - 28,
                      child: _buildTappableCircle(context, '54'),
                    ),
                    // Bronze
                    !showCircles ? Container() : Positioned(
                      bottom: 30,
                      left: MediaQuery.of(context).size.width / 2 - 170,
                      child: _buildTappableCircle(context, '54',),
                    ),


                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTappableCircle(
      BuildContext context, String number, {void Function()? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: ColorConstant.bg,
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.primaryPink, width: 0.8),
        ),
        padding: getPadding(all: 10),
        child: Center(
          child: Text(
            number,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}
