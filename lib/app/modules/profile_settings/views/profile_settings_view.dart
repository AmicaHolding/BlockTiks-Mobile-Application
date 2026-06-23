import 'package:block_tix/app/data/core/app_export.dart';

import '../controllers/profile_settings_controller.dart';

class ProfileSettingsView extends GetView<ProfileSettingsController> {
  const ProfileSettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: "lbl_settings".tr,
      sidePadding: false,
      centerTitle: true,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_signout".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            onLogoutTap();
          },
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            Container(
              padding: getPadding(left: 16, right: 16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: TextField(
                decoration: InputDecoration(
                  icon: CustomImageView(
                    svgPath: ImageConstant.search,
                  ),
                  hintText: 'Search',
                  hintStyle: TextStyle(color: Colors.white70),
                  border: InputBorder.none,
                ),
              ),
            ),
            SizedBox(
              height: getSize(20),
            ),
            profileTile(
                title: "Personal Info",
                desc: "Change your Name, email, Phone number",
                onTap: () => Get.toNamed(Routes.EDIT_PROFILE)),
            profileTile(
                title: "Payment Methods",
                desc: "Add, modify or delete your payment method",
                onTap: () => Get.toNamed(Routes.PAYMENT_OPTIONS)),
            profileTile(
                title: "Promo codes",
                desc: "Redeem or share your codes",
                onTap: () {
                  if(Constants.isUserCreator){
                    Get.toNamed(Routes.CREATOR_PROMO_CODE);
                  }else{
                    Get.toNamed(Routes.PROMO_CODES);
                  }
                }
            ),
            profileTile(
                title: "Referrals",
                desc: "Share the app with your friends and start earning",
                onTap: () => Get.toNamed(Routes.REFERRALS)),
            profileTile(
                title: "Settings",
                desc: "Change language, theme, etc...",
                onTap: () => Get.toNamed(Routes.SETTINGS)),
            profileTile(
                title: "Help",
                desc: "Questions and answers page",
                onTap: () => Get.toNamed(Routes.FAQS)),
            Constants.isUserCreator ?  profileTile(
                title: "Teams",
                desc: "Create and manage your teams",
                onTap: () => Get.toNamed(Routes.MANAGE_TEAMS)) : Offstage(),
            profileTile(
              title: "Switch to ${!Constants.isUserCreator? "Creator": "User"}",
              desc: Constants.isUserCreator? "Host events and send invites" : "Find and get tickets to events near you",
              onTap: (){
                if(Constants.isUserCreator != true){
                  Constants.isUserCreator = true;
                  Get.offAllNamed(Routes.CREATOR_DASHBOARD);
                }else{
                  Constants.isUserCreator = false;
                  Get.offAllNamed(Routes.USER_DASHBOARD);
                }

              }
            ),
            SizedBox(
              height: getSize(30),
            )
          ],
        ),
      ),
    );
  }

  Widget profileTile(
      {required String title, required String desc, void Function()? onTap}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: getMargin(bottom: 10),
        padding: getPadding(left: 12, right: 12, top: 7, bottom: 10),
        decoration: BoxDecoration(
            color: ColorConstant.containerBg.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: title,
                    customWeight: FontWeight.w500,
                    fontSize: getFontSize(16),
                  ),
                  SizedBox(
                    height: getSize(3),
                  ),
                  MyText(
                    title: desc,
                    fontSize: getFontSize(14),
                    clr: ColorConstant.whiteA700.withValues(alpha: 0.7),
                    toverflow: TextOverflow.ellipsis,
                    line: 1,
                  ),
                ],
              ),
            ),
            SizedBox(
              width: getSize(10),
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: ColorConstant.whiteA700,
            )
          ],
        ),
      ),
    );
  }

  void onLogoutTap() {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.bg),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 50), // For the cancel icon spacing
                    MyText(
                      title: 'lbl_signout'.tr,
                      customWeight: FontWeight.w700,
                      fontSize: 20,
                    ),
                    const SizedBox(height: 5),
                    MyText(
                      title: 'logout_msg'.tr,
                      fontSize: 14,
                    ),
                    const SizedBox(height: 35),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Expanded(
                            child: CustomButton(
                                text: "No",
                                height: 40,
                                variant: ButtonVariant.OutlinePink,
                                onTap: () {
                                  Get.back();
                                })),
                        const SizedBox(
                          width: 10,
                        ),
                        Expanded(
                            child: CustomButton(
                          text: "Yes",
                          height: 40,
                          onTap: () {
                            Get.offAllNamed(Routes.GET_STARTED);
                          },
                        )),
                      ],
                    ),
                  ],
                ),
              ),
              Positioned(
                top: 0,
                left: 0,
                child: IconButton(
                  icon: const Icon(
                    Icons.close,
                    color: Colors.grey,
                    size: 30,
                  ),
                  onPressed: () {
                    Get.back(); // Close the dialog
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
