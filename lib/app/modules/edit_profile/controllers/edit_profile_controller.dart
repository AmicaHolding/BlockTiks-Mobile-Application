import 'dart:convert';

import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class EditProfileController extends GetxController {
  final AppPreferences _appPreferences = AppPreferences();
  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  final TextEditingController firstNameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController firstNameArController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController cityController = TextEditingController();
  final TextEditingController dobController = TextEditingController();

  final RxBool isLoading = true.obs;
  final RxBool isSaving = false.obs;
  final RxBool isDeleting = false.obs;
  final RxBool isResendingVerification = false.obs;
  final RxString emailVerified = ''.obs;
  String avatarUrl = '';

  @override
  void onInit() {
    super.onInit();
    loadProfile();
  }

  @override
  void onClose() {
    for (final c in [
      firstNameController,
      lastNameController,
      firstNameArController,
      emailController,
      phoneController,
      cityController,
      dobController
    ]) {
      c.dispose();
    }
    super.onClose();
  }

  Future<void> loadProfile() async {
    isLoading.value = true;
    try {
      final res = await ApiService.me();
      final user = Map<String, dynamic>.from(res['user'] as Map? ?? {});
      firstNameController.text = user['firstName']?.toString() ?? '';
      lastNameController.text = user['lastName']?.toString() ?? '';
      firstNameArController.text = user['firstNameAr']?.toString() ?? '';
      emailController.text = user['email']?.toString() ?? '';
      phoneController.text = user['phone']?.toString() ?? '';
      cityController.text = user['city']?.toString() ?? '';
      dobController.text = user['dateOfBirth']?.toString() ?? '';
      emailVerified.value = user['emailVerified'] == true ? 'Verified' : '';
      avatarUrl = user['avatarUrl']?.toString() ?? '';
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isLoading.value = false;
    }
  }

  /// Resend the email-verification link (account email is read-only).
  Future<void> resendVerification() async {
    if (isResendingVerification.value) return;
    isResendingVerification.value = true;
    try {
      await ApiService.verifyEmailRequest();
      CustomSnackBar.showCustomSnackBar(
          title: 'Verification sent',
          message: 'Check your inbox for the verification link.');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isResendingVerification.value = false;
    }
  }

  String get initials {
    final first = firstNameController.text.trim();
    final last = lastNameController.text.trim();
    final a = first.isEmpty ? '?' : first[0];
    final b = last.isEmpty ? '' : last[0];
    return '$a$b'.toUpperCase();
  }

  Future<void> save() async {
    if (isSaving.value) return;
    isSaving.value = true;
    try {
      final res = await ApiService.updateProfile({
        'firstName': firstNameController.text.trim(),
        'lastName': lastNameController.text.trim(),
        'firstNameAr': firstNameArController.text.trim(),
        'phone': phoneController.text.trim(),
        'city': cityController.text.trim(),
        'dateOfBirth': dobController.text.trim(),
      });
      final user = Map<String, dynamic>.from(res['user'] as Map? ?? {});
      await _persistUser(user);
      CustomSnackBar.showCustomSnackBar(
          title: 'Profile saved', message: 'Your details were updated.');
      Get.back();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSaving.value = false;
    }
  }

  Future<void> deleteAccount() async {
    if (isDeleting.value) return;
    isDeleting.value = true;
    try {
      await ApiService.deleteAccount();
      await ApiService.logout();
      await _appPreferences.clearPreference();
      ApiService.setToken(null);
      Constants.isUserCreator = false;
      Get.offAllNamed(Routes.GET_STARTED);
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isDeleting.value = false;
    }
  }

  Future<void> _persistUser(Map<String, dynamic> user) async {
    await _appPreferences.isPreferenceReady;
    final legacyUser = {
      '_id': user['id'],
      'firstName': user['firstName'],
      'lastName': user['lastName'],
      'email': user['email'],
      'phone': user['phone'],
      'profileImage': user['avatarUrl'],
      'fullName': '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
      'role': {
        'name': Constants.isUserCreator ? 'Creator' : 'User',
        'roleId': Constants.isUserCreator ? 2 : 1,
      },
    };
    final model = SignupModel.fromJson({'user': legacyUser});
    _appPreferences.setUserData(data: jsonEncode(model));
    _appPreferences.setUserName(userName: legacyUser['fullName'] as String);
    _appPreferences.setUserEmail(email: user['email']?.toString() ?? '');
  }
}
