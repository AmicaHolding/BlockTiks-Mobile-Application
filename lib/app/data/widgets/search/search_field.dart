import 'package:block_tix/app/data/core/app_export.dart';
import 'package:google_fonts/google_fonts.dart';

class SearchField extends StatelessWidget {
  const SearchField({
    super.key,
    this.onChanged,
    this.onTap,
    this.isSuffixVisible = false,
    this.controller,
    this.hintText,
    this.readOnly = false,
    this.onSuffixTap,
    this.textInputType,
  });

  final void Function()? onTap;
  final void Function(String)? onChanged;
  final bool isSuffixVisible;
  final TextEditingController? controller;
  final String? hintText;
  final bool readOnly;
  final void Function()? onSuffixTap;
  final TextInputType? textInputType;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: getPadding(left: 16, right: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Stack(
        children: [
          TextField(
            controller: controller,
            onTap: onTap,
            style: GoogleFonts.getFont("Inter",
                fontSize: 16, color: ColorConstant.whiteA700),
            onChanged: onChanged,
            readOnly: readOnly,
            decoration: InputDecoration(
              contentPadding: getPadding(
                right: getSize(isSuffixVisible ? 30 : 15),
              ),
              icon: CustomImageView(
                svgPath: ImageConstant.search,
              ),
              hintText: hintText ?? "Search",
              hintStyle: const TextStyle(color: Colors.white70),
              border: InputBorder.none,
            ),
          ),
          Visibility(
            visible: isSuffixVisible,
            child: Positioned(
                right: 0,
                top: 12,
                child: CustomImageView(
                  onTap: ()=> onSuffixTap,
                  svgPath: ImageConstant.filter,
                  height: 24,
                )),
          ),
        ],
      ),
    );
  }
}
