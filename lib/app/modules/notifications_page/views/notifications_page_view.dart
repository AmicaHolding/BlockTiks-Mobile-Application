import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/notifications_page_controller.dart';

class NotificationsPageView extends GetView<NotificationsPageController> {
  const NotificationsPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
        backgroundColor: ColorConstant.night,
        elevation: 0,
        title: Text('Notifications',
            style: sahraText(size: 22, weight: FontWeight.w800)),
        actions: [
          Obx(() => controller.unreadCount.value > 0
              ? TextButton(
                  onPressed: controller.markAllRead,
                  child: Text('Mark all read',
                      style: sahraText(
                          color: ColorConstant.gold,
                          size: 14,
                          weight: FontWeight.w600)),
                )
              : const SizedBox.shrink()),
        ],
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
                  style: sahraText(color: ColorConstant.nightMuted)),
            ),
          );
        }
        if (controller.items.isEmpty) {
          return Center(
              child: Text('No notifications yet',
                  style: sahraText(color: ColorConstant.nightMuted)));
        }
        return RefreshIndicator(
          color: ColorConstant.gold,
          onRefresh: controller.fetch,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            itemCount: controller.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final item = controller.items[index];
              final read = controller.isRead(item);
              return SahraCard(
                color: read
                    ? ColorConstant.nightSurface
                    : ColorConstant.nightElevated,
                child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                            color: ColorConstant.nightSurface,
                            borderRadius: BorderRadius.circular(12)),
                        child: Icon(
                            controller.iconFor(item['type']?.toString()),
                            color: ColorConstant.gold,
                            size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['title']?.toString() ?? 'Notification',
                                  style: sahraText(
                                      size: 15, weight: FontWeight.w600)),
                              const SizedBox(height: 3),
                              Text(item['body']?.toString() ?? '',
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 13)),
                            ]),
                      ),
                      const SizedBox(width: 8),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                                controller
                                    .timeLabel(item['createdAt']?.toString()),
                                style: sahraText(
                                    color: ColorConstant.nightMuted, size: 12)),
                            const SizedBox(height: 6),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: read
                                    ? Colors.transparent
                                    : ColorConstant.gold,
                              ),
                            ),
                          ]),
                    ]),
              );
            },
          ),
        );
      }),
    );
  }
}
