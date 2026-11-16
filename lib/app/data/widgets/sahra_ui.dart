import 'package:block_tix/app/data/core/app_export.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';

TextStyle sahraText({
  Color? color,
  double size = 15,
  FontWeight weight = FontWeight.w400,
  double height = 1.4,
  double? letterSpacing,
}) {
  return GoogleFonts.bricolageGrotesque(
    color: color ?? ColorConstant.whiteA700,
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: letterSpacing,
  );
}

TextStyle sahraArabic({
  Color? color,
  double size = 15,
  FontWeight weight = FontWeight.w400,
  double height = 1.6,
}) {
  return GoogleFonts.ibmPlexSansArabic(
    color: color ?? ColorConstant.whiteA700,
    fontSize: size,
    fontWeight: weight,
    height: height,
  );
}

class SahraCard extends StatelessWidget {
  const SahraCard(
      {super.key,
      required this.child,
      this.padding,
      this.color,
      this.border,
      this.radius = 18});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final Color? border;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color ?? ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(radius),
        border: border == null ? null : Border.all(color: border!),
      ),
      child: child,
    );
  }
}

class SahraChip extends StatelessWidget {
  const SahraChip(
      {super.key, required this.label, this.selected = false, this.onTap});
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? ColorConstant.gold : ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label,
            style: sahraText(
                color: selected ? ColorConstant.night : ColorConstant.whiteA700,
                size: 13,
                weight: FontWeight.w500)),
      ),
    );
  }
}

class SahraPillButton extends StatelessWidget {
  const SahraPillButton(
      {super.key,
      required this.label,
      this.onTap,
      this.dark = false,
      this.enabled = true});
  final String label;
  final VoidCallback? onTap;
  final bool dark;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : .55,
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: dark ? ColorConstant.night : ColorConstant.gold,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: sahraText(
                  color: dark ? ColorConstant.gold : ColorConstant.night,
                  size: 15,
                  weight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class SahraSectionLabel extends StatelessWidget {
  const SahraSectionLabel(this.label, {super.key, this.trailing});
  final String label;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
      child: Row(children: [
        Expanded(
            child: Text(label,
                style: sahraText(size: 17, weight: FontWeight.w600))),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

class SahraSmallLabel extends StatelessWidget {
  const SahraSmallLabel(this.label, {super.key});
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
        child: Text(label.toUpperCase(),
            style: sahraText(
                color: ColorConstant.nightMuted,
                size: 11,
                weight: FontWeight.w600,
                letterSpacing: 1.1)),
      );
}

class SahraStatusPill extends StatelessWidget {
  const SahraStatusPill(this.label, {super.key, this.color, this.background});
  final String label;
  final Color? color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final fg = color ?? ColorConstant.gold;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
          color: background ?? ColorConstant.nightSurface,
          borderRadius: BorderRadius.circular(999)),
      child: Text(label,
          style: sahraText(color: fg, size: 11, weight: FontWeight.w600)),
    );
  }
}

class SahraDateBadge extends StatelessWidget {
  const SahraDateBadge(
      {super.key, required this.month, required this.day, this.dark = true});
  final String month;
  final String day;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
          color: dark ? ColorConstant.nightSurface : ColorConstant.dune,
          borderRadius: BorderRadius.circular(10)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(month.toUpperCase(),
            style: sahraText(
                color: ColorConstant.gold, size: 9, weight: FontWeight.w600)),
        Text(day,
            style: sahraText(
                color: dark ? ColorConstant.whiteA700 : ColorConstant.night,
                size: 15,
                weight: FontWeight.w700)),
      ]),
    );
  }
}

class SahraEventTile extends StatelessWidget {
  const SahraEventTile(
      {super.key, required this.event, this.onTap, this.compact = false});
  final Map<String, dynamic> event;
  final VoidCallback? onTap;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final title = event['title']?.toString() ?? 'Event';
    final category = event['category']?.toString() ?? 'Event';
    final date = event['startsAt']?.toString() ?? '';
    final location = event['location']?.toString() ?? '';
    final image = event['imageUrl']?.toString() ?? '';
    final tiers = event['tiers'];
    String price = '';
    if (tiers is List) {
      num? min;
      for (final t in tiers.whereType<Map>()) {
        final p = t['price'];
        final c = t['priceCents'];
        final v = p is num ? p : (c is num ? c / 100 : null);
        if (v != null && (min == null || v < min)) min = v;
      }
      if (min != null)
        price =
            '\$${min % 1 == 0 ? min.toStringAsFixed(0) : min.toStringAsFixed(2)}';
    }
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: compact ? 52 : 64,
              height: compact ? 52 : 64,
              child: image.isEmpty
                  ? Container(
                      decoration: const BoxDecoration(
                          gradient: LinearGradient(
                              colors: [Color(0xFF2F4560), Color(0xFF3A506C)])))
                  : CachedNetworkImage(
                      imageUrl: image,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) =>
                          Container(color: ColorConstant.nightElevated)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(size: 15, weight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('$category · $location',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 12)),
                if (date.isNotEmpty || price.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                      '${date.isEmpty ? '' : date}${price.isEmpty ? '' : ' · From $price'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: sahraText(
                          color: ColorConstant.gold,
                          size: 12,
                          weight: FontWeight.w600)),
                ],
              ])),
          Icon(Icons.chevron_right_rounded,
              color: ColorConstant.gold, size: 20),
        ]),
      ),
    );
  }
}

class SahraEmptyState extends StatelessWidget {
  const SahraEmptyState(
      {super.key,
      required this.title,
      this.message,
      this.actionLabel,
      this.onAction});
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
        child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(title,
                  textAlign: TextAlign.center,
                  style: sahraText(size: 18, weight: FontWeight.w700)),
              if (message != null) ...[
                const SizedBox(height: 8),
                Text(message!,
                    textAlign: TextAlign.center,
                    style: sahraText(color: ColorConstant.nightMuted, size: 13))
              ],
              if (actionLabel != null) ...[
                const SizedBox(height: 16),
                SahraPillButton(label: actionLabel!, onTap: onAction)
              ],
            ])));
  }
}

class SahraIconAction extends StatelessWidget {
  const SahraIconAction(
      {super.key, required this.icon, this.onTap, this.color});
  final IconData icon;
  final VoidCallback? onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
            color: ColorConstant.night.withValues(alpha: .8),
            shape: BoxShape.circle),
        child: Icon(icon, color: color ?? ColorConstant.whiteA700, size: 20),
      ),
    );
  }
}
