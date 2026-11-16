import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../controllers/event_detail_controller.dart';

class EventDetailView extends GetView<EventDetailController> {
  const EventDetailView({super.key});

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: false,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      bottomNavigationBar: controller.isFromCreator ? null : _bottomBar(),
      child: Obx(() {
        if (controller.isLoading.value && !controller.hasEvent) {
          return _page(child: const Center(child: CircularProgressIndicator()));
        }
        if (controller.loadError.value != null && !controller.hasEvent) {
          return _page(
            child: SahraEmptyState(
              title: "Couldn't load event",
              message: controller.loadError.value,
              actionLabel: 'Retry',
              onAction: controller.fetchEvent,
            ),
          );
        }
        return _page(child: _content());
      }),
    );
  }

  Widget _page({required Widget child}) {
    return Column(
      children: [
        _EventHero(event: controller.hasEvent ? controller.event : null),
        Expanded(child: child),
      ],
    );
  }

  Widget _bottomBar() {
    return Container(
      color: ColorConstant.nightTabBar,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
      child: Row(
        children: [
          Expanded(child: Obx(() => _priceSummary())),
          const SizedBox(width: 14),
          SizedBox(
            width: 138,
            child: Obx(() => SahraPillButton(
                  label: controller.isSeated ? 'Choose seats' : 'Get tickets',
                  enabled:
                      !controller.isFromCreator && controller.selectedCount > 0,
                  onTap: _continueToCheckout,
                )),
          ),
        ],
      ),
    );
  }

  Widget _priceSummary() {
    final selected = controller.selectedCount > 0;
    final label = selected
        ? '${controller.selectedCount} ticket${controller.selectedCount == 1 ? '' : 's'}'
        : 'From';
    final price = selected
        ? controller.moneyDollars(controller.subtotalDollars)
        : _fromPriceLabel();
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: sahraText(color: ColorConstant.nightMuted, size: 12)),
        const SizedBox(height: 2),
        Text(price, style: sahraText(size: 22, weight: FontWeight.w700)),
      ],
    );
  }

  String _fromPriceLabel() {
    final centsValues = <num>[];
    void consider(dynamic value) {
      num? cents;
      if (value is num) {
        cents = value is int ? value : (value * 100).round();
      }
      if (cents != null) centsValues.add(cents);
    }

    if (controller.isSeated) {
      for (final s in controller.venueSections) {
        consider(
            s['priceCents'] ?? ((s['price'] as num?)?.toDouble() ?? 0) * 100);
      }
    } else {
      for (final t in controller.tiers) {
        consider(
            t['priceCents'] ?? ((t['price'] as num?)?.toDouble() ?? 0) * 100);
      }
    }
    for (final l in controller.resaleListings) {
      consider(l['priceCents']);
    }
    if (centsValues.isEmpty) return '—';
    centsValues.sort();
    return controller.moneyCents(centsValues.first);
  }

  void _continueToCheckout() {
    if (controller.selectedCount <= 0) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Please select at least one ticket');
      return;
    }
    Get.toNamed(Routes.PAYMENT_PAGE, arguments: controller.paymentArguments());
  }

  void _setPrice(Map<String, dynamic> tier) {
    final event = controller.event;
    Get.toNamed(Routes.PLACE_BID, arguments: {
      'eventId': controller.eventId ?? '',
      'title': event['title']?.toString() ?? 'Event',
      'type': controller.categoryText.isNotEmpty
          ? controller.categoryText
          : 'Event',
      'tier': tier['name']?.toString() ?? 'Ticket',
      'faceCents': _tierPriceCents(tier),
    });
  }

  Widget _setPriceButton(Map<String, dynamic> tier) {
    return GestureDetector(
      onTap: () => _setPrice(tier),
      child: Row(
        children: [
          Icon(Icons.bolt_rounded, color: ColorConstant.gold, size: 18),
          const SizedBox(width: 6),
          Text('Set your price',
              style: sahraText(
                  color: ColorConstant.gold,
                  size: 14,
                  weight: FontWeight.w700)),
          const Spacer(),
          Icon(Icons.chevron_right_rounded,
              color: ColorConstant.nightMuted, size: 18),
        ],
      ),
    );
  }

  Widget _content() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        _titleBlock(),
        const SizedBox(height: 18),
        _dateRow(),
        const SizedBox(height: 12),
        _venueRow(),
        if (controller.descriptionText.isNotEmpty) ...[
          const SizedBox(height: 22),
          Text('About this event',
              style: sahraText(size: 17, weight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(controller.descriptionText,
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 14, height: 1.55)),
        ],
        const SizedBox(height: 24),
        if (!controller.isFromCreator) ...[
          Padding(
            padding: const EdgeInsets.only(top: 14, bottom: 6),
            child: Text(
              (controller.isSeated ? 'Choose seats' : 'Tickets').toUpperCase(),
              style: sahraText(
                color: ColorConstant.nightMuted,
                size: 11,
                weight: FontWeight.w600,
                letterSpacing: 1.1,
              ),
            ),
          ),
          if (controller.isSeated)
            _VenueSections()
          else if (controller.hasEvent)
            ...controller.tiers.map(_tierCard),
          if (controller.resaleListings.isNotEmpty) ...[
            if (controller.isSeated || controller.hasEvent)
              const SizedBox(height: 8),
            _resaleHeader(),
            ..._sortedListings().map(_resaleCard),
            const SizedBox(height: 10),
            Text(
              'Resale tickets are reissued to you with a new QR. Same entry, same guarantee.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 12, height: 1.45),
            ),
          ],
        ] else
          SahraCard(
            child: Text(
              'Preview mode — ticket sales are managed in Sahra Studio.',
              style: sahraText(color: ColorConstant.nightMuted, size: 13),
            ),
          ),
      ],
    );
  }

  Widget _titleBlock() {
    final category = controller.categoryText.isNotEmpty
        ? controller.categoryText.toUpperCase()
        : 'EVENT';
    final arabic = controller.event['titleAr']?.toString() ??
        controller.event['arabicTitle']?.toString() ??
        '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(category,
            style: sahraText(
                color: ColorConstant.gold,
                size: 12,
                weight: FontWeight.w600,
                letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Text(
          controller.hasEvent ? controller.titleText : 'Event details',
          style: sahraText(size: 30, weight: FontWeight.w700, height: 1.08),
        ),
        if (arabic.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(arabic,
              style: sahraArabic(color: ColorConstant.nightMuted, size: 15)),
        ],
      ],
    );
  }

  Widget _dateRow() {
    final dt = DateTime.tryParse(controller.startsAtText)?.toLocal();
    final month = dt == null ? '—' : DateFormat('MMM').format(dt);
    final day = dt == null ? '—' : DateFormat('d').format(dt);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SahraDateBadge(month: month, day: day),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                controller.hasEvent && controller.formattedDate.isNotEmpty
                    ? controller.formattedDate
                    : 'Date to be announced',
                style: sahraText(size: 15, weight: FontWeight.w600),
              ),
              const SizedBox(height: 3),
              Text('Add to calendar',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _venueRow() {
    final location = controller.locationText.isNotEmpty
        ? controller.locationText
        : 'Venue to be announced';
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _openDirections(location),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.location_on_outlined,
                color: ColorConstant.gold, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(location,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(size: 15, weight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('Directions',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 12)),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              color: ColorConstant.gold, size: 22),
        ],
      ),
    );
  }

  Future<void> _openDirections(String location) async {
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(location)}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      CustomSnackBar.showCustomErrorToast(message: 'Could not open maps');
    }
  }

  Widget _tierCard(Map<String, dynamic> tier) {
    final id = tier['id']?.toString() ?? '';
    final remaining = controller.tierRemaining(tier);
    final maxCount = remaining < 10 ? remaining : 10;
    final soldOut = remaining <= 0;
    final priceLabel = _tierPriceLabel(tier);
    return Obx(() {
      final count = controller.tierCounts[id] ?? 0;
      return Opacity(
        opacity: soldOut ? .55 : 1,
        child: SahraCard(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tier['name']?.toString() ?? 'Ticket',
                            style:
                                sahraText(size: 16, weight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        Text(
                          soldOut
                              ? 'Sold out'
                              : remaining <= 10
                                  ? '$remaining left'
                                  : 'Official · plenty left',
                          style: sahraText(
                            color: soldOut
                                ? ColorConstant.rumman
                                : ColorConstant.nightMuted,
                            size: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(priceLabel,
                      style: sahraText(
                          color: ColorConstant.gold,
                          size: 17,
                          weight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text('Official',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 12)),
                  const Spacer(),
                  _stepButton(
                    icon: Icons.remove_rounded,
                    enabled: count > 0 && !soldOut,
                    filled: false,
                    onTap: () => controller.adjustTier(id, -1, maxCount),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text('$count',
                        style: sahraText(size: 16, weight: FontWeight.w700)),
                  ),
                  _stepButton(
                    icon: Icons.add_rounded,
                    enabled: count < maxCount && !soldOut,
                    filled: true,
                    onTap: () => controller.adjustTier(id, 1, maxCount),
                  ),
                ],
              ),
              if (soldOut) ...[
                const SizedBox(height: 10),
                _setPriceButton(tier),
              ],
            ],
          ),
        ),
      );
    });
  }

  String _tierPriceLabel(Map<String, dynamic> tier) {
    final price = tier['price'];
    final cents = tier['priceCents'];
    if (cents is num) return controller.moneyCents(cents);
    if (price is num) return controller.moneyDollars(price);
    return '—';
  }

  int _tierPriceCents(Map<String, dynamic> tier) {
    final cents = tier['priceCents'];
    if (cents is num) return cents.toInt();
    final price = tier['price'];
    if (price is num) return (price * 100).round();
    return 0;
  }

  Widget _resaleHeader() {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Row(
        children: [
          Text('Resale', style: sahraText(size: 15, weight: FontWeight.w700)),
          const SizedBox(width: 8),
          Text('cheapest first',
              style: sahraText(color: ColorConstant.nightMuted, size: 12)),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _sortedListings() {
    final list = List<Map<String, dynamic>>.from(controller.resaleListings);
    list.sort((a, b) {
      final ap = (a['priceCents'] as num?)?.toInt() ?? 0;
      final bp = (b['priceCents'] as num?)?.toInt() ?? 0;
      return ap.compareTo(bp);
    });
    return list;
  }

  Widget _resaleCard(Map<String, dynamic> listing) {
    final code = listing['ticketCode']?.toString() ?? '';
    final cents = listing['priceCents'];
    final price = cents is num
        ? formatMoney(cents, listing['currency']?.toString())
        : '—';
    final tier = listing['tierName']?.toString() ?? 'Resale ticket';
    return Obx(() {
      final isSelected = controller.selectedListingCode.value == code;
      return GestureDetector(
        onTap: () => isSelected
            ? controller.clearListing()
            : controller.selectListing(code),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected
                ? ColorConstant.nightElevated
                : ColorConstant.nightSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color:
                  isSelected ? ColorConstant.gold : ColorConstant.nightBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(tier,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style:
                                  sahraText(size: 15, weight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 8),
                        SahraStatusPill('Resale',
                            color: ColorConstant.gold,
                            background:
                                ColorConstant.gold.withValues(alpha: .14)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('1 ticket · instant transfer',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                  ],
                ),
              ),
              Text(price,
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 16,
                      weight: FontWeight.w700)),
              const SizedBox(width: 12),
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? ColorConstant.gold
                        : ColorConstant.nightBorder,
                    width: 2,
                  ),
                  color: isSelected ? ColorConstant.gold : Colors.transparent,
                ),
                child: isSelected
                    ? Icon(Icons.check, size: 13, color: ColorConstant.night)
                    : null,
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _stepButton({
    required IconData icon,
    required bool enabled,
    required bool filled,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: filled && enabled ? ColorConstant.gold : Colors.transparent,
          border: Border.all(
            color: filled && enabled
                ? ColorConstant.gold
                : ColorConstant.nightBorder,
            width: 1.5,
          ),
        ),
        child: Icon(
          icon,
          size: 18,
          color: filled && enabled
              ? ColorConstant.night
              : (enabled ? ColorConstant.whiteA700 : ColorConstant.white60),
        ),
      ),
    );
  }
}

class _EventHero extends StatelessWidget {
  const _EventHero({this.event});

  final Map<String, dynamic>? event;

  @override
  Widget build(BuildContext context) {
    final url = event == null ? null : eventImageUrl(event!);
    final controller = Get.find<EventDetailController>();
    return SizedBox(
      height: 330,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (url != null)
            CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              placeholder: (_, __) => _placeholder(),
              errorWidget: (_, __, ___) => _placeholder(),
            )
          else
            _placeholder(),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  ColorConstant.nightDeep.withValues(alpha: .55),
                  Colors.transparent,
                  ColorConstant.night.withValues(alpha: .35),
                  ColorConstant.night,
                ],
                stops: const [0, .35, .72, 1],
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  SahraIconAction(
                    icon: Icons.arrow_back_ios_new_rounded,
                    onTap: Get.back,
                  ),
                  const Spacer(),
                  Obx(() => SahraIconAction(
                        icon: controller.isFavorite.value
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: controller.isFavorite.value
                            ? ColorConstant.gold
                            : ColorConstant.whiteA700,
                        onTap: () => controller.isFavorite.value =
                            !controller.isFavorite.value,
                      )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2F4560), ColorConstant.nightSurface],
        ),
      ),
      child: Center(
        child: Icon(Icons.music_note_rounded,
            size: 72, color: ColorConstant.gold.withValues(alpha: .45)),
      ),
    );
  }
}

class _VenueSections extends GetWidget<EventDetailController> {
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sections = controller.venueSections;
      if (sections.isEmpty) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SahraCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: ColorConstant.nightElevated,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.map_outlined,
                      color: ColorConstant.gold, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Reserved seating',
                          style: sahraText(size: 15, weight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('Pick a section — seats are held at checkout',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _mapPreview(sections),
          const SizedBox(height: 12),
          ...sections.map(_sectionCard),
        ],
      );
    });
  }

  void _openSectionSheet(Map<String, dynamic> section) {
    final id = section['id']?.toString() ?? '';
    if (id.isNotEmpty) controller.chooseSection(id);
    final name = section['name']?.toString() ?? 'Section';
    final remaining = controller.sectionRemaining(section);
    final price = section['priceCents'];
    final priceLabel = price is num
        ? controller.moneyCents(price)
        : controller.moneyDollars((section['price'] as num?)?.toDouble());
    Get.bottomSheet(
      Container(
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: SafeArea(
          child: Obx(() {
            final count = controller.sectionCount.value;
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: ColorConstant.nightBorder,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(name, style: sahraText(size: 22, weight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('$priceLabel each · $remaining seats left',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13)),
                const SizedBox(height: 6),
                Text('View from this section · facing stage',
                    style: sahraText(color: ColorConstant.gold, size: 12)),
                const SizedBox(height: 18),
                Obx(() {
                  if (controller.seatsLoading.value) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 28),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (controller.sectionSeats.isNotEmpty) {
                    return _seatPicker();
                  }
                  return _sectionStepper(count);
                }),
                const SizedBox(height: 14),
                Obx(() {
                  final seatMode = controller.sectionSeats.isNotEmpty;
                  final fallbackNote = !seatMode &&
                      !controller.seatsLoading.value &&
                      controller.seatsError.value != null;
                  if (!fallbackNote) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Text(
                      'Seat map unavailable — Sahra assigns seats in this section at checkout.',
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 12,
                          height: 1.45),
                    ),
                  );
                }),
                const SizedBox(height: 4),
                SahraPillButton(
                  label: controller.sectionSeats.isNotEmpty
                      ? (count > 0
                          ? 'Select $count seat${count == 1 ? '' : 's'}'
                          : 'Pick seats')
                      : count > 0
                          ? 'Select $count seat${count == 1 ? '' : 's'}'
                          : 'Sold out',
                  enabled: count > 0,
                  onTap: Get.back,
                ),
              ],
            );
          }),
        ),
      ),
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
    );
  }

  /// Exact-seat grid backed by GET /events/:id/seats. Tapping an available
  /// seat toggles it; the checkout quantity follows the selection.
  Widget _seatPicker() {
    return Obx(() {
      final seats = controller.sectionSeats;
      final selectedCount = controller.selectedSeatLabels.length;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Pick your seats',
                  style: sahraText(size: 15, weight: FontWeight.w600)),
              const Spacer(),
              Text('$selectedCount selected',
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 12,
                      weight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 10),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 240),
            child: SingleChildScrollView(
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: seats.map(_seatChip).toList(),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _seatLegend(
                  color: ColorConstant.nightElevated, label: 'Available'),
              const SizedBox(width: 14),
              _seatLegend(color: ColorConstant.gold, label: 'Selected'),
              const SizedBox(width: 14),
              _seatLegend(color: ColorConstant.nightDeep, label: 'Taken'),
            ],
          ),
        ],
      );
    });
  }

  Widget _seatChip(Map<String, dynamic> seat) {
    final label = seat['seatLabel']?.toString() ?? '';
    final available = controller.seatSelectable(seat);
    final isSelected = controller.selectedSeatLabels.contains(label);
    final accessible = seat['accessible'] == true;
    return GestureDetector(
      onTap: available ? () => controller.toggleSeat(label) : null,
      child: Container(
        width: 46,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected
              ? ColorConstant.gold
              : available
                  ? ColorConstant.nightElevated
                  : ColorConstant.nightDeep,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? ColorConstant.gold : ColorConstant.nightBorder,
          ),
        ),
        child: available || isSelected
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (accessible)
                    Icon(Icons.accessible_rounded,
                        size: 10,
                        color: isSelected
                            ? ColorConstant.night
                            : ColorConstant.gold),
                  Text(label,
                      style: sahraText(
                          color: isSelected
                              ? ColorConstant.night
                              : ColorConstant.whiteA700,
                          size: 12,
                          weight: FontWeight.w700)),
                ],
              )
            : Icon(Icons.close_rounded,
                size: 14, color: ColorConstant.nightMuted),
      ),
    );
  }

  Widget _seatLegend({required Color color, required String label}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: ColorConstant.nightBorder),
          ),
        ),
        const SizedBox(width: 5),
        Text(label,
            style: sahraText(color: ColorConstant.nightMuted, size: 11)),
      ],
    );
  }

  /// Quantity stepper fallback when exact seats can't be loaded.
  Widget _sectionStepper(int count) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Tickets',
                style: sahraText(size: 15, weight: FontWeight.w600)),
            const Spacer(),
            _smallStep(
                Icons.remove_rounded, () => controller.adjustSectionCount(-1)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text('$count',
                  style: sahraText(size: 16, weight: FontWeight.w700)),
            ),
            _smallStep(
                Icons.add_rounded, () => controller.adjustSectionCount(1)),
          ],
        ),
      ],
    );
  }

  Widget _mapPreview(List<Map<String, dynamic>> sections) {
    return SahraCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 120,
              height: 26,
              decoration: BoxDecoration(
                color: ColorConstant.nightDeep,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text('STAGE',
                    style: sahraText(
                        color: ColorConstant.nightMuted,
                        size: 10,
                        weight: FontWeight.w700,
                        letterSpacing: 1.4)),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sections
                .map((section) => GestureDetector(
                      onTap: () => _openSectionSheet(section),
                      child: _mapSectionChip(section),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _mapSectionChip(Map<String, dynamic> section) {
    final id = section['id']?.toString() ?? '';
    final selected = controller.selectedSectionId.value == id;
    final remaining = controller.sectionRemaining(section);
    final soldOut = remaining <= 0;
    final name = section['name']?.toString() ?? 'Section';
    final price = section['priceCents'];
    final priceLabel = price is num
        ? controller.moneyCents(price)
        : controller.moneyDollars((section['price'] as num?)?.toDouble());
    return Container(
      width: 88,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: soldOut
            ? ColorConstant.nightDeep
            : selected
                ? ColorConstant.gold
                : ColorConstant.nightElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: selected ? ColorConstant.gold : ColorConstant.nightBorder,
        ),
      ),
      child: Column(
        children: [
          Text(name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: sahraText(
                  color:
                      selected ? ColorConstant.night : ColorConstant.whiteA700,
                  size: 12,
                  weight: FontWeight.w700)),
          const SizedBox(height: 3),
          Text(soldOut ? 'Sold out' : priceLabel,
              style: sahraText(
                  color:
                      selected ? ColorConstant.night : ColorConstant.nightMuted,
                  size: 10)),
        ],
      ),
    );
  }

  Widget _sectionCard(Map<String, dynamic> section) {
    final id = section['id']?.toString() ?? '';
    final selected = controller.selectedSectionId.value == id;
    final remaining = controller.sectionRemaining(section);
    final soldOut = remaining <= 0;
    final price = section['priceCents'];
    final priceLabel = price is num
        ? controller.moneyCents(price)
        : controller.moneyDollars((section['price'] as num?)?.toDouble());
    return Obx(() {
      final count = controller.sectionCount.value;
      return Opacity(
        opacity: soldOut ? .55 : 1,
        child: GestureDetector(
          onTap: soldOut ? null : () => _openSectionSheet(section),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: selected
                  ? ColorConstant.nightElevated
                  : ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color:
                    selected ? ColorConstant.gold : ColorConstant.nightBorder,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(section['name']?.toString() ?? 'Section',
                              style:
                                  sahraText(size: 16, weight: FontWeight.w700)),
                          const SizedBox(height: 3),
                          Text(
                            soldOut ? 'Sold out' : '$remaining seats left',
                            style: sahraText(
                              color: soldOut
                                  ? ColorConstant.rumman
                                  : ColorConstant.nightMuted,
                              size: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(priceLabel,
                        style: sahraText(
                            color: ColorConstant.gold,
                            size: 16,
                            weight: FontWeight.w700)),
                    const SizedBox(width: 12),
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected
                              ? ColorConstant.gold
                              : ColorConstant.nightBorder,
                          width: 2,
                        ),
                        color:
                            selected ? ColorConstant.gold : Colors.transparent,
                      ),
                      child: selected
                          ? Icon(Icons.check,
                              size: 13, color: ColorConstant.night)
                          : null,
                    ),
                  ],
                ),
                if (selected) ...[
                  const SizedBox(height: 12),
                  Text('View from this section · facing stage',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 12)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('Tickets',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 12)),
                      const Spacer(),
                      _smallStep(Icons.remove_rounded,
                          () => controller.adjustSectionCount(-1)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text('$count',
                            style:
                                sahraText(size: 16, weight: FontWeight.w700)),
                      ),
                      _smallStep(Icons.add_rounded,
                          () => controller.adjustSectionCount(1)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _smallStep(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ColorConstant.nightDeep,
          border: Border.all(color: ColorConstant.nightBorder),
        ),
        child: Icon(icon, size: 17, color: ColorConstant.whiteA700),
      ),
    );
  }
}

/// Minimal stage/seating preview reused by legacy bid/upcoming flows.
class StageViewScreen extends StatelessWidget {
  const StageViewScreen(
      {super.key, this.height = 350, this.showCircles = true});

  final double height;
  final bool showCircles;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [const Color(0xFF22344D), ColorConstant.nightDeep],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(Icons.music_note_rounded,
              size: height * .22,
              color: ColorConstant.gold.withValues(alpha: .5)),
          if (showCircles)
            Positioned(
              bottom: 18,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  7,
                  (i) => Container(
                    width: 10,
                    height: 10,
                    margin: const EdgeInsets.symmetric(horizontal: 5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i.isEven
                          ? ColorConstant.gold.withValues(alpha: .75)
                          : ColorConstant.nightBorder,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
