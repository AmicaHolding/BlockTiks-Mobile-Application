import 'package:block_tix/app/data/core/app_export.dart';

class FollowFollowingController extends GetxController
    with GetSingleTickerProviderStateMixin {
  late TabController tabController;

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
  }
}
