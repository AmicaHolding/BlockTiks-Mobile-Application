import 'dart:io';

import 'package:block_tix/app/modules/creator_dashboard/controllers/creator_dashboard_controller.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_export.dart';

class CustomBottomBarCreator extends StatelessWidget {
  CustomBottomBarCreator({super.key, this.onChanged});

  final Color _selectedColor = ColorConstant.primaryPink;
  final Color _unselectedColor = ColorConstant.white60;

  final CreatorDashboardController controller = Get.put(CreatorDashboardController());

  final Function()? onChanged;

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return Obx(
          () => Container(
        constraints: BoxConstraints(
          maxHeight: Platform.isIOS ? getSize(85) : getSize(75),
        ),
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              spreadRadius: getHorizontalSize(0.01),
              blurRadius: getHorizontalSize(0),
              offset: const Offset(0, -0.5),
            ),
          ],
        ),
        alignment: Alignment.bottomCenter,
        child: Theme(
          data: Theme.of(context).copyWith(
            splashFactory: NoSplash.splashFactory, // Remove the ripple effect
            highlightColor: Colors.transparent, // Remove the highlight color
          ),
          child: BottomNavigationBar(
            backgroundColor: Colors.black,
            elevation: 0,
            showUnselectedLabels: true,  // Ensures unselected labels are shown
            showSelectedLabels: true,    // Ensures selected labels are shown
            selectedItemColor: _unselectedColor,  // Use selected color for selected items
            unselectedItemColor: _unselectedColor, // Use unselected color for unselected items
            selectedLabelStyle: AppStyle.white60InterNormal14.copyWith(color: _selectedColor), // Customize selected label style
            unselectedLabelStyle: AppStyle.white60InterNormal14.copyWith(color: _unselectedColor), // Customize unselected label style
            currentIndex: controller.selectedIndex.value,
            onTap: (index) {
              controller.selectedIndex.value = index;
              controller.changePage(index);
            },
            items: [
              _buildNavItem(ImageConstant.forYouActive, ImageConstant.forYou, "Home", 0),
              _buildNavItem(ImageConstant.analyticsTabActive, ImageConstant.analyticsTab, "Analytics", 1),
              _buildNavItem(ImageConstant.profileTabActive, ImageConstant.profileTab, "Profile", 2),
            ],
            type: BottomNavigationBarType.fixed, // Ensure all items (selected and unselected) are shown
          ),
        ),
      ),
    );
  }

  BottomNavigationBarItem _buildNavItem(
      String selectedIcon, String icon, String label, int index) {
    return BottomNavigationBarItem(
      icon: controller.selectedIndex.value == index
          ? CustomImageView(svgPath: selectedIcon, color: _selectedColor, height: getSize(20), margin: getMargin(bottom: 5))
          : CustomImageView(svgPath: icon, color: index == 0 ? _unselectedColor : null, height: getSize(20), margin: getMargin(bottom: 5)),
      label: label,
    );
  }
}
