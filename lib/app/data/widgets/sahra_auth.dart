import 'package:flutter/material.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

class SahraAuthField extends StatelessWidget {
  const SahraAuthField({
    super.key,
    required this.controller,
    this.label,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.textInputAction,
    this.suffix,
    this.validator,
    this.onFieldSubmitted,
    this.autofillHints,
    this.light = false,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Widget? suffix;
  final FormFieldValidator<String>? validator;
  final ValueChanged<String>? onFieldSubmitted;
  final Iterable<String>? autofillHints;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final fill = light ? ColorConstant.lightCard : ColorConstant.nightSurface;
    final hintColor =
        light ? ColorConstant.lightMuted : ColorConstant.nightMuted;
    final border =
        light ? ColorConstant.lightBorder : ColorConstant.nightSurface;
    final text = light ? ColorConstant.ink : ColorConstant.whiteA700;
    final labelColor = light ? ColorConstant.ink : ColorConstant.nightMuted;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!,
              style: sahraText(
                  color: labelColor, size: 13, weight: FontWeight.w600)),
          const SizedBox(height: 8),
        ],
        TextFormField(
          controller: controller,
          obscureText: obscure,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          validator: validator,
          onFieldSubmitted: onFieldSubmitted,
          autofillHints: autofillHints,
          style: sahraText(color: text),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: sahraText(color: hintColor),
            suffixIcon: suffix,
            filled: true,
            fillColor: fill,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: ColorConstant.gold, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: ColorConstant.rumman),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: ColorConstant.rumman, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}

class SahraAuthTabs extends StatelessWidget {
  const SahraAuthTabs({super.key, required this.isSignUp});

  final bool isSignUp;

  @override
  Widget build(BuildContext context) {
    Widget tab(String label, bool selected, VoidCallback onTap) {
      return Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? ColorConstant.whiteA700 : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(label,
                style: sahraText(
                    color: selected
                        ? ColorConstant.night
                        : ColorConstant.nightMuted,
                    size: 14,
                    weight: FontWeight.w700)),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(children: [
        tab('Sign in', !isSignUp, () {
          if (isSignUp) Get.toNamed(Routes.SIGN_IN);
        }),
        tab('Create account', isSignUp, () {
          if (!isSignUp) Get.toNamed(Routes.SIGN_UP);
        }),
      ]),
    );
  }
}

class SahraAuthScaffold extends StatelessWidget {
  const SahraAuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onBack,
    this.bottom,
    this.light = false,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final VoidCallback? onBack;
  final Widget? bottom;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final bg = light ? ColorConstant.sand : ColorConstant.night;
    final fg = light ? ColorConstant.ink : ColorConstant.whiteA700;
    final muted = light ? ColorConstant.lightMuted : ColorConstant.nightMuted;
    return Scaffold(
      backgroundColor: bg,
      resizeToAvoidBottomInset: true,
      bottomNavigationBar: bottom == null
          ? null
          : SafeArea(
              child: Padding(padding: const EdgeInsets.all(20), child: bottom)),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 20, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: onBack ?? Get.back,
                    icon: Icon(Icons.arrow_back_ios_new_rounded,
                        color: fg, size: 20),
                  ),
                  const Spacer(),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: sahraText(
                            size: 30,
                            weight: FontWeight.w800,
                            color: fg,
                            height: 1.1)),
                    const SizedBox(height: 10),
                    Text(subtitle,
                        style: sahraText(color: muted, size: 14, height: 1.5)),
                    const SizedBox(height: 28),
                    child,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
