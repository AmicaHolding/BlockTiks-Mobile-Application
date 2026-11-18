import 'package:block_tix/app/modules/creator_dashboard/controllers/creator_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_export.dart';
import 'sahra_nav_icon.dart';

/// Creator "door mode" tab bar matching the prototype:
/// Events · Scan · Guests · Account — same 22px stroke icons and metrics as
/// the fan bar. Scan pushes the camera screen (not a PageView tab).
/// Gate staff see Scan · Guests · Account only (flow M5).
class CustomBottomBarCreator extends StatelessWidget {
  CustomBottomBarCreator({super.key});

  final CreatorDashboardController controller =
      Get.put(CreatorDashboardController());

  static const _allTabs = [
    ('events', 'Events'),
    ('scan', 'Scan'),
    ('guests', 'Guests'),
    ('profile', 'Account'),
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
            for (final tab in _visibleTabs) Expanded(child: _item(tab)),
          ],
        ),
      ),
    );
  }

  List<(String, String)> get _visibleTabs => controller.isGateStaff.value
      ? _allTabs.sublist(1) // Scan · Guests · Account
      : _allTabs;

  /// PageView tab index for each bar item, or null for Scan (a pushed route).
  int? _tabIndex(String icon) {
    final gate = controller.isGateStaff.value;
    switch (icon) {
      case 'events':
        return gate ? null : 0;
      case 'guests':
        return gate ? 0 : 1;
      case 'profile':
        return gate ? 1 : 2;
      default:
        return null; // scan
    }
  }

  Widget _item((String, String) tab) {
    final (icon, label) = tab;
    final tabIndex = _tabIndex(icon);
    final selected = tabIndex != null &&
        controller.selectedIndex.value == tabIndex;
    final color =
        selected ? ColorConstant.gold : ColorConstant.nightMuted;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (icon == 'scan') {
          Get.toNamed(Routes.MY_SCANNER);
        } else if (tabIndex != null) {
          controller.selectedIndex.value = tabIndex;
          controller.changePage(tabIndex);
        }
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
