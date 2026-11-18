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
        controller.pushEnabled.value;
        controller.emailEnabled.value;
        controller.smsEnabled.value;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Max 3 broadcasts per event day · attendees see this in Sahra',
                  textAlign: TextAlign.center,
                  style: sahraText(color: ColorConstant.nightMuted, size: 12),
                ),
                const SizedBox(height: 8),
                SahraPillButton(
                  label: controller.isSending.value
                      ? 'Sending…'
                      : 'Send to ${controller.selectedAudience.value}',
                  enabled: controller.canSend,
                  onTap: controller.send,
                ),
              ],
            ),
          ),
        );
      }),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 150),
        children: [
          _header(),
          SahraSectionLabel('To'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _audienceChips(),
          ),
          SahraSectionLabel('Channels'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _channels(),
          ),
          SahraSectionLabel('Message'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _messageField(),
                const SizedBox(height: 10),
                Obx(() => Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${controller.messageController.text.trim().length}/500',
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 12),
                          ),
                        ),
                        if (controller.lastSent.value.isNotEmpty)
                          Text(controller.lastSent.value,
                              style: sahraText(
                                  color: ColorConstant.nightMuted, size: 12)),
                      ],
                    )),
                const SizedBox(height: 14),
                _noteCard(),
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
          children: controller.audiences.map((audience) {
            final label = audience['label']?.toString() ?? '';
            return SahraChip(
              label: label,
              selected: controller.selectedAudience.value == label,
              onTap: () => controller.selectedAudience.value = label,
            );
          }).toList(),
        ));
  }

  Widget _channels() {
    return SahraCard(
      child: Column(
        children: [
          _channelRow('Push notification', controller.pushEnabled),
          _channelRow('Email', controller.emailEnabled),
          _channelRow('SMS', controller.smsEnabled),
        ],
      ),
    );
  }

  Widget _channelRow(String label, RxBool value) {
    return Obx(() => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Expanded(child: Text(label, style: sahraText(size: 14))),
              Switch.adaptive(
                value: value.value,
                activeThumbColor: ColorConstant.gold,
                onChanged: (v) => value.value = v,
              ),
            ],
          ),
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
        maxLength: 500,
        maxLines: 6,
        buildCounter: (_,
                {required currentLength, required isFocused, maxLength}) =>
            null,
        style: sahraText(height: 1.45),
        decoration: InputDecoration(
          hintText: 'Tell your guests what they need to know',
          hintStyle: sahraText(color: ColorConstant.nightMuted),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _noteCard() {
    return SahraCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.campaign_outlined, color: ColorConstant.gold, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Delivery is queued into the attendee feed for now. Push/email/SMS providers are not connected yet.',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}
