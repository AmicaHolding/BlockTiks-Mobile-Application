import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/sahra_v3.dart';
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
              // W1: cash / pending / credits balances sit above the plan list.
              const SahraWalletCard(),
              _summary(),
              // Plans: invites "waiting on you" come first (I-rules).
              if (controller.invites.isNotEmpty) ...[
                SahraSectionLabel('Waiting on you',
                    trailing: Text('${controller.invites.length} invites',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12))), ...controller.invites.map(_inviteTile),
              ],
              SahraSectionLabel('Holding',
                  trailing: Text('${controller.validTickets.length} active',
                      style: sahraText(
                          color: ColorConstant.nightMuted, size: 12))),
              if (controller.validTickets.isEmpty)
                Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Text('No active tickets.',
                        style: TextStyle(color: ColorConstant.nightMuted))), ...controller.validTickets.map(_ticketTile),
              SahraSectionLabel('Selling'),
              if (controller.listings.isEmpty)
                Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 8),
                    child: Text('Nothing listed right now.',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 13))), ...controller.listings.map(_listingTile),
              if (controller.waitingOffers.isNotEmpty) ...[
                SahraSectionLabel('Waiting',
                    trailing: Text('Set-your-price orders',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12))), ...controller.waitingOffers.map(_offerTile),
              ],
              if (controller.otherTickets.isNotEmpty) ...[
                SahraSectionLabel('Past / inactive'), ...controller.otherTickets.map(_ticketTile),
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
          Text('Plans',
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
    final orderId = ticket['orderId']?.toString() ?? '';
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: GestureDetector(
            onTap: orderId.isEmpty
                ? null
                : () => Get.toNamed(Routes.PURCHASED_TICKET,
                    arguments: {
                      'orderId': orderId,
                      'ticketCode': ticket['code']?.toString() ?? '',
                      // The ticket itself — /orders/:id only serves the
                      // buyer, so a gift recipient renders from this.
                      'ticket': ticket,
                    }),
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
                        '${formatEventDate(ticket['eventStartsAt']?.toString(), tz: ticket['venueTimezone']?.toString())} · ${location.isEmpty ? 'Venue TBD' : location}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 8, runSpacing: 4, children: [
                      SahraStatusPill(section.isNotEmpty
                          ? section
                          : (tier.isEmpty ? 'Ticket' : tier)),
                      SahraStatusPill(status.isEmpty ? '-' : status,
                          color: status == 'VALID'
                              ? ColorConstant.gold
                              : ColorConstant.nightMuted),
                      Text(ticket['code']?.toString() ?? '',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 11)),
                    ]),
                  ])),
              if (sellable) ...[
                const SizedBox(width: 8),
                GestureDetector(
                    onTap: () => Get.toNamed(Routes.SEND_TICKETS, arguments: {
                        'ticketCode': ticket['code']?.toString() ?? '',
                        'eventTitle':
                            ticket['eventTitle']?.toString() ?? '',
                    }),
                    child: Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                            color: ColorConstant.nightSurface,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                                color: ColorConstant.gold)),
                        child: Icon(Icons.send_outlined,
                            color: ColorConstant.gold, size: 16))),
                const SizedBox(width: 8),
                GestureDetector(
                    onTap: () => Get.toNamed(Routes.ASK_BID, arguments: {
                        'code': ticket['code']?.toString() ?? '',
                        'title':
                            ticket['eventTitle']?.toString() ?? '',
                    }),
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
            ]))));
  }

  Widget _listingTile(Map<String, dynamic> listing) {
    final status = listing['status']?.toString() ?? '';
    final cents = listing['priceCents'];
    final price =
        cents is num ? formatMoney(cents, listing['currency']?.toString()) : '';
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
                    child: Text('Stop selling',
                        style: sahraText(
                            color: ColorConstant.rumman,
                            size: 13,
                            weight: FontWeight.w600))),
              ],
            ])));
  }

  /// "Waiting" row, an ACTIVE Set-your-price order (price watch).
  Widget _offerTile(Map<String, dynamic> offer) {
    final cents = offer['maxPriceCents'] ?? offer['priceCents'];
    final price =
        cents is num ? formatMoney(cents, offer['currency']?.toString()) : '';
    final qty = (offer['quantity'] as num?)?.toInt() ?? 1;
    final label = offer['tierName']?.toString() ??
        offer['sectionName']?.toString() ??
        'Ticket';
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SahraCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Icon(Icons.bolt_outlined, color: ColorConstant.gold, size: 22),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(offer['eventTitle']?.toString() ?? 'Event',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(size: 15, weight: FontWeight.w600)),
                    Text('$qty × $label · up to $price',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                  ])),
              GestureDetector(
                  onTap: () => _cancelOffer(offer),
                  child: Text('Cancel',
                      style: sahraText(
                          color: ColorConstant.rumman,
                          size: 13,
                          weight: FontWeight.w600))),
            ])));
  }

  /// Personal invite row — opens the `/i/{code}` guest landing.
  Widget _inviteTile(Map<String, dynamic> invite) {
    final name = invite['org_name']?.toString() ??
        invite['event_title']?.toString() ??
        invite['title']?.toString() ??
        'Invite';
    final role = invite['role']?.toString() ?? '';
    final code = invite['code']?.toString() ?? invite['id']?.toString() ?? '';
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: GestureDetector(
            onTap: () =>
                code.isNotEmpty ? Get.toNamed('/i/$code') : null,
            child: SahraCard(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Icon(Icons.mail_outline_rounded,
                      color: ColorConstant.gold, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style:
                                sahraText(size: 15, weight: FontWeight.w600)),
                        Text(role.isEmpty ? 'Personal invite' : 'Invite · $role',
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 12)),
                      ])),
                  Icon(Icons.chevron_right,
                      color: ColorConstant.nightMuted, size: 20),
                ]))));
  }

  Future<void> _cancelOffer(Map<String, dynamic> offer) async {
    final id = (offer['id'] ?? offer['offerId'])?.toString() ?? '';
    if (id.isEmpty) return;
    try {
      await ApiService.cancelOffer(id);
      await controller.fetchTickets();
      CustomSnackBar.showCustomToast(message: 'Price watch cancelled');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
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
}
