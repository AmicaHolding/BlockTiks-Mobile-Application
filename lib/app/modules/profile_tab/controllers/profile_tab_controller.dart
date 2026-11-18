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

  final RxInt upcomingCount = 0.obs;
  final RxInt sahrasCount = 0.obs;
  final RxInt followingCount = 0.obs;

  /// Real earnings summary for the money card (rule, ready vs pending).
  final RxInt earningsReadyCents = 0.obs;
  final RxInt earningsPendingCents = 0.obs;
  final RxString earningsCurrency = 'usd'.obs;

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: Constants.isUserCreator ? 2 : 1, vsync: this);
    getUserData();
    getMyProfile();
    _loadStats();
  }

  /// Stats row + earnings card data, all best-effort.
  Future<void> _loadStats() async {
    try {
      final tickets = await ApiService.myTickets(limit: 100);
      final now = DateTime.now();
      upcomingCount.value = tickets.where((t) {
        if (t['status']?.toString() != 'VALID') return false;
        final starts = DateTime.tryParse(
            t['eventStartsAt']?.toString() ?? '');
        return starts == null || starts.isAfter(now);
      }).length;
      // "Sahras" = events already attended (used tickets).
      sahrasCount.value = tickets
          .where((t) => t['status']?.toString() == 'USED')
          .length;
    } catch (_) {}
    // TODO(api-gap: "following" count needs a user-stats/follows endpoint)
    try {
      final earn = await ApiService.earnings();
      earningsReadyCents.value =
          ((earn['readyCents'] ?? earn['ready'] ?? 0) as num? ?? 0).toInt();
      earningsPendingCents.value =
          ((earn['pendingCents'] ?? earn['pending'] ?? 0) as num? ?? 0).toInt();
      final cur = earn['currency']?.toString();
      if (cur != null && cur.isNotEmpty) {
        earningsCurrency.value = cur.toLowerCase();
      }
    } catch (_) {}
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
