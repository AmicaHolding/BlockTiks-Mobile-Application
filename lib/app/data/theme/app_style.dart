import 'package:block_tix/app/data/core/app_export.dart';
import 'package:google_fonts/google_fonts.dart';

class AppStyle {
  // Sahra type system: Bricolage Grotesque for Latin UI/headlines,
  // IBM Plex Sans Arabic for Arabic, Aref Ruqaa for display moments only.
  static TextStyle displayBricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(34),
    fontWeight: FontWeight.w800,
    height: 1.15,
    letterSpacing: -0.5,
  );

  static TextStyle heading1Bricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(26),
    fontWeight: FontWeight.w800,
    height: 1.2,
    letterSpacing: -0.4,
  );

  static TextStyle heading2Bricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(20),
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: -0.3,
  );

  static TextStyle heading3Bricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(16),
    fontWeight: FontWeight.w600,
    height: 1.4,
  );

  static TextStyle bodyBricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(15),
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static TextStyle bodySmallBricolage = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.white60,
    fontSize: getFontSize(13),
    fontWeight: FontWeight.w400,
    height: 1.4,
  );

  static TextStyle arabicPlex = GoogleFonts.ibmPlexSansArabic(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(15),
    fontWeight: FontWeight.w400,
    height: 1.6,
  );

  static TextStyle arabicPlexSemiBold = GoogleFonts.ibmPlexSansArabic(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(15),
    fontWeight: FontWeight.w600,
    height: 1.6,
  );

  static TextStyle ruqaaDisplay = GoogleFonts.arefRuqaa(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(40),
    fontWeight: FontWeight.w700,
    height: 1.2,
  );

  // Legacy aliases kept so existing screens pick up the new type scale.
  static TextStyle displayManrope = displayBricolage;
  static TextStyle heading1Manrope = heading1Bricolage;
  static TextStyle heading2Manrope = heading2Bricolage;
  static TextStyle heading3Manrope = heading3Bricolage;
  static TextStyle bodyInter = bodyBricolage;
  static TextStyle bodySmallInter = bodySmallBricolage;

  static TextStyle white60InterNormal14 = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.white60,
    fontSize: getFontSize(
      14,
    ),
    fontWeight: FontWeight.w400,
  );
  static TextStyle whiteInterBold18 = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(
      18,
    ),
    fontWeight: FontWeight.w800,
  );
  static TextStyle whiteInterNormal14 = GoogleFonts.bricolageGrotesque(
    color: ColorConstant.whiteA700,
    fontSize: getFontSize(
      14,
    ),
  );
  static TextStyle pinkInterNormal16 = GoogleFonts.bricolageGrotesque(
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
