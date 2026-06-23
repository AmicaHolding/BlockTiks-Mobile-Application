import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_floating_edit_text.dart';

class CustomEditText extends StatelessWidget {
  const CustomEditText(
      {super.key,
      this.shape,
      this.padding,
      this.variant,
      this.fontStyle,
      this.alignment,
      this.width,
      this.margin,
      this.controller,
      this.focusNode,
      this.autofocus = false,
      this.isObscureText = false,
      this.textInputAction = TextInputAction.next,
      this.textInputType = TextInputType.text,
      this.maxLines,
      this.hintText,
      this.prefix,
      this.prefixConstraints,
      this.suffix,
      this.suffixConstraints,
      this.onTap,
      this.onChanged,
      this.onDone,
      this.readOnly,
      this.validator});

  final FloatingEditTextShape? shape;

  final FloatingEditTextPadding? padding;

  final FloatingEditTextVariant? variant;

  final FloatingEditTextFontStyle? fontStyle;

  final Alignment? alignment;

  final double? width;

  final EdgeInsetsGeometry? margin;

  final TextEditingController? controller;

  final FocusNode? focusNode;

  final bool? autofocus;

  final bool? isObscureText;

  final TextInputAction? textInputAction;

  final TextInputType? textInputType;

  final int? maxLines;

  final String? hintText;

  final Widget? prefix;

  final BoxConstraints? prefixConstraints;

  final Widget? suffix;

  final BoxConstraints? suffixConstraints;

  final FormFieldValidator<String>? validator;

  final void Function()? onTap;

  final void Function(String)? onChanged;

  final void Function()? onDone;

  final bool? readOnly;

  @override
  Widget build(BuildContext context) {
    return alignment != null
        ? Align(
            alignment: alignment ?? Alignment.center,
            child: _buildFloatingEditTextWidget(),
          )
        : _buildFloatingEditTextWidget();
  }

  _buildFloatingEditTextWidget() {
    return Container(
      width: width ?? double.maxFinite,
      margin: margin,
      child: TextFormField(
        onTap: onTap,
        controller: controller,
        focusNode: focusNode,
        autofocus: autofocus!,
        readOnly: readOnly ?? false,
        style: _setFontStyle(),
        obscureText: isObscureText!,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        textInputAction: textInputAction,
        keyboardType: textInputType,
        maxLines: maxLines ?? 1,
        decoration: _buildDecoration(),
        validator: validator,
        onChanged: onChanged,
        onEditingComplete: onDone,
        onSaved: (_) {
          onDone!();
        },
        onFieldSubmitted: (value) {},
      ),
    );
  }

  _buildDecoration() {
    return InputDecoration(
      hintText: hintText ?? "",
      hintStyle: _setFontStyle(),
      border: _setBorderStyle(),
      enabledBorder: _setBorderStyle(),
      focusedBorder: _setBorderStyle(),
      disabledBorder: _setBorderStyle(),
      prefixIcon: prefix,
      prefixIconConstraints: prefixConstraints ??
          BoxConstraints(
              maxWidth: getSize(30),
              minWidth: getSize(30),
              maxHeight: getSize(16)),
      suffixIcon: suffix,
      suffixIconConstraints: suffixConstraints ??
          BoxConstraints(
            maxWidth: getSize(38),
            minWidth: getSize(38),
            maxHeight: getSize(32),
          ),
      fillColor: _setFillColor(),
      filled: _setFilled(),
      isDense: true,
      contentPadding: _setPadding(),
    );
  }

  _setFontStyle() {
    switch (fontStyle) {
      case FloatingEditTextFontStyle.AgeoMedium14:
        return TextStyle(
          color: ColorConstant.black900,
          fontSize: getFontSize(
            14,
          ),
          fontFamily: 'Ageo',
          fontWeight: FontWeight.w500,
        );
      case FloatingEditTextFontStyle.AgeoRegular16:
        return TextStyle(
          color: ColorConstant.gray700,
          fontSize: getFontSize(
            16,
          ),
          fontFamily: 'Ageo',
          fontWeight: FontWeight.w400,
        );
      default:
        return TextStyle(
          color: ColorConstant.black900,
          fontSize: getFontSize(
            14,
          ),
          fontFamily: 'Ageo',
          fontWeight: FontWeight.w400,
        );
    }
  }

  _setOutlineBorderRadius() {
    switch (shape) {
      case FloatingEditTextShape.RoundedBorder10:
        return BorderRadius.circular(
          getHorizontalSize(
            10.00,
          ),
        );
      default:
        return BorderRadius.circular(
          getHorizontalSize(
            14.00,
          ),
        );
    }
  }

  _setBorderStyle() {
    switch (variant) {
      case FloatingEditTextVariant.OutlineGray300_1:
        return OutlineInputBorder(
          borderRadius: _setOutlineBorderRadius(),
          borderSide: BorderSide(
            color: ColorConstant.gray300,
            width: 1,
          ),
        );
      case FloatingEditTextVariant.None:
        return InputBorder.none;
      case FloatingEditTextVariant.FilledGrayF8:
        return OutlineInputBorder(
          borderRadius: _setOutlineBorderRadius(),
          borderSide: BorderSide(
            color: ColorConstant.gray300,
            width: 0,
          ),
        );
      default:
        return OutlineInputBorder(
          borderRadius: _setOutlineBorderRadius(),
          borderSide: BorderSide(
            color: ColorConstant.gray300,
            width: 1,
          ),
        );
    }
  }

  _setFillColor() {
    switch (variant) {
      case FloatingEditTextVariant.FilledGrayF8:
        return ColorConstant.grayF8Color;
      default:
        return ColorConstant.whiteA700;
    }
  }

  _setFilled() {
    switch (variant) {
      case FloatingEditTextVariant.OutlineGray300_1:
        return false;
      case FloatingEditTextVariant.None:
        return false;
      default:
        return true;
    }
  }

  _setPadding() {
    switch (padding) {
      case FloatingEditTextPadding.PaddingTB16_1:
        return getPadding(
          left: 8,
          top: 8,
          right: 8,
          bottom: 16,
        );
      case FloatingEditTextPadding.Padding0:
        return getPadding(
          left: 6,
          right: 8,
          top: 10.11,
          bottom: 10.11,
        );
      default:
        return getPadding(
          left: 6,
          right: 8,
          top: 10.11,
          bottom: 10.11,
        );
    }
  }
}
