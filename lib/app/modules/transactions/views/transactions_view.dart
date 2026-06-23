import 'package:block_tix/app/data/core/app_export.dart';

import '../controllers/transactions_controller.dart';

class TransactionsView extends GetView<TransactionsController> {
  const TransactionsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: "All Transactions",
      centerTitle: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      actions: [
        Container(
          decoration: BoxDecoration(
              border: Border.all(
                  color: ColorConstant.whiteA700),
              borderRadius: BorderRadius.circular(5)),
          padding: getPadding(all: 5),
          child: CustomImageView(
            onTap: ()=> controller.showFilterDialog(context),
            svgPath: ImageConstant.filter,
            height: 20,
          )
        )
      ],
      child: Column(
        children: [
          Container(
            width: size.width,
            height: getSize(45),
            decoration: BoxDecoration(
                color: ColorConstant.primaryPink.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(15)),
            child: Row(
              children: [
                Expanded(child: _tabWidget(name: "Asks", index: 0)),
                Expanded(child: _tabWidget(name: "Bids", index: 1)),
                Expanded(child: _tabWidget(name: "Sales", index: 2)),
              ],
            ),
          ),
          SizedBox(
            height: getSize(20),
          ),
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              physics: const BouncingScrollPhysics(),
              itemCount: 8,
              itemBuilder: (context, index) {
                return listItem(
                    date: "07:23:11, 9:51 PM",
                    price: 200,
                    tickets: "2 Platinum Tickets");
              },
            ),
          ),
          SizedBox(
            height: getSize(20),
          ),
        ],
      ),
    );
  }

  Widget _tabWidget({required String name, required int index}) {
    return GestureDetector(
      onTap: () {
        controller.selectedTab.value = index;
      },
      child: Obx(() => Container(
            height: getSize(45),
            alignment: Alignment.center,
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(15),
                color: controller.selectedTab.value == index
                    ? ColorConstant.gray50.withValues(alpha: 0.5)
                    : null,
                border: Border.all(
                  color: controller.selectedTab.value == index
                      ? ColorConstant.gray50
                      : Colors.transparent,
                )),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                MyText(
                  title: name,
                  fontSize: 16,
                  customWeight: FontWeight.w600,
                ),
              ],
            ),
          )),
    );
  }

  Widget listItem(
      {required String date, required String tickets, required int price}) {
    return Container(
      height: 80,
      padding: getPadding(left: 15, right: 15, top: 8, bottom: 8),
      alignment: Alignment.center,
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
              color: ColorConstant.blue.withValues(alpha: 0.5), width: 0.3)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              MyText(
                title: date,
                fontSize: 16,
                customWeight: FontWeight.w600,
              ),
              MyText(
                title: tickets,
                fontSize: 14,
                customWeight: FontWeight.w400,
                clr: ColorConstant.white60,
              ),
            ],
          ),
          MyText(
            title: "\$$price",
            fontSize: 16,
            customWeight: FontWeight.w600,
          ),
        ],
      ),
    );
  }
}
