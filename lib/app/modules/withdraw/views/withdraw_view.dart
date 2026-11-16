import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/withdraw_controller.dart';

class WithdrawView extends GetView<WithdrawController> {
  const WithdrawView({Key? key}) : super(key: key);

  static const Color _ink = Color(0xFF241C14);
  static const Color _muted = Color(0xFF6B6257);
  static const Color _card = Color(0xFFFFF9EF);
  static const Color _border = Color(0xFFECE4D6);
  static const Color _dune = Color(0xFFECE4D6);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: true,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: const Color(0xFFF7F1E6),
      bottomNavigationBar: Obx(() {
        final amount = formatCents(controller.availableCents.value);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SahraPillButton(
                  label: 'Withdraw $amount',
                  dark: true,
                  enabled: controller.canWithdraw,
                  onTap: controller.withdraw,
                ),
                const SizedBox(height: 8),
                Text(
                  'Payouts are not connected yet.',
                  textAlign: TextAlign.center,
                  style: sahraText(color: _muted, size: 12),
                ),
              ],
            ),
          ),
        );
      }),
      child: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator(color: _ink));
        }
        if (controller.loadError.value != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Couldn't load earnings",
                      style: sahraText(
                          color: _ink, size: 18, weight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(controller.loadError.value!,
                      textAlign: TextAlign.center,
                      style: sahraText(color: _muted, size: 13)),
                  const SizedBox(height: 14),
                  SahraPillButton(
                      label: 'Retry', dark: true, onTap: controller.load),
                ],
              ),
            ),
          );
        }
        return RefreshIndicator(
          color: _ink,
          backgroundColor: _card,
          onRefresh: controller.load,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 140),
            children: [
              _header(),
              _available(),
              _payoutCard(),
              SahraSectionLabel('Recent earnings'),
              if (controller.soldListings.isEmpty)
                _emptyEarnings()
              else
                ...controller.soldListings.map(_earningTile),
            ],
          ),
        );
      }),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 20, 8),
      child: Row(
        children: [
          IconButton(
            onPressed: Get.back,
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: _ink, size: 20),
          ),
          Text('Withdraw',
              style: sahraText(color: _ink, size: 26, weight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _available() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        children: [
          Text('Available ${formatCents(controller.availableCents.value)}',
              style: sahraText(color: _muted, size: 14)),
          const SizedBox(height: 6),
          Obx(() => Text(formatCents(controller.availableCents.value),
              style:
                  sahraText(color: _ink, size: 48, weight: FontWeight.w800))),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _dune,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text('Max',
                style:
                    sahraText(color: _ink, size: 13, weight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _payoutCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('To',
              style: sahraText(color: _ink, size: 14, weight: FontWeight.w600)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _card,
              border: Border.all(color: _border, width: 1.5),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Payout method',
                          style: sahraText(
                              color: _ink, size: 15, weight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Text('Not connected',
                          style: sahraText(color: _muted, size: 13)),
                    ],
                  ),
                ),
                Text('Change',
                    style: sahraText(
                        color: ColorConstant.rumman,
                        size: 14,
                        weight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Payouts are not connected yet. Bank details and settlement timing need a backend payout flow.',
            style: sahraText(color: _muted, size: 13, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _emptyEarnings() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Text('No resale earnings yet.',
          style: sahraText(color: _muted, size: 13)),
    );
  }

  Widget _earningTile(Map<String, dynamic> listing) {
    final cents = listing['priceCents'];
    final price = cents is num ? formatCents(cents) : '';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _card,
          border: Border.all(color: _border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(listing['eventTitle']?.toString() ?? 'Event',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: sahraText(
                          color: _ink, size: 15, weight: FontWeight.w600)),
                  Text(
                    '${listing['tierName']?.toString() ?? 'Ticket'} · ${listing['ticketCode']?.toString() ?? ''}',
                    style: sahraText(color: _muted, size: 12),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(price,
                    style: sahraText(
                        color: _ink, size: 15, weight: FontWeight.w700)),
                Text('SOLD', style: sahraText(color: _muted, size: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
