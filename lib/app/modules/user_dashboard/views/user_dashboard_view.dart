import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/custom_dialogue.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';
import 'package:block_tix/app/modules/profile_tab/views/profile_tab_view.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:block_tix/app/modules/wallet/views/wallet_view.dart';

import '../../../data/core/app_export.dart';
import '../controllers/user_dashboard_controller.dart';

class UserDashboardView extends StatelessWidget {
  UserDashboardView({Key? key}) : super(key: key);

  final UserDashboardController controller = Get.put(UserDashboardController());

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
          hideAppBar: controller.selectedIndex.value == 3 ||controller.selectedIndex.value == 0,
          basicAppBar: false,
          showBackBtn: false,
          safeAreaTop: !(controller.selectedIndex.value == 0 ||controller.selectedIndex.value == 3),
          isAgent: false,
          isServices: false,
          child: PageView(
            scrollDirection: Axis.horizontal,
            controller: controller.pageController,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              ForYouView(),
              ResellTabView(),
              WalletView(),
              ProfileTabView(),
            ],
          ),
        ),
      ),
    );
  }
}
