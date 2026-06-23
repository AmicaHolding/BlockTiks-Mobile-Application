import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter/cupertino.dart';

class MediaSelectionTileIOS extends StatelessWidget {
  const MediaSelectionTileIOS(
      {required this.title, required this.onPressed, Key? key})
      : super(key: key);

  final String title;
  final Function() onPressed;

  @override
  Widget build(BuildContext context) {
    return CupertinoActionSheetAction(
      onPressed: onPressed,
      child: Row(
        children: [
          const SizedBox(width: 5.0),
          const SizedBox(width: 15.0),
          Text(title),
        ],
      ),
    );
  }
}

class MediaSelectionTileAndroid extends StatelessWidget {
  const MediaSelectionTileAndroid(
      {required this.title,
      required this.onPressed,
      this.textColor = Colors.black,
      Key? key})
      : super(key: key);

  final String title;
  final Color textColor;
  final Function() onPressed;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: size.width,
        decoration: BoxDecoration(
            color: ColorConstant.whiteA700,
            borderRadius: BorderRadius.circular(5)),
        padding: getPadding(top: 10, bottom: 10),
        alignment: Alignment.center,
        child: MyText(
          title: title,
          clr: textColor,
          fontSize: getFontSize(14),
          customWeight: FontWeight.w400,
        ),
      ),
    );
  }
}
