import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/notifications_page_controller.dart';

class NotificationsPageView extends GetView<NotificationsPageController> {
  const NotificationsPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
        backgroundColor: ColorConstant.night,
        foregroundColor: ColorConstant.whiteA700,
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
              child: Text('You’re all caught up.',
                  style: sahraText(color: ColorConstant.nightMuted)));
        }
        return RefreshIndicator(
          color: ColorConstant.gold,
          onRefresh: controller.fetch,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: controller.items.length,
            separatorBuilder: (_, __) => Divider(
                height: 1,
                thickness: 1,
                color: ColorConstant.nightBorder),
            itemBuilder: (context, index) {
              final item = controller.items[index];
              final read = controller.isRead(item);
              return InkWell(
                onTap: () => controller.markRead(item),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                      const SizedBox(width: 12),
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
                ),
              );
            },
          ),
        );
      }),
    );
  }
}
