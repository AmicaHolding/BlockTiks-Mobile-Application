import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/resell_tab/tabs/asks.dart';
import 'package:block_tix/app/modules/resell_tab/tabs/bids.dart';
import 'package:block_tix/app/modules/resell_tab/tabs/history.dart';
import 'package:block_tix/app/modules/resell_tab/tabs/marketplace.dart';

import '../controllers/resell_tab_controller.dart';

class ResellTabView extends StatelessWidget {
  ResellTabView({Key? key}) : super(key: key);

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: getPadding(left: 16,right: 16,bottom: 16),
          child: SearchField(
            onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
            readOnly: true,
          ),
        ),
        Container(
          height: getVerticalSize(54),
          padding: getMargin(
            top: 10,
            left: 16,
            // right: 16,
          ),
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: ColorConstant.answerColor)
              )
            ),
            child: ListView.separated(
              physics: const ScrollPhysics(),
              itemCount: controller.tabs.length,
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              itemBuilder: (context, index) {
                String item = controller.tabs[index];
                return Obx(() => GestureDetector(
                      onTap: () {
                        controller.onTapSelectIndex(index);
                      },
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            padding: getPadding(top: 10, bottom: 10),
                            child: MyText(
                              title: item,
                              clr: controller.index.value == index
                                  ? ColorConstant.primaryPink
                                  : ColorConstant.answerColor,
                              fontSize: getFontSize(14),
                              customWeight: controller.index.value == index
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            height: getVerticalSize(3),
                            width: getHorizontalSize(73),
                            color: controller.index.value == index
                                ? null
                                : Colors.transparent,
                            decoration: controller.index.value == index
                                ? controller.kGradientBoxDecoration
                                : null,
                          ),
                        ],
                      ),
                    ));
              },
              separatorBuilder: (context, index) {
                return SizedBox(
                  width: getHorizontalSize(15),
                );
              },
            ),
          ),
        ),
        Expanded(
          child: Container(
            margin: getMargin(all: 16),
            child: TabBarView(
              physics: const NeverScrollableScrollPhysics(),
              controller: controller.tabController,
              children: [
                MarketPlace(),
                Asks(),
                Bids(),
                History(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class BidWidget extends StatelessWidget {
  final bool isFulfilled;
  final String title;
  final String? biddingExpiration;
  final String? askingExpiration;
  final String? type;
  final String? date;
  final bool fromCreator;
  final bool isExpired;
  final bool fromSearch;
  final bool showTrailing;
  final num? currentBid;
  final num? askingPrice;
  final void Function()? onOptionsTap;
  final void Function()? onTap;

  const BidWidget(
      {super.key,
      required this.title,
      this.currentBid,
      this.askingPrice,
      this.biddingExpiration,
      this.askingExpiration,
      this.type,
      this.date,
      this.fromSearch = false,
      this.fromCreator = false,
      this.isFulfilled = false,
      this.isExpired = false,
      this.showTrailing = true,
      this.onOptionsTap,
      this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
            color: ColorConstant.gray50.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10)),
        margin: getMargin(bottom: 10),
        padding: getPadding(left: 16, right: 16, top: 10, bottom: 10),
        child: Row(
          children: [
            Padding(
              padding: getPadding(right: 15),
              child: Container(
                width: 70,
                height: 70,
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
                  fromCreator ? Offstage() : fromSearch
                      ?  MyText(
                          title: "$type",
                          clr: ColorConstant.whiteA700,
                          fontSize: 13,
                        )
                      : Row(
                          children: [
                            MyText(
                              title: askingPrice != null
                                  ? "Asking Price: \$$askingPrice"
                                  : "Current Bid \$$currentBid",
                              clr: ColorConstant.whiteA700,
                              fontSize: 13,
                            ),
                            if (isFulfilled)
                              MyText(
                                title: "(Fulfilled)",
                                clr: ColorConstant.green,
                                fontSize: 13,
                              ),
                          ],
                        ),
                  const SizedBox(height: 4),
                  fromSearch || fromCreator
                      ? MyText(
                          title: "$date",
                          clr: ColorConstant.whiteA700,
                          fontSize: 13,
                        )
                      : isExpired
                          ? MyText(
                              title: "Expired",
                              clr: ColorConstant.red,
                              fontSize: 13,
                            )
                          : MyText(
                              title: askingExpiration != null
                                  ? "Asking Expiration: $askingExpiration"
                                  : "Bidding Expiration $biddingExpiration",
                              clr: Colors.white,
                              fontSize: 13,
                            ),
                ],
              ),
            ),
            !showTrailing ? Offstage() : fromSearch
                ? GestureDetector(
                    onTap: onTap,
                    child: Container(
                      margin: getMargin(left: 15, right: 5),
                      child: Icon(
                        Icons.arrow_forward_ios,
                        color: ColorConstant.whiteA700,
                      ),
                    ),
                  )
                : isFulfilled || isExpired
                    ? const Offstage()
                    : CustomImageView(
                        onTap: onOptionsTap,
                        margin: getMargin(left: 10,),
                        svgPath: ImageConstant.options,
                        height: 20,
              width: 20,
                      ),
          ],
        ),
      ),
    );
  }
}
