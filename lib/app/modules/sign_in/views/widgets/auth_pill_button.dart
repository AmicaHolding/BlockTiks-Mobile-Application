import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

/// Sahra pill button for auth flows.
///
/// - [AuthPillButtonVariant.primary]: gold pill with night text.
/// - [AuthPillButtonVariant.secondary]: dune pill with ink text and a hairline
///   border, used for social/alternative actions.
enum AuthPillButtonVariant { primary, secondary }

class AuthPillButton extends StatelessWidget {
  const AuthPillButton({
    super.key,
    required this.text,
    this.onTap,
    this.controller,
    this.prefix,
    this.variant = AuthPillButtonVariant.primary,
    this.margin,
  });

  final String text;
  final VoidCallback? onTap;
  final RoundedLoadingButtonController? controller;
  final Widget? prefix;
  final AuthPillButtonVariant variant;
  final EdgeInsetsGeometry? margin;

  bool get _isPrimary => variant == AuthPillButtonVariant.primary;

  Color get _background => _isPrimary ? ColorConstant.gold : ColorConstant.dune;

  Color get _foreground => _isPrimary ? ColorConstant.night : ColorConstant.ink;

  @override
  Widget build(BuildContext context) {
    final height = getVerticalSize(48);

    final label = Text(
      text,
      textAlign: TextAlign.center,
      style: sahraText(
        color: _foreground,
        size: 16,
        weight: FontWeight.w700,
      ),
    );

    final child = prefix == null
        ? label
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              prefix!,
              const SizedBox(width: 10),
              Flexible(child: label),
            ],
          );

    final Widget button;
    if (controller != null) {
      button = RoundedLoadingButton(
        controller: controller!,
        onPressed: onTap,
        color: _background,
        valueColor: _foreground,
        height: height,
        width: double.maxFinite,
        borderRadius: height / 2,
        elevation: 0,
        animateOnTap: false,
        child: child,
      );
    } else {
      button = ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: _background,
          foregroundColor: _foreground,
          elevation: 0,
          minimumSize: Size(double.infinity, height),
          padding: EdgeInsets.symmetric(horizontal: getHorizontalSize(24)),
          shape: const StadiumBorder(),
          side: _isPrimary
              ? BorderSide.none
              : BorderSide(color: ColorConstant.lightBorder),
        ),
        child: child,
      );
    }

    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: SizedBox(width: double.infinity, child: button),
    );
  }
}
