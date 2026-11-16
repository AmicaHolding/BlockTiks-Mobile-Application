import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/broadcast_message_controller.dart';

class BroadcastMessageView extends GetView<BroadcastMessageController> {
  const BroadcastMessageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      safeTopArea: true,
      sidePadding: false,
      bodyPadding: false,
      backgroundColor: ColorConstant.night,
      resizeToAvoidBottomInset: true,
      bottomNavigationBar: Obx(() {
        controller.version.value;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Delivery is not connected yet',
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 12)),
                const SizedBox(height: 8),
                SahraPillButton(
                  label:
                      controller.isSending.value ? 'Sending…' : 'Send message',
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
          SahraSectionLabel('To'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _audienceChips(),
          ),
          SahraSectionLabel('Message'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _messageField(),
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
                Obx(() => Text(controller.eventTitle.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 13))),
                Text('Message guests',
                    style: sahraText(size: 26, weight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _audienceChips() {
    return Obx(() => Wrap(
          spacing: 8,
          runSpacing: 8,
          children: controller.audienceOptions
              .map((audience) => SahraChip(
                    label: audience,
                    selected: controller.selectedAudience.contains(audience),
                    onTap: () => controller.toggleAudience(audience),
                  ))
              .toList(),
        ));
  }

  Widget _messageField() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ColorConstant.nightBorder),
      ),
      child: TextField(
        controller: controller.messageController,
        maxLines: 6,
        style: sahraText(height: 1.45),
        decoration: InputDecoration(
          hintText: 'Tell your guests what they need to know',
          hintStyle: sahraText(color: ColorConstant.nightMuted),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _gapCard() {
    return SahraCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.campaign_outlined, color: ColorConstant.gold, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Broadcast delivery is not connected yet. This composer is ready for the backend notification endpoint, but sending will not reach guests until that exists.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}
