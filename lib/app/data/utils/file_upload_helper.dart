import 'package:block_tix/app/data/core/app_export.dart';
import 'package:image_picker/image_picker.dart';
import 'package:images_picker/images_picker.dart';

class FileManager {
  showModelSheetForImage(ImageSource imageSource, context,
      {int maxFileSize = Constants.MAX_IMAGE_SIZE * 1024 * 1024,
      List<String> allowedExtensions = const [],
      void Function(List<String?>)? getImages,
      CropAspectRatio? ratio}) async {
    if (imageSource == ImageSource.camera) {
      //camera
      List<String?> imageList =
          await _imgFromCamera(maxFileSize, allowedExtensions, ratio: ratio);
      if (getImages != null) {
        getImages(imageList);
      }
    } else {
      //gallery
      List<String?> imageList =
          await _imgFromGallery(maxFileSize, allowedExtensions, ratio: ratio);
      if (getImages != null) {
        getImages(imageList);
      }
    }
  }

  Future<List<String?>> _imgFromGallery(
      int maxFileSize, List<String>? allowedExtensions,
      {CropAspectRatio? ratio}) async {
    List<String?> files = [];
    List<Media>? res1 = await ImagesPicker.pick(
        pickType: PickType.image,
        maxSize: maxFileSize,
        cropOpt: CropOption(aspectRatio: ratio));
    res1?.forEach((element) {
      var extension = element.path.split('.');
      if (allowedExtensions != null && allowedExtensions.isNotEmpty) {
        if (allowedExtensions.contains(extension.last)) {
          files.add(element.path);
        } else {
          Get.snackbar('msg', 'only $allowedExtensions images are allowed');
        }
      } else {
        files.add(element.path);
      }
    });
    return files;
  }

  Future<List<String?>> _imgFromCamera(
      int maxFileSize, List<String>? allowedExtensions,
      {CropAspectRatio? ratio}) async {
    List<String?> files = [];
    List<Media>? res1 = await ImagesPicker.openCamera(
      pickType: PickType.image,
      maxSize: maxFileSize,
      cropOpt: CropOption(aspectRatio: ratio),
    );
    res1?.forEach((element) {
      var extension = element.path.split('.');
      if (allowedExtensions != null && allowedExtensions.isNotEmpty) {
        if (allowedExtensions.contains(extension.last)) {
          files.add(element.path);
        } else {
          Get.snackbar('msg', 'only $allowedExtensions images are allowed');
        }
      } else {
        files.add(element.path);
      }
    });
    return files;
  }
}
