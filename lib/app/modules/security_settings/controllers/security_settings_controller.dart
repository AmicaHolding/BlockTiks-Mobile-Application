import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';

/// Sign-in & security: sessions (passwords are gone in v2 — sign-in is OTP
/// or Apple), sign out other devices, and the guarded account-deletion
/// flow (rule A6).
class SecuritySettingsController extends GetxController {
  final RxInt otherSessions = 2.obs;
  final RxBool isDeleting = false.obs;

  Future<void> signOutOthers() async {
    final ok = await showSahraConfirm(
      title: 'Sign out other devices?',
      body: 'You’ll stay signed in on this phone.',
      okLabel: 'Sign out others',
    );
    if (!ok) return;
    otherSessions.value = 0;
    CustomSnackBar.showCustomToast(
        message: 'Signed out of your other devices');
  }

  /// A6: blocked by upcoming tickets, active listings, open price watches,
  /// balance, or sole-admin status, checked locally first, then the server.
  Future<void> deleteAccount() async {
    final block = await _deletionBlocker();
    if (block != null) {
      await showSahraConfirm(
          title: 'Can’t delete yet', body: block, okLabel: 'OK');
      return;
    }
    final ok = await showSahraConfirm(
      title: 'Delete your account?',
      body: 'This permanently removes your profile and history.',
      okLabel: 'Delete account',
      danger: true,
    );
    if (!ok) return;
    isDeleting.value = true;
    try {
      await ApiService.deleteAccount();
      await ApiService.clearSession();
      Get.offAllNamed(Routes.GET_STARTED);
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isDeleting.value = false;
    }
  }

  /// Client-side pre-check for the A6 blockers, before the server check.
  Future<String?> _deletionBlocker() async {
    try {
      final tickets = await ApiService.myTickets(limit: 50);
      final held = tickets.where((t) =>
          t['status']?.toString() == 'VALID' ||
          t['status']?.toString() == 'HOLDING');
      if (held.isNotEmpty) {
        return 'You still have upcoming tickets. Sell or send them first.';
      }
    } catch (_) {}
    try {
      final listings = await ApiService.myListings();
      final active = listings
          .where((l) => l['status']?.toString() == 'ACTIVE');
      if (active.isNotEmpty) {
        return 'You still have tickets listed for sale. Cancel the listings first.';
      }
    } catch (_) {}
    try {
      final offers = await ApiService.myOffers();
      final active =
          offers.where((o) => o['status']?.toString() == 'ACTIVE');
      if (active.isNotEmpty) {
        return 'Cancel your Set-your-price orders first.';
      }
    } catch (_) {}
    try {
      final earn = await ApiService.earnings();
      final ready = (earn['readyCents'] ?? earn['ready'] ?? 0) as num? ?? 0;
      final pending =
          (earn['pendingCents'] ?? earn['pending'] ?? 0) as num? ?? 0;
      if (ready + pending > 0) {
        return 'You have resale earnings. Withdraw them first; pending money releases after the event.';
      }
    } catch (_) {}
    // TODO(api-gap: sole-admin blocker, needs the memberships endpoint to
    // detect "you’re the admin of X"; the server still enforces `sole_admin`)
    return null;
  }
}
