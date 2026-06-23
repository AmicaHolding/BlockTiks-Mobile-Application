import 'package:block_tix/app/data/core/app_export.dart';

Widget squareImage(
  double width,
  double height,
  String imageUrl,
  double radius, {
  bool isVideo = false,
  bool fromMediaPreview = false,
  bool isSelected = false,
  String placeholder = ImageConstant.placeholderPost,
}) {
  return CustomImageView(
    border: Border.all(
        width: 2, color: isSelected ? Colors.white : Colors.transparent),
    radius: BorderRadius.circular(8.0),
    width: width,
    height: height,
    fit: BoxFit.cover,
    url: imageUrl,
  );
}
