import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

class ReferralsController extends GetxController {
  final RxString code = ''.obs;
  final RxString shareUrl = ''.obs;
  final RxInt earnedCents = 0.obs;
  final RxInt bonusCents = 0.obs;
  final RxInt friendCount = 0.obs;
  final RxString referredByCode = ''.obs;
  final RxList<Map<String, dynamic>> friends = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  final TextEditingController applyCodeController = TextEditingController();
  final RxBool isApplying = false.obs;
  final RxInt codeVersion = 0.obs;

  @override
  void onInit() {
    super.onInit();
    applyCodeController.addListener(() => codeVersion.value++);
    fetch();
  }

  @override
  void onClose() {
    applyCodeController.dispose();
    super.onClose();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.referrals();
      code.value = res['code']?.toString() ?? '';
      shareUrl.value = res['shareUrl']?.toString() ?? '';
      earnedCents.value = (res['earnedCents'] as num?)?.toInt() ?? 0;
      bonusCents.value = (res['bonusCents'] as num?)?.toInt() ?? 0;
      friendCount.value = (res['friendCount'] as num?)?.toInt() ??
          ((res['friends'] as List?)?.length ?? 0);
      referredByCode.value = res['referredByCode']?.toString() ?? '';
      friends.value = ((res['friends'] as List?) ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  String money(int cents) => formatMoney(cents, 'usd');

  String get bonusLabel => money(bonusCents.value);

  bool get canApply =>
      referredByCode.value.isEmpty &&
      applyCodeController.text.trim().length >= 4 &&
      !isApplying.value;

  /// Apply a referral code to an existing account.
  Future<void> applyCode() async {
    final value = applyCodeController.text.trim();
    if (value.length < 4 || isApplying.value) return;
    isApplying.value = true;
    try {
      await ApiService.applyReferral(value);
      CustomSnackBar.showCustomSnackBar(
          title: 'Code applied', message: 'Referral linked to your account');
      applyCodeController.clear();
      await fetch();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isApplying.value = false;
    }
  }

  Future<void> copyCode() async {
    await Clipboard.setData(ClipboardData(text: code.value));
    CustomSnackBar.showCustomToast(
        title: 'Copied', message: 'Referral code copied');
  }

  Future<void> shareInvite() async {
    final text = shareUrl.value.isEmpty ? code.value : shareUrl.value;
    await Clipboard.setData(ClipboardData(text: text));
    CustomSnackBar.showCustomToast(
        title: 'Invite copied', message: 'Share it with a friend');
  }
}
