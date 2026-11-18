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
    if (c.isNotEmpty) load(c);
  }

  Future<void> load(String code) async {
    isLoading.value = true;
    try {
      final res = await ApiService.inviteByCode(code);
      invite.value = res['invite'] is Map
          ? Map<String, dynamic>.from(res['invite'] as Map)
          : res;
      isHost.value = invite['is_host'] == true ||
          invite['viewer']?.toString() == 'host';
      myResponse.value =
          invite['my_response']?.toString() ?? '';
      if (isHost.value && invite['id'] != null) {
        guests.value =
            await ApiService.inviteGuests(invite['id'].toString());
      }
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isLoading.value = false;
    }
  }

  /// Guest reply — signed-out guests hit the A2/A8 gate and come back.
  Future<void> respond(String response) async {
    if (!await ApiService.requireAuth(comingFrom: 'invite')) return;
    isResponding.value = true;
    try {
      await ApiService.respondToInvite(code, response,
          plusOnes: plusOnes.value);
      myResponse.value = response;
      CustomSnackBar.showCustomToast(
          message: response == 'yes'
              ? "You're in. See you there."
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
