import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';

import '../../utils/internet_connection_widgets/widget.dart';

class BaseViewPageScreen extends StatelessWidget {
  BaseViewPageScreen({
    super.key,
    this.sidePadding,
    this.bodyPadding,
    this.mainTopHeight,
    this.child,
    this.screenName,
    this.basicAppBar,
    this.showDivider,
    this.showNotification,
    this.showBackBtn,
    this.isHideLogo,
    this.backgroundColor,
    this.hideAppBar,
    this.showBorder,
    this.basicAppTrailingIcon,
    this.basicAppTrailingIconOnTap,
    this.resizeToAvoidBottomInset,
    this.prifixIcon,
    this.prefixIconOnTap,
    this.bottomNavigationBar,
    this.actions,
    this.leadingImagePath,
    this.extendBodyBehindAppBar = false,
    this.showLogo = false,
    this.centerTitle = false,
    this.safeTopArea = true,
  });

  final bool? basicAppBar;
  final bool? sidePadding;
  final bool? bodyPadding;
  final bool? showBackBtn;
  final bool? showDivider;
  final bool? showNotification;
  final double? mainTopHeight;
  final String? screenName;
  final Color? backgroundColor;
  final bool? hideAppBar;
  final bool? resizeToAvoidBottomInset;
  final bool? showBorder;
  final bool? isHideLogo;
  final Widget? child;
  final Widget? bottomNavigationBar;
  final IconData? basicAppTrailingIcon;
  final Function? basicAppTrailingIconOnTap;
  final Function()? prefixIconOnTap;
  final IconData? prifixIcon;
  final List<Widget>? actions;
  final String? leadingImagePath;
  final bool extendBodyBehindAppBar;
  final bool showLogo;
  final bool centerTitle;
  final bool safeTopArea;

  final Responsive responsive = Responsive();

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
      extendBodyBehindAppBar: extendBodyBehindAppBar,
      backgroundColor: backgroundColor ?? ColorConstant.bg,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset ?? false,
      bottomNavigationBar: SafeArea(
          child: bottomNavigationBar ??
              const SizedBox(
                width: 0,
                height: 0,
              )),
      body: SafeArea(
        top: safeTopArea,
        child: GestureDetector(
          onTap: () {
            FocusScope.of(context).requestFocus(FocusNode());
          },
          child: Container(
              height: responsive.setHeight(HelperFunction.FULL_SCREEN_SIZE),
              width: responsive.setWidth(HelperFunction.FULL_SCREEN_SIZE),
              color: backgroundColor ?? ColorConstant.bg,
              child: Padding(
                padding: EdgeInsets.symmetric(
                    horizontal: sidePadding == false
                        ? 0
                        : HelperFunction.SCREENS_SIDE_PADDING),
                child: Column(
                  children: [
                    Column(
                      children: [
                        if (hideAppBar != true)
                          Container(
                            color: ColorConstant.bg,
                            padding: const EdgeInsets.only(top: 8.0),
                            margin: const EdgeInsets.only(bottom: 0),
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
                                    top: 10.0, left: 16, right: 16, bottom: 10),
                                child: Column(
                                  children: [
                                    Stack(
                                      children: [
                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.center,
                                          mainAxisSize: MainAxisSize.max,
                                          children: [
                                            showBackBtn ?? false
                                                ?

                                            (leadingImagePath != null ? AppBarButton(
                                              onTap: prefixIconOnTap ??
                                                      () {
                                                    Get.back();
                                                  },
                                              svgPath: leadingImagePath ??
                                                  ImageConstant
                                                      .imgBackIcon2,
                                              // margin: getPadding(right: 10),
                                            ): GestureDetector(
                                              onTap: prefixIconOnTap ??
                                                      () {
                                                    Get.back();
                                                  },
                                              child: Container(
                                                height:getSize(30),
                                                width:getSize(30),
                                                decoration: BoxDecoration(
                                                  color: ColorConstant.whiteA700.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(8)
                                                ),
                                                alignment: Alignment.center,
                                                child: Padding(
                                                  padding: getPadding(left: 8),
                                                  child: Icon(Icons.arrow_back_ios,
                                                    color: ColorConstant.whiteA700,
                                                    size: 18,
                                                  ),
                                                ),
                                              ),
                                            )

                                            // AppBarButton(
                                            //   onTap: prefixIconOnTap ??
                                            //           () {
                                            //         Get.back();
                                            //       },
                                            //   svgPath: leadingImagePath ??
                                            //       ImageConstant
                                            //           .imgBackIcon2,
                                            //   // margin: getPadding(right: 10),
                                            // )
        )
                                                : SizedBox(
                                                    height: getVerticalSize(18),
                                                    width:
                                                        getHorizontalSize(18),
                                                  ),
                                            Expanded(
                                              flex: 2,
                                              child: showLogo
                                                  ? Center(
                                                      child: CustomImageView(
                                                      imagePath:
                                                          ImageConstant.logo,
                                                        height: getSize(Constants.appbarIconSize),
                                                      fit: BoxFit.fitHeight,
                                                    ))
                                                  : centerTitle
                                                      ? Center(
                                                          child: AppbarTitle(
                                                            text: screenName ??
                                                                '',
                                                            margin: EdgeInsets.only(
                                                                right:
                                                                    getHorizontalSize(
                                                                        28.0),
                                                                left: 20),
                                                          ),
                                                        )
                                                      : AppbarTitle(
                                                          text:
                                                              screenName ?? '',
                                                          margin: EdgeInsets.only(
                                                              right:
                                                                  getHorizontalSize(
                                                                      28.0),
                                                              left: 20),
                                                        ),
                                            ),
                                          ],
                                        ),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.end,
                                            children: showNotification == true
                                                ? [
                                                    CustomImageView(
                                                      svgPath: ImageConstant
                                                          .notificationBellIcon,
                                                      height:
                                                          getVerticalSize(23),
                                                      onTap: () {
                                                        Get.toNamed(Routes
                                                                .NOTIFICATIONS_PAGE)!
                                                            .then((value) {
                                                          //userDashboardController.notificationUnreadCount.value = 0;
                                                          // userDashboardController.fetchNotifications();
                                                        });
                                                        // CustomToast().showToast("in_progress".tr,false,context);
                                                      },
                                                    )
                                                  ]
                                                : (actions ?? []),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        const WarningWidgetValueNotifier(),
                      ],
                    ),
                    Expanded(
                      child: SizedBox(
                        width: responsive.setWidth(100),
                        child: Container(
                          padding: EdgeInsets.symmetric(
                              horizontal: bodyPadding == false
                                  ? 0
                                  : HelperFunction.SCREENS_SIDE_PADDING),
                          child: Column(
                            children: [Expanded(child: child ?? Container())],
                          ),
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
