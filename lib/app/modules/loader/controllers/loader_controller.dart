import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';

class LoaderController extends GetxController {
  RxDouble progress = 0.0.obs;
  late Timer _timer;

  void Function()? onDone;

  @override
  void onInit() {
    if (Get.arguments != null && Get.arguments["todo"] != null) {
      onDone = Get.arguments["todo"];
    }
    super.onInit();
    startProgress();
  }

  void startProgress() {
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      progress.value += 0.05; // Increment progress by 1%
      if (progress.value >= 1.0) {
        progress.value = 1.0;
        _timer.cancel(); // Stop the timer when progress reaches 100%
        if (onDone != null) {
          onDone!();
        } else {
          Get.offAllNamed(Routes.USER_DASHBOARD);
        }
      }
      ;
    });
  }

  @override
  void dispose() {
    _timer.cancel(); // Ensure the timer is canceled when the widget is disposed
    super.dispose();
  }
}
