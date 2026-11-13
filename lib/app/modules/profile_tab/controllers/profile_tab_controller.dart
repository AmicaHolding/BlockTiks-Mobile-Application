import 'dart:convert';

import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';
import 'package:block_tix/app/services/api_service.dart';

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
    getMyProfile();
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
    try {
      final res = await ApiService.me();
      final user = Map<String, dynamic>.from(res['user'] as Map? ?? {});
      final role = user['role']?.toString() ?? 'fan';
      final isCreator = role == 'creator';
      final legacyUser = {
        '_id': user['id'],
        'firstName': user['firstName'],
        'lastName': user['lastName'],
        'email': user['email'],
        'phone': user['phone'],
        'profileImage': user['avatarUrl'],
        'fullName': '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim(),
        'pushNotification': true,
        'isVerified': true,
        'role': {'name': isCreator ? 'Creator' : 'User', 'roleId': isCreator ? 2 : 1},
      };
      String? token = await _appPreferences.getAccessToken();
      final model = SignupModel.fromJson({'user': legacyUser, 'access_token': token});
      model.accessToken = token;
      _appPreferences.setUserData(data: jsonEncode(model));
      profileData.value = model;
      profileData.refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}
