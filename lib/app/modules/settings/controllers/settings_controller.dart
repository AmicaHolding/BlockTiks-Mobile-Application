import 'dart:convert';
import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';

class SettingsController extends GetxController {
  final AppPreferences _appPreferences = AppPreferences();
  Rx<SignupModel?> profileData = SignupModel().obs;

  RxBool notificationSwitchValue = false.obs;
  RxBool emailSwitchValue = false.obs;
  RxBool twoStepSwitchValue = false.obs;

  // FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  final List<String> languages = [
    "English",
  ];
  final List<String> currencies = [
    "USD",
  ];

  List<int> numbers = List<int>.generate(10, (index) => index);

  RxString selectedLanguage = "English".obs;
  RxString selectedCurrency = "USD".obs;

  void updateNotificationTaoggle(context) async {
    notificationSwitchValue.value = !notificationSwitchValue.value;
    updateNotificationToggleApi(context);
  }

  resetController() {
    // Get.find<ZipCodesTabController>().searchController.text = "";
    // Get.find<ZipCodesTabController>().isCloseVisible.value = false;
    // Get.find<ZipCodesTabController>().resetValues();
    //
    // Get.find<PropertiesTabController>().searchController.text = "";
    // Get.find<PropertiesTabController>().isCloseVisible.value = false;
    //
    // Get.find<AgentPropertiesTabController>().searchController.text = "";
    // Get.find<AgentPropertiesTabController>().isCloseVisible.value = false;
    // Get.find<AgentPropertiesTabController>().resetValues();
    //
    // if(Get.isRegistered<AdsTabController>()){
    //   Get.find<AdsTabController>().searchController.text = "";
    //   Get.find<AdsTabController>().isCloseVisible.value = false;
    //   Get.find<AdsTabController>().resetValues();
    // }
    //
    // if(Get.isRegistered<AddPropertyController>()){
    //   Get.find<AddPropertyController>().searchController.text = "";
    //   Get.find<AddPropertyController>().isCloseVisible.value = false;
    // }
    //
    // Get.find<AddZipCodesController>().searchController.text = "";
    // Get.find<AddZipCodesController>().isCloseVisible.value = false;
    // Get.find<AddZipCodesController>().resetItems();
    //
    // Get.find<FilterResultController>().searchController.text = "";
    // Get.find<FilterResultController>().isCloseVisible.value = false;
    //
    // Get.find<PropertySearchController>().searchController.text = "";
    // Get.find<PropertySearchController>().isCloseVisible.value = false;
  }

  var data;
  bool isButtonDisabled = false;

  @override
  void onInit() {
    super.onInit();
    getUserData();
  }

  getUserData() async {
    await _appPreferences.isPreferenceReady;
    var data = await _appPreferences.getUserData();
    if (data != null) {
      Map<String, dynamic> userMap = jsonDecode(data ?? "");
      print('Settings map $userMap');
      profileData.value = SignupModel.fromJson(userMap);
      notificationSwitchValue.value =
          profileData.value!.user!.pushNotification == true ? true : false;
      update();
    }
  }

  void logout(BuildContext context) async {
    Utils.check().then((value) async {
      if (value) {
        Navigator.pop(context);
        await ApiService.logout();
        await _appPreferences.clearPreference();
        ApiService.setToken(null);
        Constants.isUserCreator = false;
        Get.offAllNamed(Routes.GET_STARTED);

        // _firebaseMessaging.getToken().then((fcmToken) async {
        //   await BaseClient.post(
        //     ApiUtils.logoutApiUrl,
        //     onSuccess: (response) async {
        //       await FirebaseAuth.instance.signOut();
        //       await AppPreferences().clearPreference();
        //       await GoogleSignIn().signOut();
        //       await FacebookAuth.instance.logOut();
        //       BaseClient.removeToken();
        //       if (!Constants.isUserAgent) {
        //         // Get.find<PreferencesScreenController>().resetValues();
        //       }
        //       try {
        //         resetController();
        //       } catch (e) {
        //         //debugPrint(e);
        //       }
        //       return true;
        //     },
        //     onError: (error) async {
        //       // BaseClient.handleApiError(error);
        //       // await AppPreferences().clearPreference();
        //       return false;
        //     },
        //     data: {
        //       'deviceToken': fcmToken ,
        //       'deviceType': (Platform.isIOS) ? 'ios' : 'android',
        //     },
        //   );
        // });
      } else {
        CustomSnackBar.showCustomErrorToast(message: "msg_no_internet".tr);
      }
    });
  }

  Future<dynamic> updateNotificationToggleApi(BuildContext context) async {
    try {
      await ApiService.updateProfile({'pushNotification': notificationSwitchValue.value});
    } catch (_) {
      // Preference is cosmetic for MVP — keep the local toggle state.
    }
    profileData.value?.user?.pushNotification = notificationSwitchValue.value;
    profileData.refresh();
  }
}
