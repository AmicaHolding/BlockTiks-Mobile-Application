import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/profile_tab_controller.dart';

class ProfileTabView extends GetView<ProfileTabController> {
  ProfileTabView({Key? key}) : super(key: key);

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
          _stats(),
          const SahraSmallLabel('Upcoming'),
          Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Text('Your next events will appear here.',
                  style: TextStyle(color: ColorConstant.nightMuted))),
          const SahraSmallLabel('Account'),
          _settingRow('Edit profile & settings',
              onTap: () => Get.toNamed(Routes.PROFILE_SETTINGS)),
          _settingRow('Edit profile',
              onTap: () => Get.toNamed(Routes.EDIT_PROFILE)),
          _settingRow('Change password',
              onTap: () => Get.toNamed(Routes.CHANGE_PASSWORD)),
          _settingRow('Notifications',
              onTap: () => Get.toNamed(Routes.NOTIFICATIONS_PAGE)),
          _settingRow('Transactions',
              onTap: () => Get.toNamed(Routes.TRANSACTIONS)),
          _settingRow('Earnings & payouts',
              onTap: () => Get.toNamed(Routes.WITHDRAW)),
          _settingRow('Payment methods',
              onTap: () => Get.toNamed(Routes.PAYMENT_OPTIONS)),
          _settingRow('Promo codes',
              onTap: () => Get.toNamed(Routes.PROMO_CODES)),
          const SahraSmallLabel('Support'),
          _settingRow('Help & FAQs', onTap: () => Get.toNamed(Routes.FAQS)),
          _settingRow('Invite friends',
              onTap: () => Get.toNamed(Routes.REFERRALS)),
          const SizedBox(height: 28),
          Center(
              child: GestureDetector(
                  onTap: () => Get.offAllNamed(Routes.SIGN_IN),
                  child: Text('Sign out',
                      style: sahraText(
                          color: ColorConstant.rumman,
                          size: 14,
                          weight: FontWeight.w600)))),
          const SizedBox(height: 36),
        ]),
      ),
    );
  }

  String _name() {
    final user = controller.profileData.value?.user;
    final full = (user?.fullName ?? '').toString().trim();
    if (full.isNotEmpty) return full;
    final name = '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim();
    return name.isEmpty ? 'Sahra fan' : name;
  }

  Widget _header() {
    return Obx(() {
      final user = controller.profileData.value?.user;
      final initials = _name()
          .split(' ')
          .where((e) => e.isNotEmpty)
          .take(2)
          .map((e) => e[0].toUpperCase())
          .join();
      return Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
          child: Row(children: [
            Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                    color: ColorConstant.nightSurface,
                    shape: BoxShape.circle,
                    border: Border.all(color: ColorConstant.gold, width: 2)),
                child: Center(
                    child: Text(initials.isEmpty ? 'S' : initials,
                        style: sahraText(
                            color: ColorConstant.gold,
                            size: 22,
                            weight: FontWeight.w700)))),
            const SizedBox(width: 16),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(_name(),
                      style: sahraText(size: 24, weight: FontWeight.w800)),
                  Text(user?.email ?? 'Set up your profile',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 13)),
                ])),
            SahraIconAction(
                icon: Icons.edit_outlined,
                onTap: () => Get.toNamed(Routes.PROFILE_SETTINGS)),
          ]));
    });
  }

  Widget _stats() {
    return Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
        child: SahraCard(
            child: Row(children: [
          _stat('Sahras', '0'),
          _stat('Upcoming', '0'),
          _stat('Following', '0'),
        ])));
  }

  Widget _stat(String label, String value) {
    return Expanded(
        child: Column(children: [
      Text(value, style: sahraText(size: 24, weight: FontWeight.w800)),
      Text(label, style: sahraText(color: ColorConstant.nightMuted, size: 12))
    ]));
  }

  Widget _settingRow(String label, {String? value, VoidCallback? onTap}) {
    return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: SahraCard(
            padding: EdgeInsets.zero,
            radius: 14,
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              title: Text(label, style: sahraText(size: 15)),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                if (value != null)
                  Text(value,
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 13)),
                Icon(Icons.chevron_right_rounded,
                    color: ColorConstant.gold, size: 20)
              ]),
              onTap: onTap,
            )));
  }
}
