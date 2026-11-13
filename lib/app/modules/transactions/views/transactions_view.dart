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
                  color: ColorConstant.hairline),
              borderRadius: BorderRadius.circular(12)),
          padding: getPadding(all: 8),
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
            height: getSize(48),
            padding: getPadding(all: 4),
            decoration: BoxDecoration(
                color: ColorConstant.elevated,
                borderRadius: BorderRadius.circular(14)),
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
            child: Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              if (controller.loadError.value != null) {
                return Center(
                  child: Padding(
                    padding: getPadding(all: 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        MyText(
                          title: "Couldn't load transactions",
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
                        CustomButton(
                          text: "Retry",
                          onTap: () => controller.fetchOrders(),
                        ),
                      ],
                    ),
                  ),
                );
              }
              if (controller.orders.isEmpty) {
                return Center(
                  child: MyText(
                    title: 'No transactions yet',
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    fontSize: 16,
                    clr: ColorConstant.white60,
                  ),
                );
              }
              return ListView.builder(
                padding: EdgeInsets.zero,
                physics: const BouncingScrollPhysics(),
                itemCount: controller.orders.length,
                itemBuilder: (context, index) {
                  final order = controller.orders[index];
                  final status = controller.orderStatus(order);
                  return listItem(
                      date: controller.orderDate(order),
                      price: controller.orderTotal(order),
                      tickets:
                          '${controller.itemsLabel(order)}${status.isNotEmpty ? ' · $status' : ''}');
                },
              );
            }),
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
      child: Obx(() {
        final selected = controller.selectedTab.value == index;
        return Container(
          height: getSize(40),
          alignment: Alignment.center,
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: selected ? ColorConstant.whiteA700 : Colors.transparent),
          child: MyText(
            title: name,
            family: 'Manrope',
            fontSize: 14,
            customWeight: FontWeight.w600,
            clr: selected
                ? ColorConstant.bg
                : ColorConstant.white60,
          ),
        );
      }),
    );
  }

  Widget listItem(
      {required String date, required String tickets, required double price}) {
    return Container(
      height: 80,
      margin: getMargin(bottom: 10),
      padding: getPadding(left: 16, right: 16, top: 12, bottom: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
          color: ColorConstant.elevated,
          borderRadius: BorderRadius.circular(16)),
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
                family: 'Inter',
                fontSize: 14,
                customWeight: FontWeight.w500,
                clr: ColorConstant.white60,
              ),
              MyText(
                title: tickets,
                family: 'Inter',
                fontSize: 14,
                customWeight: FontWeight.w400,
                clr: ColorConstant.white60,
              ),
            ],
          ),
          MyText(
            title: "\$${price == price.roundToDouble() ? price.toStringAsFixed(0) : price.toStringAsFixed(2)}",
            family: 'Manrope',
            fontSize: 16,
            customWeight: FontWeight.w700,
          ),
        ],
      ),
    );
  }
}
