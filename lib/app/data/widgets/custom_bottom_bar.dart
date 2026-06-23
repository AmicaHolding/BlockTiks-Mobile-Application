import 'dart:io';

import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';

import '../core/app_export.dart';

class CustomBottomBar extends StatelessWidget {
  CustomBottomBar({super.key, this.onChanged});

  final Color _selectedColor = ColorConstant.primaryPink;
  final Color _unselectedColor = ColorConstant.white60;

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
        decoration: BoxDecoration(
          // color: ColorConstant.whiteColor.withOpacity(0.1),
          boxShadow: [
            BoxShadow(
              // color: ColorConstant.black9004c,
              spreadRadius: getHorizontalSize(
                0.01,
              ),
              blurRadius: getHorizontalSize(
                0,
              ),
              offset: const Offset(
                0,
                -0.5,
              ),
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
            currentIndex: controller.selectedIndex.value,
            onTap: (index) {
              controller.selectedIndex.value = index;
              controller.changePage(index);
            },
            items: [
              _buildNavItem(ImageConstant.forYouActive, ImageConstant.forYou, "For You", 0),
              _buildNavItem(ImageConstant.resellActive,ImageConstant.resell, "Resell", 1),
              _buildNavItem(ImageConstant.walletActive,ImageConstant.wallet, "Wallet", 2),
              _buildNavItem(ImageConstant.profileTabActive,ImageConstant.profileTab, "Profile", 3),
            ],
            type: BottomNavigationBarType.fixed, // Keeps all icons visible
          ),
        ),
      ),
    );
  }

  BottomNavigationBarItem _buildNavItem(
      String selectedIcon,String icon, String label, int index) {
    return BottomNavigationBarItem(
      icon: controller.selectedIndex.value == index
          ? Container(
              padding: getPadding(left: 10,right: 10, top: 8,bottom: 8),
              decoration: BoxDecoration(
                color: ColorConstant.whiteA700.withOpacity(0.1),
                borderRadius: BorderRadius.circular(getSize(20)),
              ),
              child: Row(
                children: [
                  CustomImageView(svgPath: selectedIcon, color: _selectedColor,height: getSize(20),),
                  if (label.isNotEmpty)
                    SizedBox(width: getSize(6)), // Space between icon and text
                  if (label.isNotEmpty)
                    MyText(title: label, clr: Colors.white),
                ],
              ),
            )
          : Container(
        padding: getPadding(left: 10,right: 10, top: 8,bottom: 8),
            child: CustomImageView(svgPath: icon,color: index ==0 ? ColorConstant.white60 : null, height: getSize(18),
                  ),
          ),
      label: '',
    );
  }
}
