import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/modules/event_detail/views/event_detail_view.dart';
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
                            '\$390', Colors.blue),
                        _buildTicketCard('Gold Ticket', '\$330', '\$109',1,
                            '\$280', Colors.orange),
                        _buildTicketCard('Silver Ticket', '\$220', '\$210',2,
                            '\$170', Colors.grey),
                        _buildTicketCard('Bronze Ticket', '\$110', '\$82',3,
                            '\$60', Colors.brown),
                      ],
                    ),
                    // Place an Offer Button
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20.0),
                      child: Align(
                        alignment: Alignment.center,
                        child: CustomButton(
                          onTap: () => Get.toNamed(Routes.PLACE_BID_DETAIL),
                          width: size.width / 1.8,
                          text: "Place an offer",
                        ),
                      ),
                    ),
                    // Bottom Actions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        const MyText(
                          title: 'Available Tickets',
                          clr: Colors.white,
                          fontSize: 16,
                          customWeight: FontWeight.w600,
                        ),
                        Spacer(),
                        GestureDetector(
                          onTap: () => Get.toNamed(Routes.TRANSACTIONS),
                          child: Container(
                            decoration: BoxDecoration(
                                border: Border.all(
                                    color: ColorConstant.whiteA700),
                                borderRadius: BorderRadius.circular(5)),
                            padding: getPadding(left: 3, right: 3),
                            child: const MyText(
                              title: 'View all transactions',
                              clr: Colors.white,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Spacer(),
                        Container(
                            decoration: BoxDecoration(
                                border: Border.all(
                                    color: ColorConstant.whiteA700),
                                borderRadius: BorderRadius.circular(5)),
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
                          onTap: () => Get.toNamed(Routes.ASK_BID),
                        );
                      },
                    ):MarketPlaceListWidget(
                      title: controller.ticketType[controller.selectedBid.value],
                      askingPrice: 500,
                      qty: Random().nextInt(5),
                      onTap: () => Get.toNamed(Routes.ASK_BID),
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
      String recentSale, Color borderColor) {
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
              color: index == controller.selectedBid.value ? ColorConstant.primaryPink: null,
              border: Border.all(color: borderColor, width: 2),
              borderRadius: BorderRadius.circular(8.0),
              boxShadow: [
                BoxShadow(
                  color: borderColor.withOpacity(0.2), // Shadow color
                  spreadRadius: 1, // How much the shadow spreads
                  blurRadius: 6, // How blurred the shadow is
                  offset: const Offset(0, 40), // Offset in X and Y directions
                ),
              ],
            ),
            alignment: Alignment.center,
            padding: const EdgeInsets.all(10.0),
            child: MyText(
              title: title,
              clr: Colors.white,
              fontSize: 16,
              customWeight: FontWeight.bold,
            ),
          )),
        ),
        Column(
          children: [
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                border:
                    Border.all(color: ColorConstant.gray50.withOpacity(0.5)),
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: Row(
                children: [
                  _buildPriceColumn('Highest Bid', highestBid),
                  Container(
                    width: 0.5,
                    height: 30,
                    color: ColorConstant.gray50.withOpacity(0.5),
                  ),
                  _buildPriceColumn('Lowest Ask', lowestAsk),
                  Container(
                    width: 0.5,
                    height: 30,
                    color: ColorConstant.gray50.withOpacity(0.5),
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
              clr: Colors.grey,
              fontSize: 8,
            ),
            SizedBox(
              height: getSize(5),
            ),
            MyText(
              title: price,
              clr: Colors.white,
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
            color: ColorConstant.gray50.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10)),
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
                  borderRadius: BorderRadius.circular(10),
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
                    customWeight: FontWeight.bold,
                    clr: ColorConstant.whiteA700,
                    fontSize: 16,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      MyText(
                        title: "Current Ask:\$$askingPrice",
                        clr: ColorConstant.whiteA700,
                        fontSize: 12,
                      ),
                        MyText(
                          title: "  Qty : $qty",
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
