import 'dart:convert';
import 'dart:io';
import 'package:block_tix/app/data/utils/file_upload_helper.dart';
import 'package:block_tix/app/data/widgets/custom_round_button.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/countries.dart';
import 'package:block_tix/app/data/utils/permission_manager.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';

class EditProfileController extends GetxController {
  GlobalKey<FormState> formKey = GlobalKey();

  final RoundedLoadingButtonController btnController =
      RoundedLoadingButtonController();

  // String? countryName = "US";
  RxBool isCloseVisible = false.obs;

  // File? profileImage;

  Rx<File> image = File("").obs;

  // final ImagePicker picker = ImagePicker();

  final AppPreferences _appPreferences = AppPreferences();

  TextEditingController firstNameController = TextEditingController();
  TextEditingController lastNameController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  TextEditingController locationController = TextEditingController();

  // PhoneNumber initialPhone = PhoneNumber(isoCode: 'US');
  RxString initialPhone = "+1".obs;
  RxString countryCode = "US".obs;

  // Rx<PhoneNumber> initialPhone = PhoneNumber(isoCode: 'US').obs;

  double? lat = 0;
  double? lng = 0;

  SignupModel? userData;

  FocusNode? firstNameNode = FocusNode();
  FocusNode? lastNameNode = FocusNode();
  FocusNode? emailNode = FocusNode();
  FocusNode? phoneNode = FocusNode();
  FocusNode? locationNode = FocusNode();

  String amzFilePath = '';

  @override
  void onInit() {
    var args = Get.arguments;
    if (args != null) {
      if (Get.arguments[Constants.paramUser] != null) {
        userData = Get.arguments[Constants.paramUser];
      }
      countryCode.value = (userData?.user?.coverImage ?? "").toString().isEmpty
          ? "US"
          : userData?.user?.coverImage;
      getPhoneNumberNew(userData?.user?.phone ?? "");

      firstNameController =
          TextEditingController(text: userData?.user?.firstName ?? "");
      lastNameController =
          TextEditingController(text: userData?.user?.lastName ?? "");
      emailController =
          TextEditingController(text: userData?.user?.email ?? "");
      locationController =
          TextEditingController(text: userData?.user?.address ?? "");
      if (locationController.text.isNotEmpty) {
        isCloseVisible.value = true;
      }
    }
    super.onInit();
  }

  // getPhoneNumber(String phoneNumber) async {
  //   PhoneNumber number = await PhoneNumber.getRegionInfoFromPhoneNumber(phoneNumber);
  //   print('#### Dial Code: ${number.dialCode} -- ISO Code: ${number.dialCode} -- Number without code: ${number.phoneNumber} ');
  //   print(number);
  //   if(number.dialCode != null){
  //     initialPhone.value = number.dialCode.toString();
  //   }
  //   phoneController.text = number.phoneNumber.toString();
  // }

  getPhoneNumberNew(String phoneNumber) async {
    Map<String, String> foundedCountry = {};
    for (var country in Countries.allCountries) {
      String dialCode = country["dial_code"].toString();
      if (phoneNumber.contains(dialCode)) {
        if (countryCode.value == country["code"]) {
          foundedCountry = country;
        }
      }
    }

    if (foundedCountry.isNotEmpty) {
      initialPhone.value = phoneNumber.substring(
        0,
        foundedCountry["dial_code"]!.length,
      );
      phoneController.text = phoneNumber.substring(
        foundedCountry["dial_code"]!.length,
      );
      print({initialPhone.value, phoneController.text});
    }
    initialPhone.refresh();
  }

  Future<void> mediaSelectionBottomSheetAndroid(context) async {
    await PermissionManager.askForPermission(Permission.camera);
    await PermissionManager.askForPermission(Permission.storage);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
        topLeft: Radius.circular(14),
        topRight: Radius.circular(14),
      )),
      builder: (BuildContext bc) {
        return SafeArea(
          child: Container(
            padding: getPadding(left: 16, right: 16, top: 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: () {
                        Get.back();
                      },
                      child: MyText(
                        title: "lbl_cancel".tr,
                        clr: ColorConstant.blueGray400,
                        fontSize: getFontSize(14),
                        customWeight: FontWeight.w400,
                      ),
                    ),
                    SizedBox(
                      width: size.width,
                      child: Center(
                        child: MyText(
                          title: "lbl_select_option".tr,
                          clr: ColorConstant.blueGray900,
                          fontSize: getFontSize(16),
                          customWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "lbl_take_picture".tr,
                    onPressed: () {
                      _pickImage(ImageSource.camera, context);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "lbl_upload_picture".tr,
                    onPressed: () {
                      _pickImage(ImageSource.gallery, context);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _pickImage(ImageSource imageSource, context) async {
    Navigator.pop(context);
    await PermissionManager.askForPermission(Permission.camera);
    await PermissionManager.askForPermission(Permission.storage);
    await FileManager().showModelSheetForImage(imageSource, context,
        getImages: (value) async {
      debugPrint("=========>$value");
      image.value = File(value[0].toString());
    });
  }

}
