import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import '../controllers/place_bid_controller.dart';

class PlaceBidView extends GetView<PlaceBidController> {
  const PlaceBidView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: false,
      showNotification: true,
      child: Column(
        children: [
          const StageViewScreen(height: 350,),
          Expanded(
            child: Padding(
              padding: getPadding(all: 16),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              MyText(
                                title: controller.eventType,
                                family: 'Inter',
                                customWeight: FontWeight.w400,
                                fontSize: 14,
                                clr: ColorConstant.white60,
                              ),
                              MyText(
                                title: controller.eventTitle,
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: 22,
                                clr: ColorConstant.whiteA700,
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: (){
                            controller.showDetailDialog(context);
                          },
                          child: Icon(Icons.info_outline_rounded,color: ColorConstant.whiteA700,),
                        )
                      ],
                    ),
                    const CustomDivider(
                      height: 0.3,
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    GridView.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10.0,
                      crossAxisSpacing: 10.0,
                      childAspectRatio: 1.7,
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                      children: [
                        _buildTicketCard('Platinum Ticket', '\$440', '\$210',0,
                            '\$390'),
                        _buildTicketCard('Gold Ticket', '\$330', '\$109',1,
                            '\$280'),
                        _buildTicketCard('Silver Ticket', '\$220', '\$210',2,
                            '\$170'),
                        _buildTicketCard('Bronze Ticket', '\$110', '\$82',3,
                            '\$60'),
                      ],
                    ),
                    // Place an Offer Button
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20.0),
                      child: Align(
                        alignment: Alignment.center,
                        child: SizedBox(
                          width: size.width / 1.8,
                          child: PrimaryPillButton(
                            onTap: () => Get.toNamed(
                              Routes.PLACE_BID_DETAIL,
                              arguments: {
                                'title': controller.eventTitle,
                                'type': controller.eventType,
                                if (controller.selectedBid.value != -1)
                                  'ticketType': controller
                                      .ticketType[controller.selectedBid.value],
                              },
                            ),
                            text: "Place an offer",
                          ),
                        ),
                      ),
                    ),
                    // Bottom Actions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        const MyText(
                          title: 'Available Tickets',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                        Spacer(),
                        GestureDetector(
                          onTap: () => Get.toNamed(Routes.TRANSACTIONS),
                          child: Container(
                            decoration: BoxDecoration(
                                border: Border.all(
                                    color: ColorConstant.hairline),
                                borderRadius: BorderRadius.circular(8)),
                            padding: getPadding(left: 8, right: 8, top: 4, bottom: 4),
                            child: MyText(
                              title: 'View all transactions',
                              family: 'Inter',
                              clr: ColorConstant.white60,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        Spacer(),
                        Container(
                            decoration: BoxDecoration(
                                color: ColorConstant.elevated,
                                border: Border.all(
                                    color: ColorConstant.hairline),
                                borderRadius: BorderRadius.circular(8)),
                            padding: getPadding(all: 5),
                            child: CustomImageView(
                              onTap: ()=> controller.showFilterDialog(context),
                              svgPath: ImageConstant.filter,
                              height: 16,
                            )
                        )
                      ],
                    ),
                    const SizedBox(
                      height: 30,
                    ),
                    Obx(() => controller.selectedBid.value == -1 ?
                        ListView.separated(
                      padding: EdgeInsets.zero,
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                      separatorBuilder: (context, index,) {
                        return SizedBox(height: getSize(10),);
                      },
                      itemCount: controller.ticketType.length,
                      itemBuilder: (context, index) {
                        return MarketPlaceListWidget(
                          title: controller.ticketType[index],
                          askingPrice: 500,
                          qty: Random().nextInt(5),
                          onTap: () => Get.toNamed(Routes.ASK_BID,
                              arguments: {'tier': controller.ticketType[index]}),
                        );
                      },
                    ):MarketPlaceListWidget(
                      title: controller.ticketType[controller.selectedBid.value],
                      askingPrice: 500,
                      qty: Random().nextInt(5),
                      onTap: () => Get.toNamed(Routes.ASK_BID,
                          arguments: {'tier': controller.ticketType[controller.selectedBid.value]}),
                    )
                      ,),
                    const SizedBox(
                      height: 30,
                    )
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTicketCard(String title, String highestBid, String lowestAsk, int index,
      String recentSale) {
    return Column(
      children: [
        GestureDetector(
          onTap: (){
            if(controller.selectedBid.value != index){
              controller.selectedBid.value = index;
            }else{
              controller.selectedBid.value = -1;
            }
          },
          child: Obx(() => Container(
            width: size.width,
            decoration: BoxDecoration(
              color: index == controller.selectedBid.value
                  ? ColorConstant.primaryAccent
                  : ColorConstant.elevated,
              border: Border.all(
                  color: index == controller.selectedBid.value
                      ? ColorConstant.primaryAccent
                      : ColorConstant.hairline,
                  width: 1.5),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            padding: const EdgeInsets.all(10.0),
            child: MyText(
              title: title,
              family: 'Manrope',
              customWeight: FontWeight.w600,
              fontSize: 14,
            ),
          )),
        ),
        Column(
          children: [
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: ColorConstant.surface,
                border:
                    Border.all(color: ColorConstant.hairline),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  _buildPriceColumn('Highest Bid', highestBid),
                  Container(
                    width: 0.5,
                    height: 30,
                    color: ColorConstant.hairline,
                  ),
                  _buildPriceColumn('Lowest Ask', lowestAsk),
                  Container(
                    width: 0.5,
                    height: 30,
                    color: ColorConstant.hairline,
                  ),
                  _buildPriceColumn('Recent Sale', recentSale),
                ],
              ),
            )
          ],
        ),
      ],
    );
  }

  Widget _buildPriceColumn(String label, String price) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            MyText(
              title: label,
              family: 'Inter',
              clr: ColorConstant.white60,
              fontSize: 10,
            ),
            SizedBox(
              height: getSize(5),
            ),
            MyText(
              title: price,
              family: 'Manrope',
              customWeight: FontWeight.w600,
              clr: ColorConstant.whiteA700,
              fontSize: 12,
            ),
          ],
        ),
      ),
    );
  }
}


class MarketPlaceListWidget extends StatelessWidget {
  final String title;
  final num? askingPrice;
  final num? qty;
  final void Function()? onTap;

  const MarketPlaceListWidget(
      {super.key,
        required this.title,
        this.askingPrice,
        this.qty,
        this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
            color: ColorConstant.elevated,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: ColorConstant.hairline)),
        margin: getMargin(bottom: 10),
        padding: getPadding(left: 16, right: 16, top: 10, bottom: 10),
        child: Row(
          children: [
            Padding(
              padding: getPadding(right: 10),
              child: Container(
                width: 65,
                height: 65,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: DecorationImage(
                    image: AssetImage(ImageConstant.splashBg),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: title,
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    clr: ColorConstant.whiteA700,
                    fontSize: 16,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      MyText(
                        title: "Current Ask:\$$askingPrice",
                        family: 'Inter',
                        clr: ColorConstant.whiteA700,
                        fontSize: 12,
                      ),
                        MyText(
                          title: "  Qty : $qty",
                          family: 'Inter',
                          clr: ColorConstant.white60,
                          fontSize: 12,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            _buildTappableCircle(context,Random().nextInt(10).toString(),),
             GestureDetector(
              onTap: onTap,
              child: Container(
                margin: getMargin(left: 15, right: 5),
                child: Icon(
                  Icons.arrow_forward_ios,
                  color: ColorConstant.whiteA700,
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildTappableCircle(
      BuildContext context, String number, {void Function()? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: ColorConstant.elevated,
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.hairline, width: 1),
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
