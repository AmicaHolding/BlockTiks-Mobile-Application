import 'package:block_tix/app/data/core/app_export.dart';

class CustomDivider extends StatelessWidget {
  const CustomDivider({super.key, this.margin, this.color, this.height});

  final EdgeInsetsGeometry? margin;
  final Color? color;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? getMargin(top: getSize(10), bottom: getSize(10)),
      height: height ?? 1,
      color: color ?? ColorConstant.dividerColor,
    );
  }
}
