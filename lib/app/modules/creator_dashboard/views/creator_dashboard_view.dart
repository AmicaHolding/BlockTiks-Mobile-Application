import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/custom_dialogue.dart';
import 'package:block_tix/app/modules/analytic/views/analytic_view.dart';
import 'package:block_tix/app/modules/creator_home_tab/views/creator_home_tab_view.dart';
import 'package:block_tix/app/modules/profile_tab/views/profile_tab_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/creator_dashboard_controller.dart';

class CreatorDashboardView extends StatelessWidget {
  CreatorDashboardView({Key? key}) : super(key: key);
  final CreatorDashboardController controller = Get.put(CreatorDashboardController());

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return WillPopScope(
      onWillPop: () async {
        showDialog(
            context: context,
            builder: (context) {
              return CustomDialogue(
                dialogueBoxHeading: 'Exit',
                dialogueBoxText: 'warning_close_app'.tr,
                actionOnNo: () {
                  Navigator.pop(context);
                },
                actionOnYes: () {
                  SystemNavigator.pop();
                },
              );
            });
        return true;
      },
      child: Obx(
            () => BaseviewScreen(
          showLogo: true,
          sidePadding: false,
          // mainTopHeight: controller.mainTopPadding.value,
          mainTopHeight: 0,
          // isHideLogo: controller.isHideLogo.value,
          screenName: controller.screenName.isEmpty
              ? null
              : controller.screenName.value,
          hideAppBar: controller.selectedIndex.value == 2,
          basicAppBar: false,
          showBackBtn: false,
          safeAreaTop: (controller.selectedIndex.value != 2),
          isAgent: false,
          isServices: false,
          child: PageView(
            scrollDirection: Axis.horizontal,
            controller: controller.pageController,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              CreatorHomeTabView(),
              AnalyticView(fromCreator: true,),
              ProfileTabView(),
            ],
          ),
        ),
      ),
    );
  }
}
