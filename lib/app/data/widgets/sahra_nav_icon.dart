import 'package:flutter_svg/flutter_svg.dart';

import '../core/app_export.dart';

/// Stroke icon set matching the Sahra mobile prototype tab bar:
/// 22x22 viewBox, stroke-width 1.75, round caps/joins, single-path glyphs.
class SahraNavIcon extends StatelessWidget {
  const SahraNavIcon(this.name, {super.key, required this.color, this.size = 22});

  final String name;
  final Color color;
  final double size;

  static const Map<String, String> paths = {
    'home': 'M4 10l8-6 8 6v10h-5v-6H9v6H4z',
    'search': 'M11 4a7 7 0 110 14 7 7 0 010-14zM20 20l-4-4',
    'tickets': 'M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z',
    'profile': 'M12 4a4 4 0 110 8 4 4 0 010-8zM4 21c1-4 4-6 8-6s7 2 8 6',
    'events': 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
    'scan': 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16',
    'guests': 'M9 4a4 4 0 110 8 4 4 0 010-8zM2 21c.8-4 3.5-6 7-6s6.2 2 7 6M17 4.5a3.5 3.5 0 010 7M22 21c-.5-3-2.2-5-4.5-5.7',
  };

  @override
  Widget build(BuildContext context) {
    final d = paths[name] ?? paths['home']!;
    final svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
        'viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.75" '
        'stroke-linecap="round" stroke-linejoin="round"><path d="$d"/></svg>';
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }
}
