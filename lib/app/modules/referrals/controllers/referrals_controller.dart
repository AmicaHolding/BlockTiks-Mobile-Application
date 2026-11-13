import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

class ReferralsController extends GetxController {
  static const String referralCode = 'BTX-4F8K2Q';
  static const String referralLink = 'https://blocktix.app/r/BTX-4F8K2Q';

  Future<void> copyReferralCode() async {
    await Clipboard.setData(const ClipboardData(text: referralCode));
    CustomSnackBar.showCustomToast(
        title: 'Copied', message: 'Referral code copied to clipboard');
  }

  Future<void> copyReferralLink() async {
    await Clipboard.setData(const ClipboardData(text: referralLink));
    CustomSnackBar.showCustomToast(
        title: 'Copied', message: 'Referral link copied to clipboard');
  }
}
