import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/profile_settings_controller.dart';

class ProfileSettingsView extends GetView<ProfileSettingsController> {
  const ProfileSettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.sand,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Row(children: [
              IconButton(
                onPressed: Get.back,
                icon: Icon(Icons.arrow_back_rounded, color: ColorConstant.ink),
              ),
              Expanded(
                child: Text('Settings',
                    style: sahraText(
                        color: ColorConstant.ink,
                        size: 26,
                        weight: FontWeight.w800)),
              ),
            ]),
            const SizedBox(height: 8),
            Text('Account, payments, promos and support.',
                style: sahraText(
                    color: ColorConstant.ink.withValues(alpha: .62), size: 14)),
            const SizedBox(height: 20),
            _section('Account', [
              _tile(
                icon: Icons.person_outline_rounded,
                title: 'Edit profile',
                subtitle: 'Name, photo, language and city',
                onTap: () => Get.toNamed(Routes.EDIT_PROFILE),
              ),
              _tile(
                icon: Icons.lock_outline_rounded,
                title: 'Change password',
                subtitle: 'Update your sign-in password',
                onTap: () => Get.toNamed(Routes.CHANGE_PASSWORD),
              ),
              _tile(
                icon: Icons.notifications_none_rounded,
                title: 'Notifications',
                subtitle: 'Purchases, resale and organizer updates',
                onTap: () => Get.toNamed(Routes.NOTIFICATIONS_PAGE),
              ),
              _tile(
                icon: Icons.receipt_long_outlined,
                title: 'Transactions',
                subtitle: 'Orders, refunds and resale activity',
                onTap: () => Get.toNamed(Routes.TRANSACTIONS),
              ),
            ]),
            _section('Money', [
              _tile(
                icon: Icons.account_balance_wallet_outlined,
                title: 'Earnings & payouts',
                subtitle: 'Resale proceeds and withdrawals',
                onTap: () => Get.toNamed(Routes.WITHDRAW),
              ),
              _tile(
                icon: Icons.credit_card_outlined,
                title: 'Payment methods',
                subtitle: 'Cards used for checkout',
                onTap: () => Get.toNamed(Routes.PAYMENT_OPTIONS),
              ),
              _tile(
                icon: Icons.local_offer_outlined,
                title: 'Promo codes',
                subtitle: 'Redeem or manage your codes',
                onTap: () => Get.toNamed(Routes.PROMO_CODES),
              ),
              _tile(
                icon: Icons.card_giftcard_outlined,
                title: 'Referrals',
                subtitle: 'Invite friends and track rewards',
                onTap: () => Get.toNamed(Routes.REFERRALS),
              ),
            ]),
            _section('Support', [
              _tile(
                icon: Icons.help_outline_rounded,
                title: 'Help & FAQs',
                subtitle: 'Tickets, resale, payments and account',
                onTap: () => Get.toNamed(Routes.FAQS),
              ),
            ]),
            const SizedBox(height: 18),
            SahraPillButton(
              label: 'Sign out',
              dark: true,
              onTap: () => Get.offAllNamed(Routes.GET_STARTED),
            ),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Text(title.toUpperCase(),
                style: sahraText(
                    color: ColorConstant.ink.withValues(alpha: .55),
                    size: 11,
                    weight: FontWeight.w700,
                    letterSpacing: 1.2)),
          ),
          SahraCard(
            color: ColorConstant.lightCard,
            padding: EdgeInsets.zero,
            radius: 18,
            child: Column(children: children),
          ),
        ],
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: ColorConstant.dune,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: ColorConstant.ink, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: sahraText(
                        color: ColorConstant.ink,
                        size: 15,
                        weight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: sahraText(
                        color: ColorConstant.ink.withValues(alpha: .58),
                        size: 12)),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              color: ColorConstant.ink.withValues(alpha: .45), size: 22),
        ]),
      ),
    );
  }
}
