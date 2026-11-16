import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:block_tix/app/services/api_service.dart';

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
                    const MyText(
                      title: "Balance",
                      family: 'Inter',
                      fontSize: 13,
                    ),
                    const SizedBox(
                      height: 3,
                    ),
                    Row(
                      children: [
                        const MyText(
                          title: "\$2000",
                          family: 'Manrope',
                          fontSize: 30,
                          customWeight: FontWeight.w800,
                          height: 1.1,
                        ),
                        const SizedBox(
                          width: 10,
                        ),
                        MyText(
                          title: "USD",
                          family: 'Inter',
                          fontSize: 14,
                          clr: ColorConstant.white60,
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
                          family: 'Inter',
                          fontSize: 13,
                          clr: ColorConstant.white60,
                        ),
                        const SizedBox(
                          width: 5,
                        ),
                        MyText(
                          title: "+10%",
                          family: 'Inter',
                          clr: ColorConstant.successGreen,
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
                        color: ColorConstant.whiteA700,
                        borderRadius: BorderRadius.circular(999)),
                    child: MyText(
                      title: "Deposit",
                      family: 'Manrope',
                      customWeight: FontWeight.w600,
                      fontSize: 14,
                      clr: ColorConstant.canvas,
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
                        color: ColorConstant.elevated,
                        border: Border.all(
                          color: ColorConstant.hairline,
                        ),
                        borderRadius: BorderRadius.circular(999)),
                    child: const MyText(
                      title: "Withdraw",
                      family: 'Manrope',
                      customWeight: FontWeight.w600,
                      fontSize: 14,
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
                        color: ColorConstant.elevated,
                        border: Border.all(
                          color: ColorConstant.hairline,
                        ),
                        borderRadius: BorderRadius.circular(999)),
                    child: const MyText(
                      title: "Transfer",
                      family: 'Manrope',
                      customWeight: FontWeight.w600,
                      fontSize: 14,
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
                // Real tickets from GET /tickets with loading/empty/error.
                Obx(() {
                  if (controller.isLoading.value) {
                    return Padding(
                      padding: getPadding(top: 40, bottom: 40),
                      child: Center(
                        child: SizedBox(
                          height: 28,
                          width: 28,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: ColorConstant.primaryAccent,
                          ),
                        ),
                      ),
                    );
                  }
                  if (controller.loadError.value != null) {
                    return Padding(
                      padding: getPadding(all: 24),
                      child: Column(
                        children: [
                          MyText(
                            title: "Couldn't load tickets",
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
                          PrimaryPillButton(
                            text: 'Retry',
                            onTap: () => controller.fetchTickets(),
                          ),
                        ],
                      ),
                    );
                  }
                  if (controller.tickets.isEmpty) {
                    return Padding(
                      padding: getPadding(top: 40, bottom: 40),
                      child: Center(
                        child: MyText(
                          title: 'No tickets yet',
                          family: 'Manrope',
                          customWeight: FontWeight.w600,
                          fontSize: 16,
                          clr: ColorConstant.white60,
                        ),
                      ),
                    );
                  }
                  final valid = controller.validTickets;
                  final others = controller.otherTickets;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (valid.isNotEmpty) ...[
                        Container(
                          margin: getMargin(left: 16),
                          child: MyText(
                            title: "My Tickets",
                            family: 'Manrope',
                            customWeight: FontWeight.w600,
                            fontSize: 18,
                          ),
                        ),
                        ...valid.map((t) => _ticketCard(t)),
                      ],
                      if (others.isNotEmpty) ...[
                        Container(
                          margin: getMargin(left: 16, top: 16),
                          child: MyText(
                            title: "Other Tickets",
                            family: 'Manrope',
                            customWeight: FontWeight.w600,
                            fontSize: 18,
                          ),
                        ),
                        ...others.map((t) => _ticketCard(t)),
                      ],
                      _listingsSection(),
                      const SizedBox(height: 20),
                    ],
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// One wallet ticket card: event, date, location, tier, code and status.
  Widget _ticketCard(Map<String, dynamic> ticket) {
    final status = ticket['status']?.toString() ?? '';
    final statusColor = status == 'VALID'
        ? ColorConstant.successGreen
        : ColorConstant.warningOrange;
    return Container(
      margin: getMargin(left: 16, right: 16, top: 10),
      padding: getPadding(left: 16, right: 16, top: 14, bottom: 14),
      decoration: BoxDecoration(
        color: ColorConstant.elevated,
        border: Border.all(color: ColorConstant.hairline),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText(
                  title: ticket['eventTitle']?.toString() ?? 'Event',
                  family: 'Manrope',
                  customWeight: FontWeight.w600,
                  fontSize: 15,
                  clr: ColorConstant.whiteA700,
                ),
                const SizedBox(height: 4),
                MyText(
                  title: formatEventDate(
                      ticket['eventStartsAt']?.toString()),
                  family: 'Inter',
                  fontSize: 12,
                  clr: ColorConstant.white60,
                ),
                const SizedBox(height: 2),
                MyText(
                  title: ticket['eventLocation']?.toString() ?? '',
                  family: 'Inter',
                  fontSize: 12,
                  clr: ColorConstant.white60,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    MyText(
                      title: ticket['tierName']?.toString() ?? '',
                      family: 'Inter',
                      fontSize: 12,
                      customWeight: FontWeight.w500,
                    ),
                    const SizedBox(width: 8),
                    MyText(
                      title: ticket['code']?.toString() ?? '',
                      family: 'Inter',
                      fontSize: 11,
                      clr: ColorConstant.white60,
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: getPadding(left: 10, right: 10, top: 4, bottom: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: statusColor.withValues(alpha: 0.4)),
            ),
            child: MyText(
              title: status.isEmpty ? '—' : status,
              family: 'Inter',
              fontSize: 11,
              customWeight: FontWeight.w600,
              clr: statusColor,
            ),
          ),
          if (status == 'VALID') ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => _sellTicketDialog(ticket),
              child: Container(
                padding: getPadding(left: 12, right: 12, top: 6, bottom: 6),
                decoration: BoxDecoration(
                  color: ColorConstant.gold,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: MyText(
                  title: 'Sell',
                  family: 'Inter',
                  fontSize: 11,
                  customWeight: FontWeight.w700,
                  clr: ColorConstant.night,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// "Your listings" — resale management (Sahra screens 22/23 essence):
  /// active listings with a cancel action, sold ones shown as history.
  Widget _listingsSection() {
    return Obx(() {
      if (controller.listings.isEmpty) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: getMargin(left: 16, top: 16),
            child: MyText(
              title: "Your Listings",
              family: 'Manrope',
              customWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
          ...controller.listings.map((l) => _listingCard(l)),
        ],
      );
    });
  }

  Widget _listingCard(Map<String, dynamic> listing) {
    final status = listing['status']?.toString() ?? '';
    final isActive = status == 'ACTIVE';
    final priceCents = listing['priceCents'];
    final priceLabel = priceCents is num
        ? '\$${(priceCents / 100).toStringAsFixed(2)}'
        : '—';
    return Container(
      margin: getMargin(left: 16, right: 16, top: 10),
      padding: getPadding(left: 16, right: 16, top: 12, bottom: 12),
      decoration: BoxDecoration(
        color: ColorConstant.elevated,
        border: Border.all(color: ColorConstant.hairline),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText(
                  title: listing['eventTitle']?.toString() ?? 'Event',
                  family: 'Manrope',
                  customWeight: FontWeight.w600,
                  fontSize: 14,
                  clr: ColorConstant.whiteA700,
                ),
                const SizedBox(height: 3),
                MyText(
                  title:
                      '${listing['tierName']?.toString() ?? ''} · $priceLabel',
                  family: 'Inter',
                  fontSize: 12,
                  clr: ColorConstant.white60,
                ),
              ],
            ),
          ),
          if (isActive)
            GestureDetector(
              onTap: () => _cancelListing(listing),
              child: Container(
                padding: getPadding(left: 12, right: 12, top: 6, bottom: 6),
                decoration: BoxDecoration(
                  border: Border.all(color: ColorConstant.hairline),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: MyText(
                  title: 'Cancel',
                  family: 'Inter',
                  fontSize: 11,
                  customWeight: FontWeight.w600,
                  clr: ColorConstant.white60,
                ),
              ),
            )
          else
            MyText(
              title: status,
              family: 'Inter',
              fontSize: 11,
              customWeight: FontWeight.w600,
              clr: status == 'SOLD'
                  ? ColorConstant.successGreen
                  : ColorConstant.white60,
            ),
        ],
      ),
    );
  }

  Future<void> _cancelListing(Map<String, dynamic> listing) async {
    final code = listing['ticketCode']?.toString() ?? '';
    if (code.isEmpty) return;
    try {
      await ApiService.cancelListing(code);
      await controller.fetchTickets();
      CustomSnackBar.showCustomToast(message: 'Listing cancelled');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _sellTicketDialog(Map<String, dynamic> ticket) {
    final code = ticket['code']?.toString() ?? '';
    if (code.isEmpty) return;
    final priceController = TextEditingController();
    Get.dialog(
      AlertDialog(
        backgroundColor: ColorConstant.elevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: MyText(
          title: 'Sell ticket',
          family: 'Manrope',
          customWeight: FontWeight.w700,
          fontSize: 18,
          clr: ColorConstant.whiteA700,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText(
              title: ticket['eventTitle']?.toString() ?? '',
              family: 'Inter',
              fontSize: 13,
              clr: ColorConstant.white60,
            ),
            const SizedBox(height: 14),
            TextField(
              controller: priceController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Your price (USD)',
                labelStyle: const TextStyle(color: Colors.white60),
                enabledBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(color: Colors.white24),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
          TextButton(
            onPressed: () async {
              final dollars = double.tryParse(priceController.text.trim());
              if (dollars == null || dollars <= 0) {
                CustomSnackBar.showCustomErrorToast(
                    message: 'Enter a valid price');
                return;
              }
              Get.back();
              try {
                await ApiService.createListing(code, (dollars * 100).round());
                await controller.fetchTickets();
                CustomSnackBar.showCustomToast(
                    message: 'Ticket listed for sale');
              } catch (e) {
                CustomSnackBar.showCustomErrorToast(
                    message: e.toString().replaceFirst('Exception: ', ''));
              }
            },
            child: Text('List it',
                style: TextStyle(color: ColorConstant.gold)),
          ),
        ],
      ),
    );
  }
}
