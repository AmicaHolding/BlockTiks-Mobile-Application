import 'dart:async';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class UpcomingEventController extends GetxController {

  Duration totalDuration = Duration(days: 2);
  Rx<Duration> elapsedTime = (Duration.zero).obs;
  Timer? _timer;

  // Real event state when navigated with an event id.
  final RxMap<String, dynamic> event = <String, dynamic>{}.obs;
  final RxBool isLoading = false.obs;
  final Rxn<String> loadError = Rxn<String>();
  String? eventId;

  bool get hasEvent => event.isNotEmpty;

  String get titleText => event['title']?.toString() ?? '';
  String get categoryText => event['category']?.toString() ?? '';
  String get descriptionText => event['description']?.toString() ?? '';
  String get startsAtText => event['startsAt']?.toString() ?? '';
  String get locationText {
    final loc = event['location']?.toString() ?? '';
    final addr = event['address']?.toString() ?? '';
    if (addr.isNotEmpty && loc.isNotEmpty) return '$loc, $addr';
    return loc.isNotEmpty ? loc : addr;
  }

  String get formattedDate => formatEventDate(startsAtText);

  @override
  void onInit() {
    var data = Get.arguments;
    if (data is Map) {
      final id = data['id'] ?? data['eventId'];
      if (id != null && id.toString().isNotEmpty) {
        eventId = id.toString();
      }
    } else if (data is String && data.isNotEmpty) {
      eventId = data;
    }
    super.onInit();
    if (eventId != null) {
      fetchEvent();
    }
    _startTimer();
  }

  Future<void> fetchEvent() async {
    final id = eventId;
    if (id == null) return;
    isLoading.value = true;
    loadError.value = null;
    try {
      event.value = await ApiService.event(id);
      // Countdown targets the real start time when we have one.
      final startsAt = DateTime.tryParse(startsAtText)?.toLocal();
      if (startsAt != null) {
        final remaining = startsAt.difference(DateTime.now());
        totalDuration = remaining.isNegative ? Duration.zero : remaining;
        // Restart the countdown against the real start time.
        elapsedTime.value = Duration.zero;
      }
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
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
