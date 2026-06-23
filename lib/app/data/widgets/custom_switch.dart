import 'package:flutter/material.dart';
import 'package:flutter_switch/flutter_switch.dart';
import 'package:block_tix/app/data/utils/color_constant.dart';
import 'package:block_tix/app/data/utils/size_utils.dart';

class CustomSwitch extends StatelessWidget {
  const CustomSwitch({
    super.key,
    this.alignment,
    this.margin,
    this.value,
    this.onChanged,
  });

  final Alignment? alignment;

  final EdgeInsetsGeometry? margin;

  final bool? value;

  final Function(bool)? onChanged;

  @override
  Widget build(BuildContext context) {
    return alignment != null
        ? Align(
            alignment: alignment ?? Alignment.center,
            child: _buildSwitchWidget(),
          )
        : _buildSwitchWidget();
  }

  _buildSwitchWidget() {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: FlutterSwitch(
        value: value ?? false,
        height: getHorizontalSize(30),
        width: getHorizontalSize(50),
        toggleSize: 22,
        activeColor: ColorConstant.primaryPink,
        activeToggleColor: ColorConstant.whiteA700,
        inactiveColor: ColorConstant.gray600,
        inactiveToggleColor: ColorConstant.whiteA700,
        onToggle: (value) {
          onChanged!(value);
        },
      ),
    );
  }
}
