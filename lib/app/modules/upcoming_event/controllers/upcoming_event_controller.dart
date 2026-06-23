import 'dart:async';

import 'package:get/get.dart';

class UpcomingEventController extends GetxController {

  Duration totalDuration = Duration(days: 2);
  Rx<Duration> elapsedTime = (Duration.zero).obs;
  Timer? _timer;

  @override
  void onInit() {
    super.onInit();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(Duration(seconds: 1), (Timer timer) {
        elapsedTime.value += Duration(seconds: 1);

        if (elapsedTime.value >= totalDuration) {
          _timer?.cancel();
        }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }




  String formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitHours = twoDigits(duration.inHours.remainder(24));
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return '${twoDigits(duration.inDays)} Day ${twoDigitHours} Hours ${twoDigitMinutes} Minutes';
  }
}
