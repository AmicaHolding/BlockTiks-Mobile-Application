import 'package:photo_view/photo_view.dart';

import '../../../data/core/app_export.dart';

class MediaPreviewController extends GetxController {
  RxBool isLoading = false.obs;
  RxList<String> mediaList = RxList<String>([]);
  Rx<int> index = 0.obs;
  PageController? pageController;
  PhotoViewController? photoViewController;
  bool isProfilePicture = false;
  String? placeholder;
  dynamic argumentData = Get.arguments;
  ScrollController scrollController = ScrollController();
  final double listViewHeight = getVerticalSize(80);

  @override
  Future<void> onInit() async {
    if (argumentData != null && argumentData['index'] != null) {
      index.value = argumentData['index'];
    }

    if (argumentData != null && argumentData['media'] != null) {
      mediaList.value = argumentData['media'];
      mediaList.refresh();
    }

    pageController = PageController(initialPage: index.value);
    scrollToPosition(index.value);
    super.onInit();
  }

  void scrollToPosition(int position) {
    index.value = position;
    Future.delayed(const Duration(milliseconds: 300), () {
      try {
        scrollController.animateTo(
          position * listViewHeight,
          duration: const Duration(milliseconds: 500),
          curve: Curves.fastOutSlowIn,
        );
      } catch (e) {
        debugPrint("Error scrolling: $e");
      }
    });
  }

  @override
  void dispose() {
    pageController!.dispose();
    super.dispose();
  }
}
