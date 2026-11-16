import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/creator_event_controller.dart';

class CreatorEventView extends GetView<CreatorEventController> {
  const CreatorEventView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: false,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      child: Obx(() {
        if (controller.isLoading.value && controller.event.value == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (controller.loadError.value != null &&
            controller.event.value == null) {
          return SahraEmptyState(
            title: "Couldn't load event",
            message: controller.loadError.value,
            actionLabel: 'Retry',
            onAction: controller.loadEvent,
          );
        }
        return RefreshIndicator(
          onRefresh: controller.loadEvent,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              _header(),
              const SizedBox(height: 18),
              _statsRow(),
              const SizedBox(height: 14),
              _doorActions(),
              const SizedBox(height: 22),
              _tiersSection(),
              const SizedBox(height: 22),
              _studioLinks(),
            ],
          ),
        );
      }),
    );
  }

  Widget _header() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _backButton(),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                controller.venueLabel.isEmpty
                    ? 'Event snapshot'
                    : 'Tonight · ${controller.venueLabel}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: sahraText(
                    color: ColorConstant.gold,
                    size: 12,
                    weight: FontWeight.w700,
                    letterSpacing: 1.1),
              ),
            ),
            Obx(() => SahraStatusPill(
                  controller.statusLabel,
                  color: controller.eventStatus.value == 'PUBLISHED'
                      ? ColorConstant.successGreen
                      : controller.eventStatus.value == 'DRAFT'
                          ? ColorConstant.warningOrange
                          : ColorConstant.nightMuted,
                  background: ColorConstant.nightSurface,
                )),
          ],
        ),
        const SizedBox(height: 16),
        Obx(() => Text(
              controller.eventTitle.value,
              style: sahraText(size: 28, weight: FontWeight.w700, height: 1.15),
            )),
        const SizedBox(height: 6),
        Obx(() => Text(
              [
                if (controller.startsAtLabel.isNotEmpty)
                  controller.startsAtLabel,
                if (controller.venueLabel.isNotEmpty) controller.venueLabel,
              ].join(' · '),
              style: sahraText(color: ColorConstant.nightMuted, size: 13),
            )),
      ],
    );
  }

  Widget _backButton() {
    return GestureDetector(
      onTap: () => Get.back(),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.nightBorder),
        ),
        child: Icon(Icons.arrow_back_rounded,
            color: ColorConstant.whiteA700, size: 19),
      ),
    );
  }

  Widget _statsRow() {
    return Obx(() => Row(
          children: [
            Expanded(
                child: _statCard('Sold', '${controller.ticketsSold.value}',
                    'of ${controller.capacity.value}')),
            const SizedBox(width: 10),
            Expanded(
              child: _statCard(
                'Checked in',
                '${controller.checkedIn.value}',
                '${controller.checkInPercent}% live',
                accent: true,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
                child: _statCard('Gross revenue',
                    formatDollars(controller.revenue.value), 'ticket sales')),
          ],
        ));
  }

  Widget _statCard(String label, String value, String caption,
      {bool accent = false}) {
    return SahraCard(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: sahraText(color: ColorConstant.nightMuted, size: 11)),
          const SizedBox(height: 5),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: sahraText(
                  color: accent
                      ? ColorConstant.successGreen
                      : ColorConstant.whiteA700,
                  size: 21,
                  weight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(caption,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: sahraText(color: ColorConstant.nightMuted, size: 10)),
        ],
      ),
    );
  }

  Widget _doorActions() {
    return Row(
      children: [
        Expanded(
          child: _actionButton(
            icon: Icons.qr_code_scanner_rounded,
            label: 'Scan tickets',
            filled: true,
            onTap: () => Get.toNamed(Routes.MY_SCANNER, arguments: {
              'eventId': controller.eventId.value,
              'title': controller.eventTitle.value,
            }),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _actionButton(
            icon: Icons.groups_rounded,
            label: 'Guest list',
            onTap: () => Get.toNamed(Routes.ALL_GUESTS, arguments: {
              'eventId': controller.eventId.value,
            }),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _actionButton(
            icon: Icons.campaign_rounded,
            label: 'Message',
            onTap: () => Get.toNamed(Routes.BROADCAST_MESSAGE, arguments: {
              'eventId': controller.eventId.value,
              'title': controller.eventTitle.value,
            }),
          ),
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          color: filled ? ColorConstant.gold : ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(16),
          border: filled ? null : Border.all(color: ColorConstant.nightBorder),
        ),
        child: Column(
          children: [
            Icon(icon,
                color: filled ? ColorConstant.night : ColorConstant.gold,
                size: 20),
            const SizedBox(height: 5),
            Text(label,
                style: sahraText(
                    color:
                        filled ? ColorConstant.night : ColorConstant.whiteA700,
                    size: 12,
                    weight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _tiersSection() {
    return Obx(() {
      if (controller.tiers.isEmpty) {
        return SahraCard(
          child: Text('No ticket tiers yet.',
              style: sahraText(color: ColorConstant.nightMuted, size: 13)),
        );
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Tiers', style: sahraText(size: 18, weight: FontWeight.w700)),
          const SizedBox(height: 10),
          ...controller.tiers.map(_tierRow),
        ],
      );
    });
  }

  Widget _tierRow(Map<String, dynamic> tier) {
    final name =
        tier['name']?.toString() ?? tier['sectionName']?.toString() ?? 'Ticket';
    final capacityValue = tier['capacity'] ?? tier['quantity'];
    final capacity = capacityValue is num ? capacityValue.toInt() : 0;
    final soldValue = tier['sold'];
    final sold = soldValue is num ? soldValue.toInt() : 0;
    final priceCentsValue = tier['priceCents'];
    final priceValue = tier['price'];
    final priceCents = priceCentsValue is num
        ? priceCentsValue
        : (priceValue is num ? priceValue * 100 : 0);
    final price = formatCents(priceCents);
    final progress = capacity == 0 ? 0.0 : (sold / capacity).clamp(0.0, 1.0);
    return SahraCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(size: 14, weight: FontWeight.w600)),
              ),
              Text(price,
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 13,
                      weight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 9),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: ColorConstant.nightElevated,
              valueColor: AlwaysStoppedAnimation<Color>(ColorConstant.gold),
            ),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              Text('$sold sold',
                  style: sahraText(color: ColorConstant.nightMuted, size: 11)),
              const Spacer(),
              Text('$capacity capacity',
                  style: sahraText(color: ColorConstant.nightMuted, size: 11)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _studioLinks() {
    return Column(
      children: [
        _webLinkTile(
          title: 'Edit event, tiers & promo codes',
          subtitle:
              'Seating maps, ticket tiers, promo codes and payouts need Sahra Studio.',
          onTap: () => WebHandoffSheet.show(
            feature: 'Editing events and ticket tiers',
            eventId: controller.eventId.value,
          ),
        ),
        const SizedBox(height: 10),
        _webLinkTile(
          title: 'Full analytics & payouts',
          subtitle: 'Revenue, attendance and payout controls live on the web.',
          onTap: () => WebHandoffSheet.show(
            feature: 'Full analytics and payouts',
            eventId: controller.eventId.value,
          ),
        ),
      ],
    );
  }

  Widget _webLinkTile({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: SahraCard(
        color: ColorConstant.nightElevated,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: sahraText(size: 14, weight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  Text(subtitle,
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 11,
                          height: 1.4)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Icon(Icons.open_in_new_rounded,
                color: ColorConstant.gold, size: 19),
          ],
        ),
      ),
    );
  }
}
