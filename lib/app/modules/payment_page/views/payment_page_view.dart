import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/payment_page_controller.dart';

class PaymentPageView extends GetView<PaymentPageController> {
  const PaymentPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: false,
      hideAppBar: true,
      sidePadding: false,
      safeTopArea: false,
      backgroundColor: ColorConstant.sand,
      bottomNavigationBar: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (controller.hasBackendContext)
              Container(
                margin: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: ColorConstant.warningOrange.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color:
                          ColorConstant.warningOrange.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.science_outlined,
                        size: 16, color: ColorConstant.warningOrange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Test mode — pay with 4242 4242 4242 4242',
                        style: sahraText(
                            color: ColorConstant.warningOrange, size: 12),
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
              child: PrimaryPillButton(
                text: controller.fromPlaceBid
                    ? 'Place'
                    : 'Pay ${controller.money(controller.estimatedTotalCents)}',
                onTap: () => controller.checkout(),
              ),
            ),
          ],
        ),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SahraIconAction(
                  icon: Icons.arrow_back_ios_new_rounded,
                  color: ColorConstant.ink,
                  onTap: Get.back,
                ),
                const Spacer(),
                Text('Step 2 of 2',
                    style: sahraText(
                        color: ColorConstant.ink.withValues(alpha: .55),
                        size: 12)),
              ],
            ),
            const SizedBox(height: 18),
            Text('Checkout',
                style: sahraText(
                    color: ColorConstant.ink,
                    size: 30,
                    weight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              [controller.eventTitle, controller.eventType]
                  .where((e) => e.isNotEmpty)
                  .join(' · '),
              style: sahraText(
                  color: ColorConstant.ink.withValues(alpha: .6), size: 14),
            ),
            if ((controller.eventDate ?? '').isNotEmpty ||
                (controller.eventVenue ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                [controller.eventDate, controller.eventVenue]
                    .whereType<String>()
                    .where((e) => e.isNotEmpty)
                    .join(' · '),
                style: sahraText(
                    color: ColorConstant.ink.withValues(alpha: .55), size: 12),
              ),
            ],
            const SizedBox(height: 22),
            _summaryCard(),
            const SizedBox(height: 16),
            _paymentMethodCard(),
            const SizedBox(height: 14),
            Text(
              controller.hasBackendContext
                  ? 'Tickets appear in your Tickets tab instantly after payment.'
                  : 'Simulated checkout — no real payment is processed.',
              style: sahraText(
                  color: ColorConstant.ink.withValues(alpha: .55),
                  size: 12,
                  height: 1.45),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard() {
    final lines = _orderLines();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ColorConstant.lightCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ColorConstant.dune),
      ),
      child: Column(
        children: [
          ...lines.map((line) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(line.label,
                          style: sahraText(
                              color: ColorConstant.ink,
                              size: 15,
                              weight: FontWeight.w600)),
                    ),
                    Text(line.amount,
                        style: sahraText(
                            color: ColorConstant.ink,
                            size: 15,
                            weight: FontWeight.w600)),
                  ],
                ),
              )),
          Divider(height: 22, color: ColorConstant.dune),
          _feeRow('Service fee (est.)',
              controller.money(controller.estimatedFeesCents)),
          const SizedBox(height: 8),
          Row(
            children: [
              Text('Total',
                  style: sahraText(
                      color: ColorConstant.ink,
                      size: 18,
                      weight: FontWeight.w700)),
              const Spacer(),
              Text(controller.money(controller.estimatedTotalCents),
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 20,
                      weight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Final total is confirmed by Stripe at payment.',
            style: sahraText(
                color: ColorConstant.ink.withValues(alpha: .5), size: 11),
          ),
        ],
      ),
    );
  }

  Widget _feeRow(String label, String value) {
    return Row(
      children: [
        Expanded(
            child: Text(label,
                style: sahraText(
                    color: ColorConstant.ink.withValues(alpha: .65),
                    size: 13))),
        Text(value, style: sahraText(color: ColorConstant.ink, size: 13)),
      ],
    );
  }

  Widget _paymentMethodCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ColorConstant.lightCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ColorConstant.dune),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: ColorConstant.dune,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.credit_card_rounded,
                color: ColorConstant.ink, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Card',
                    style: sahraText(
                        color: ColorConstant.ink,
                        size: 15,
                        weight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  controller.hasBackendContext
                      ? 'Stripe PaymentSheet — Apple Pay / Google Pay when available'
                      : 'Simulated checkout — no real payment',
                  style: sahraText(
                      color: ColorConstant.ink.withValues(alpha: .55),
                      size: 12),
                ),
              ],
            ),
          ),
          Icon(Icons.check_circle_rounded, color: ColorConstant.gold, size: 22),
        ],
      ),
    );
  }

  List<_OrderLine> _orderLines() {
    final lines = <_OrderLine>[];
    if (controller.selections.isNotEmpty) {
      for (final sel in controller.selections) {
        final qty = (sel['quantity'] as num?)?.toInt() ?? 1;
        final price = (sel['priceCents'] as num?)?.toInt() ?? 0;
        final name =
            (sel['tierName'] ?? sel['sectionName'] ?? 'Ticket').toString();
        lines.add(_OrderLine('$qty × $name', controller.money(price * qty)));
      }
      return lines;
    }
    if (controller.listingCode != null) {
      lines.add(_OrderLine(
        '1 × ${controller.listingName ?? 'Resale ticket'}',
        controller.money(controller.displaySubtotalCents),
      ));
      return lines;
    }
    if (controller.sectionId != null) {
      final seatSuffix = controller.seatLabels.isNotEmpty
          ? ' · seats ${controller.seatLabels.join(', ')}'
          : '';
      lines.add(_OrderLine(
        '${controller.quantity} × ${controller.sectionName ?? 'Seated ticket'}$seatSuffix',
        controller.money(controller.displaySubtotalCents),
      ));
      return lines;
    }
    final legacyCount = controller.platinum +
        controller.gold +
        controller.silver +
        controller.bronze;
    if (legacyCount > 0) {
      lines.add(_OrderLine('$legacyCount × Ticket',
          controller.money(controller.displaySubtotalCents)));
    } else {
      lines.add(_OrderLine('${controller.quantity} × Ticket',
          controller.money(controller.displaySubtotalCents)));
    }
    return lines;
  }
}

class _OrderLine {
  const _OrderLine(this.label, this.amount);
  final String label;
  final String amount;
}

class CardWidget extends StatelessWidget {
  CardWidget(
      {super.key,
      required this.image,
      required this.title,
      required this.index,
      required this.desc,
      this.isPng = false,
      this.colorWhite = false});

  final String image;
  final String title;
  final String desc;
  final int index;
  final bool isPng;
  final bool colorWhite;

  final controller = Get.put(PaymentPageController());

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        controller.selectedPayment.value = index;
      },
      child: Obx(() => Container(
            decoration: BoxDecoration(
                color: ColorConstant.lightSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: controller.selectedPayment.value == index
                        ? ColorConstant.night
                        : ColorConstant.lightBorder)),
            margin: getMargin(bottom: 10),
            padding: getPadding(left: 15, right: 15, top: 8, bottom: 8),
            child: Row(
              children: [
                SizedBox(
                  height: 36,
                  width: 36,
                  child: CustomImageView(
                    svgPath: isPng ? null : image,
                    imagePath: isPng ? image : null,
                    height: 36,
                    width: 36,
                    color: colorWhite ? ColorConstant.whiteA700 : null,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(
                  width: 20,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText(
                        title: title,
                        family: 'Manrope',
                        fontSize: 16,
                        customWeight: FontWeight.w600,
                        clr: ColorConstant.lightText,
                      ),
                      const SizedBox(
                        width: 5,
                      ),
                      MyText(
                        title: desc,
                        family: 'Inter',
                        fontSize: 12,
                        clr: ColorConstant.lightMuted,
                      ),
                    ],
                  ),
                ),
                const SizedBox(
                  width: 10,
                ),
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: controller.selectedPayment.value == index
                            ? ColorConstant.night
                            : ColorConstant.lightBorder),
                  ),
                  child: Padding(
                    padding: getPadding(all: 3),
                    child: Container(
                        decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: controller.selectedPayment.value == index
                          ? ColorConstant.night
                          : Colors.transparent,
                    )),
                  ),
                )
              ],
            ),
          )),
    );
  }
}

/// Sahra primary CTA: gold pill with Night text — the brand signature.
class PrimaryPillButton extends StatelessWidget {
  const PrimaryPillButton({
    super.key,
    required this.text,
    required this.onTap,
    this.margin,
    this.prefixWidget,
  });

  final String text;
  final VoidCallback onTap;
  final EdgeInsetsGeometry? margin;
  final Widget? prefixWidget;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: SizedBox(
        width: double.maxFinite,
        height: getVerticalSize(48),
        child: TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            backgroundColor: ColorConstant.gold,
            foregroundColor: ColorConstant.night,
            shape: const StadiumBorder(),
            padding: EdgeInsets.zero,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (prefixWidget != null) ...[
                prefixWidget!,
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  text,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.bricolageGrotesque(
                    color: ColorConstant.night,
                    fontSize: getFontSize(16),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
