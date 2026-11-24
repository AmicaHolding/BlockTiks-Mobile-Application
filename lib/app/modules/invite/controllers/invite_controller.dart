import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';

/// Personal invite (I-rules): guest view of `/i/{code}` — read the invite,
/// respond yes/no/maybe with plus-ones; host view shows the guest list and
/// "Sell tickets instead" (I7 invite → paid event move, handed to Studio).
class InviteController extends GetxController {
  final RxMap<String, dynamic> invite = <String, dynamic>{}.obs;
  final RxList<Map<String, dynamic>> guests = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final RxBool isResponding = false.obs;
  final RxInt plusOnes = 0.obs;
  final RxString myResponse = ''.obs;
  final RxBool isHost = false.obs;

  String get code => invite['code']?.toString() ?? '';

  @override
  void onInit() {
    super.onInit();
    final arg = Get.arguments;
    final c = (arg is Map ? arg['code'] : null)?.toString() ??
        Get.parameters['code'] ??
        '';
    if (c.isNotEmpty) {
      load(c);
    } else {
      // No code — nothing to fetch; without this the view spins forever.
      isLoading.value = false;
    }
  }

  Future<void> load(String code) async {
    isLoading.value = true;
    try {
      final res = await ApiService.inviteByCode(code);
      final inv = res['invite'] is Map
          ? Map<String, dynamic>.from(res['invite'] as Map)
          : Map<String, dynamic>.from(res);
      // The invite payload carries the date poll at the top level (PE2);
      // the view reads invite['poll'], so merge it in here.
      if (res['poll'] is Map) inv['poll'] = res['poll'];
      invite.value = inv;
      isHost.value = invite['is_host'] == true;
      final mine = res['my_rsvp'];
      myResponse.value =
          mine is Map ? mine['status']?.toString() ?? '' : '';
      if (isHost.value && invite['id'] != null) {
        guests.value =
            await ApiService.inviteGuests(invite['id'].toString());
      }
    } catch (e) {
      debugPrint('InviteController.load("$code") failed: $e');
      try {
        CustomSnackBar.showCustomErrorToast(
            message: e.toString().replaceFirst('Exception: ', ''));
      } catch (_) {
        // No Overlay while the OS pushes a route mid-navigation — skip the
        // toast; the view already shows the not-found state.
      }
    } finally {
      isLoading.value = false;
    }
  }

  /// Guest reply — signed-out guests hit the A2/A8 gate and come back.
  /// `status` is going|maybe|no; the server may downgrade going→requested
  /// when the host approves guests (I3).
  Future<void> respond(String status) async {
    if (!await ApiService.requireAuth(comingFrom: 'invite')) return;
    isResponding.value = true;
    try {
      final res = await ApiService.respondToInvite(code, status,
          plusOnes: plusOnes.value);
      final rsvp = res['rsvp'];
      myResponse.value =
          rsvp is Map ? rsvp['status']?.toString() ?? status : status;
      CustomSnackBar.showCustomToast(
          message: myResponse.value == 'going'
              ? "You're in. See you there."
              : myResponse.value == 'requested'
                  ? 'Requested — the host will approve you.'
                  : 'Reply sent to the host.');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isResponding.value = false;
    }
  }

  void share() {
    Clipboard.setData(ClipboardData(
        text:
            'You are invited: ${invite['name'] ?? 'event'} — https://sahra.app/i/$code'));
    CustomSnackBar.showCustomToast(message: 'Invite link copied');
  }

  /// I7: host can convert the invite into a real paid event under an org.
  /// Mobile hands event build to Studio (door-mode rule); pick the admin org.
  Future<void> moveToOrg() async {
    if (!await ApiService.requireAuth(comingFrom: 'invite')) return;
    try {
      final m = await ApiService.meMemberships();
      final memberships = (m['memberships'] as List? ?? [])
          .where((e) =>
              e is Map &&
              e['role']?.toString() == 'admin' &&
              e['status']?.toString() != 'invited')
          .toList();
      if (memberships.isEmpty) {
        CustomSnackBar.showCustomErrorToast(
            message: 'You need an organiser account to sell tickets.');
        return;
      }
      // One admin org → move directly; several → take the first (TODO: org
      // picker sheet when multi-org is common).
      final orgId = memberships.first['org_id']?.toString();
      if (orgId == null) return;
      final res = await ApiService.moveInvite(
          invite['id']?.toString() ?? '', orgId);
      CustomSnackBar.showCustomToast(
          message:
              'Invite moved. Finish setup in Studio: ${res['studio_path'] ?? ''}');
      load(code);
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    }
  }
}
