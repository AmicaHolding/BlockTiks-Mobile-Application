import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/utils/internet_connection_widgets/widget.dart';
import 'package:block_tix/app/data/widgets/custom_bottom_bar_creator.dart';
import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_export.dart';
import '../custom_bottom_bar.dart';

class BaseviewScreen extends StatelessWidget {
  BaseviewScreen({
    super.key,
    this.semanticsLabel,
    this.showBottomBar,
    this.sidePadding,
    this.mainTopHeight,
    this.child,
    this.screenName,
    this.basicAppBar,
    this.showDivider,
    this.showBackBtn,
    this.isHideLogo,
    this.backgroundColor,
    this.hideAppBar,
    this.showBorder,
    this.basicAppTrailingIcon,
    this.basicAppTrailingIconOnTap,
    this.resizeToAvoidBottomInset,
    this.searchField,
    this.isAgent,
    this.isServices,
    this.prifixIcon,
    this.prefixIconOnTap,
    this.customBottomBar,
    this.isFFactory,
    this.basicRightScreenName,
    this.safeAreaTop = true,
    this.showLogo = true,
  });

  final String? semanticsLabel;
  final bool? showBottomBar;
  final bool? isFFactory;
  final bool? basicAppBar;
  final bool? sidePadding;
  final bool? showBackBtn;
  final bool? showDivider;
  final double? mainTopHeight;
  final String? screenName;
  final Color? backgroundColor;
  final bool? hideAppBar;
  final bool? resizeToAvoidBottomInset;
  final bool? showBorder;
  final bool? isHideLogo;
  final Widget? child;
  final IconData? basicAppTrailingIcon;
  final Function? basicAppTrailingIconOnTap;
  final Function()? prefixIconOnTap;
  final Widget? searchField;
  final bool? isAgent;
  final bool? isServices;
  final IconData? prifixIcon;
  final Widget? customBottomBar;
  final String? basicRightScreenName;
  final bool safeAreaTop;
  final bool showLogo;

  final Responsive responsive = Responsive();
  UserDashboardController userDashboardController =
      Get.put(UserDashboardController());

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
      statusBarColor: Colors.black,
      // Dark color for the status bar
      statusBarIconBrightness: Brightness.light,
      // White icons on the status bar
      statusBarBrightness:
          Brightness.dark, // For iOS: sets status bar text and icons to light
    ));
    return Scaffold(
      backgroundColor: backgroundColor ?? ColorConstant.bg,
      bottomNavigationBar:
          showBottomBar != false ? customBottomBar ?? (Constants.isUserCreator ? CustomBottomBarCreator() : CustomBottomBar()) : null,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset ?? false,
      body: SafeArea(
        top: safeAreaTop,
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).requestFocus();
          },
          child: Container(
              height: MediaQuery.of(context).size.height,
              width: MediaQuery.of(context).size.width,
              color: backgroundColor ?? ColorConstant.bg,
              child: Padding(
                padding: EdgeInsets.symmetric(
                    horizontal: sidePadding == false
                        ? 0
                        : HelperFunction.SCREENS_SIDE_PADDING),
                child: Column(
                  children: [
                    if (hideAppBar != true)
                      Column(
                        children: [
                          if (basicAppBar != true)
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 8.0),
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                        color: showDivider == true
                                            ? ColorConstant.textFieldHintColor
                                                .withValues(alpha: 0.5)
                                            : Colors.transparent,
                                        width: 0.5),
                                  ),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.only(
                                      top: 10.0,
                                      left: 25,
                                      right: 16,
                                      bottom: 10),
                                  child: Column(
                                    children: [
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        mainAxisSize: MainAxisSize.max,
                                        children: [
                                          showBackBtn == true
                                              ? AppBarButton(
                                                  onTap: prefixIconOnTap ??
                                                      () {
                                                        Get.back();
                                                      },
                                                  svgPath:
                                                      ImageConstant.imgBackIcon,
                                                )
                                              : Container(),
                                          Expanded(
                                            flex: 1,
                                            child: showLogo
                                                ? CustomImageView(
                                                    imagePath:
                                                        ImageConstant.logo,
                                                    height: getSize(Constants.appbarIconSize),
                                                    fit: BoxFit.fitHeight,
                                                  )
                                                : AppbarTitle(
                                                    text: screenName ?? ''),
                                          ),
                                          Obx(
                                            () => Stack(
                                              children: [
                                                CustomImageView(
                                                  svgPath: ImageConstant
                                                      .notificationBellIcon,
                                                  height: getVerticalSize(23),
                                                  onTap: () {
                                                    Get.toNamed(Routes
                                                            .NOTIFICATIONS_PAGE)!
                                                        .then((value) {
                                                      //userDashboardController.notificationUnreadCount.value = 0;
                                                      // userDashboardController
                                                      //     .fetchNotifications();
                                                    });
                                                    // CustomToast().showToast("in_progress".tr,false,context);
                                                  },
                                                ),
                                                userDashboardController
                                                            .notificationUnreadCount
                                                            .value !=
                                                        0
                                                    ? Container(
                                                        margin: const EdgeInsets
                                                            .only(left: 7),
                                                        height: 17,
                                                        width: 17,
                                                        decoration: BoxDecoration(
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                        100),
                                                            color: ColorConstant
                                                                .orangeA200),
                                                        child: Center(
                                                          child: Text(
                                                            "${userDashboardController.notificationUnreadCount.value > 9 ? "9+" : userDashboardController.notificationUnreadCount.value}",
                                                            style: AppStyle
                                                                .txtAgeoMedium10BlackA500,
                                                            textAlign: TextAlign
                                                                .center,
                                                          ),
                                                        ),
                                                      )
                                                    : const SizedBox.shrink()
                                              ],
                                            ),
                                          )
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          if (basicAppBar == true)
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 8.0),
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                        color: showDivider == true
                                            ? ColorConstant.textFieldHintColor
                                                .withValues(alpha: 0.5)
                                            : Colors.transparent,
                                        width: 0.5),
                                  ),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.only(
                                      top: 10.0,
                                      left: 16,
                                      right: 16,
                                      bottom: 10),
                                  child: Column(
                                    children: [
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        mainAxisSize: MainAxisSize.max,
                                        children: [
                                          AppBarButton(
                                            onTap: prefixIconOnTap ??
                                                () {
                                                  Get.back();
                                                },
                                            svgPath: ImageConstant.imgBackIcon,
                                          ),
                                          Expanded(
                                            flex: 2,
                                            child: showLogo
                                                ? CustomImageView(
                                                    imagePath:
                                                        ImageConstant.logo,
                                                    height: getSize(35),
                                                    fit: BoxFit.fitHeight,
                                                  )
                                                : AppbarTitle(
                                                    text: screenName ?? '',
                                                    margin: EdgeInsets.only(
                                                        right:
                                                            getHorizontalSize(
                                                                20.0)),
                                                  ),
                                          ),
                                          Obx(
                                            () => Stack(
                                              children: [
                                                CustomImageView(
                                                  svgPath: ImageConstant
                                                      .notificationBellIcon,
                                                  height: getVerticalSize(23),
                                                  onTap: () {
                                                    Get.toNamed(Routes
                                                            .NOTIFICATIONS_PAGE)!
                                                        .then((value) {
                                                      //userDashboardController.notificationUnreadCount.value = 0;
                                                      // userDashboardController
                                                      //     .fetchNotifications();
                                                    });
                                                    // CustomToast().showToast("in_progress".tr,false,context);
                                                  },
                                                ),
                                                userDashboardController
                                                            .notificationUnreadCount
                                                            .value !=
                                                        0
                                                    ? Container(
                                                        margin: const EdgeInsets
                                                            .only(left: 7),
                                                        height: 17,
                                                        width: 17,
                                                        decoration: BoxDecoration(
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                        100),
                                                            color: ColorConstant
                                                                .orangeA200),
                                                        child: Center(
                                                          child: Text(
                                                            "${userDashboardController.notificationUnreadCount.value > 9 ? "9+" : userDashboardController.notificationUnreadCount.value}",
                                                            style: AppStyle
                                                                .txtAgeoMedium10BlackA500,
                                                            textAlign: TextAlign
                                                                .center,
                                                          ),
                                                        ),
                                                      )
                                                    : const SizedBox.shrink()
                                              ],
                                            ),
                                          )
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    const WarningWidgetValueNotifier(),
                    Expanded(
                      child: SizedBox(
                        width: size.height,
                        // decoration: AppDecoration.fillGray50,
                        child: Column(
                          children: [Expanded(child: child ?? Container())],
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ),
      ),
      // This trailing comma makes auto-formatting nicer for build methods.
    );
  }

}
