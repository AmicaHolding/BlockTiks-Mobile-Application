import 'dart:convert';

import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';

class ProfileTabController extends GetxController
    with GetSingleTickerProviderStateMixin {
  Rx<SignupModel?> profileData = SignupModel().obs;

  final AppPreferences _appPreferences = AppPreferences();
  late TabController tabController;

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: Constants.isUserCreator ? 2 : 1, vsync: this);
    getUserData();
    // getMyProfile();
  }

  getUserData() async {
    var data = await _appPreferences.getUserData();
    if (data == null || data.isEmpty) {
      profileData.refresh();
      return;
    }
    try {
      Map<String, dynamic> userMap = jsonDecode(data);
      profileData.value = SignupModel.fromJson(userMap);
    } catch (_) {
      // stored data is malformed, ignore
    }
    profileData.refresh();
  }

  Future<dynamic> getMyProfile() async {
    // Utils.check().then((value) async {
    //   if (value) {
    //     await BaseClient.get(
    //         ApiUtils.getProfileApiUrl,
    //         onSuccess: (response) async {
    //           print(response);
    //
    //           SignupModel model = SignupModel.fromJson(response.data['data']);
    //           await _appPreferences.isPreferenceReady;
    //           String? token = await _appPreferences.getAccessToken();
    //           model.accessToken = token;
    //           _appPreferences.setUserData(data: jsonEncode(model));
    //           profileData.value = model;
    //           profileData.refresh();
    //           return true;
    //         },
    //         onError: (error) {
    //           BaseClient.handleApiError(error);
    //           // update();
    //           return false;
    //         },
    //     );
    //   } else {
    //     Utils.showNoInternet();
    //   }
    // });
  }
}
