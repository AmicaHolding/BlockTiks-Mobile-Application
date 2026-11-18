import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/creator_account_tab_controller.dart';

/// Door-mode Account tab, organisation card, switch-profile sheet,
/// settings shortcut, sign out (spec 58 / flow M5).
class CreatorAccountTabView extends GetView<CreatorAccountTabController> {
  const CreatorAccountTabView({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Obx(() => ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            children: [
              Text('Account',
                  style: sahraText(size: 26, weight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text('Your organisation and profiles',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
              const SizedBox(height: 18),
              _orgCard(),
              const SizedBox(height: 12),
              _switchRow(),
              const SahraSmallLabel('This device'),
              _rowLink(Icons.settings_outlined, 'Settings',
                  () => Get.toNamed(Routes.PROFILE_SETTINGS)),
              const SizedBox(height: 26),
              Center(
                child: GestureDetector(
                  onTap: controller.signOut,
                  child: Text('Sign out',
                      style: sahraText(
                          color: const Color(0xFFE0626A),
                          size: 14,
                          weight: FontWeight.w600)),
                ),
              ),
            ],
          )),
    );
  }

  /// Current org card, name, type · city, role pill.
  Widget _orgCard() {
    final org = controller.currentOrg;
    final name = org?['name']?.toString() ??
        controller.user.value?['orgName']?.toString() ??
        'Your organisation';
    final meta = [
      org?['type']?.toString() ?? '',
      org?['city']?.toString() ?? '',
    ].where((e) => e.isNotEmpty).join(' · ');
    return SahraCard(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
              color: ColorConstant.gold.withValues(alpha: .14),
              borderRadius: BorderRadius.circular(14)),
          child: Icon(Icons.apartment_rounded,
              color: ColorConstant.gold, size: 24),
        ),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: sahraText(size: 17, weight: FontWeight.w700)),
          if (meta.isNotEmpty)
            Text(meta,
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 12)),
        ])),
        SahraStatusPill(controller.currentRole,
            color: ColorConstant.gold,
            background: ColorConstant.gold.withValues(alpha: .14)),
      ]),
    );
  }

  /// "Switch profile" row, opens the personal + orgs sheet (flow M5).
  Widget _switchRow() {
    return GestureDetector(
      onTap: _showProfileSheet,
      child: SahraCard(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Icon(Icons.swap_horiz_rounded,
              color: ColorConstant.gold, size: 22),
          const SizedBox(width: 10),
          Expanded(
              child: Text('Switch profile',
                  style: sahraText(size: 15, weight: FontWeight.w600))),
          Icon(Icons.chevron_right_rounded,
              color: ColorConstant.gold, size: 20),
        ]),
      ),
    );
  }

  Widget _rowLink(IconData icon, String label, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: SahraCard(
        padding: EdgeInsets.zero,
        radius: 14,
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Icon(icon, color: ColorConstant.gold, size: 20),
          title: Text(label, style: sahraText(size: 15)),
          trailing: Icon(Icons.chevron_right_rounded,
              color: ColorConstant.gold, size: 20),
          onTap: onTap,
        ),
      ),
    );
  }

  /// Bottom sheet: you (personal) + every organisation + create one.
  void _showProfileSheet() {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        decoration: BoxDecoration(
            color: ColorConstant.nightElevated,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24))),
        child: SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                    color: ColorConstant.nightBorder,
                    borderRadius: BorderRadius.circular(99))),
            Text('Switch profile',
                style: sahraText(size: 20, weight: FontWeight.w800)),
            const SizedBox(height: 14),
            _sheetProfileTile(
              icon: Icons.person_outline_rounded,
              title: controller.user.value?['firstName'] != null
                  ? '${controller.user.value!['firstName']} ${controller.user.value!['lastName'] ?? ''}'
                      .trim()
                  : 'You (personal)',
              subtitle: 'Fan tabs · For You, Search, Tickets, Profile',
              onTap: () {
                Get.back();
                controller.switchToPersonal();
              },
            ), ...controller.memberships.map((m) {
              final org = m['org'] as Map? ?? const {};
              return _sheetProfileTile(
                icon: Icons.apartment_rounded,
                title: org['name']?.toString() ?? 'Organisation',
                subtitle:
                    '${m['role']?.toString() ?? 'member'} · ${org['city']?.toString() ?? ''}',
                selected: identical(m, controller.memberships.first),
                onTap: () => Get.back(),
              );
            }),
            _sheetProfileTile(
              icon: Icons.add_rounded,
              title: 'Create an organisation',
              subtitle: 'For a new team or venue',
              onTap: () {
                Get.back();
                controller.createOrg();
              },
            ),
          ]),
        ),
      ),
      isScrollControlled: true,
    );
  }

  Widget _sheetProfileTile({
    required IconData icon,
    required String title,
    required String subtitle,
    bool selected = false,
    required VoidCallback onTap,
  }) {
    return Material(
      type: MaterialType.transparency,
      child: ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
            color: ColorConstant.nightSurface,
            borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: ColorConstant.gold, size: 20),
      ),
      title: Text(title, style: sahraText(size: 15, weight: FontWeight.w600)),
      subtitle: Text(subtitle,
          style: sahraText(color: ColorConstant.nightMuted, size: 12)),
      trailing: selected
          ? Icon(Icons.check_circle_rounded,
              color: ColorConstant.gold, size: 20)
          : null,
      onTap: onTap,
    ));
  }
}
