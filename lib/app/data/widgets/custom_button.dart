// ignore_for_file: constant_identifier_names

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:google_fonts/google_fonts.dart';

class CustomButton extends StatelessWidget {
  CustomButton(
      {super.key,
      this.shape,
      this.padding,
      this.variant,
      this.fontStyle,
      this.alignment,
      this.margin,
      this.onTap,
      this.width,
      this.height,
      this.text,
      this.prefixWidget,
      this.suffixWidget,
      this.controller});

  final ButtonShape? shape;

  final ButtonPadding? padding;

  final ButtonVariant? variant;

  final ButtonFontStyle? fontStyle;

  final Alignment? alignment;

  final EdgeInsetsGeometry? margin;

  final VoidCallback? onTap;

  final double? width;

  final double? height;

  final String? text;

  final Widget? prefixWidget;

  final Widget? suffixWidget;

  final RoundedLoadingButtonController? controller;

  bool isTapCalled = false;

  @override
  Widget build(BuildContext context) {
    return alignment != null
        ? Align(
            alignment: alignment!,
            child: _buildButtonWidget(),
          )
        : _buildButtonWidget();
  }

  _buildButtonWidget() {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: controller != null
          ? RoundedLoadingButton(
              width: width ?? double.maxFinite,
              height: height ?? getVerticalSize(46),
              onPressed: () {
                if (controller!.currentState != ButtonState.loading) {
                  onTap!();
                }
              },
              animateOnTap: false,
              elevation: 1,
              borderRadius: _setBorderRadiusForLoadingButton(),
              color: _setColor(),
              controller: controller!,
              child: _buildButtonWithOrWithoutIcon(),
            )
          : TextButton(
              onPressed: () {
                if (!isTapCalled) {
                  isTapCalled = true;
                  onTap!();
                  Future.delayed(
                    const Duration(seconds: 1),
                    () => isTapCalled = false,
                  );
                }
              },
              style: _buildTextButtonStyle(),
              child: _buildButtonWithOrWithoutIcon(),
            ),
    );
  }

  _buildButtonWithOrWithoutIcon() {
    if (prefixWidget != null || suffixWidget != null) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          prefixWidget ?? const SizedBox(),
          Text(
            text ?? "",
            textAlign: TextAlign.center,
            style: _setFontStyle(),
          ),
          suffixWidget ?? const SizedBox(),
        ],
      );
    } else {
      return Text(
        text ?? "",
        textAlign: TextAlign.center,
        style: _setFontStyle(),
      );
    }
  }

  _buildTextButtonStyle() {
    return TextButton.styleFrom(
      fixedSize: Size(
        width ?? double.maxFinite,
        height ?? getVerticalSize(46),
      ),
      padding: _setPadding(),
      backgroundColor: _setColor(),
      side: _setTextButtonBorder(),
      shadowColor: _setTextButtonShadowColor(),
      shape: RoundedRectangleBorder(
        borderRadius: _setBorderRadius(),
      ),
    );
  }

  _setPadding() {
    switch (padding) {
      case ButtonPadding.PaddingAll5:
        return getPadding(
          all: 5,
        );
      case ButtonPadding.PaddingAll11:
        return getPadding(
          all: 11,
        );
      case ButtonPadding.PaddingT14:
        return getPadding(
          top: 14,
          right: 14,
          bottom: 14,
        );
      case ButtonPadding.PaddingT33:
        return getPadding(
          top: 33,
          right: 33,
          bottom: 33,
        );
      case ButtonPadding.PaddingT33_1:
        return getPadding(
          top: 33,
          right: 16,
          bottom: 33,
        );
      case ButtonPadding.PaddingT2:
        return getPadding(
          top: 2,
          right: 2,
          bottom: 2,
        );
      case ButtonPadding.PaddingT5:
        return getPadding(
          top: 5,
          right: 2,
          bottom: 5,
        );
      case ButtonPadding.PaddingT5_1:
        return getPadding(
          top: 5,
          right: 5,
          bottom: 5,
        );
      default:
        return getPadding(
          all: 10,
        );
    }
  }

  _setColor() {
    switch (variant) {
      case ButtonVariant.FillWhiteA700:
        return ColorConstant.whiteA700;
      case ButtonVariant.FillGray300:
        return ColorConstant.gray300.withOpacity(0.2);
      case ButtonVariant.FillBlueA400:
        return ColorConstant.blueA400;
      case ButtonVariant.OutlineBluegray100:
        return ColorConstant.whiteA700;
      case ButtonVariant.OutlineBlack900:
        return ColorConstant.black900;
      case ButtonVariant.OutlineGray300:
        return ColorConstant.whiteA700;
      case ButtonVariant.OutlineBlack9001e:
        return ColorConstant.whiteA700;
      case ButtonVariant.OutlineGray20001:
        return ColorConstant.whiteA700;
      case ButtonVariant.OutlineWhite:
        return null;
      case ButtonVariant.FillGray5001:
        return ColorConstant.gray5001;
      case ButtonVariant.FillOrangeA20033:
        return ColorConstant.orangeA200;
      case ButtonVariant.OutlineGray300_1:
      case ButtonVariant.OutlineOrangeA200:
      case ButtonVariant.OutlinePink:
        return null;
      default:
        return ColorConstant.primaryPink;
    }
  }

  _setTextButtonBorder() {
    switch (variant) {
      case ButtonVariant.OutlineBluegray100:
        return BorderSide(
          color: ColorConstant.blueGray100,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineWhite:
        return BorderSide(
          color: ColorConstant.whiteA700,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlinePink:
        return BorderSide(
          color: ColorConstant.primaryPink,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineBluegray100:
        return BorderSide(
          color: ColorConstant.blueGray100,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineBlack900:
        return BorderSide(
          color: ColorConstant.black900,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineGray300:
        return BorderSide(
          color: ColorConstant.gray300,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineGray20001:
        return BorderSide(
          color: ColorConstant.grayBackground,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineGray300_1:
        return BorderSide(
          color: ColorConstant.gray300,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.OutlineOrangeA200:
        return BorderSide(
          color: ColorConstant.orangeA200,
          width: getHorizontalSize(
            1.00,
          ),
        );
      case ButtonVariant.FillWhiteA700:
      case ButtonVariant.FillOrangeA200:
      case ButtonVariant.FillGray300:
      case ButtonVariant.FillBlueA400:
      case ButtonVariant.OutlineBlack9001e:
      case ButtonVariant.FillGray5001:
      case ButtonVariant.FillOrangeA20033:
        return null;
      default:
        return null;
    }
  }

  _setTextButtonShadowColor() {
    switch (variant) {
      case ButtonVariant.OutlineBlack9001e:
        return ColorConstant.black9001e;
      case ButtonVariant.FillWhiteA700:
      case ButtonVariant.FillOrangeA200:
      case ButtonVariant.FillGray300:
      case ButtonVariant.FillBlueA400:
      case ButtonVariant.OutlineBluegray100:
      case ButtonVariant.OutlineBlack900:
      case ButtonVariant.OutlineGray300:
      case ButtonVariant.OutlineGray20001:
      case ButtonVariant.OutlineGray300_1:
      case ButtonVariant.OutlineOrangeA200:
      case ButtonVariant.FillGray5001:
      case ButtonVariant.FillOrangeA20033:
        return null;
      default:
        return null;
    }
  }

  _setBorderRadius() {
    switch (shape) {
      case ButtonShape.RoundedBorder10:
        return BorderRadius.circular(
          getHorizontalSize(
            10.00,
          ),
        );
      case ButtonShape.RoundedBorder14:
        return BorderRadius.circular(
          getHorizontalSize(
            14.00,
          ),
        );
      case ButtonShape.CircleBorder18:
        return BorderRadius.circular(
          getHorizontalSize(
            18.00,
          ),
        );
      case ButtonShape.Square:
        return BorderRadius.circular(0);
      default:
        return BorderRadius.circular(
          getHorizontalSize(
            8.00,
          ),
        );
    }
  }

  _setBorderRadiusForLoadingButton() {
    switch (shape) {
      case ButtonShape.RoundedBorder10:
        return getHorizontalSize(
          10.00,
        );
      case ButtonShape.RoundedBorder14:
        return getHorizontalSize(
          14.00,
        );
      case ButtonShape.CircleBorder18:
        return getHorizontalSize(18.00);
      case ButtonShape.Square:
        return 0;
      default:
        return getHorizontalSize(
          8.00,
        );
    }
  }

  _setFontStyle() {
    switch (fontStyle) {
      default:
        return GoogleFonts.getFont(
          "Inter",
          color: ColorConstant.whiteA700,
          fontSize: getFontSize(
            16,
          ),
          fontWeight: FontWeight.w600,
        );
    }
  }
}

enum ButtonShape {
  Square,
  RoundedBorder5,
  RoundedBorder10,
  RoundedBorder14,
  CircleBorder18,
}

enum ButtonPadding {
  PaddingAll5,
  PaddingAll14,
  PaddingAll11,
  PaddingT14,
  PaddingT33,
  PaddingT33_1,
  PaddingT2,
  PaddingT5,
  PaddingT5_1,
}

enum ButtonVariant {
  FillWhiteA700,
  FillOrangeA200,
  FillGray300,
  FillBlueA400,
  OutlineBluegray100,
  OutlineWhite,
  OutlinePink,
  OutlineBlack900,
  OutlineGray300,
  OutlineBlack9001e,
  OutlineGray20001,
  OutlineGray300_1,
  OutlineOrangeA200,
  FillGray5001,
  FillOrangeA20033,
}

enum ButtonFontStyle {
  AgeoMedium14,
  AgeoSemiBold14,
  AgeoSemiBold14Black900,
  AgeoMedium18,
  AgeoRegular14,
  AgeoRegular14Gray60001,
  AgeoSemiBold18,
  AgeoRegular14Gray600,
  AgeoSemiBold18OrangeA200,
  AgeoSemiBold15,
  AgeoMedium14Gray70001,
  AgeoMedium14Gray60002,
  AgeoSemiBold16,
  AgeoMedium14Gray50001,
  AgeoMedium1213,
  AgeoMedium1227,
  AgeoMedium11,
  AgeoMedium12,
  AgeoSemiBold14WhiteA700,
  AgeoSemiBold14GreyA700,
}
