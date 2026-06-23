import 'package:block_tix/app/data/core/app_export.dart';
import 'package:google_fonts/google_fonts.dart';

class AppStyle {
  static TextStyle white60InterNormal14 = GoogleFonts.getFont(
    "Inter",
    color: ColorConstant.white60,
    fontSize: getFontSize(
      14,
    ),
    fontWeight: FontWeight.w400,
  );
  static TextStyle whiteInterBold18 = GoogleFonts.getFont(
    "Inter",
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(
      18,
    ),
    fontWeight: FontWeight.w800,
  );
  static TextStyle whiteInterNormal14 = GoogleFonts.getFont(
    "Inter",
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(
      14,
    ),
  );
  static TextStyle pinkInterNormal16 = GoogleFonts.getFont(
    "Inter",
    color: ColorConstant.primaryPink,
    fontSize: getFontSize(
      16,
    ),
    fontWeight: FontWeight.w600,
  );

  static TextStyle txtAgeoMedium10BlackA500 = TextStyle(
    color: ColorConstant.black900,
    fontSize: getFontSize(
      10,
    ),
    fontFamily: 'Ageo',
    fontWeight: FontWeight.w500,
  );

  static TextStyle txtAgeoMedium14Gray700 = TextStyle(
    color: ColorConstant.gray700,
    fontSize: getFontSize(
      14,
    ),
    fontFamily: 'Ageo',
    fontWeight: FontWeight.w500,
  );

  static TextStyle txtAgeoSemiBold18WhiteA700 = TextStyle(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(
      18,
    ),
    fontFamily: 'Ageo',
    fontWeight: FontWeight.w600,
  );

}
