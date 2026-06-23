import 'package:block_tix/app/data/core/app_export.dart';

// ignore: must_be_immutable
class AppBarButton extends StatelessWidget {
  AppBarButton({
    super.key,
    this.height,
    this.width,
    this.imagePath,
    this.svgPath,
    this.semanticsLabel,
    this.margin,
    this.isTransparent = true,
    this.onTap,
    this.color,
  });

  double? height;

  double? width;

  String? imagePath;

  String? svgPath;

  String? semanticsLabel;

  EdgeInsetsGeometry? margin;

  Function? onTap;

  bool isTransparent;

  Color? color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        onTap!();
      },
      child: Container(
        color: isTransparent ? Colors.transparent : ColorConstant.whiteA700,
        padding: margin ?? EdgeInsets.zero,
        child: Semantics(
          label: semanticsLabel,
          child: CustomImageView(
            svgPath: svgPath,
            imagePath: imagePath,
            height: height ?? getVerticalSize(18),
            width: width ?? getHorizontalSize(18),
            color: color,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
