import 'package:flutter/material.dart';

class ColorConstant {
  // Sahra palette (brand/DESIGN.md): Night canvas, Gold signature, Sand/Dune
  // light surfaces, Ink text, Rumman accent. Dark mode is the default for
  // discovery; light mode (Sand) for checkout, account and receipts.
  static Color night = fromHex('#16263B');
  static Color gold = fromHex('#F2D9A0');
  static Color sand = fromHex('#F7F1E6');
  static Color dune = fromHex('#ECE4D6');
  static Color ink = fromHex('#241C14');
  static Color rumman = fromHex('#B8323A');
  static Color nightSurface = fromHex('#22344D');
  static Color nightElevated = fromHex('#2A3B52');
  static Color nightBorder = fromHex('#3A506C');
  static Color nightMuted = fromHex('#9FB0C6');
  static Color nightTabBar = fromHex('#0F1C2D');
  static Color nightDeep = fromHex('#0B1420');
  static Color lightCard = fromHex('#FFF9EF');

  // Semantic aliases for the Sahra palette.
  static Color canvas = night;
  static Color elevated = nightElevated;
  static Color hairline = fromHex('#803A506C'); // night border at 50%
  static Color primaryAccent = gold;
  static Color successGreen = fromHex('#34C77B');
  static Color errorRed = rumman;
  static Color warningOrange = fromHex('#FF9F43');

  // Compatibility aliases still referenced by remaining screens. New code
  // should use the Sahra palette names above.
  static Color gray5001 = fromHex('#fafafa');
  static Color primaryPink = gold;
  static Color bg = night;
  static Color white60 = nightMuted;
  static Color whiteA700 = sand;
  static Color blueA400 = fromHex('#1877f2');
  static Color grayBackground = fromHex('#f0f0f0');
  static Color gray20002 = dune;
  static Color gray600 = fromHex('#6F84A0');
  static Color orangeA200 = fromHex('#fea846');
  static Color blueGray100 = fromHex('#d9d9d9');
  static Color gray10001 = sand;
  static Color orangeA20033 = fromHex('#33fea846');
  static Color gray50 = sand;
  static Color black9001e = fromHex('#1e000000');
  static Color black900 = ink;
  static Color gray700 = ink;
  static Color gray300 = fromHex('#D8CDB9');
  static Color orangeA20019 = fromHex('#19fea846');
  static Color textFieldUnderlineColor = const Color(0xffD8CDB9);
  static Color textFieldHintColor = const Color(0xff8A8378);
  static Color yellow = fromHex('#FEA846');
  static Color answerColor = fromHex('#6F84A0');
  static Color grayF8Color = lightCard;
  static Color redColor = fromHex('#FF5A4E');
  static Color dividerColor = fromHex('#646464');

  static Color fromHex(String hexString) {
    final buffer = StringBuffer();
    if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
    buffer.write(hexString.replaceFirst('#', ''));
    return Color(int.parse(buffer.toString(), radix: 16));
  }

  // Light-mode (Sand) surfaces for checkout, account and receipts.
  static Color get lightBackground => sand;
  static Color get lightSurface => dune;
  static Color get lightCardColor => lightCard;
  static Color get lightBorder => fromHex('#D8CDB9');
  static Color get lightText => ink;
  static Color get lightMuted => fromHex('#6F84A0');
}
