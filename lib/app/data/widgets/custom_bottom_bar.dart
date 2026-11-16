import 'dart:io';

import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_export.dart';

/// Sahra fan tab bar: For You · Search · Tickets · Profile on the deep-night
/// bar, gold for the active tab, muted blue-grey for the rest.
class CustomBottomBar extends StatelessWidget {
  CustomBottomBar({super.key, this.onChanged});

  final Color _selectedColor = ColorConstant.gold;
  final Color _unselectedColor = ColorConstant.nightMuted;

  final UserDashboardController controller = Get.put(UserDashboardController());

  final Function()? onChanged;

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return Obx(
      () => Container(
        constraints: BoxConstraints(
          maxHeight: Platform.isIOS ? getSize(85) : getSize(75)
        ),
        color: ColorConstant.nightTabBar,
        alignment: Alignment.bottomCenter,
        child: Theme(
          data: Theme.of(context).copyWith(
            splashFactory: NoSplash.splashFactory, // Remove the ripple effect
            highlightColor: Colors.transparent, // Remove the highlight color
          ),
          child: BottomNavigationBar(
            backgroundColor: ColorConstant.nightTabBar,
            elevation: 0,
            selectedItemColor: _selectedColor,
            unselectedItemColor: _unselectedColor,
            selectedLabelStyle: GoogleFonts.bricolageGrotesque(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: _selectedColor,
            ),
            unselectedLabelStyle: GoogleFonts.bricolageGrotesque(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: _unselectedColor,
            ),
            showUnselectedLabels: true,
            showSelectedLabels: true,
            currentIndex: controller.selectedIndex.value,
            onTap: (index) {
              controller.selectedIndex.value = index;
              controller.changePage(index);
            },
            items: [
              _buildNavItem(ImageConstant.forYou, "For You", 0),
              _buildNavItem(ImageConstant.search, "Search", 1),
              _buildNavItem(ImageConstant.ticket, "Tickets", 2),
              _buildNavItem(ImageConstant.profileTab, "Profile", 3),
            ],
            type: BottomNavigationBarType.fixed, // Keeps all icons visible
          ),
        ),
      ),
    );
  }

  BottomNavigationBarItem _buildNavItem(String icon, String label, int index) {
    final selected = controller.selectedIndex.value == index;
    return BottomNavigationBarItem(
      icon: Padding(
        padding: getPadding(top: 2),
        child: CustomImageView(
          svgPath: icon,
          color: selected ? _selectedColor : _unselectedColor,
          height: getSize(22),
        ),
      ),
      label: label,
    );
  }
}
