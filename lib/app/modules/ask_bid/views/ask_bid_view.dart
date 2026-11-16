import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/ask_bid_controller.dart';

class AskBidView extends GetView<AskBidController> {
  const AskBidView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: true,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      bottomNavigationBar: Obx(() {
        controller.priceVersion.value;
        final count = controller.selectedCount;
        final price = formatCents(controller.priceCents);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  count == 0
                      ? 'Choose tickets to sell'
                      : '$count ticket${count == 1 ? '' : 's'} · $price each',
                  style: sahraText(color: ColorConstant.nightMuted, size: 13),
                ),
                const SizedBox(height: 8),
                SahraPillButton(
                  label: controller.isListing.value
                      ? 'Listing…'
                      : 'List $count ticket${count == 1 ? '' : 's'}',
                  enabled: controller.canList,
                  onTap: controller.listSelected,
                ),
              ],
            ),
          ),
        );
      }),
      child: Obx(() {
        if (controller.isLoading.value) {
          return Center(
              child: CircularProgressIndicator(color: ColorConstant.gold));
        }
        if (controller.loadError.value != null) {
          return SahraEmptyState(
            title: "Couldn't load tickets",
            message: controller.loadError.value,
            actionLabel: 'Retry',
            onAction: controller.load,
          );
        }
        return RefreshIndicator(
          color: ColorConstant.gold,
          backgroundColor: ColorConstant.nightSurface,
          onRefresh: controller.load,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 120),
            children: [
              _header(),
              SahraSectionLabel('Which tickets?',
                  trailing: Obx(() => Text(
                      '${controller.selectedCount} selected',
                      style: sahraText(
                          color: ColorConstant.nightMuted, size: 12)))),
              if (controller.sellableTickets.isEmpty)
                _emptySellable()
              else
                ...controller.sellableTickets.map(_ticketTile),
              SahraSectionLabel('Price & rules'),
              _priceCard(),
              SahraSectionLabel('Selling'),
              if (controller.listings.isEmpty)
                _emptyListings()
              else
                ...controller.listings.map(_listingTile),
            ],
          ),
        );
      }),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 20, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconButton(
            onPressed: Get.back,
            icon: Icon(Icons.arrow_back_ios_new_rounded,
                color: ColorConstant.whiteA700, size: 20),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('I can\'t go',
                    style: sahraText(color: ColorConstant.gold, size: 13)),
                Text('Sell tickets',
                    style: sahraText(size: 26, weight: FontWeight.w800)),
                const SizedBox(height: 4),
                Obx(() => Text(
                      controller.eventTitle.value.isEmpty
                          ? 'Choose what to sell, set a price, then manage the sale.'
                          : controller.eventTitle.value,
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 13),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptySellable() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SahraCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('No tickets to sell',
                style: sahraText(size: 16, weight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              'Tickets you hold that are not listed yet will show up here.',
              style: sahraText(color: ColorConstant.nightMuted, size: 13),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ticketTile(Map<String, dynamic> ticket) {
    final code = ticket['code']?.toString() ?? '';
    final tier = ticket['tierName']?.toString() ?? '';
    final section = ticket['sectionName']?.toString() ?? '';
    return Obx(() {
      final isSelected = controller.isSelected(code);
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SahraCard(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          color: isSelected ? ColorConstant.nightElevated : null,
          border: isSelected ? ColorConstant.gold : null,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => controller.toggleTicket(code),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? ColorConstant.gold : Colors.transparent,
                    border: Border.all(
                      color: isSelected
                          ? ColorConstant.gold
                          : ColorConstant.nightBorder,
                      width: 1.5,
                    ),
                  ),
                  child: isSelected
                      ? Icon(Icons.check_rounded,
                          color: ColorConstant.night, size: 16)
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(ticket['eventTitle']?.toString() ?? 'Event',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: sahraText(size: 15, weight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Text(
                        '${formatEventDate(ticket['eventStartsAt']?.toString())} · ${ticket['eventLocation']?.toString().isNotEmpty == true ? ticket['eventLocation'] : 'Venue TBD'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12),
                      ),
                      const SizedBox(height: 8),
                      Wrap(spacing: 8, runSpacing: 4, children: [
                        SahraStatusPill(section.isNotEmpty
                            ? section
                            : (tier.isEmpty ? 'Ticket' : tier)),
                        Text(code,
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 11)),
                      ]),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _priceCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SahraCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Set your price',
                style: sahraText(size: 16, weight: FontWeight.w700)),
            const SizedBox(height: 10),
            Obx(() {
              controller.priceVersion.value;
              return TextField(
                controller: controller.priceController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                style: sahraText(size: 22, weight: FontWeight.w800),
                decoration: InputDecoration(
                  prefixText: '\$ ',
                  prefixStyle: sahraText(size: 22, weight: FontWeight.w800),
                  hintText: '0',
                  hintStyle:
                      sahraText(color: ColorConstant.nightMuted, size: 22),
                  border: InputBorder.none,
                ),
              );
            }),
            const SizedBox(height: 10),
            Text(
              'Each selected ticket is listed at this price. Paid out after the event. Cancel any time before it sells.',
              style: sahraText(color: ColorConstant.nightMuted, size: 13),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyListings() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text('No listings yet.',
          style: sahraText(color: ColorConstant.nightMuted, size: 13)),
    );
  }

  Widget _listingTile(Map<String, dynamic> listing) {
    final status = listing['status']?.toString() ?? '';
    final cents = listing['priceCents'];
    final price = cents is num ? formatCents(cents) : '';
    final active = status == 'ACTIVE';
    final code =
        listing['ticketCode']?.toString() ?? listing['code']?.toString() ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SahraCard(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(Icons.sell_outlined, color: ColorConstant.gold, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(listing['eventTitle']?.toString() ?? 'Event',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: sahraText(size: 15, weight: FontWeight.w600)),
                  Text(
                    '${listing['tierName']?.toString() ?? 'Ticket'} · $price',
                    style: sahraText(color: ColorConstant.nightMuted, size: 12),
                  ),
                  if (code.isNotEmpty)
                    Text(code,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 11)),
                ],
              ),
            ),
            SahraStatusPill(status,
                color: active ? ColorConstant.gold : ColorConstant.nightMuted),
            if (active) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => controller.cancelListing(listing),
                child: Text('Cancel',
                    style: sahraText(
                        color: ColorConstant.rumman,
                        size: 13,
                        weight: FontWeight.w600)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
