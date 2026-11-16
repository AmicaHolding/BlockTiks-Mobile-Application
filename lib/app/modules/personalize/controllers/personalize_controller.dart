import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class PersonalizeController extends GetxController {
  final RxString selectedCity = ''.obs;
  final RxSet<String> selectedInterests = <String>{}.obs;
  final RxBool isSaving = false.obs;
  final RxString firstName = 'there'.obs;

  final List<String> cities = const [
    'Dubai',
    'Abu Dhabi',
    'Riyadh',
    'Doha',
    'Kuwait City',
    'Muscat',
    'Manama',
    'Jeddah',
  ];

  final List<String> interests = const [
    'Concerts',
    'Comedy',
    'Sports',
    'Theatre',
    'Festivals',
    'Clubs',
    'Family',
    'Food & drink',
    'Art',
  ];

  @override
  void onInit() {
    super.onInit();
    loadFirstName();
  }

  Future<void> loadFirstName() async {
    try {
      final res = await ApiService.me();
      final user = Map<String, dynamic>.from(res['user'] as Map? ?? {});
      firstName.value = user['firstName']?.toString() ?? 'there';
    } catch (_) {
      firstName.value = 'there';
    }
  }

  void selectCity(String city) => selectedCity.value = city;

  void toggleInterest(String interest) {
    if (selectedInterests.contains(interest)) {
      selectedInterests.remove(interest);
    } else if (selectedInterests.length < 3) {
      selectedInterests.add(interest);
    } else {
      CustomSnackBar.showCustomErrorToast(message: 'Pick up to 3 interests');
    }
  }

  Future<void> continueToApp({bool skip = false}) async {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      if (!skip && selectedCity.value.isNotEmpty) {
        await ApiService.updateProfile({'city': selectedCity.value});
      }
    } catch (_) {
      // Personalization is optional; don't block entry if the profile patch fails.
    } finally {
      isSaving.value = false;
    }
    ApiService.goToDashboard();
  }
}
