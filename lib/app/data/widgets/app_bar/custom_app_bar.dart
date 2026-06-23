import 'package:block_tix/app/data/core/app_export.dart';

// ignore: must_be_immutable
class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  CustomAppBar({
    super.key,
    required this.height,
    this.styleType,
    this.leadingWidth,
    this.leading,
    this.title,
    this.centerTitle,
    this.actions,
  });

  double height;

  Style? styleType;

  double? leadingWidth;

  Widget? leading;

  Widget? title;

  bool? centerTitle;

  List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      elevation: 0,
      toolbarHeight: height,
      automaticallyImplyLeading: false,
      backgroundColor: Colors.transparent,
      flexibleSpace: _getStyle(),
      leadingWidth: leadingWidth ?? 0,
      leading: leading,
      title: title,
      titleSpacing: 0,
      centerTitle: centerTitle ?? false,
      actions: actions,
    );
  }

  @override
  Size get preferredSize => Size(
        size.width,
        height,
      );

  _getStyle() {
    switch (styleType) {
      case Style.bgFillWhiteA700:
        return Container(
          height: getVerticalSize(
            44,
          ),
          width: double.maxFinite,
          decoration: BoxDecoration(
            color: ColorConstant.whiteA700,
          ),
        );
      case Style.bgOutlineGray10001:
        return Container(
          height: getVerticalSize(
            49,
          ),
          width: double.maxFinite,
          decoration: BoxDecoration(
            color: ColorConstant.whiteA700,
            border: Border(
              bottom: BorderSide(
                color: ColorConstant.gray10001,
                width: getHorizontalSize(
                  1,
                ),
              ),
            ),
          ),
        );
      default:
        return null;
    }
  }
}

enum Style {
  bgFillWhiteA700,
  bgOutlineGray10001,
}
