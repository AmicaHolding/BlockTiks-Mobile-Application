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
                            family: 'Roboto Condensed',
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
                                title: 'Clear All Notifications',
                                family: 'Manrope',
                                customWeight: FontWeight.w400,
                                fontSize: 12,
                                clr: ColorConstant.primaryPink,
                              ),
                            ),
                          )
                        : const SizedBox.shrink()),
                  ],
                ),
              ),
              Expanded(
                child: Obx(()=> ListView.separated(
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
                        // Optionally, you can handle other things here, like showing a Snackbar
                      },
                      background: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: Colors.red,// Background color when swiping
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
                )),
              ),
            ],
          ),
        ));
  }
}
