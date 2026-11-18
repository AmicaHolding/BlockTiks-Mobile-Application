import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/notification_settings_controller.dart';

class NotificationSettingsView
    extends GetView<NotificationSettingsController> {
  const NotificationSettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              const SahraBackHeader(title: ''),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
                child: Text('Notifications',
                    style: sahraText(size: 28, weight: FontWeight.w800)),
              ),
              const SizedBox(height: 18),
              const SahraSmallLabel('How we reach you'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SahraCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                      children: NotificationSettingsController.channels
                          .map((c) => _switchRow(c[1], c[0]))
                          .toList()),
                ),
              ),
              const SizedBox(height: 10),
              const SahraSmallLabel('What about'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SahraCard(
                  padding: EdgeInsets.zero,
                  child: Column(children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(children: [
                        Expanded(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Tickets & orders',
                                    style: sahraText(
                                        size: 15,
                                        weight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text('Always on. You need these to get in.',
                                    style: sahraText(
                                        color: ColorConstant.nightMuted,
                                        size: 12)),
                              ]),
                        ),
                        Text('On',
                            style: sahraText(
                                color: ColorConstant.gold,
                                size: 14,
                                weight: FontWeight.w600)),
                      ]),
                    ), ...NotificationSettingsController.categories
                        .map((c) => _switchRow(c[1], c[0], detail: c[2])),
                  ]),
                ),
              ),
            ]),
      ),
    );
  }

  Widget _switchRow(String label, String key, {String? detail}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: sahraText(size: 15, weight: FontWeight.w600)),
            if (detail != null) ...[
              const SizedBox(height: 2),
              Text(detail,
                  style: sahraText(
                      color: ColorConstant.nightMuted, size: 12)),
            ],
          ]),
        ),
        Obx(() => Switch.adaptive(
              value: controller.valueFor(key).value,
              activeThumbColor: ColorConstant.gold,
              onChanged: (_) => controller.toggle(key),
            )),
      ]),
    );
  }
}
