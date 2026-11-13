import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/notification_item.dart';
import '../controllers/notifications_page_controller.dart';

class NotificationsPageView extends GetView<NotificationsPageController> {
  const NotificationsPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
        // bodyPadding: false,
        showLogo: false,
        centerTitle: true,
        screenName: "Notifications",
        showBackBtn: true,
        sidePadding: false,
        child: Container(
          margin: getMargin(top: getVerticalSize(16)),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.fromLTRB(0, 0, 0, 25),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Obx(() => Visibility(
                      visible: controller.dummyNotifications.isNotEmpty,
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(0, 0, 10.5, 1),
                        child: const SizedBox(
                          width: 52,
                          child: MyText(
                            title: 'Today',
                            family: 'Manrope',
                            customWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    )),
                    Obx(() => controller.isMarkAllReadVisible.value
                        ? GestureDetector(
                            onTap: () {
                              controller.readAllNotifications();
                            },
                            child: Container(
                              margin: const EdgeInsets.fromLTRB(0, 6, 0, 0),
                              child: MyText(
                                title: 'Mark all as read',
                                family: 'Inter',
                                customWeight: FontWeight.w500,
                                fontSize: 13,
                                clr: ColorConstant.primaryAccent,
                              ),
                            ),
                          )
                        : const SizedBox.shrink()),
                  ],
                ),
              ),
              Expanded(
                child: Obx(() {
                  if (controller.dummyNotifications.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.notifications_none,
                            size: 48,
                            color: ColorConstant.white60,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No notifications yet',
                            style: AppStyle.bodySmallInter,
                          ),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    physics: const ScrollPhysics(),
                    itemCount: controller.dummyNotifications.length,
                    padding: EdgeInsets.zero,
                    itemBuilder: (context, index) {
                      final item = controller.dummyNotifications[index];
                      return Dismissible(
                        key: Key(item.id.toString()),  // Unique key for each notification item
                        direction: DismissDirection.endToStart, // Swipe from right to left
                        onDismissed: (direction) {
                          // Remove the notification from the list
                          controller.dummyNotifications.removeAt(index);
                          controller.getMarkAllAsReadVisibility();
                        },
                        background: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: ColorConstant.errorRed,
                          ),
                          padding: EdgeInsets.symmetric(horizontal: 20),
                          alignment: Alignment.centerRight,
                          child: Icon(Icons.delete, color: Colors.white),
                        ),
                        child: NotificationsItem(
                          item: item,
                          onTap: () {
                            controller.dummyNotifications[index].isRead.value = true;
                            controller.getMarkAllAsReadVisibility();
                          },
                        ),
                      );
                    },
                    separatorBuilder: (context, index) {
                      return SizedBox(
                        height: getSize(16),
                      );
                    },
                  );
                }),
              ),
            ],
          ),
        ));
  }
}
