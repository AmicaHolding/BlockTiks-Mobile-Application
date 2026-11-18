import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';

class WithdrawController extends GetxController {
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();
  final RxInt readyCents = 0.obs;
  final RxInt pendingCents = 0.obs;
  final RxInt lifetimeCents = 0.obs;
  final RxInt withdrawnCents = 0.obs;
  final RxInt availableCents = 0.obs;
  final RxList<Map<String, dynamic>> sales = <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> withdrawals = <Map<String, dynamic>>[].obs;
  final RxBool isWithdrawing = false.obs;

  // Payout account (Stripe Connect) state.
  final RxBool payoutsConnected = false.obs;
  final RxBool payoutsEnabled = false.obs;
  final RxBool payoutsDetailsSubmitted = false.obs;
  final RxBool isSettingUpPayouts = false.obs;

  /// Earnings currency, derived from the seller's sales (defaults to USD).
  String currency = 'usd';

  String money(int cents) => formatMoney(cents, currency);

  bool get canWithdraw =>
      availableCents.value >= 100 &&
      payoutsEnabled.value &&
      !isLoading.value &&
      !isWithdrawing.value;

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final results = await Future.wait([
        ApiService.earnings(),
        ApiService.payouts().catchError((_) => <String, dynamic>{}),
      ]);
      final res = results[0];
      readyCents.value = (res['readyCents'] as num?)?.toInt() ?? 0;
      pendingCents.value = (res['pendingCents'] as num?)?.toInt() ?? 0;
      lifetimeCents.value = (res['lifetimeCents'] as num?)?.toInt() ?? 0;
      withdrawnCents.value = (res['withdrawnCents'] as num?)?.toInt() ?? 0;
      availableCents.value = (res['availableCents'] as num?)?.toInt() ?? 0;
      final list = (res['sales'] as List?) ?? [];
      sales.value = list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      currency = _deriveCurrency(sales);
      withdrawals.value = ((res['withdrawals'] as List?) ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();

      final payouts = results[1];
      payoutsConnected.value = payouts['connected'] == true;
      payoutsDetailsSubmitted.value = payouts['detailsSubmitted'] == true;
      payoutsEnabled.value = payouts['payoutsEnabled'] == true;
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }

  String _deriveCurrency(List<Map<String, dynamic>> sales) {
    for (final sale in sales) {
      final c = sale['currency']?.toString();
      if (c != null && c.isNotEmpty) return c.toLowerCase();
    }
    return 'usd';
  }

  /// Start (or resume) Stripe Express payout onboarding in the browser.
  Future<void> setupPayouts() async {
    if (isSettingUpPayouts.value) return;
    isSettingUpPayouts.value = true;
    try {
      final res = await ApiService.payoutsOnboardingLink();
      final url = res['url']?.toString() ?? '';
      final uri = Uri.tryParse(url);
      if (uri == null || !await canLaunchUrl(uri)) {
        CustomSnackBar.showCustomErrorToast(
            message: 'Could not open payout setup');
        return;
      }
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSettingUpPayouts.value = false;
    }
  }

  /// Re-check payout status after returning from Stripe onboarding.
  Future<void> refreshPayoutStatus() async {
    try {
      final res = await ApiService.payoutsRefresh();
      payoutsConnected.value = res['connected'] == true;
      payoutsDetailsSubmitted.value = res['detailsSubmitted'] == true;
      payoutsEnabled.value = res['payoutsEnabled'] == true;
    } catch (_) {
      // Status refresh is best-effort; the next load() retries.
    }
  }

  Future<void> withdraw() async {
    if (!canWithdraw) return;
    isWithdrawing.value = true;
    try {
      await ApiService.withdraw(availableCents.value, currency: currency);
      CustomSnackBar.showCustomSnackBar(
          title: 'Withdrawal sent',
          message: 'Payout is on its way to your connected account.');
      await load();
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isWithdrawing.value = false;
    }
  }

  /// e.g. "March 24, 2026"
  String dateLabel(String? iso) =>
      formatEventDate(iso, includeTime: false);
}
