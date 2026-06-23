import 'package:block_tix/app/data/core/app_export.dart';

class ForYouController extends GetxController {
  RxInt currentImage = 0.obs;

  final List<String> imageList = [
    ImageConstant.splashBg, // Replace with actual image URLs
    ImageConstant.splashBg,
    ImageConstant.splashBg,
    ImageConstant.splashBg,
  ];

  // Method to jump to the specific slide (optional)
  void goToSlide(int index) {
    currentImage.value = index;
  }
}
