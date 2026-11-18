import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/all_guests/controllers/all_guests_controller.dart';
import 'package:block_tix/app/modules/creator_account_tab/controllers/creator_account_tab_controller.dart';
import 'package:block_tix/app/modules/profile_tab/controllers/profile_tab_controller.dart';
import 'package:block_tix/app/services/api_service.dart';

class CreatorDashboardController extends GetxController {
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

  /// Door-mode role, gate staff see Scan · Guests · Account only (flow M5).
  final RxBool isGateStaff = false.obs;

  @override
  void onInit() {
    super.onInit();
    // Door-mode tabs: Events, Guests, Account (Scan is a bar action).
    if (!Get.isRegistered<ProfileTabController>()) {
      Get.put(ProfileTabController());
    }
    Get.put(AllGuestsController());
    Get.put(CreatorAccountTabController());
    _loadRole();
    var data = Get.arguments;
    if (data != null && data['index'] != null) {
      selectedIndex.value = data['index'];
      Future.delayed(200.milliseconds, () => changePage(selectedIndex.value));
    }
    fetchNotificationCount();
  }

  /// Role comes from the memberships contract; missing endpoint keeps the
  /// default (full door mode). TODO(api-gap: memberships fallback)
  Future<void> _loadRole() async {
    try {
      final list = await ApiService.memberships();
      if (list.isEmpty) return;
      final role = list.first['role']?.toString().toLowerCase() ?? '';
      isGateStaff.value = role.contains('gate');
    } catch (_) {}
  }

  void changePage(index) {
    // The creator bar can render on pushed pages where this PageController
    // has no clients — jumpToPage would throw and leave the tab dead.
    if (!pageController.hasClients) return;
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
