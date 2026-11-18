import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';

import '../controllers/profile_tab_controller.dart';

/// Profile tab (spec 43, prototype screen 06 + 06c): "Profile" title with a
/// gear, a night-surface name card with a gold initials avatar, a gold
/// earnings card once there is resale money, then Money / Rewards / Hosting /
/// Support sections of flat divider rows, and a red sign-out link.
class ProfileTabView extends GetView<ProfileTabController> {
  ProfileTabView({Key? key}) : super(key: key);

  static const Color _signOutRed = Color(0xFFE0626A);
  static const Color _versionGrey = Color(0xFF6F84A0);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        color: ColorConstant.gold,
        backgroundColor: ColorConstant.nightSurface,
        onRefresh: controller.getMyProfile,
        child: ListView(children: [
          _header(),
          _profileCard(),
          _earningsCard(),
          _section('Money'),
          _row('Earnings & withdrawals',
              onTap: () => Get.toNamed(Routes.WITHDRAW)),
          _row('Transactions', onTap: () => Get.toNamed(Routes.TRANSACTIONS)),
          _section('Rewards'),
          _row('Promo codes', onTap: () => Get.toNamed(Routes.PROMO_CODES)),
          _row('Invite friends',
              value: 'Get AED 25', onTap: () => Get.toNamed(Routes.REFERRALS)),
          _section('Hosting'),
          // v2 I-rules: personal invites — a private get-together people
          // reply to; separate from hosting ticketed events in Studio.
          _row('Host a personal invite',
              value: 'Free', onTap: () => Get.toNamed(Routes.INVITE_NEW)),
          _hostingRow(),
          _section('Support'),
          _row('Help & FAQs', onTap: () => Get.toNamed(Routes.FAQS)),
          _signOut(),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
            child: Text('Sahra 1.0.0',
                style: sahraText(color: _versionGrey, size: 12)),
          ),
          const SizedBox(height: 36),
        ]),
      ),
    );
  }

  /// "Profile" title (28px, tight tracking) + optional creator switch pill +
  /// the 44px night-surface gear that opens Settings.
  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(children: [
        Expanded(
          child: Text('Profile',
              style: sahraText(
                  size: 28, weight: FontWeight.w800, letterSpacing: -0.56)),
        ),
        if (Constants.isUserCreator) ...[
          GestureDetector(
            onTap: _switchToCreator,
            child: Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                  color: ColorConstant.nightSurface,
                  borderRadius: BorderRadius.circular(999)),
              alignment: Alignment.center,
              child: Text('Switch ⇄',
                  style: sahraText(size: 14, weight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 8),
        ],
        GestureDetector(
          onTap: () => Get.toNamed(Routes.PROFILE_SETTINGS),
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface, shape: BoxShape.circle),
            child: Icon(Icons.settings_outlined,
                color: ColorConstant.whiteA700, size: 22),
          ),
        ),
      ]),
    );
  }

  String _name() {
    final user = controller.profileData.value?.user;
    final full = (user?.fullName ?? '').toString().trim();
    if (full.isNotEmpty) return full;
    final name = '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim();
    return name.isEmpty ? 'Sahra fan' : name;
  }

  /// Night-surface card: gold initials avatar, name, muted "email · Member
  /// since yyyy" line, and a gold "Edit ›" link. Whole card opens edit.
  Widget _profileCard() {
    return Obx(() {
      final user = controller.profileData.value?.user;
      final initials = _name()
          .split(' ')
          .where((e) => e.isNotEmpty)
          .take(2)
          .map((e) => e[0].toUpperCase())
          .join();
      final sub = <String>[
        if ((user?.email ?? '').isNotEmpty) user!.email!,
        if (user?.createdAt != null) 'Member since ${user!.createdAt!.year}',
      ].join(' · ');
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        child: GestureDetector(
          onTap: () => Get.toNamed(Routes.EDIT_PROFILE),
          child: SahraCard(
            padding: const EdgeInsets.all(14),
            radius: 18,
            child: Row(children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                    color: ColorConstant.gold, shape: BoxShape.circle),
                child: Center(
                  child: Text(initials.isEmpty ? 'S' : initials,
                      style: sahraText(
                          color: ColorConstant.night,
                          size: 20,
                          weight: FontWeight.w800)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_name(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: sahraText(size: 18, weight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(sub.isEmpty ? 'Sahra fan' : sub,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 13)),
                    ]),
              ),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text('Edit',
                    style: sahraText(
                        color: ColorConstant.gold,
                        size: 14,
                        weight: FontWeight.w600)),
                Icon(Icons.chevron_right_rounded,
                    color: ColorConstant.gold, size: 16),
              ]),
            ]),
          ),
        ),
      );
    });
  }

  /// Gold earnings card, only once there's resale money to talk about.
  Widget _earningsCard() {
    return Obx(() {
      final ready = controller.earningsReadyCents.value;
      final pending = controller.earningsPendingCents.value;
      if (ready <= 0 && pending <= 0) return const SizedBox.shrink();
      final cur = controller.earningsCurrency.value;
      final sub = ready > 0
          ? '${formatMoney(ready, cur)} ready to withdraw'
          : '${formatMoney(pending, cur)} pending · releases after the event';
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: GestureDetector(
          onTap: () => Get.toNamed(Routes.WITHDRAW),
          child: SahraCard(
            color: ColorConstant.gold,
            radius: 18,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(children: [
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Resale earnings · $sub',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              sahraText(color: ColorConstant.night, size: 13)),
                      const SizedBox(height: 2),
                      Text(formatMoney(ready + pending, cur),
                          style: sahraText(
                              color: ColorConstant.night,
                              size: 22,
                              weight: FontWeight.w800,
                              letterSpacing: -0.44)),
                    ]),
              ),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text('Earnings',
                    style: sahraText(
                        color: ColorConstant.night,
                        size: 14,
                        weight: FontWeight.w600)),
                Icon(Icons.chevron_right_rounded,
                    color: ColorConstant.night, size: 16),
              ]),
            ]),
          ),
        ),
      );
    });
  }

  /// Uppercase muted section label (12px, .1em tracking, 22px top space).
  Widget _section(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 4),
      child: Text(label.toUpperCase(),
          style: sahraText(
              color: ColorConstant.nightMuted,
              size: 12,
              weight: FontWeight.w500,
              letterSpacing: 1.2)),
    );
  }

  /// Flat settings row: label left, muted "value ›" right, hairline divider
  /// in nightSurface (#22344D) exactly like the prototype rows.
  Widget _row(String label, {String? value, VoidCallback? onTap}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: ColorConstant.nightSurface, width: 1),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: sahraText(size: 15)),
                Row(mainAxisSize: MainAxisSize.min, children: [
                  if (value != null && value.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: Text(value,
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14)),
                    ),
                  Icon(Icons.chevron_right_rounded,
                      color: ColorConstant.nightMuted, size: 18),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Fans get "Host events on Sahra"; creators get the door-mode entry.
  Widget _hostingRow() {
    if (Constants.isUserCreator) {
      return _row('Switch profile',
          value: 'Door mode', onTap: _switchToCreator);
    }
    return _row('Host events on Sahra',
        value: 'Free to start', onTap: () => Get.toNamed(Routes.HOST_INTRO));
  }

  Future<void> _switchToCreator() async {
    await ApiService.setLastModeLocal('creator');
    try {
      await ApiService.setMode(mode: 'org');
    } catch (_) {}
    Get.offAllNamed(Routes.CREATOR_DASHBOARD);
  }

  Widget _signOut() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: GestureDetector(
          onTap: () async {
            await ApiService.logout();
            Get.offAllNamed(Routes.SIGN_IN);
          },
          child: Text('Sign out',
              style: sahraText(
                  color: _signOutRed, size: 15, weight: FontWeight.w600)),
        ),
      ),
    );
  }
}
