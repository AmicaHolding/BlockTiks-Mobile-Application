import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';

import '../controllers/wallet_controller.dart';

class WalletView extends GetView<WalletController> {
  WalletView({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        color: ColorConstant.gold,
        backgroundColor: ColorConstant.nightSurface,
        onRefresh: controller.fetchTickets,
        child: CustomScrollView(slivers: [
          SliverToBoxAdapter(child: _header()),
          Obx(() {
            if (controller.isLoading.value)
              return SliverToBoxAdapter(
                  child: Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(
                          child: CircularProgressIndicator(
                              color: ColorConstant.gold))));
            if (controller.loadError.value != null)
              return SliverToBoxAdapter(
                  child: SahraEmptyState(
                      title: "Couldn't load tickets",
                      message: controller.loadError.value,
                      actionLabel: 'Retry',
                      onAction: controller.fetchTickets));
            return SliverList(
                delegate: SliverChildListDelegate([
              _summary(),
              SahraSectionLabel('Holding',
                  trailing: Text('${controller.validTickets.length} active',
                      style: sahraText(
                          color: ColorConstant.nightMuted, size: 12))),
              if (controller.validTickets.isEmpty)
                Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Text('No active tickets.',
                        style: TextStyle(color: ColorConstant.nightMuted))),
              ...controller.validTickets.map(_ticketTile),
              SahraSectionLabel('Selling'),
              ...controller.listings.map(_listingTile),
              if (controller.otherTickets.isNotEmpty) ...[
                SahraSectionLabel('Past / inactive'),
                ...controller.otherTickets.map(_ticketTile),
              ],
              const SizedBox(height: 32),
            ]));
          }),
        ]),
      ),
    );
  }

  Widget _header() {
    return const Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Tickets',
              style: TextStyle(
                  color: Color(0xFFF2D9A0),
                  fontSize: 13,
                  fontWeight: FontWeight.w600)),
          SizedBox(height: 2),
          Text("Everything you're holding, selling, and waiting on.",
              style: TextStyle(color: Color(0xFFC9D3DF), fontSize: 15)),
        ]));
  }

  Widget _summary() {
    return Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
        child: SahraCard(
            child: Row(children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('Active tickets',
                    style:
                        sahraText(size: 12, color: ColorConstant.nightMuted)),
                const SizedBox(height: 4),
                Obx(() => Text('${controller.validTickets.length}',
                    style: sahraText(size: 28, weight: FontWeight.w800))),
              ])),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('Listings',
                    style:
                        sahraText(size: 12, color: ColorConstant.nightMuted)),
                const SizedBox(height: 4),
                Obx(() => Text('${controller.listings.length}',
                    style: sahraText(size: 28, weight: FontWeight.w800))),
              ])),
          Icon(Icons.confirmation_number_outlined,
              color: ColorConstant.gold, size: 36),
        ])));
  }

  Widget _ticketTile(Map<String, dynamic> ticket) {
    final status = ticket['status']?.toString() ?? '';
    final tier = ticket['tierName']?.toString() ?? '';
    final section = ticket['sectionName']?.toString() ?? '';
    final location = ticket['eventLocation']?.toString() ?? '';
    final sellable = status == 'VALID';
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SahraCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(ticket['eventTitle']?.toString() ?? 'Event',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(size: 16, weight: FontWeight.w600)),
                    const SizedBox(height: 3),
                    Text(
                        '${formatEventDate(ticket['eventStartsAt']?.toString())} · ${location.isEmpty ? 'Venue TBD' : location}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 4, children: [
                      SahraStatusPill(section.isNotEmpty
                          ? section
                          : (tier.isEmpty ? 'Ticket' : tier)),
                      SahraStatusPill(status.isEmpty ? '—' : status,
                          color: status == 'VALID'
                              ? ColorConstant.gold
                              : ColorConstant.nightMuted),
                      Text(ticket['code']?.toString() ?? '',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 11)),
                    ]),
                  ])),
              if (sellable) ...[
                const SizedBox(width: 10),
                GestureDetector(
                    onTap: () => _sellTicketDialog(ticket),
                    child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 9),
                        decoration: BoxDecoration(
                            color: ColorConstant.gold,
                            borderRadius: BorderRadius.circular(999)),
                        child: Text('Sell',
                            style: sahraText(
                                color: ColorConstant.night,
                                size: 13,
                                weight: FontWeight.w700)))),
              ],
            ])));
  }

  Widget _listingTile(Map<String, dynamic> listing) {
    final status = listing['status']?.toString() ?? '';
    final cents = listing['priceCents'];
    final price = cents is num ? formatCents(cents) : '';
    final active = status == 'ACTIVE';
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SahraCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
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
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                  ])),
              SahraStatusPill(status,
                  color:
                      active ? ColorConstant.gold : ColorConstant.nightMuted),
              if (active) ...[
                const SizedBox(width: 8),
                GestureDetector(
                    onTap: () => _cancelListing(listing),
                    child: Text('Cancel',
                        style: sahraText(
                            color: ColorConstant.rumman,
                            size: 13,
                            weight: FontWeight.w600))),
              ],
            ])));
  }

  Future<void> _cancelListing(Map<String, dynamic> listing) async {
    final code =
        listing['code']?.toString() ?? listing['ticketCode']?.toString() ?? '';
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
    Get.dialog(AlertDialog(
      backgroundColor: ColorConstant.nightSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Text('Sell ticket',
          style: sahraText(size: 18, weight: FontWeight.w700)),
      content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ticket['eventTitle']?.toString() ?? '',
                style: sahraText(color: ColorConstant.nightMuted, size: 13)),
            const SizedBox(height: 14),
            TextField(
                controller: priceController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                style: sahraText(),
                decoration: InputDecoration(
                    labelText: 'Your price (USD)',
                    labelStyle: sahraText(color: ColorConstant.nightMuted),
                    enabledBorder: UnderlineInputBorder(
                        borderSide:
                            BorderSide(color: ColorConstant.nightMuted)))),
          ]),
      actions: [
        TextButton(
            onPressed: Get.back,
            child: Text('Cancel',
                style: sahraText(color: ColorConstant.nightMuted))),
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
                style: sahraText(
                    color: ColorConstant.gold, weight: FontWeight.w700))),
      ],
    ));
  }
}
