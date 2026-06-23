import 'package:block_tix/app/data/core/app_export.dart';

// ignore: must_be_immutable
class AppbarTitle extends StatelessWidget {
  AppbarTitle({
    super.key,
    required this.text,
    this.margin,
    this.onTap,
  });

  String text;

  EdgeInsetsGeometry? margin;

  Function? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        onTap?.call();
      },
      child: Padding(
          padding: margin ?? EdgeInsets.zero,
          child: MyText(
              title: text,
              clr: ColorConstant.whiteA700,
              fontSize: getFontSize(20),
              // center: true,
              customWeight: FontWeight.w600)
          //
          // Text(
          //   text,
          //   overflow: TextOverflow.ellipsis,
          //   textAlign: TextAlign.center,
          //   style: AppStyle.txtAgeoSemiBold18Bluegray900.copyWith(
          //     color: ColorConstant.blackColor,
          //   ),
          // ),
          ),
    );
  }
}
