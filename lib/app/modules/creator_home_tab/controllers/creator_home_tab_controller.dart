import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:get/get.dart';

class CreatorHomeTabController extends GetxController {
  showSheet(BuildContext ctx, {bool fromAsk = true}) {
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
          )),
      backgroundColor: Colors.transparent,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                    color: ColorConstant.whiteA700.withOpacity(.9),
                    borderRadius: BorderRadius.circular(
                      14,
                    )),
                padding: getPadding(left: 16, right: 16, top: 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Make changes to this action".tr,
                      clr: ColorConstant.blueGray900,
                      fontSize: getFontSize(16),
                      customWeight: FontWeight.w600,
                    ),
                    SizedBox(
                      height: getVerticalSize(5),
                    ),
                    MyText(
                      title: "Are you sure you want to make a change".tr,
                      clr: ColorConstant.blueGray400,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w400,
                    ),
                    SizedBox(
                      height: getVerticalSize(10),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: (){
                        Get.back();
                        Get.toNamed(Routes.CREATE_EVENT,arguments: {Constants.paramEdit : true});
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Duplicate",
                          clr: ColorConstant.blue,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              MediaSelectionTileAndroid(
                  title: "Cancel".tr,
                  textColor: ColorConstant.blue,
                  onPressed: () {
                    Get.back();
                  }),
              SizedBox(
                height: getVerticalSize(20),
              ),
            ],
          ),
        );
      },
    );
  }

  showUpcomingEventSheet(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
          )),
      backgroundColor: Colors.transparent,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                    color: ColorConstant.whiteA700.withOpacity(.9),
                    borderRadius: BorderRadius.circular(
                      14,
                    )),
                padding: getPadding(left: 16, right: 16, top: 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Make changes to this action".tr,
                      clr: ColorConstant.blueGray900,
                      fontSize: getFontSize(16),
                      customWeight: FontWeight.w600,
                    ),
                    SizedBox(
                      height: getVerticalSize(5),
                    ),
                    MyText(
                      title: "Are you sure you want to make a change".tr,
                      clr: ColorConstant.blueGray400,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w400,
                    ),
                    SizedBox(
                      height: getVerticalSize(10),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: (){
                        Get.back();
                        Get.toNamed(Routes.CREATE_EVENT,arguments: {Constants.paramEdit : true});
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Edit",
                          clr: ColorConstant.blue,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: (){
                        Get.back();
                        CustomSnackBar.showCustomToast(message: "Event Deleted Successfully");
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Delete",
                          clr: ColorConstant.blue,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              MediaSelectionTileAndroid(
                  title: "Cancel".tr,
                  textColor: ColorConstant.blue,
                  onPressed: () {
                    Get.back();
                  }),
              SizedBox(
                height: getVerticalSize(20),
              ),
            ],
          ),
        );
      },
    );
  }
}
