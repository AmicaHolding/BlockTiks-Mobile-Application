import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/promo_codes_controller.dart';

class PromoCodesView extends GetView<PromoCodesController> {
  const PromoCodesView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
          backgroundColor: ColorConstant.night,
          elevation: 0,
          title: Text('Promo codes',
              style: sahraText(size: 22, weight: FontWeight.w800))),
      body: Obx(() {
        if (controller.isLoading.value) {
          return Center(
              child: CircularProgressIndicator(color: ColorConstant.gold));
        }
        if (controller.loadError.value != null) {
          return Center(
              child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(controller.loadError.value!,
                      textAlign: TextAlign.center,
                      style: sahraText(color: ColorConstant.nightMuted))));
        }
        return RefreshIndicator(
          color: ColorConstant.gold,
          onRefresh: controller.fetch,
          child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: controller.codeController,
                      style: sahraText(size: 15),
                      decoration: InputDecoration(
                        hintText: 'ENTER A CODE',
                        hintStyle: sahraText(
                            color: ColorConstant.nightMuted,
                            size: 15,
                            letterSpacing: 1.2),
                        filled: true,
                        fillColor: ColorConstant.nightSurface,
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  TextButton(
                      onPressed: controller.fetch,
                      child: Text('Add',
                          style: sahraText(
                              color: ColorConstant.night,
                              size: 15,
                              weight: FontWeight.w600))),
                ]),
                const SizedBox(height: 18),
                Text('Ready to use · ${controller.ready.length}',
                    style: sahraText(size: 14, weight: FontWeight.w600)),
                const SizedBox(height: 10),
                if (controller.ready.isEmpty)
                  SahraCard(
                      child: Text('No active promo codes',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14)))
                else
                  ...controller.ready.map((p) => _PromoTicket(
                      promo: p, controller: controller, enabled: true)),
                const SizedBox(height: 20),
                Text('Used or expired',
                    style: sahraText(
                        color: ColorConstant.nightMuted,
                        size: 14,
                        weight: FontWeight.w600)),
                const SizedBox(height: 10),
                if (controller.used.isEmpty)
                  SahraCard(
                      child: Text('Nothing used yet',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14)))
                else
                  ...controller.used.map((p) => _PromoTicket(
                      promo: p, controller: controller, enabled: false)),
              ]),
        );
      }),
    );
  }
}

class _PromoTicket extends StatelessWidget {
  const _PromoTicket(
      {required this.promo, required this.controller, required this.enabled});
  final Map<String, dynamic> promo;
  final PromoCodesController controller;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final bg = enabled ? ColorConstant.gold : ColorConstant.nightSurface;
    final fg = enabled ? ColorConstant.night : ColorConstant.nightMuted;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Container(
          width: 92,
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: Border(
                right: BorderSide(
                    color: enabled
                        ? ColorConstant.night.withValues(alpha: 0.35)
                        : ColorConstant.nightBorder,
                    width: 2)),
          ),
          child: Column(children: [
            Text(controller.discountLabel(promo),
                style: sahraText(
                    color: fg,
                    size: 22,
                    weight: FontWeight.w800,
                    letterSpacing: -0.6)),
            Text('OFF',
                style: sahraText(color: fg, size: 11, weight: FontWeight.w600)),
          ]),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(promo['code']?.toString() ?? '',
                  style: sahraText(
                      color: fg,
                      size: 15,
                      weight: FontWeight.w700,
                      letterSpacing: 1.2)),
              const SizedBox(height: 3),
              Text(controller.detailLabel(promo),
                  style: sahraText(color: fg, size: 13)),
              const SizedBox(height: 2),
              Text(controller.expiryLabel(promo),
                  style:
                      sahraText(color: fg.withValues(alpha: 0.75), size: 12)),
            ]),
          ),
        ),
      ]),
    );
  }
}
