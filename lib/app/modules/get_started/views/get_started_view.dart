import 'package:block_tix/app/data/core/app_export.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../data/widgets/base/baseview_auth_screen.dart';
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
                    style: GoogleFonts.getFont(
                      'Inter',
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                      height: 1.3,
                      letterSpacing: -0.8,
                      color: ColorConstant.white60,
                    ),
                  ),
                ),
                Container(
                  margin: getPadding(top: 40, bottom: 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CustomButton(
                        onTap: () => Get.toNamed(Routes.SIGN_IN),
                        text: 'Log In',
                      ),
                      const SizedBox(
                        height: 20,
                      ),
                      CustomButton(
                        onTap: () => Get.toNamed(Routes.SIGN_UP),
                        text: 'Create an account',
                        variant: ButtonVariant.OutlineWhite,
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
