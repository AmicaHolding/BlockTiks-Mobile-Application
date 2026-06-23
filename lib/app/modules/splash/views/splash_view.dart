import 'package:block_tix/app/data/widgets/base/baseview_auth_screen.dart';

import '../../../data/core/app_export.dart';
import '../controllers/splash_controller.dart';

class SplashView extends GetView<SplashController> {
  const SplashView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseviewAuthScreen(
        child: Stack(
      alignment: Alignment.center,
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
            width: size.width,
            height: size.height,
            alignment: Alignment.center,
            child: GetBuilder<SplashController>(
              init: SplashController(),
              initState: (_) {},
              builder: (controller) {
                return Center(
                    child: CustomImageView(
                  imagePath: ImageConstant.logo,
                  fit: BoxFit.fitWidth,
                  width: this.controller.sizeAnimation?.value ?? 0 + 200,
                  height: this.controller.sizeAnimation?.value ?? 0 + 200,
                ));
              },
            )),
      ],
    ));
  }
}
