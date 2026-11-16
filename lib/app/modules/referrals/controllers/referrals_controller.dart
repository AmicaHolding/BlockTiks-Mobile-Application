import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

class ReferralsController extends GetxController {
  final RxString code = ''.obs;
  final RxString shareUrl = ''.obs;
  final RxInt earnedCents = 0.obs;
  final RxList<Map<String, dynamic>> friends = <Map<String, dynamic>>[].obs;
  final RxString note = ''.obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  @override
  void onInit() {
    super.onInit();
    fetch();
  }

  Future<void> fetch() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final res = await ApiService.referrals();
      code.value = res['code']?.toString() ?? '';
      shareUrl.value = res['shareUrl']?.toString() ?? '';
      earnedCents.value = (res['earnedCents'] as num?)?.toInt() ?? 0;
      note.value = res['note']?.toString() ?? '';
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

  String aed(int cents) => 'AED ${(cents / 100).toStringAsFixed(2)}';

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
