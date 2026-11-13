import 'package:block_tix/app/data/core/app_export.dart';
import '../../../data/widgets/base/baseview_auth_screen.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';
import '../controllers/get_started_controller.dart';

class GetStartedView extends GetView<GetStartedController> {
  GetStartedView({Key? key}) : super(key: key);

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    return BaseviewAuthScreen(
      child: Stack(
        children: [
          SizedBox(
            width: size.width,
            height: size.height,
            child: CustomImageView(
              width: size.width,
              fit: BoxFit.fill,
              height: size.height,
              imagePath: ImageConstant.splashBg,
            ),
          ),
          Container(
            padding: getPadding(all: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                const Spacer(),
                CustomImageView(
                  imagePath: ImageConstant.logo,
                  fit: BoxFit.fitWidth,
                  width: 300,
                ),
                Container(
                  margin: getPadding(top: 5),
                  child: Text(
                    'Book premium event\'s ticket here',
                    textAlign: TextAlign.center,
                    style: AppStyle.heading3Manrope.copyWith(
                      color: ColorConstant.white60,
                      fontSize: getFontSize(17),
                    ),
                  ),
                ),
                Container(
                  margin: getPadding(top: 40, bottom: 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AuthPillButton(
                        onTap: () => Get.toNamed(Routes.SIGN_IN),
                        text: 'Log In',
                      ),
                      const SizedBox(
                        height: 12,
                      ),
                      AuthPillButton(
                        onTap: () => Get.toNamed(Routes.SIGN_UP),
                        text: 'Create an account',
                        variant: AuthPillButtonVariant.secondary,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
