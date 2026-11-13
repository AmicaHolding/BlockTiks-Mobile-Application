import 'package:block_tix/app/data/core/app_export.dart';

class FollowFollowingController extends GetxController
    with GetSingleTickerProviderStateMixin {
  late TabController tabController;

  final RxString searchQuery = ''.obs;

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
  }

  List<int> filteredIndices(int total) {
    final q = searchQuery.value.trim().toLowerCase();
    if (q.isEmpty) return List.generate(total, (i) => i);
    return List.generate(total, (i) => i)
        .where((i) => 'name $i'.contains(q))
        .toList();
  }
}
