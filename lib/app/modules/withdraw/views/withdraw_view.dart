import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/withdraw_controller.dart';

class WithdrawView extends GetView<WithdrawController> {
  const WithdrawView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
        backgroundColor: ColorConstant.night,
          foregroundColor: ColorConstant.whiteA700,
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
          onRefresh: () async {
            await controller.load();
            await controller.refreshPayoutStatus();
          },
          child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                _balanceCard(),
                const SizedBox(height: 14),
                _payoutCard(),
                const SizedBox(height: 14),
                Text(
                    'Lifetime: ${controller.money(controller.lifetimeCents.value)} from resale sales · withdrawn ${controller.money(controller.withdrawnCents.value)}',
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
                                      controller.money(
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
                const SizedBox(height: 8),
                Text('Withdrawals',
                    style: sahraText(size: 17, weight: FontWeight.w600)),
                const SizedBox(height: 6),
                if (controller.withdrawals.isEmpty)
                  SahraCard(
                      child: Text('No withdrawals yet',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14)))
                else
                  ...controller.withdrawals.map((w) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SahraCard(
                          child: Row(children: [
                            Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Payout',
                                        style: sahraText(
                                            size: 15, weight: FontWeight.w600)),
                                    const SizedBox(height: 3),
                                    Text(
                                        '${controller.dateLabel(w['createdAt']?.toString())} · ${w['status']?.toString() ?? ''}',
                                        style: sahraText(
                                            color: ColorConstant.nightMuted,
                                            size: 12)),
                                  ]),
                            ),
                            Text(
                                controller.money(
                                    (w['amountCents'] as num?)?.toInt() ?? 0),
                                style: sahraText(
                                    size: 15, weight: FontWeight.w700)),
                          ]),
                        ),
                      )),
              ]),
        );
      }),
    );
  }

  Widget _balanceCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
          color: ColorConstant.gold, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Available to withdraw',
            style: sahraText(color: ColorConstant.night, size: 14)),
        const SizedBox(height: 4),
        Text(controller.money(controller.availableCents.value),
            style: sahraText(
                color: ColorConstant.night,
                size: 34,
                weight: FontWeight.w800,
                letterSpacing: -0.8)),
        const SizedBox(height: 14),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Expanded(
              child: Text('Pending · releases after the event',
                  style: sahraText(color: ColorConstant.night, size: 13))),
          Text(controller.money(controller.pendingCents.value),
              style: sahraText(
                  color: ColorConstant.night,
                  size: 14,
                  weight: FontWeight.w700)),
        ]),
        const SizedBox(height: 14),
        Obx(() => SahraPillButton(
              label: controller.isWithdrawing.value ? 'Sending…' : 'Withdraw',
              dark: true,
              enabled: controller.canWithdraw,
              onTap: controller.withdraw,
            )),
        if (!controller.payoutsEnabled.value) ...[
          const SizedBox(height: 8),
          Text('Set up your payout account below to enable withdrawals.',
              style: sahraText(
                  color: ColorConstant.night.withValues(alpha: .75), size: 12)),
        ],
      ]),
    );
  }

  Widget _payoutCard() {
    return Obx(() {
      final enabled = controller.payoutsEnabled.value;
      final connected = controller.payoutsConnected.value;
      final status = enabled
          ? 'Payouts enabled'
          : connected
              ? 'Setup incomplete, finish payout onboarding'
              : 'Connect a payout account to withdraw earnings';
      return SahraCard(
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: ColorConstant.nightElevated,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
                enabled
                    ? Icons.verified_rounded
                    : Icons.account_balance_outlined,
                color: enabled ? ColorConstant.gold : ColorConstant.nightMuted,
                size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Payout account',
                  style: sahraText(size: 15, weight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(status,
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ]),
          ),
          TextButton(
            onPressed: controller.isSettingUpPayouts.value
                ? null
                : controller.setupPayouts,
            child: Text(
                controller.isSettingUpPayouts.value
                    ? 'Opening…'
                    : enabled
                        ? 'Manage'
                        : connected
                            ? 'Finish setup'
                            : 'Set up',
                style: sahraText(
                    color: ColorConstant.gold,
                    size: 14,
                    weight: FontWeight.w600)),
          ),
        ]),
      );
    });
  }
}
