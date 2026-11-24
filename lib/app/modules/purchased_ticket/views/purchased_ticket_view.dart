import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ticket_card.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/sahra_v3.dart';


import '../controllers/purchased_ticket_controller.dart';

class PurchasedTicketView extends GetView<PurchasedTicketController> {
  const PurchasedTicketView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      showDivider: false,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Row(
            children: [
              Expanded(
                child: _secondaryButton('Send', () => _sendTicket()),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _secondaryButton('Sell', () => _sell()),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SahraPillButton(
                  label: 'Done',
                  onTap: () {
                    if (controller.showBack) {
                      Get.back();
                    } else {
                      Get.offAllNamed(Routes.USER_DASHBOARD);
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      child: Obx(() {
        return RefreshIndicator(
          onRefresh: () async {},
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              _header(),
              const SizedBox(height: 12),
              _statusBanner(),
              const SizedBox(height: 14),
              _summaryCard(),
              const SizedBox(height: 16),
              if (controller.isLoadingOrder.value)
                const Padding(
                  padding: EdgeInsets.all(48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (controller.orderError.value != null)
                SahraEmptyState(
                  title: "Couldn't load ticket",
                  message: controller.orderError.value,
                )
              else
                ..._ticketCards(),
              const SizedBox(height: 16),
              // G1-G5: split the bill — friends pay their own share.
              if (controller.orderId.isNotEmpty)
                SahraGroupPay(orderId: controller.orderId),
              _walletHint(),
            ],
          ),
        );
      }),
    );
  }

  Widget _header() {
    return Row(
      children: [
        if (controller.showBack)
          GestureDetector(
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
          )
        else
          const SizedBox(width: 38),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("You're in.",
                  style: sahraText(size: 26, weight: FontWeight.w700)),
              Text('Show this QR at the gate',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ],
          ),
        ),
        IconButton(
          onPressed: _showTicketOptions,
          icon: Icon(Icons.more_horiz_rounded,
              color: ColorConstant.whiteA700, size: 24),
        ),
      ],
    );
  }

  Widget _statusBanner() {
    if (controller.isPreview) {
      return _banner(
        icon: Icons.science_outlined,
        color: ColorConstant.warningOrange,
        text: 'Order preview, payment not completed',
      );
    }
    if (controller.isSimulated) {
      return _banner(
        icon: Icons.science_outlined,
        color: ColorConstant.warningOrange,
        text: 'Simulated ticket, no real purchase',
      );
    }
    return const SizedBox.shrink();
  }

  Widget _banner({
    required IconData icon,
    required Color color,
    required String text,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: .4)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style:
                    sahraText(color: color, size: 12, weight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard() {
    return SahraCard(
      color: ColorConstant.nightElevated,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(controller.eventTitle,
              style: sahraText(size: 18, weight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            [
              controller.venue,
              controller.ticketDate,
              controller.ticketTime,
            ].where((s) => s.isNotEmpty).join(' · '),
            style: sahraText(color: ColorConstant.nightMuted, size: 13),
          ),
          const SizedBox(height: 10),
          Text('Order ${controller.orderId}',
              style: sahraText(
                  color: ColorConstant.gold,
                  size: 12,
                  weight: FontWeight.w600)),
        ],
      ),
    );
  }

  List<Widget> _ticketCards() {
    if (controller.ticketRows.isNotEmpty) {
      return controller.ticketRows.map((row) {
        String rowStr(String key, String fallback) {
          final value = row[key]?.toString() ?? '';
          return value.isEmpty ? fallback : value;
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: SahraTicketCard(
            title: rowStr('title', controller.eventTitle),
            subtitle:
                '${rowStr('venue', controller.venue)} · ${rowStr('date', controller.ticketDate)} · ${rowStr('time', controller.ticketTime)}',
            fields: {
              'Gate': rowStr('section', 'Main'),
              'Zone': rowStr('tier', controller.ticketTier),
              'Seat': rowStr('seat', '-'),
              'Order': rowStr('orderId', controller.orderId),
            },
            code: row['code']?.toString(),
            qrData: row['code']?.toString(),
            status: row['status']?.toString(),
          ),
        );
      }).toList().cast<Widget>()
        // Q1-Q3: live rotating QR for the first valid ticket (unlocks 24h
        // before doors; refreshes on the 15s window).
        .followedBy(
            controller.ticketRows
                .where((r) =>
                    r['status']?.toString() == 'VALID' && r['code'] != null)
                .take(1)
                .map((r) =>
                    Center(child: SahraLiveQr(ticketCode: r['code'].toString()))))
        .toList();
    }

    // Preview/simulated path without order rows.
    return List.generate(controller.tickets, (index) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: SahraTicketCard(
          title: controller.eventTitle,
          subtitle:
              '${controller.venue} · ${controller.ticketDate} · ${controller.ticketTime}',
          fields: {
            'Zone': controller.ticketTier,
            'Order': controller.orderId,
          },
          code: controller.isSimulated ? 'SIM-${index + 1}' : null,
          qrData: controller.isSimulated ? 'SIM-${index + 1}' : null,
          status: controller.isPreview
              ? 'PENDING'
              : controller.isSimulated
                  ? 'SIMULATED'
                  : null,
        ),
      );
    });
  }

  Widget _walletHint() {
    return SahraCard(
      color: ColorConstant.nightSurface,
      child: Row(
        children: [
          Icon(Icons.wallet_outlined, color: ColorConstant.gold, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Keep the screen bright at the gate. Transfers and resale are available from Tickets.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _secondaryButton(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: ColorConstant.nightBorder),
        ),
        alignment: Alignment.center,
        child: Text(label,
            style: sahraText(
                color: ColorConstant.whiteA700,
                size: 14,
                weight: FontWeight.w600)),
      ),
    );
  }

  void _sendTicket() {
    String code = '';
    var tier = controller.ticketTier;
    var section = '';
    var seat = '';
    Map<String, dynamic>? rowFor(String wanted) {
      for (final row in controller.ticketRows) {
        final rowCode = row['code']?.toString() ?? '';
        if (rowCode.isEmpty) continue;
        if (wanted.isNotEmpty && rowCode != wanted) continue;
        return row;
      }
      return null;
    }

    // The ticket the wallet tile opened wins over the order's first row.
    final row =
        rowFor(controller.focusTicketCode) ?? rowFor('');
    if (row != null) {
      code = row['code']?.toString() ?? '';
      final rowTier = row['tier']?.toString() ?? '';
      if (rowTier.isNotEmpty) tier = rowTier;
      section = row['section']?.toString() ?? '';
      seat = row['seat']?.toString() ?? '';
    }
    Get.toNamed(Routes.SEND_TICKETS, arguments: {
      'title': controller.eventTitle,
      'type': controller.eventType,
      'date': controller.ticketDate,
      'tier': tier,
      'section': section,
      'seat': seat,
      'ticketCode': code,
      'orderId': controller.orderId,
    });
  }

  void _sell() {
    Get.toNamed(Routes.ASK_BID, arguments: {
      'fromSell': true,
      'title': controller.eventTitle,
      'type': controller.eventType,
      'tier': controller.ticketTier,
    });
  }

  void _showTicketOptions() {
    Get.bottomSheet(
      Container(
        decoration: BoxDecoration(
          color: ColorConstant.nightSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(controller.eventTitle,
                  style: sahraText(size: 18, weight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${controller.eventType} · ${controller.ticketTier}',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
              const SizedBox(height: 18),
              _sheetAction(
                  'Send ticket', Icons.send_outlined, _sendTicket),
              _sheetAction('Sell ticket', Icons.sell_outlined, _sell),
              _sheetAction(
                  'View in Tickets', Icons.confirmation_number_outlined, () {
                Get.back();
                Get.offAllNamed(Routes.USER_DASHBOARD, arguments: {'index': 2});
              }),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }

  Widget _sheetAction(String label, IconData icon, VoidCallback onTap) {
    return Material(
      type: MaterialType.transparency,
      child: ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: ColorConstant.gold),
      title: Text(label, style: sahraText(size: 15, weight: FontWeight.w600)),
      onTap: () {
        Get.back();
        onTap();
      },
    ));
  }
}
