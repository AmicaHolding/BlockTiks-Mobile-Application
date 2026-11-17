import 'package:get/get.dart';

import '../../for_you/controllers/for_you_controller.dart';
import '../../profile_tab/controllers/profile_tab_controller.dart';
import '../../search/controllers/search_controller.dart';
import '../../wallet/controllers/wallet_controller.dart';
import '../controllers/user_dashboard_controller.dart';

class UserDashboardBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<UserDashboardController>(
      () => UserDashboardController(),
    );
    Get.lazyPut<ForYouController>(() => ForYouController());
    Get.lazyPut<MySearchController>(() => MySearchController());
    Get.lazyPut<WalletController>(() => WalletController());
    Get.lazyPut<ProfileTabController>(() => ProfileTabController());
  }
}
