import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_text_form_field.dart';

import '../controllers/edit_profile_controller.dart';

class EditProfileView extends GetView<EditProfileController> {
  const EditProfileView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      hideAppBar: true,
      sidePadding: false,
      bodyPadding: false,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_save".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.back();
          },
        ),
      ),
      child: Stack(
        children: [
          Container(
            width: size.width,
            height: size.height,
            foregroundDecoration: BoxDecoration(
                gradient: LinearGradient(
              colors: [
                Colors.black.withValues(alpha: 0.1),
                Colors.black.withValues(alpha: 0.9),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            )),
            child: CustomImageView(
              width: size.width,
              fit: BoxFit.fill,
              imagePath: ImageConstant.splashBg,
            ),
          ),
          SizedBox(
            width: size.width,
            height: size.height,
            child: Column(
              children: [
                SizedBox(
                  height: size.height * 0.17,
                ),
                Expanded(
                    child: Container(
                        width: size.width,
                        decoration: BoxDecoration(
                            color: ColorConstant.bg,
                            border: Border.all(
                                color: ColorConstant.hairline, width: 1),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(24),
                              topRight: Radius.circular(24),
                            ))))
              ],
            ),
          ),
          Container(
            padding: getPadding(all: HelperFunction.SCREENS_SIDE_PADDING),
            child: Stack(
              children: <Widget>[
                ListView(),
                Column(
                  children: [
                    SizedBox(
                      height: size.height * 0.095,
                      width: size.width,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Align(
                            alignment: Alignment.topLeft,
                            child: GestureDetector(
                              onTap: () => Get.back(),
                              child: Icon(
                                Icons.arrow_back_ios,
                                color: ColorConstant.whiteA700,
                              ),
                            ),
                          ),
                          Align(
                            alignment: Alignment.bottomCenter,
                            child: Container(
                              margin: getMargin(bottom: 15),
                              child: MyText(
                                title: "Personal Info",
                                family: 'Manrope',
                                customWeight: FontWeight.w700,
                                fontSize: getFontSize(18),
                              ),
                            ),
                          ),
                          Align(
                            alignment: Alignment.bottomRight,
                            child: Container(
                              margin: getMargin(bottom: 15),
                              child: Icon(
                                Icons.edit,
                                color: ColorConstant.whiteA700,
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                    CustomImageView(
                      url: controller.userData?.user?.profileImage ?? "",
                      imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                      height: size.height * 0.12,
                      radius: BorderRadius.circular(200),
                      margin: getMargin(bottom: 20),
                    ),
                    MyText(
                      title: _displayName(),
                      family: 'Manrope',
                      customWeight: FontWeight.w700,
                      fontSize: getFontSize(18),
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    MyText(
                      title: _displayRole(),
                      family: 'Inter',
                      customWeight: FontWeight.w400,
                      fontSize: getFontSize(16),
                      clr: ColorConstant.white60,
                    ),
                    SizedBox(
                      height: getSize(20),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CustomTextFormField(
                              controller: controller.firstNameController,
                              labelText: "Name (Public)",
                              hintText: "Type in your name",
                              textInputType: TextInputType.name,
                            ),
                            SizedBox(
                              height: getSize(20),
                            ),
                            CustomTextFormField(
                              controller: controller.phoneController,
                              labelText: "Phone Number",
                              hintText: "+971",
                              textInputType: TextInputType.phone,
                            ),
                            SizedBox(
                              height: getSize(20),
                            ),
                            CustomTextFormField(
                              controller: controller.emailController,
                              labelText: "lbl_email_address",
                              hintText: "Type in your email",
                              textInputType: TextInputType.emailAddress,
                            ),
                            SizedBox(
                              height: getSize(20),
                            ),
                            const CustomTextFormField(
                              labelText: "Wallet ID",
                              hintText: "12312324",
                              readOnly: true,
                              textInputType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.done,
                            ),
                            SizedBox(
                              height: getSize(20),
                            ),
                            MyText(
                              title: "Connect to Social Media",
                              family: 'Manrope',
                              customWeight: FontWeight.w600,
                              fontSize: getFontSize(16),
                            ),
                            SizedBox(
                              height: getSize(20),
                            ),
                            socialWidget(
                                image: ImageConstant.insta,
                                title: "Instagram",
                                linked: true),
                            socialWidget(
                                image: ImageConstant.fb,
                                title: "Facebook",
                                linked: false),
                            socialWidget(
                                image: ImageConstant.x,
                                title: "X",
                                linked: false),
                          ],
                        ),
                      ),
                    )
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _displayName() {
    final user = controller.userData?.user;
    final full = (user?.fullName ?? '').toString().trim();
    if (full.isNotEmpty) return full;
    final name = '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim();
    return name.isNotEmpty ? name : 'User';
  }

  String _displayRole() {
    final role = controller.userData?.user?.role?.name?.toString().trim();
    if (role != null && role.isNotEmpty) return role;
    return 'User';
  }

  Widget socialWidget({
    required String image,
    required String title,
    required bool linked,
    void Function()? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: getPadding(left: 15, right: 15, bottom: 20),
        child: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                  color: ColorConstant.whiteA700,
                  borderRadius: BorderRadius.circular(5)),
              child: CustomImageView(
                imagePath: image,
                width: 30,
                height: 30,
                fit: BoxFit.fill,
                margin: getMargin(all: 5),
              ),
            ),
            const SizedBox(
              width: 20,
            ),
            Expanded(
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText(
                  title: "Link to your $title account",
                  customWeight: FontWeight.w400,
                  fontSize: getFontSize(16),
                  clr: ColorConstant.whiteA700,
                ),
                MyText(
                  title: linked ? "Unlink Now" : "Link Now",
                  customWeight: FontWeight.w400,
                  fontSize: getFontSize(16),
                  clr: linked
                      ? ColorConstant.errorRed
                      : ColorConstant.successGreen,
                ),
              ],
            ))
          ],
        ),
      ),
    );
  }
}
