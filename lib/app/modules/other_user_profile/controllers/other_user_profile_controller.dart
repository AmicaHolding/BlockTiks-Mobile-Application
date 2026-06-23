import 'package:block_tix/app/data/core/app_export.dart';

class OtherUserProfileController extends GetxController
    with GetSingleTickerProviderStateMixin {
  late TabController tabController;

  RxBool isFollowing = false.obs;

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
  }
}
