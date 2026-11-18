import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/custom_bottom_bar.dart';
import 'package:block_tix/app/data/widgets/custom_dialogue.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';
import 'package:block_tix/app/modules/profile_tab/views/profile_tab_view.dart';
import 'package:block_tix/app/modules/search/views/search_view.dart';
import 'package:block_tix/app/modules/wallet/views/wallet_view.dart';

import '../../../data/core/app_export.dart';
import '../controllers/user_dashboard_controller.dart';

class UserDashboardView extends GetView<UserDashboardController> {
  UserDashboardView({Key? key}) : super(key: key);

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
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
          // Fan dashboard always uses the fan tab bar — a creator in
          // personal mode (lastMode=fan) must not get the door-mode bar,
          // whose PageController is bound to the creator PageView.
          customBottomBar: CustomBottomBar(),
          hideAppBar: controller.selectedIndex.value == 3 ||controller.selectedIndex.value == 0,
          basicAppBar: false,
          showBackBtn: false,
          safeAreaTop: !(controller.selectedIndex.value == 0 ||controller.selectedIndex.value == 3),
          isAgent: false,
          isServices: false,
          child: Column(children: [
            if (Constants.appEnv != 'prod')
              Container(
                width: double.infinity,
                color: ColorConstant.rumman.withValues(alpha: .9),
                padding:
                    const EdgeInsets.symmetric(vertical: 3, horizontal: 12),
                child: Text('TEST MODE — ${Constants.appEnv} data only',
                    textAlign: TextAlign.center,
                    style: sahraText(
                        color: ColorConstant.whiteA700,
                        size: 11,
                        weight: FontWeight.w700)),
              ),
            Expanded(
              child: PageView(
                scrollDirection: Axis.horizontal,
                controller: controller.pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  ForYouView(),
                  const SearchView(embedded: true),
                  WalletView(),
                  ProfileTabView(),
                ],
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
