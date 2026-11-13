import 'package:block_tix/app/data/widgets/sahra_ticket_card.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
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
          child: PrimaryPillButton(
            text: "lbl_back_to_home".tr,
            margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
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
                  Colors.black.withValues(alpha: 0.1),
                  Colors.black.withValues(alpha: 0.9),
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
                              color: ColorConstant.whiteA700.withValues(alpha: 0.1),
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
                      MyText(
                        title: 'Your E-Ticket',
                        family: 'Manrope',
                        customWeight: FontWeight.w600,
                        fontSize: 18,
                      ),
                      SizedBox(
                        height: getSize(5),
                      ),
                      MyText(
                        title: 'Refreshing in 30 seconds',
                        family: 'Inter',
                        fontSize: 14.0,
                        clr: ColorConstant.white60,
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
                // Honest status banners: order preview vs simulated ticket.
                if (controller.isPreview)
                  Container(
                    margin: getMargin(left: 25, right: 25, bottom: 10),
                    padding: getPadding(left: 12, right: 12, top: 10, bottom: 10),
                    decoration: BoxDecoration(
                      color: ColorConstant.warningOrange.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: ColorConstant.warningOrange.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.science_outlined,
                            size: 16, color: ColorConstant.warningOrange),
                        const SizedBox(width: 8),
                        Expanded(
                          child: MyText(
                            title: 'Order preview — payment not completed',
                            family: 'Inter',
                            fontSize: 12,
                            clr: ColorConstant.warningOrange,
                          ),
                        ),
                      ],
                    ),
                  )
                else if (controller.isSimulated)
                  Container(
                    margin: getMargin(left: 25, right: 25, bottom: 10),
                    padding: getPadding(left: 12, right: 12, top: 10, bottom: 10),
                    decoration: BoxDecoration(
                      color: ColorConstant.warningOrange.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: ColorConstant.warningOrange.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.science_outlined,
                            size: 16, color: ColorConstant.warningOrange),
                        const SizedBox(width: 8),
                        Expanded(
                          child: MyText(
                            title: 'Simulated ticket — no real purchase',
                            family: 'Inter',
                            fontSize: 12,
                            clr: ColorConstant.warningOrange,
                          ),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: Obx(() {
                    if (controller.isLoadingOrder.value) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (controller.orderError.value != null) {
                      return Center(
                        child: Padding(
                          padding: getPadding(all: 24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              MyText(
                                title: "Couldn't load order",
                                family: 'Manrope',
                                customWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                              const SizedBox(height: 8),
                              MyText(
                                title: controller.orderError.value ?? '',
                                family: 'Inter',
                                fontSize: 13,
                                clr: ColorConstant.white60,
                                center: true,
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    final rowCount = controller.ticketRows.isNotEmpty
                        ? controller.ticketRows.length
                        : controller.tickets;
                    return Padding(
                    padding: getPadding(left: 25, right: 25,bottom: 25),
                    child: ListView.separated(
                      itemCount: rowCount,
                        separatorBuilder: (_,__){
                        return SizedBox(height: getSize(10),);
                        },
                        itemBuilder: (_,index){
                      final row = index < controller.ticketRows.length
                          ? controller.ticketRows[index]
                          : null;
                      String rowStr(String key, String fallback) {
                        final v = row?[key]?.toString() ?? '';
                        return v.isNotEmpty ? v : fallback;
                      }
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
                            SahraTicketCard(
                              title: rowStr('title', controller.eventTitle),
                              subtitle:
                                  '${rowStr('venue', controller.venue)} · ${rowStr('date', controller.ticketDate)} · ${rowStr('time', controller.ticketTime)}',
                              fields: {
                                'Zone': rowStr('tier', controller.ticketTier),
                                'Order': rowStr('orderId', controller.orderId),
                              },
                              code: row?['code']?.toString(),
                              status: row?['status']?.toString(),
                            ),
                            Obx(() => controller.rxBoolList[index].value ?
                            Positioned(
                              right: 0,
                              top: 0,
                              child: Icon(Icons.check_circle,size: 55,color: ColorConstant.primaryAccent,),
                            ) : Offstage())

                          ],
                        ),
                      );
                    }),
                    );
                  }),
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
              color: ColorConstant.surface),
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
                          title: controller.eventType,
                            family: 'Inter',
                            customWeight: FontWeight.w400,
                            fontSize: 14,
                            clr: ColorConstant.white60,
                        ),
                        const SizedBox(height: 5),
                        MyText(
                          title: controller.eventTitle,
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
                        child: PrimaryPillButton(
                          text: "Transfer",
                          onTap: () {
                            Get.back();
                            Get.toNamed(Routes.TRANSFER, arguments: {
                              'title': controller.eventTitle,
                              'type': controller.ticketTier,
                              'date': controller.ticketDate,
                            });
                          },
                        )),
                    const SizedBox(
                      width: 10,
                    ),
                    Expanded(
                        child: CustomButton(
                            text: "Sell",
                            variant: ButtonVariant.OutlineWhite,
                            onTap: () {
                              Get.back();
                              Get.toNamed(Routes.ASK_BID,arguments: {
                                'fromSell': true,
                                'title': controller.eventTitle,
                                'type': controller.eventType,
                                'tier': controller.ticketTier,
                              });
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
      ..color = ColorConstant.dividerColor.withValues(alpha: 0.3)
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
