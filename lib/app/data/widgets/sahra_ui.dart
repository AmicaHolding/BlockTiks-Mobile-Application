import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
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
      this.margin,
      this.color,
      this.border,
      this.radius = 18});
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? border;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
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
    final date = formatEventDate(event['startsAt']?.toString(),
        tz: event['venueTimezone']?.toString());
    final location = event['location']?.toString() ?? '';
    final image = event['imageUrl']?.toString() ?? '';
    final tiers = event['tiers'];
    String price = '';
    if (tiers is List) {
      num? min;
      for (final t in tiers.whereType<Map>()) {
        final p = t['price'];
        final c = t['priceCents'];
        // v3 all-in display: shown price includes the 7% fee.
        final face = p is num ? p : (c is num ? c / 100 : null);
        final v = face == null ? null : face * 1.07;
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

/// Circular −/+ stepper row used by the Send, Sell and Set-your-price flows
/// (matches the prototype: outline minus, gold filled plus).
class SahraStepper extends StatelessWidget {
  const SahraStepper(
      {super.key,
      required this.value,
      required this.onDecrement,
      required this.onIncrement,
      this.onDark = true});
  final String value;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      _circle(Icons.remove_rounded, onDecrement, false),
      Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(value,
              style: sahraText(
                  color: onDark ? ColorConstant.whiteA700 : ColorConstant.ink,
                  size: 15,
                  weight: FontWeight.w700))),
      _circle(Icons.add_rounded, onIncrement, true),
    ]);
  }

  Widget _circle(IconData icon, VoidCallback onTap, bool filled) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: filled
              ? ColorConstant.gold
              : Colors.transparent,
          border: Border.all(
              color: filled
                  ? ColorConstant.gold
                  : (onDark ? ColorConstant.nightBorder : ColorConstant.dune),
              width: 1.5),
        ),
        child: Icon(icon,
            color: filled
                ? ColorConstant.night
                : (onDark ? ColorConstant.whiteA700 : ColorConstant.ink),
            size: 18),
      ),
    );
  }
}

/// Back chevron + 17px title header used on pushed screens.
class SahraBackHeader extends StatelessWidget {
  const SahraBackHeader({super.key, required this.title, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 12, 0),
      child: Row(children: [
        IconButton(
          onPressed: Get.back,
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: ColorConstant.whiteA700, size: 20),
        ),
        Expanded(
          child: Text(title,
              style: sahraText(size: 17, weight: FontWeight.w700)),
        ),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

/// Settings-style row: label on the left, muted "value ›" on the right.
class SahraRowLink extends StatelessWidget {
  const SahraRowLink(
      {super.key, required this.label, this.value, this.onTap, this.danger = false});
  final String label;
  final String? value;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: ColorConstant.nightBorder, width: 1),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: sahraText(
                    size: 15,
                    color: danger
                        ? const Color(0xFFE0626A)
                        : ColorConstant.whiteA700)),
            Row(mainAxisSize: MainAxisSize.min, children: [
              if (value != null && value!.isNotEmpty)
                Text(value!,
                    style:
                        sahraText(color: ColorConstant.nightMuted, size: 14)),
              Text(' ›',
                  style:
                      sahraText(color: ColorConstant.nightMuted, size: 14)),
            ]),
          ],
        ),
      ),
    );
  }
}

/// Prototype-style confirmation bottom sheet, `ask(title, body, ok, fn, danger)`.
/// Returns a Future that resolves true when the user confirms.
Future<bool> showSahraConfirm({
  required String title,
  required String body,
  String okLabel = 'Confirm',
  bool danger = false,
}) async {
  final result = await Get.bottomSheet<bool>(
    Container(
      decoration: BoxDecoration(
        color: ColorConstant.night,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 34),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: sahraText(size: 20, weight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(body,
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 14, height: 1.5)),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () => Get.back(result: true),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 15),
                decoration: BoxDecoration(
                  color: danger
                      ? ColorConstant.rumman
                      : ColorConstant.gold,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(okLabel,
                    textAlign: TextAlign.center,
                    style: sahraText(
                        color: danger
                            ? ColorConstant.whiteA700
                            : ColorConstant.night,
                        size: 16,
                        weight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => Get.back(result: false),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                alignment: Alignment.center,
                child: Text('Not now',
                    style: sahraText(
                        color: ColorConstant.nightMuted,
                        size: 15,
                        weight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    ),
    isScrollControlled: true,
  );
  return result == true;
}

/// Generic bottom-sheet scaffold used by pickers and detail sheets.
class SahraSheetBody extends StatelessWidget {
  const SahraSheetBody({super.key, required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: ColorConstant.night,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 34),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(title,
                  style: sahraText(size: 18, weight: FontWeight.w700)),
            ),
            Flexible(child: child),
          ],
        ),
      ),
    );
  }
}
