import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_export.dart';
import 'sahra_nav_icon.dart';

/// Sahra fan tab bar matching the prototype: For You · Search · Tickets ·
/// Profile — 22px stroke icons, 11px labels, gold active / muted inactive
/// on the deep-night bar.
class CustomBottomBar extends StatelessWidget {
  CustomBottomBar({super.key, this.onChanged});

  final Color _selectedColor = ColorConstant.gold;
  final Color _unselectedColor = ColorConstant.nightMuted;

  UserDashboardController get controller =>
      Get.isRegistered<UserDashboardController>()
          ? Get.find<UserDashboardController>()
          : Get.put(UserDashboardController());

  final Function()? onChanged;

  static const _tabs = [
    ('home', 'For You'),
    ('search', 'Search'),
    ('tickets', 'Tickets'),
    ('profile', 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Obx(
      () => Container(
        height: 58 + bottomInset,
        padding: EdgeInsets.only(bottom: bottomInset, top: 8),
        color: ColorConstant.nightTabBar,
        child: Row(
          children: [
            for (var i = 0; i < _tabs.length; i++)
              Expanded(child: _item(_tabs[i].$1, _tabs[i].$2, i)),
          ],
        ),
      ),
    );
  }

  Widget _item(String icon, String label, int index) {
    final selected = controller.selectedIndex.value == index;
    final color = selected ? _selectedColor : _unselectedColor;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        controller.selectedIndex.value = index;
        controller.changePage(index);
        onChanged?.call();
      },
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SahraNavIcon(icon, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.bricolageGrotesque(
              fontSize: 11,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
