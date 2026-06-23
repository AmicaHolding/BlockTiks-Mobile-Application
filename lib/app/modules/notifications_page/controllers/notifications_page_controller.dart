import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/modules/notifications_page/models/notification_item_model.dart';

import '../../../data/core/app_export.dart';

class NotificationsPageController extends GetxController {
  RxBool isMarkAllReadVisible = true.obs;

  final RxList<NotificationModel> dummyNotifications =
      DummyContent.dummyNotifications.obs;

  @override
  void onInit() {
    super.onInit();
    dummyNotifications.value = DummyContent.dummyNotifications;
  }

  @override
  void onReady() {
    super.onReady();
    getMarkAllAsReadVisibility();
  }

  void readAllNotifications() {
    for (int i = 0; i < dummyNotifications.length; i++) {
      dummyNotifications[i].isRead.value = true;
    }
    isMarkAllReadVisible.value = false;
  }

  void getMarkAllAsReadVisibility() {
    isMarkAllReadVisible.value = false;
    for (int i = 0; i < dummyNotifications.length; i++) {
      if (!dummyNotifications[i].isRead.value) {
        isMarkAllReadVisible.value = true;
        return;
      }
    }
    dummyNotifications.clear();
    dummyNotifications.refresh();
  }
}
