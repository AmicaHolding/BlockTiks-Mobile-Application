import 'package:block_tix/app/data/core/app_export.dart';

import '../controllers/loader_controller.dart';

class LoaderView extends GetView<LoaderController> {
  const LoaderView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      // screenName: 'msg_otp_verification'.tr,
      hideAppBar: true,
      sidePadding: true,
      showBackBtn: false,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomImageView(
              svgPath: ImageConstant.mini,
              width: getSize(45),
              height: getSize(45),
            ),
            SizedBox(
              height: getSize(30),
            ),
            controller.onDone != null
                ? const Offstage()
                : Text(
                    "Finding best event for you…",
                    style: AppStyle.bodyInter,
                  ),
            SizedBox(
              height: getSize(20),
            ),
            Obx(
              () => LinearProgressIndicator(
                value: controller.progress.value,
                minHeight: 4,
                backgroundColor: ColorConstant.elevated,
                valueColor:
                    AlwaysStoppedAnimation<Color>(ColorConstant.primaryAccent),
              ),
            )
          ],
        ),
      ),
    );
  }
}
