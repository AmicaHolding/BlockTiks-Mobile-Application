import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../data/core/app_export.dart';
import '../controllers/purchased_ticket_controller.dart';

class PurchasedTicketView extends GetView<PurchasedTicketController> {
  const PurchasedTicketView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
        hideAppBar: true,
        showDivider: false,
        sidePadding: false,
        bodyPadding: false,
        bottomNavigationBar: controller.showBack ? Offstage() : SafeArea(
          child: CustomButton(
            text: "lbl_back_to_home".tr,
            margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
            shape: ButtonShape.RoundedBorder10,
            onTap: () {
              Get.offAllNamed(Routes.USER_DASHBOARD);
            },
          ),
        ),
        child: Stack(
          children: [
            Container(
              width: size.width,
              height: size.height,
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
                height: size.height,
                fit: BoxFit.fill,
                imagePath: ImageConstant.splashBg,
              ),
            ),
            Column(
              children: [
                SizedBox(
                  height: getSize(16),
                ),
                !controller.showBack ? Offstage() :Row(
                  children: [
                    Padding(
                      padding: getPadding(left: 16,right: 16,top: 8,bottom: 8),
                      child: GestureDetector(
                        onTap:() {
                          Get.back();
                        },
                        child: Container(
                          height:getSize(30),
                          width:getSize(30),
                          decoration: BoxDecoration(
                              color: ColorConstant.whiteA700.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8)
                          ),
                          alignment: Alignment.center,
                          child: Padding(
                            padding: getPadding(left: 8),
                            child: Icon(Icons.arrow_back_ios,
                              color: ColorConstant.whiteA700,
                              size: 18,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                AppBar(
                  centerTitle: true,
                  leading: const Offstage(),
                  backgroundColor: Colors.transparent,
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const MyText(
                        title: 'Your E-Ticket',
                        family: 'Roboto Condensed',
                        customWeight: FontWeight.w400,
                        fontSize: 18,
                      ),
                      SizedBox(
                        height: getSize(5),
                      ),
                      const MyText(
                        title: 'Refreshing in 30 seconds',
                        fontSize: 14.0,
                        customWeight: FontWeight.w400,
                      ),
                    ],
                  ),
                  actions: [
                    Container(
                      margin: getMargin(right: 10),
                      child: GestureDetector(
                        onTap: () {
                          onOptionsTap();
                        },
                        child: CustomImageView(
                          svgPath: ImageConstant.options,
                          height: 20,
                          width: 20,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  height: getSize(20),
                ),
                Expanded(
                  child: Padding(
                    padding: getPadding(left: 25, right: 25,bottom: 25),
                    child: ListView.separated(
                      itemCount: controller.tickets,
                        separatorBuilder: (_,__){
                        return SizedBox(height: getSize(10),);
                        },
                        itemBuilder: (_,index){
                      return GestureDetector(
                        onTap: (){
                          if(controller.rxBoolList[index].value){
                            controller.rxBoolList[index].value = false;
                          }else{
                            controller.rxBoolList[index].value = true;
                          }
                        },
                        child: Stack(
                          children: [
                            CustomImageView(
                              svgPath: ImageConstant.ticketBg,
                              width: size.width,
                              fit: BoxFit.fill,
                              height: getSize(580),
                            ),
                            Container(
                              width: size.width,
                              // height: getSize(550),
                              padding: getPadding(all: 20),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.start,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    margin: const EdgeInsets.fromLTRB(0, 0, 0, 20),
                                    child: Align(
                                      alignment: Alignment.topCenter,
                                      child: CustomImageView(
                                        svgPath: ImageConstant.qr,
                                        width: 170,
                                        height: 170,
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: getMargin(top: getSize(10), bottom: getSize(10)),
                                    child: DottedLine(),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.fromLTRB(0, 20, 0, 35),
                                    child: MyText(
                                      title: 'DJ Maksmellow Orignawa',
                                      family: 'Manrope',
                                      customWeight: FontWeight.w700,
                                      fontSize: 20,
                                      clr: ColorConstant.black900,
                                    ),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.fromLTRB(0, 0, 0, 30),
                                    child: Align(
                                      alignment: Alignment.topLeft,
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.start,
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            margin: const EdgeInsets.fromLTRB(
                                                0, 0, 37.9, 0),
                                            child: Column(
                                              mainAxisAlignment:
                                              MainAxisAlignment.start,
                                              crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  margin: const EdgeInsets.fromLTRB(
                                                      0, 0, 0, 5),
                                                  child: const Align(
                                                    alignment: Alignment.topLeft,
                                                    child: MyText(
                                                      title: 'Date',
                                                      family: 'Manrope',
                                                      customWeight: FontWeight.w700,
                                                      fontSize: 14,
                                                      clr: Color(0xFF000000),
                                                    ),
                                                  ),
                                                ),
                                                const MyText(
                                                  title: '14 February 2021',
                                                  family: 'Manrope',
                                                  customWeight: FontWeight.w400,
                                                  fontSize: 14,
                                                  clr: Color(0xB2000000),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Column(
                                            mainAxisAlignment:
                                            MainAxisAlignment.start,
                                            crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                margin: const EdgeInsets.fromLTRB(
                                                    0, 0, 0, 5),
                                                child: const Align(
                                                  alignment: Alignment.topLeft,
                                                  child: MyText(
                                                    title: 'Time',
                                                    family: 'Manrope',
                                                    customWeight: FontWeight.w700,
                                                    fontSize: 14,
                                                    clr: Color(0xFF000000),
                                                  ),
                                                ),
                                              ),
                                              const MyText(
                                                title: '12.30 PM',
                                                family: 'Manrope',
                                                customWeight: FontWeight.w400,
                                                fontSize: 14,
                                                clr: Color(0xB2000000),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.fromLTRB(0, 0, 0, 35),
                                    child: Align(
                                      alignment: Alignment.topLeft,
                                      child: SizedBox(
                                        width: 234.7,
                                        child: Row(
                                          mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                          crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                          children: [
                                            Column(
                                              mainAxisAlignment:
                                              MainAxisAlignment.start,
                                              crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  margin: const EdgeInsets.fromLTRB(
                                                      0, 0, 0, 5),
                                                  child: const MyText(
                                                    title: 'Check In Type',
                                                    family: 'Manrope',
                                                    customWeight: FontWeight.w700,
                                                    fontSize: 14,
                                                    clr: Color(0xFF000000),
                                                  ),
                                                ),
                                                const Align(
                                                  alignment: Alignment.topLeft,
                                                  child: MyText(
                                                    title: 'VIP A',
                                                    family: 'Manrope',
                                                    customWeight: FontWeight.w400,
                                                    fontSize: 14,
                                                    clr: Color(0xB2000000),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Column(
                                              mainAxisAlignment:
                                              MainAxisAlignment.start,
                                              crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  margin: const EdgeInsets.fromLTRB(
                                                      0, 0, 0, 5),
                                                  child: const Align(
                                                    alignment: Alignment.topLeft,
                                                    child: MyText(
                                                      title: 'Order ID',
                                                      family: 'Manrope',
                                                      customWeight: FontWeight.w700,
                                                      fontSize: 14,
                                                      clr: Color(0xFF000000),
                                                    ),
                                                  ),
                                                ),
                                                const MyText(
                                                  title: 'EBP139920AC',
                                                  family: 'Manrope',
                                                  customWeight: FontWeight.w400,
                                                  fontSize: 14,
                                                  clr: Color(0xB2000000),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  Container(
                                    margin: const EdgeInsets.fromLTRB(0, 0, 11, 0),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.start,
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          margin:
                                          const EdgeInsets.fromLTRB(0, 0, 0, 5),
                                          child: const Align(
                                            alignment: Alignment.topLeft,
                                            child: MyText(
                                              title: 'Place',
                                              family: 'Manrope',
                                              customWeight: FontWeight.w700,
                                              fontSize: 14,
                                              clr: Color(0xFF000000),
                                            ),
                                          ),
                                        ),
                                        Container(
                                          margin:
                                          const EdgeInsets.fromLTRB(0, 0, 0, 1),
                                          child: Text(
                                            'Japan, 〒604-8122 Kyoto, Nakagyo Ward, 錦小路下る瀬戸屋町474',
                                            style: GoogleFonts.getFont(
                                              'Manrope',
                                              fontWeight: FontWeight.w400,
                                              fontSize: 14,
                                              color: const Color(0xB2000000),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Obx(() => controller.rxBoolList[index].value ?
                            const Positioned(
                              right: 0,
                              child: Icon(Icons.check_circle,size: 55,),
                            ) : Offstage())

                          ],
                        ),
                      );
                    }),
                  ),
                )
              ],
            ),
          ],
        ));
  }

  void onOptionsTap() {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.bg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(16),
                          topRight: Radius.circular(16),
                      ),
                      image: DecorationImage(
                        fit: BoxFit.cover,
                        image: AssetImage(ImageConstant.event)
                      )
                    ),
                    height: getSize(130),
                    width: size.width,
                  ),
                  Padding(
                    padding: getPadding(all: 16.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 50), // For the cancel icon spacing
                        MyText(
                          title: 'Music Concert',
                            family: 'Manrope',
                            customWeight: FontWeight.w400,
                            fontSize: 14,
                            clr: ColorConstant.whiteA700,
                        ),
                        const SizedBox(height: 5),
                        MyText(
                          title: 'DJ Maksmellow Orignawa',
                          family: 'Manrope',
                          customWeight: FontWeight.w800,
                          fontSize: 18,
                          clr: ColorConstant.whiteA700,
                        ),

                      ],
                    ),
                  ),
                  Positioned(
                    top: 0,
                    left: 0,
                    child: IconButton(
                      icon: Icon(
                        Icons.close,
                        color: ColorConstant.whiteA700,
                        size: getSize(30),
                      ),
                      onPressed: () {
                        Get.back(); // Close the dialog
                      },
                    ),
                  ),
                ],
              ),
              Padding(
                padding: getPadding(all: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Expanded(
                        child: CustomButton(
                          text: "Transfer",
                          onTap: () {
                            Get.back();
                            Get.toNamed(Routes.TRANSFER);
                          },
                        )),
                    const SizedBox(
                      width: 10,
                    ),
                    Expanded(
                        child: CustomButton(
                            text: "Sell",
                            variant: ButtonVariant.OutlinePink,
                            onTap: () {
                              Get.back();
                              Get.toNamed(Routes.ASK_BID,arguments: true);
                            })),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DottedLine extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size.width, 1), // Size of the dotted line (width x height)
      painter: DottedLinePainter(),
    );
  }
}

class DottedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = ColorConstant.dividerColor.withOpacity(0.3)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    double dashWidth = 8, dashSpace = 5;
    double startX = 0;
    final path = Path();

    while (startX < size.width) {
      path.moveTo(startX, 0); // Move the path
      path.lineTo(startX + dashWidth, 0); // Draw the dash
      startX += dashWidth + dashSpace; // Move to the next dash
    }

    canvas.drawPath(path, paint); // Draw the entire dotted line
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
