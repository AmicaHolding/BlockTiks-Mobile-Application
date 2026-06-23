// ignore_for_file: constant_identifier_names

import 'package:block_tix/app/data/core/app_export.dart';

class CustomFloatingEditText extends StatefulWidget {
  const CustomFloatingEditText(
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
      this.labelText,
      this.hintText,
      this.prefix,
      this.prefixConstraints,
      this.suffix,
      this.suffixConstraints,
      this.onTap,
      this.onChanged,
      this.limit,
      this.counterText = false,
      this.readOnly = false,
      this.maxLimit,
      this.isRequired = true,
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

  final int? maxLimit;

  final String? labelText;

  final String? hintText;

  final Widget? prefix;

  final BoxConstraints? prefixConstraints;

  final Widget? suffix;

  final int? limit;

  final BoxConstraints? suffixConstraints;

  final FormFieldValidator<String>? validator;

  final void Function()? onTap;

  final void Function(String)? onChanged;

  final bool? counterText;

  final bool readOnly;

  final bool isRequired;

  @override
  State<CustomFloatingEditText> createState() => _CustomFloatingEditTextState();
}

class _CustomFloatingEditTextState extends State<CustomFloatingEditText> {
  int lengthCounter = 0;
  int maxLimit = 0;
  String text = "";

  @override
  void initState() {
    if (widget.limit != null) {
      maxLimit = widget.limit!;
    }
    setState(() {});
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return widget.alignment != null
        ? Align(
            alignment: widget.alignment ?? Alignment.center,
            child: _buildFloatingEditTextWidget(),
          )
        : _buildFloatingEditTextWidget();
  }

  _buildFloatingEditTextWidget() {
    return Container(
      width: widget.width ?? double.maxFinite,
      margin: widget.margin,
      child: TextFormField(
        onTap: widget.onTap,
        controller: widget.controller,
        focusNode: widget.focusNode,
        autofocus: widget.autofocus!,
        style: _setFontStyle(),
        readOnly: widget.readOnly,
        maxLength: widget.maxLimit ?? Constants.MAX_INPUT_LIMIT,
        obscureText: widget.isObscureText!,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        textInputAction: widget.textInputAction,
        keyboardType: widget.textInputType,
        maxLines: widget.maxLines ?? 1,
        decoration: _buildDecoration(),
        maxLengthEnforcement: MaxLengthEnforcement.truncateAfterCompositionEnds,
        validator: widget.validator,
        onChanged: widget.onChanged,
        onFieldSubmitted: (value) {},
      ),
    );
  }

  _buildDecoration() {
    return InputDecoration(
      // labelText: widget.labelText ?? "",
      // labelStyle: _setFontStyle(),
      // labelStyle: _setHintFontStyle(),
      hintText: widget.hintText ?? "",
      // hintStyle: _setFontStyle(),
      counterText: "",
      label: (widget.controller?.text ?? "").isEmpty
          ? TextFieldLabel(
              widget.labelText ?? "",
              isRequired: widget.isRequired,
            )
          : null,
      // counterText: widget.counterText != null && widget.counterText == true ? "$lengthCounter/$maxLimit" : null,
      hintStyle: _setHintFontStyle(),
      border: _setBorderStyle(),
      enabledBorder: _setBorderStyle(),
      focusedBorder: _setBorderStyle(),
      disabledBorder: _setBorderStyle(),
      prefixIcon: widget.prefix,
      prefixIconConstraints: widget.prefixConstraints,
      suffixIcon: widget.suffix,
      suffixIconConstraints: widget.suffixConstraints,
      fillColor: _setFillColor(),
      filled: _setFilled(),
      alignLabelWithHint: true,
      isDense: true,
      contentPadding: _setPadding(),
      errorMaxLines: 2,
    );
  }

  _setHintFontStyle() {
    return TextStyle(
      color: ColorConstant.gray600,
      fontSize: getFontSize(
        14,
      ),
      fontFamily: 'Ageo',
      fontWeight: FontWeight.w400,
    );
  }

  _setFontStyle() {
    switch (widget.fontStyle) {
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
    switch (widget.shape) {
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
    switch (widget.variant) {
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
    switch (widget.variant) {
      case FloatingEditTextVariant.FilledGrayF8:
        return ColorConstant.grayF8Color;
      default:
        return ColorConstant.whiteA700;
    }
  }

  _setFilled() {
    switch (widget.variant) {
      case FloatingEditTextVariant.OutlineGray300_1:
        return false;
      case FloatingEditTextVariant.None:
        return false;
      default:
        return true;
    }
  }

  _setPadding() {
    switch (widget.padding) {
      case FloatingEditTextPadding.PaddingTB16_1:
        return getPadding(
          left: 8,
          top: 8,
          right: 8,
          bottom: 16,
          // all: 0
        );
      default:
        return getPadding(
          left: 14,
          top: 14,
          right: 14,
          bottom: 16,
        );
    }
  }
}

enum FloatingEditTextShape {
  RoundedBorder14,
  RoundedBorder10,
}

enum FloatingEditTextPadding {
  PaddingTB16,
  PaddingTB16_1,
  Padding0,
}

enum FloatingEditTextVariant {
  None,
  OutlineGray300,
  OutlineGray300_1,
  FilledGrayF8,
}

enum FloatingEditTextFontStyle {
  AgeoRegular14,
  AgeoMedium14,
  AgeoRegular16,
}

class TextFieldLabel extends StatelessWidget {
  const TextFieldLabel(this.text, {Key? key, this.isRequired = true})
      : super(key: key);

  final String text;
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    return RichText(
        text: TextSpan(
            style: TextStyle(
              fontWeight: FontWeight.w400,
              fontSize: getFontSize(14),
              color: ColorConstant.gray600,
              fontFamily: 'Ageo',
            ),
            children: [
          TextSpan(
            text: text,
          ),
          TextSpan(
            text: isRequired ? " *" : "",
            style: TextStyle(
              fontWeight: FontWeight.w400,
              fontSize: getFontSize(14),
              color: ColorConstant.yellow,
              fontFamily: 'Ageo',
            ),
          ),
        ]));
  }
}
