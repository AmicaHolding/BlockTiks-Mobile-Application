import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/event_detail_controller.dart';

class EventDetailView extends GetView<EventDetailController> {
  const EventDetailView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showLogo: true,
      basicAppBar: false,
      showBackBtn: true,
      sidePadding: false,
      bodyPadding: false,
      showNotification: true,
      bottomNavigationBar: Constants.isUserCreator ? const Offstage() : SafeArea(
        child: Container(
          color: ColorConstant.nightTabBar,
          padding: getPadding(left: 20, right: 20, top: 14, bottom: 16),
          child: Row(
          children: [
            Expanded(
              flex: 2,
              child: Obx(() {
                final fromPrice = controller.isSeated
                    ? controller.venueSections
                        .map((s) => s['priceCents'])
                        .whereType<num>()
                        .fold<num?>(null, (min, p) =>
                            min == null || p < min ? p : min)
                    : controller.hasEvent
                        ? controller.tiers
                            .map((t) => t['priceCents'] ??
                                (((t['price'] as num?) ?? 0) * 100).round())
                            .whereType<num>()
                            .fold<num?>(null, (min, p) =>
                                min == null || p < min ? p : min)
                        : null;
                return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: controller.selectedCount > 0
                        ? '${controller.selectedCount} ticket${controller.selectedCount == 1 ? '' : 's'}'
                        : 'From',
                    family: 'Inter',
                    fontSize: 13,
                    clr: ColorConstant.white60,
                  ),
                  SizedBox(height: getSize(2),),
                  MyText(
                    title: controller.selectedCount > 0
                        ? formatDollars(controller.subtotalDollars)
                        : (fromPrice != null
                            ? formatCents(fromPrice.toInt())
                            : '—'),
                    family: 'Manrope',
                    customWeight: FontWeight.w800,
                    fontSize: 20,
                    height: 1.1,
                  ),
                ],
              );}),
            ),
            Expanded(
              flex: 1,
              child: Obx(() => PrimaryPillButton(
                text: controller.isSeated ? "Choose seats" : "Get tickets",
                onTap: () {
                 final hasSelection = controller.hasEvent
                     ? controller.selectedCount > 0
                     : (controller.platinumCount.value +
                             controller.goldCount.value +
                             controller.silverCount.value +
                             controller.bronzeCount.value) >
                         0;
                 if (hasSelection) {
                   Get.toNamed(Routes.PAYMENT_PAGE,
                       arguments: controller.paymentArguments());
                 }else{
                   CustomSnackBar.showCustomErrorToast(message: "Please select at least one ticket");
                 }
                },
              )),
            ),
          ],
          ),
        ),
      ),
      child: Obx(() {
        if (controller.isLoading.value && !controller.hasEvent) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
        if (controller.loadError.value != null && !controller.hasEvent) {
          return Center(
            child: Padding(
              padding: getPadding(all: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  MyText(
                    title: "Couldn't load event",
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
                    onTap: () => controller.fetchEvent(),
                  ),
                ],
              ),
            ),
          );
        }
        return SingleChildScrollView(
        child: Column(
          children: [
            _EventHero(event: controller.hasEvent ? controller.event : null),
            Padding(
              padding: getPadding(all: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: controller.hasEvent
                        ? (controller.categoryText.isNotEmpty
                            ? controller.categoryText.toUpperCase()
                            : 'EVENT')
                        : 'MUSIC CONCERT',
                    family: 'Inter',
                    customWeight: FontWeight.w600,
                    fontSize: 13,
                    letterSpacing: 1.2,
                    clr: ColorConstant.gold,
                  ),
                  const SizedBox(height: 6),
                  MyText(
                    title: controller.hasEvent
                        ? controller.titleText
                        : 'DJ Maksmellow Orignawa',
                    family: 'Manrope',
                    customWeight: FontWeight.w800,
                    fontSize: 30,
                    height: 1.1,
                    clr: ColorConstant.whiteA700,
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  controller.hasEvent
                      ? const Offstage()
                      : const MyText(
                          title: 'Japan Night Festival 2021',
                          family: 'Manrope',
                          customWeight: FontWeight.w700,
                          fontSize: 14,
                          clr: Color(0xFFFFFFFF),
                        ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  _InfoRow(
                    icon: Icons.calendar_month,
                    title: controller.hasEvent
                        ? controller.formattedDate
                        : 'Sunday, 14 February 2021',
                    subtitle: 'Add to calendar',
                    onTap: () {},
                  ),
                  const SizedBox(height: 12),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    title: controller.hasEvent
                        ? (controller.locationText.isNotEmpty
                            ? controller.locationText
                            : '—')
                        : 'Japan, 〒604-8122 Kyoto, Nakagyo Ward',
                    subtitle: 'Directions',
                    onTap: () {
                      Utils.openGoogleMapDirections(25.197525, 55.274288);
                    },
                  ),
                  SizedBox(
                    height: getSize(20),
                  ),
                  MyText(
                    title: 'Event Details',
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    fontSize: 17,
                  ),
                  SizedBox(
                    height: getSize(10),
                  ),
                  Text(
                    controller.hasEvent
                        ? controller.descriptionText
                        : 'South Korean girl group Blackpink have embarked on two headlining concert tours. In July 2017, the group held their debut showcase in Japan.',
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.w400,
                      fontSize: 14,
                      height: 1.5,
                      color: ColorConstant.white60,
                    ),
                  ),

                  SizedBox(
                    height: getSize(20),
                  ),
                  // Real ticket tiers from the backend when an event is
                  // loaded; legacy fixed counters otherwise.
                  const SizedBox(height: 8),
                  MyText(
                    title: 'Tickets',
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 18,
                    clr: ColorConstant.whiteA700,
                  ),
                  const SizedBox(height: 12),
                  if (controller.isSeated)
                    _VenueSections()
                  else if (controller.hasEvent)
                    ...(controller.tiers.map((tier) {
                      final tierId = tier['id']?.toString() ?? '';
                      final price = tier['price'];
                      final cents = tier['priceCents'];
                      final priceLabel = price is num
                          ? formatDollars(price)
                          : (cents is num ? formatCents(cents) : '\$—');
                      final remaining = controller.tierRemaining(tier);
                      final maxCount = remaining < 10 ? remaining : 10;
                      return controller.isFromCreator
                          ? const Offstage()
                          : Obx(() => TicketCounter(
                                count: controller.tierCounts[tierId] ?? 0,
                                title: tier['name']?.toString() ?? 'Ticket',
                                priceLabel: priceLabel,
                                remaining: remaining,
                                onMinusTap: () => controller.adjustTier(
                                    tierId, -1, maxCount),
                                onPlusTap: () => controller.adjustTier(
                                    tierId, 1, maxCount),
                              ));
                    }))
                  else ...[
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.platinumCount.value,
                    title: "Platinum Ticket",
                    onMinusTap: () {
                      if (controller.platinumCount.value > 0) {
                        controller.platinumCount.value =
                            controller.platinumCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.platinumCount.value < 10) {
                        controller.platinumCount.value =
                            controller.platinumCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.goldCount.value,
                    title: "Gold Ticket",
                    onMinusTap: () {
                      if (controller.goldCount.value > 0) {
                        controller.goldCount.value =
                            controller.goldCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.goldCount.value < 10) {
                        controller.goldCount.value =
                            controller.goldCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.silverCount.value,
                    title: "Silver Ticket",
                    onMinusTap: () {
                      if (controller.silverCount.value > 0) {
                        controller.silverCount.value =
                            controller.silverCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.silverCount.value < 10) {
                        controller.silverCount.value =
                            controller.silverCount.value + 1;
                      }
                    },
                  )),
                  controller.isFromCreator ? const Offstage() : Obx(() => TicketCounter(
                    count: controller.bronzeCount.value,
                    title: "Bronze Ticket",
                    onMinusTap: () {
                      if (controller.bronzeCount.value > 0) {
                        controller.bronzeCount.value =
                            controller.bronzeCount.value - 1;
                      }
                    },
                    onPlusTap: () {
                      if (controller.bronzeCount.value < 10) {
                        controller.bronzeCount.value =
                            controller.bronzeCount.value + 1;
                      }
                    },
                  )),
                  ],
                ],
              ),
            ),
          ],
        ),
        );
      }),
    );
  }
}

/// Sahra event hero: cover photo (or brand-tinted placeholder) fading into
/// the Night canvas.
class _EventHero extends StatelessWidget {
  const _EventHero({this.event});

  final Map<String, dynamic>? event;

  @override
  Widget build(BuildContext context) {
    final url = event == null ? null : eventImageUrl(event!);
    return SizedBox(
      height: 320,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (url != null)
            CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: ColorConstant.nightElevated),
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
                  Colors.transparent,
                  ColorConstant.night.withValues(alpha: 0.55),
                  ColorConstant.night,
                ],
                stops: const [0.45, 0.8, 1.0],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: ColorConstant.nightElevated,
      child: Center(
        child: CustomImageView(
          imagePath: ImageConstant.stageCinema,
          width: 200,
          height: 120,
          fit: BoxFit.contain,
          color: ColorConstant.nightBorder,
        ),
      ),
    );
  }
}

/// Sahra info row: 40px night-surface icon tile, bold title, muted subtitle,
/// gold chevron — used for date and venue on event details.
class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: ColorConstant.gold, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.bricolageGrotesque(
                    color: ColorConstant.whiteA700,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.bricolageGrotesque(
                    color: ColorConstant.white60,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: ColorConstant.gold, size: 22),
        ],
      ),
    );
  }
}

class TicketCounter extends StatelessWidget {
  const TicketCounter({super.key,
    required this.title,
    required this.count,
    this.priceLabel,
    this.remaining,
    this.onMinusTap,
    this.onPlusTap});

  final String title;
  final int count;
  final String? priceLabel;
  final int? remaining;
  final void Function()? onMinusTap;
  final void Function()? onPlusTap;

  int get _maxCount {
    final rem = remaining;
    if (rem != null && rem < 10) return rem < 0 ? 0 : rem;
    return 10;
  }

  @override
  Widget build(BuildContext context) {
    final soldOut = remaining != null && remaining! <= 0;
    final note = soldOut
        ? 'Sold out'
        : (remaining != null && remaining! <= 10
            ? '${remaining} left'
            : 'Official');
    return Opacity(
      opacity: soldOut ? 0.5 : 1,
      child: Container(
        margin: getMargin(bottom: 10, left: 4, right: 4),
        padding: getPadding(all: 12),
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: MyText(
                    title: title,
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                MyText(
                  title: note,
                  family: 'Inter',
                  fontSize: 12,
                  clr: soldOut ? ColorConstant.rumman : ColorConstant.white60,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MyText(
                      title: priceLabel ?? '\$405',
                      family: 'Manrope',
                      customWeight: FontWeight.w800,
                      fontSize: 16,
                      clr: ColorConstant.gold,
                    ),
                    MyText(
                      title: 'Official',
                      family: 'Inter',
                      fontSize: 12,
                      clr: ColorConstant.white60,
                    ),
                  ],
                ),
                const Spacer(),
                _stepperButton(
                  icon: Icons.remove,
                  enabled: count > 0 && !soldOut,
                  filled: false,
                  onTap: onMinusTap,
                ),
                Padding(
                  padding: getPadding(left: 10, right: 10),
                  child: MyText(
                    title: count.toString(),
                    family: 'Manrope',
                    customWeight: FontWeight.w700,
                    fontSize: 16,
                    clr: ColorConstant.whiteA700,
                  ),
                ),
                _stepperButton(
                  icon: Icons.add,
                  enabled: count < _maxCount && !soldOut,
                  filled: true,
                  onTap: onPlusTap,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepperButton({
    required IconData icon,
    required bool enabled,
    required bool filled,
    void Function()? onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: Container(
        width: 30,
        height: 30,
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
          size: 14,
          color: filled && enabled
              ? ColorConstant.night
              : (enabled ? ColorConstant.whiteA700 : ColorConstant.white60),
        ),
      ),
    );
  }

}


class StageViewScreen extends StatelessWidget {
  const StageViewScreen({super.key,this.height = 320,this.showCircles = true});

  final double height;
  final bool showCircles;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                ColorConstant.canvas.withValues(alpha: 0.0),
                ColorConstant.canvas.withValues(alpha: 0.6),
              ])),
      height: height,
      child: Stack(
        children: [
          Align(
            alignment: Alignment.center,
            child: Column(
              children: [
                SizedBox(height: getSize(20),),
                CustomImageView(
                  imagePath: ImageConstant.stageCinema,
                  width: size.width,
                  height: 120,
                  fit: BoxFit.fill,
                  // height: 70,
                ),
                SizedBox(height: getSize(20),),
                CustomImageView(
                  svgPath: ImageConstant.stageComplete,
                  width: size.width,
                  height: height - 160,
                  fit: BoxFit.fill,
                  // height: 70,
                ),
              ],
            ),
          ),
          Column(
            children: [
              const SizedBox(height: 70,),
             Expanded(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Platinum
                    const Positioned(
                      top: 100,
                      child: MyText(title:"Platinum",fontSize: 12,),
                    ),
                    // Gold
                    const Positioned(
                      top: 200,
                      child: MyText(title:"Gold",fontSize: 12,),
                    ),
                    // Silver Left
                    Positioned(
                      top: 150,
                      left: MediaQuery.of(context).size.width / 4 - 20,
                      child: const MyText(title:"Silver",fontSize: 12,),
                    ),
                    // Silver Right
                    Positioned(
                      top: 150,
                      right: MediaQuery.of(context).size.width / 4 - 28,
                      child: const MyText(title:"Silver",fontSize: 12,),
                    ),
                    // Bronze
                    const Positioned(
                      bottom: 15,
                      child: MyText(title:"Bronze",fontSize: 12,),
                    ),


                    // Platinum
                    !showCircles ? Container() : Positioned(
                      top: 60,
                      // left: MediaQuery.of(context).size.width / 2 - 40,
                      child: _buildTappableCircle(
                          context, '1'),
                    ),
                    // Gold
                    !showCircles ? Container() :Positioned(
                      top: 150,
                      // left: MediaQuery.of(context).size.width / 2 - 30,
                      child:
                      _buildTappableCircle(context, '3'),
                    ),
                    // Silver Left
                    !showCircles ? Container() :Positioned(
                      top: 110,
                      left: MediaQuery.of(context).size.width / 4 - 20,
                      child: _buildTappableCircle(
                          context, '12',),
                    ),
                    // Silver Right
                    !showCircles ? Container() : Positioned(
                      top: 110,
                      right: MediaQuery.of(context).size.width / 4 - 28,
                      child: _buildTappableCircle(context, '54'),
                    ),
                    // Bronze
                    !showCircles ? Container() : Positioned(
                      bottom: 30,
                      left: MediaQuery.of(context).size.width / 2 - 170,
                      child: _buildTappableCircle(context, '54',),
                    ),


                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTappableCircle(
      BuildContext context, String number, {void Function()? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: ColorConstant.elevated,
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.hairline, width: 1),
        ),
        padding: getPadding(all: 10),
        child: Center(
          child: Text(
            number,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}

/// Seated-event section picker (Sahra screens 11/12 essence): venue preview
/// header + one row per section with price, remaining seats and a quantity
/// stepper for the selected section.
class _VenueSections extends GetWidget<EventDetailController> {
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sections = controller.venueSections;
      if (sections.isEmpty) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Venue preview strip — stands in for the full venue map until the
          // layout editor ships seat-level geometry.
          Container(
            width: double.infinity,
            padding: getPadding(all: 18),
            decoration: BoxDecoration(
              color: ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ColorConstant.nightBorder),
            ),
            child: Row(
              children: [
                Container(
                  height: 44,
                  width: 44,
                  decoration: BoxDecoration(
                    color: ColorConstant.nightElevated,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.map_outlined,
                      color: ColorConstant.gold, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText(
                        title: 'Reserved seating',
                        family: 'Manrope',
                        customWeight: FontWeight.w700,
                        fontSize: 15,
                        clr: ColorConstant.whiteA700,
                      ),
                      const SizedBox(height: 2),
                      MyText(
                        title: 'Pick a section — seats are held at checkout',
                        family: 'Inter',
                        fontSize: 12,
                        clr: ColorConstant.nightMuted,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ...sections.map((s) {
            final id = s['id']?.toString() ?? '';
            final selected = controller.selectedSectionId.value == id;
            final remaining = controller.sectionRemaining(s);
            final cents = s['priceCents'];
            final priceLabel = cents is num
                ? formatCents(cents)
                : formatDollars((s['price'] as num?)?.toDouble());
            return GestureDetector(
              onTap: remaining > 0 ? () => controller.selectSection(id) : null,
              child: Container(
                margin: getMargin(bottom: 10),
                padding: getPadding(left: 16, right: 16, top: 14, bottom: 14),
                decoration: BoxDecoration(
                  color: selected
                      ? ColorConstant.nightElevated
                      : ColorConstant.nightSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: selected
                        ? ColorConstant.gold
                        : ColorConstant.nightBorder,
                    width: selected ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              MyText(
                                title: s['name']?.toString() ?? 'Section',
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: 16,
                                clr: remaining <= 0
                                    ? ColorConstant.white60
                                    : ColorConstant.whiteA700,
                              ),
                              const SizedBox(height: 3),
                              MyText(
                                title: remaining <= 0
                                    ? 'Sold out'
                                    : '$remaining seats left',
                                family: 'Inter',
                                fontSize: 12,
                                clr: remaining <= 0
                                    ? ColorConstant.errorRed
                                    : ColorConstant.nightMuted,
                              ),
                            ],
                          ),
                        ),
                        MyText(
                          title: priceLabel,
                          family: 'Manrope',
                          customWeight: FontWeight.w800,
                          fontSize: 17,
                          clr: ColorConstant.gold,
                        ),
                        const SizedBox(width: 12),
                        Container(
                          height: 22,
                          width: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: selected
                                  ? ColorConstant.gold
                                  : ColorConstant.nightBorder,
                              width: 2,
                            ),
                            color: selected ? ColorConstant.gold : null,
                          ),
                          child: selected
                              ? Icon(Icons.check,
                                  size: 14, color: ColorConstant.night)
                              : null,
                        ),
                      ],
                    ),
                    if (selected) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Spacer(),
                          _stepBtn(Icons.remove, () => controller.adjustSectionCount(-1)),
                          Padding(
                            padding: getPadding(left: 16, right: 16),
                            child: MyText(
                              title: '${controller.sectionCount.value}',
                              family: 'Manrope',
                              customWeight: FontWeight.w700,
                              fontSize: 16,
                              clr: ColorConstant.whiteA700,
                            ),
                          ),
                          _stepBtn(Icons.add, () => controller.adjustSectionCount(1)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),
        ],
      );
    });
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 30,
        width: 30,
        decoration: BoxDecoration(
          color: ColorConstant.nightDeep,
          shape: BoxShape.circle,
          border: Border.all(color: ColorConstant.nightBorder),
        ),
        child: Icon(icon, size: 16, color: ColorConstant.whiteA700),
      ),
    );
  }
}
