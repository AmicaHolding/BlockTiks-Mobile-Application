import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';

/// Door-mode Account tab (spec 58 / flow M5), the organisation card,
/// "Switch profile" sheet (personal + every org + create), and sign out.
class CreatorAccountTabController extends GetxController {
  final RxList<Map<String, dynamic>> memberships =
      <Map<String, dynamic>>[].obs;
  final Rxn<Map<String, dynamic>> user = Rxn<Map<String, dynamic>>();
  final RxBool isLoading = true.obs;

  /// The org the user is currently acting as (first membership for now,   /// door mode runs in a single-org context).
  Map<String, dynamic>? get currentOrg =>
      memberships.isEmpty ? null : memberships.first['org'] as Map<String, dynamic>?;

  String get currentRole =>
      memberships.isEmpty ? 'member' : memberships.first['role']?.toString() ?? 'member';

  /// Gate staff see Scan · Guests · Account only (flow M5).
  bool get isGateStaff => currentRole.toLowerCase().contains('gate');

  @override
  void onInit() {
    super.onInit();
    load();
  }

  Future<void> load() async {
    isLoading.value = true;
    try {
      final results = await Future.wait([
        ApiService.me(),
        ApiService.memberships(),
      ]);
      final me = results[0] as Map<String, dynamic>;
      user.value =
          Map<String, dynamic>.from((me['user'] as Map?) ?? me);
      memberships.value = (results[1] as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
    } catch (_) {
      // Memberships endpoint may not be live, org card degrades gracefully.
      // TODO(api-gap: memberships endpoint not confirmed, org/role data
      // falls back to whatever /auth/me returns)
    } finally {
      isLoading.value = false;
    }
  }

  /// Switch to the personal (fan) profile, lands on fan tabs.
  Future<void> switchToPersonal() async {
    await ApiService.setLastModeLocal('fan');
    try {
      await ApiService.setMode(mode: 'personal');
    } catch (_) {}
    Get.offAllNamed(Routes.USER_DASHBOARD);
  }

  /// Switch to another organisation's door mode.
  Future<void> switchToOrg(Map<String, dynamic> membership) async {
    final org = membership['org'] as Map?;
    final orgId = (org?['id'] ?? membership['orgId'])?.toString();
    await ApiService.setLastModeLocal('creator');
    try {
      await ApiService.setMode(mode: 'org', orgId: orgId);
    } catch (_) {}
    Get.offAllNamed(Routes.CREATOR_DASHBOARD);
  }

  void createOrg() => Get.toNamed(Routes.HOST_ORG);

  Future<void> signOut() async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      prefs.setLastMode(mode: 'fan');
      await ApiService.clearSession();
    } catch (_) {}
    Get.offAllNamed(Routes.GET_STARTED);
  }
}
