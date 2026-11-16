import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/withdraw_controller.dart';

class WithdrawView extends GetView<WithdrawController> {
  const WithdrawView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
        backgroundColor: ColorConstant.night,
        elevation: 0,
        title: Text('Earnings',
            style: sahraText(size: 22, weight: FontWeight.w800)),
      ),
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
          onRefresh: controller.load,
          child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                      color: ColorConstant.gold,
                      borderRadius: BorderRadius.circular(20)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ready to withdraw',
                            style: sahraText(
                                color: ColorConstant.night, size: 14)),
                        const SizedBox(height: 4),
                        Text(controller.aed(controller.readyCents.value),
                            style: sahraText(
                                color: ColorConstant.night,
                                size: 34,
                                weight: FontWeight.w800,
                                letterSpacing: -0.8)),
                        const SizedBox(height: 14),
                        Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                  child: Text(
                                      'Pending · releases after the event',
                                      style: sahraText(
                                          color: ColorConstant.night,
                                          size: 13))),
                              Text(
                                  controller.aed(controller.pendingCents.value),
                                  style: sahraText(
                                      color: ColorConstant.night,
                                      size: 14,
                                      weight: FontWeight.w700)),
                            ]),
                        const SizedBox(height: 14),
                        Obx(() => SahraPillButton(
                              label: controller.isWithdrawing.value
                                  ? 'Requesting…'
                                  : 'Withdraw to bank',
                              dark: true,
                              enabled: controller.canWithdraw,
                              onTap: controller.withdraw,
                            )),
                      ]),
                ),
                const SizedBox(height: 14),
                Text(
                    'Lifetime: ${controller.aed(controller.lifetimeCents.value)} from resale sales',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13)),
                const SizedBox(height: 12),
                Text('Sales',
                    style: sahraText(size: 17, weight: FontWeight.w600)),
                const SizedBox(height: 6),
                if (controller.sales.isEmpty)
                  SahraCard(
                      child: Text('No resale sales yet',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14)))
                else
                  ...controller.sales.map((sale) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SahraCard(
                          child: Row(children: [
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(sale['title']?.toString() ?? 'Resale',
                                        style: sahraText(
                                            size: 15, weight: FontWeight.w600)),
                                    const SizedBox(height: 3),
                                    Text(sale['subtitle']?.toString() ?? '',
                                        style: sahraText(
                                            color: ColorConstant.nightMuted,
                                            size: 12)),
                                  ]),
                            ),
                            const SizedBox(width: 12),
                            Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                      controller.aed(
                                          (sale['amountCents'] as num?)
                                                  ?.toInt() ??
                                              0),
                                      style: sahraText(
                                          size: 15, weight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  SahraStatusPill(
                                      sale['status']?.toString() ?? '',
                                      color: sale['status'] == 'Ready'
                                          ? ColorConstant.gold
                                          : ColorConstant.nightMuted),
                                ]),
                          ]),
                        ),
                      )),
              ]),
        );
      }),
    );
  }
}
