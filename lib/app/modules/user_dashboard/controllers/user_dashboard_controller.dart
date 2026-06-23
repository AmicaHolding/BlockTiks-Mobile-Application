import 'package:block_tix/app/data/core/app_export.dart';

import '../../../data/utils/api_utils.dart';
import '../../../services/base_client.dart';
import '../../notifications_page/models/notification_model.dart';

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

  // RxList<AdModel> adsList = <AdModel>[].obs;
  // ReportTypeModel reportModel = ReportTypeModel();
  Rx<NotificationsModel> notificationModelObj = NotificationsModel().obs;
  RxInt notificationUnreadCount = 0.obs;

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if(data!= null && data['index'] != null){
      selectedIndex.value = data['index'];
      Future.delayed(200.milliseconds, ()=> changePage(selectedIndex.value));
    }
    // fetchNotifications();
    // getAdsListing();
    // getReportTypes();
  }

  void changePage(index) {
    pageController.jumpToPage(index);
  }

  Future<dynamic> fetchNotifications() async {
    int notificationCount = 0;
    Utils.check().then((value) async {
      if (value) {
        await BaseClient.get(
          ApiUtils.getNotifications,
          onSuccess: (response) async {
            print(response);
            NotificationsModel model =
                NotificationsModel.fromJson(response.data);
            notificationModelObj.value = model;
            for (var noti in notificationModelObj.value.data!.result!) {
              if (noti.status == 'Sent') {
                notificationCount = notificationCount + 1;
              }
            }
            notificationUnreadCount.value = notificationCount;
            return true;
          },
          onError: (error) {
            BaseClient.handleApiError(error);
            update();
            return false;
          },
        );
      } else {
        Utils.showNoInternet();
      }
    });
  }
}
