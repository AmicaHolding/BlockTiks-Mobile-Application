import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';

import '../controllers/wallet_controller.dart';

class WalletView extends StatelessWidget {
  WalletView({Key? key}) : super(key: key);

  final controller = Get.put(WalletController());

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: getMargin(bottom: 16, left: 16, right: 16),
          child: SearchField(
            onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
            readOnly: true,
          ),
        ),
        Padding(
          padding: getPadding(left: 16, right: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(
                      height: 5,
                    ),
                    const MyText(title: "Balance"),
                    const SizedBox(
                      height: 3,
                    ),
                    Row(
                      children: [
                        const MyText(
                          title: "\$2000",
                          fontSize: 28,
                          customWeight: FontWeight.w800,
                        ),
                        const SizedBox(
                          width: 10,
                        ),
                        const MyText(
                          title: "USD",
                          fontSize: 16,
                        ),
                        const SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.arrow_drop_down,
                          color: ColorConstant.whiteA700,
                        )
                      ],
                    ),
                    const SizedBox(
                      height: 5,
                    ),
                    Row(
                      children: [
                        MyText(
                          title: "This week",
                          clr: ColorConstant.white60,
                        ),
                        const SizedBox(
                          width: 5,
                        ),
                        MyText(
                          title: "+10%",
                          clr: ColorConstant.green,
                        ),
                      ],
                    ),
                    const SizedBox(
                      height: 10,
                    ),

                  ],
                ),
              ),
              CustomImageView(
                onTap: () => Get.toNamed(Routes.ANALYTIC),
                svgPath: ImageConstant.growth,
                height: getSize(24),
                margin: getMargin(right: 5),
              ),
            ],
          ),
        ),
        Padding(
          padding: getPadding(all: 16),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: ()=> Get.toNamed(Routes.WITHDRAW,arguments: {Constants.paramDeposit: true}),
                  child: Container(
                    padding: getPadding(
                      top: 15,
                      bottom: 15,
                    ),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: ColorConstant.primaryPink,
                        borderRadius: BorderRadius.circular(10)),
                    child: MyText(
                      title: "Deposit",
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: getSize(10),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => Get.toNamed(Routes.WITHDRAW),
                  child: Container(
                    padding: getPadding(
                      top: 15,
                      bottom: 15,
                    ),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        border: Border.all(
                          color: ColorConstant.primaryPink,
                        ),
                        borderRadius: BorderRadius.circular(10)),
                    child: MyText(
                      title: "Withdraw",
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: getSize(10),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    Get.toNamed(Routes.TRANSFER);
                  },
                  child: Container(
                    padding: getPadding(
                      top: 15,
                      bottom: 15,
                    ),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        border: Border.all(
                          color: ColorConstant.primaryPink,
                        ),
                        borderRadius: BorderRadius.circular(10)),
                    child: MyText(
                      title: "Transfer",
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: getMargin(left: 16),
                  child: MyText(
                    title: "Upcoming Events",
                    clr: ColorConstant.whiteA700,
                    fontSize: getFontSize(16),
                    customWeight: FontWeight.w600,
                  ),
                ),
                Container(
                  margin: getMargin(top: 15, bottom: 20, left: 16, right: 16),
                  height: 200,
                  child: TrendingCard(
                    onTap: ()=> Get.toNamed(Routes.UPCOMING_EVENT),
                      imageUrl: ImageConstant.splashBg,
                      // Replace with your image URL
                      title: 'Cyberpunk',
                      type: "Music Concert",
                      price: '\$110',
                      isExpanded: true),
                ),
                CustomListView(title: "My Tickets",onTap: ()=> Get.toNamed(Routes.PURCHASED_TICKET,arguments: {Constants.paramShowBack :true}),),
                CustomListView(title: "Expired Tickets",onTap: ()=> Get.toNamed(Routes.PURCHASED_TICKET,arguments: {Constants.paramTicket: 7})),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
