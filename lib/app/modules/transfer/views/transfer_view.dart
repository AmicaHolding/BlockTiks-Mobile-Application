import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/transfer_controller.dart';

class TransferView extends GetView<TransferController> {
  const TransferView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: true,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      bottomNavigationBar: Obx(() {
        controller.version.value;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Free transfer · recipient gets a new QR',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 12)),
                const SizedBox(height: 8),
                SahraPillButton(
                  label:
                      controller.isSending.value ? 'Sending…' : 'Send ticket',
                  enabled: controller.canSend,
                  onTap: controller.send,
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
          SahraSectionLabel('Ticket'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _ticketCard(),
          ),
          SahraSectionLabel('To'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _recipientField(),
                const SizedBox(height: 14),
                _gapCard(),
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
                Text(controller.ticketTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13)),
                Text('Send ticket',
                    style: sahraText(size: 26, weight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ticketCard() {
    final detail = <String>[
      if (controller.ticketTier.isNotEmpty) controller.ticketTier,
      if (controller.ticketSection.isNotEmpty) controller.ticketSection,
      if (controller.ticketSeat.isNotEmpty) controller.ticketSeat,
      if (controller.ticketDate.isNotEmpty) controller.ticketDate,
    ].join(' · ');
    return SahraCard(
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: ColorConstant.gold.withValues(alpha: .14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Icons.confirmation_number_rounded,
                color: ColorConstant.gold, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(controller.ticketTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(size: 16, weight: FontWeight.w700)),
                if (detail.isNotEmpty)
                  Text(detail,
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 12)),
                if (controller.ticketCode.isNotEmpty)
                  Text(controller.ticketCode,
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _recipientField() {
    return TextField(
      controller: controller.toController,
      style: sahraText(),
      decoration: InputDecoration(
        hintText: 'Name, username, or email',
        hintStyle: sahraText(color: ColorConstant.nightMuted),
        filled: true,
        fillColor: ColorConstant.nightSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: ColorConstant.nightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: ColorConstant.nightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: ColorConstant.gold),
        ),
      ),
    );
  }

  Widget _gapCard() {
    return SahraCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: ColorConstant.gold, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Ticket transfers are not connected yet. This screen collects the recipient, but the backend still needs a transfer endpoint before ownership can change hands.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}
