import 'dart:io';

import 'package:block_tix/app/modules/creator_dashboard/controllers/creator_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_export.dart';

/// Creator "door mode" tab bar: Events · Scan · Guests · Account.
/// Scan is a centre action that pushes the camera screen — it is not a tab.
/// Tab indexes: 0 = Events, 1 = Guests, 2 = Account.
class CustomBottomBarCreator extends StatelessWidget {
  CustomBottomBarCreator({super.key});

  final CreatorDashboardController controller =
      Get.put(CreatorDashboardController());

  @override
  Widget build(BuildContext context) {
    return Obx(
      () => Container(
        height: Platform.isIOS ? getSize(84) : getSize(74),
        padding: EdgeInsets.only(
          bottom: Platform.isIOS ? getSize(20) : getSize(8),
          top: getSize(8),
        ),
        decoration: BoxDecoration(
          color: ColorConstant.nightTabBar,
          border: Border(
            top: BorderSide(color: ColorConstant.hairline, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            _item(
              icon: ImageConstant.forYou,
              activeIcon: ImageConstant.forYouActive,
              label: 'Events',
              tabIndex: 0,
            ),
            _item(
              materialIcon: Icons.qr_code_scanner_rounded,
              label: 'Scan',
              isScan: true,
            ),
            _item(
              materialIcon: Icons.groups_rounded,
              label: 'Guests',
              tabIndex: 1,
            ),
            _item(
              icon: ImageConstant.profileTab,
              activeIcon: ImageConstant.profileTabActive,
              label: 'Account',
              tabIndex: 2,
            ),
          ],
        ),
      ),
    );
  }

  Widget _item({
    String? icon,
    String? activeIcon,
    IconData? materialIcon,
    required String label,
    int? tabIndex,
    bool isScan = false,
  }) {
    final selected = tabIndex != null &&
        controller.selectedIndex.value == tabIndex;
    final color =
        selected ? ColorConstant.gold : ColorConstant.white60;

    Widget iconWidget;
    if (isScan) {
      iconWidget = Container(
        height: getSize(46),
        width: getSize(46),
        decoration: BoxDecoration(
          color: ColorConstant.gold,
          shape: BoxShape.circle,
        ),
        child: Icon(
          materialIcon,
          color: ColorConstant.night,
          size: getSize(24),
        ),
      );
    } else if (materialIcon != null) {
      iconWidget = Icon(materialIcon, color: color, size: getSize(24));
    } else {
      iconWidget = CustomImageView(
        svgPath: selected ? (activeIcon ?? icon!) : (icon ?? activeIcon!),
        color: selected ? null : color,
        height: getSize(22),
      );
    }

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          if (isScan) {
            Get.toNamed(Routes.MY_SCANNER);
          } else if (tabIndex != null) {
            controller.selectedIndex.value = tabIndex;
            controller.changePage(tabIndex);
          }
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget,
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.ibmPlexSansArabic(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
