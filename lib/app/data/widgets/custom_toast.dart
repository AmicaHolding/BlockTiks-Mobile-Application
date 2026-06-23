import 'package:block_tix/app/data/core/app_export.dart';
import 'package:fluttertoast/fluttertoast.dart';

class CustomToast {
  void showToast(String body, bool error, context) {
    FToast fToast = FToast();
    fToast.init(context);
    onClose() {
      fToast.removeCustomToast();
    }

    Widget toast = Container(
      padding: EdgeInsets.symmetric(
          horizontal: getHorizontalSize(14), vertical: getVerticalSize(15)),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(getSize(13)),
          color: ColorConstant.whiteA700,
          border: Border.all(width: 0.5, color: ColorConstant.gray600)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                color:
                    error ? ColorConstant.redColor : ColorConstant.primaryPink),
            width: getSize(30),
            height: getSize(30),
            alignment: Alignment.center,
            child: Icon(
              error ? Icons.close : Icons.check,
              size: getSize(15),
            ),
          ),
          SizedBox(
            width: getHorizontalSize(14),
          ),
          Expanded(
            child: MyText(
              title: body,
              clr: ColorConstant.answerColor,
              customWeight: FontWeight.w500,
            ),
          ),
          SizedBox(
            width: getHorizontalSize(14),
          ),
          GestureDetector(
            onTap: () {
              onClose();
            },
            child: Icon(
              Icons.close,
              size: getSize(15),
              color: ColorConstant.answerColor,
            ),
          )
        ],
      ),
    );

    Future.delayed(const Duration(seconds: 3)).then((value) async {
      Constants.showToast = true;
    });
    if (Constants.showToast) {
      try {
        fToast.showToast(
          child: toast,
          gravity: ToastGravity.TOP,
          toastDuration: const Duration(seconds: 3),
        );
      } catch (_) {
        // if(Get.overlayContext!= null){
        //   fToast.init(Get.overlayContext!);
        //   fToast.showToast(
        //     child: toast,
        //     gravity: ToastGravity.TOP,
        //     toastDuration: const Duration(seconds: 3),
        //   );
        // }
      }
    }
    Constants.showToast = false;
  }

  void showToast2(String imagePath, String body, bool error, context,
      {bool isImageUrl = false}) {
    FToast fToast = FToast();
    fToast.init(context);

    onClose() {
      fToast.removeCustomToast();
    }

    Widget toast = Container(
      padding: EdgeInsets.symmetric(
          horizontal: getHorizontalSize(7), vertical: getVerticalSize(5)),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(getSize(12)),
          color: ColorConstant.whiteA700,
          border: Border.all(width: 0.5, color: ColorConstant.gray600)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CustomImageView(
            radius: BorderRadius.circular(12),
            width: getSize(50),
            height: getSize(50),
            imagePath: isImageUrl ? null : imagePath,
            url: isImageUrl ? imagePath : null,
            fit: BoxFit.cover,
          ),
          SizedBox(
            width: getHorizontalSize(14),
          ),
          Expanded(
            child: MyText(
              title: body,
              clr: ColorConstant.answerColor,
              customWeight: FontWeight.w500,
            ),
          ),
          SizedBox(
            width: getHorizontalSize(14),
          ),
          GestureDetector(
            onTap: () {
              onClose();
            },
            child: Icon(
              Icons.close,
              size: getSize(15),
              color: ColorConstant.answerColor,
            ),
          )
        ],
      ),
    );

    try {
      fToast.showToast(
        child: toast,
        gravity: ToastGravity.TOP,
        toastDuration: const Duration(seconds: 3),
      );
    } catch (_) {}
  }
}
