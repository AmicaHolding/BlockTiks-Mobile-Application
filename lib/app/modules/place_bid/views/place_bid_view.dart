import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/place_bid_controller.dart';

class PlaceBidView extends GetView<PlaceBidController> {
  const PlaceBidView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: true,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      bottomNavigationBar: Obx(() {
        final total = controller.money(controller.totalCents);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SahraPillButton(
                  label: 'Set price · up to $total',
                  onTap: controller.setPrice,
                ),
                const SizedBox(height: 8),
                Text(
                  'Set a max price and we will match you when a resale listing hits it.',
                  textAlign: TextAlign.center,
                  style: sahraText(color: ColorConstant.nightMuted, size: 12),
                ),
              ],
            ),
          ),
        );
      }),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 140),
        children: [
          _header(),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tell us what you\'d pay. When a ticket is listed at or below your price, we buy it for you automatically.',
                  style: sahraText(
                      color: ColorConstant.nightMuted, size: 14, height: 1.5),
                ),
                const SizedBox(height: 18),
                _stepperRow(),
                const SizedBox(height: 18),
                _priceStepper(),
                const SizedBox(height: 18),
                _rangeBar(),
                const SizedBox(height: 18),
                _marketCard(),
                const SizedBox(height: 18),
                _infoCard(),
                const SizedBox(height: 18),
                _keepTryingRow(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 20, 10),
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
                Text('${controller.eventTier} · ${controller.eventTitle}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13)),
                const SizedBox(height: 2),
                Text('Set your price',
                    style: sahraText(size: 26, weight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepperRow() {
    return Obx(() => Row(
          children: [
            Expanded(
              child: Text('Tickets',
                  style: sahraText(size: 15, weight: FontWeight.w600)),
            ),
            _circleButton(
              icon: Icons.remove_rounded,
              onTap: () => controller.changeQuantity(-1),
            ),
            SizedBox(
              width: 28,
              child: Text('${controller.quantity.value}',
                  textAlign: TextAlign.center,
                  style: sahraText(size: 15, weight: FontWeight.w700)),
            ),
            _circleButton(
              icon: Icons.add_rounded,
              filled: true,
              onTap: () => controller.changeQuantity(1),
            ),
          ],
        ));
  }

  Widget _priceStepper() {
    return Obx(() => Column(
          children: [
            Text('Max price, each',
                style: sahraText(color: ColorConstant.nightMuted, size: 13)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _circleButton(
                  icon: Icons.remove_rounded,
                  onTap: () => controller.changePrice(-500),
                ),
                const SizedBox(width: 18),
                Text(controller.money(controller.maxPriceCents.value),
                    style: sahraText(size: 34, weight: FontWeight.w800)),
                const SizedBox(width: 18),
                _circleButton(
                  icon: Icons.add_rounded,
                  filled: true,
                  onTap: () => controller.changePrice(500),
                ),
              ],
            ),
          ],
        ));
  }

  Widget _rangeBar() {
    return Obx(() {
      controller.maxPriceCents.value;
      final face = controller.faceCents;
      final cap = controller.capCents;
      var fraction = 0.0;
      if (face > 0 && cap > face) {
        final value = controller.maxPriceCents.value;
        fraction = ((value - face) / (cap - face)).clamp(0.0, 1.0);
      } else if (cap > 0) {
        fraction = 0.6;
      }
      return Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: fraction,
              minHeight: 8,
              color: ColorConstant.gold,
              backgroundColor: ColorConstant.nightSurface,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(face > 0 ? 'Face ${controller.money(face)}' : 'Face value',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
              Text(cap > 0 ? 'Cap ${controller.money(cap)}' : 'Cap',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ],
          ),
        ],
      );
    });
  }

  Widget _marketCard() {
    return Obx(() {
      if (controller.isLoading.value) {
        return SahraCard(
          child: Row(children: [
            const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2)),
            const SizedBox(width: 12),
            Text('Checking resale market…',
                style: sahraText(color: ColorConstant.nightMuted, size: 13)),
          ]),
        );
      }
      final listings = controller.marketListings;
      final lowest = controller.lowestAskCents;
      if (listings.isEmpty) {
        return const SizedBox.shrink();
      }
      return SahraCard(
        child: Row(
          children: [
            Icon(Icons.groups_rounded, color: ColorConstant.gold, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                lowest == null
                    ? '${listings.length} active resale listings.'
                    : '${listings.length} active resale listings · from ${controller.money(lowest)}',
                style: sahraText(color: ColorConstant.whiteA700, size: 13),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _infoCard() {
    return SahraCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: ColorConstant.gold, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Below face value. Fewer sellers usually take this, but it can happen close to the date.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }

  Widget _keepTryingRow() {
    return SahraCard(
      child: Row(
        children: [
          Expanded(
            child: Text('Keep trying until',
                style: sahraText(size: 15, weight: FontWeight.w600)),
          ),
          Text('Doors open',
              style: sahraText(color: ColorConstant.gold, size: 15)),
          const SizedBox(width: 6),
          Icon(Icons.keyboard_arrow_down_rounded,
              color: ColorConstant.nightMuted, size: 20),
        ],
      ),
    );
  }

  Widget _circleButton({
    required IconData icon,
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: filled ? ColorConstant.gold : Colors.transparent,
          border: Border.all(
            color: filled ? ColorConstant.gold : ColorConstant.nightBorder,
            width: 1.5,
          ),
        ),
        child: Icon(icon,
            color: filled ? ColorConstant.night : ColorConstant.whiteA700,
            size: 22),
      ),
    );
  }
}
