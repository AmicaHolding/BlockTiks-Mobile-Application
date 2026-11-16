import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/profile_tab/controllers/profile_tab_controller.dart';
import 'package:block_tix/app/services/api_service.dart';

class UserDashboardController extends GetxController {
  //pages detail
  RxInt selectedIndex = 0.obs;
  RxString screenName = ''.obs;
  RxBool isHideLogo = false.obs;
  RxBool hideAppBar = false.obs;
  RxDouble mainTopPadding = 1.0.obs;
  PageController pageController = PageController();
  int currentPage = 1;
  int totalPages = 0;

  RxInt notificationUnreadCount = 0.obs;

  @override
  void onInit() {
    super.onInit();
    if (!Get.isRegistered<ProfileTabController>()) {
      Get.put(ProfileTabController());
    }
    var data = Get.arguments;
    if (data != null && data['index'] != null) {
      selectedIndex.value = data['index'];
      Future.delayed(200.milliseconds, () => changePage(selectedIndex.value));
    }
    fetchNotificationCount();
  }

  void changePage(index) {
    pageController.jumpToPage(index);
  }

  /// Refresh the notification badge from the backend.
  Future<void> fetchNotificationCount() async {
    try {
      final res = await ApiService.notifications();
      notificationUnreadCount.value =
          (res['unreadCount'] as num?)?.toInt() ?? 0;
    } catch (_) {
      // Badge is best-effort; the notifications page surfaces errors.
    }
  }
}
