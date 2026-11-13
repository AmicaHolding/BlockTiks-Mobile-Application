import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';
import 'package:block_tix/app/services/base_client.dart';

/// Client for the BlockTiks MVP backend (Fastify + DynamoDB + Stripe).
///
/// Local dev URLs:
///   - iOS simulator / macOS: http://localhost:4000
///   - Android emulator:      http://10.0.2.2:4000
/// Override with --dart-define=API_BASE_URL=... when needed.
class ApiService {
  static String get baseUrl {
    const fromDefine = String.fromEnvironment('API_BASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    if (Platform.isAndroid) return 'http://10.0.2.2:4000';
    return 'http://localhost:4000';
  }

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  static String? _token;

  static void setToken(String? token) {
    _token = token;
    if (token != null && token.isNotEmpty) {
      BaseClient.addToken(token);
    } else {
      BaseClient.removeToken();
    }
  }

  static Options get _authOptions => Options(
        headers: {
          if (_token != null && _token!.isNotEmpty)
            'Authorization': 'Bearer $_token',
        },
      );

  static String _errorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    return e.message ?? 'Request failed';
  }

  static Never _throw(DioException e) => throw Exception(_errorMessage(e));

  // ------------------------------------------------------------------ auth

  /// POST /auth/signup -> { token, refreshToken, user }
  static Future<Map<String, dynamic>> signup({
    required String firstName,
    String? lastName,
    required String email,
    required String password,
    String role = 'user',
  }) async {
    try {
      final res = await _dio.post('/auth/signup', data: {
        'firstName': firstName,
        'lastName': lastName ?? '',
        'email': email,
        'password': password,
        'role': role,
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/login -> { token, refreshToken, user }
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /auth/me -> { user }
  static Future<Map<String, dynamic>> me() async {
    try {
      final res = await _dio.get('/auth/me', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// PATCH /auth/me — update profile fields.
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> fields) async {
    try {
      final res = await _dio.patch('/auth/me', data: fields, options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/change-password
  static Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post('/auth/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      }, options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/logout
  static Future<void> logout() async {
    try {
      await _dio.post('/auth/logout', options: _authOptions);
    } catch (_) {
      // Logout is best-effort — local session is cleared regardless.
    }
  }

  // ---------------------------------------------------------------- events

  /// GET /events?category=&q= -> { events: [...] }
  static Future<List<Map<String, dynamic>>> events({String? category, String? q}) async {
    try {
      final res = await _dio.get('/events', queryParameters: {
        if (category != null && category.isNotEmpty) 'category': category,
        if (q != null && q.isNotEmpty) 'q': q,
      });
      final list = (res.data['events'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /events/:id -> { event } (includes tiers)
  static Future<Map<String, dynamic>> event(String id) async {
    try {
      final res = await _dio.get('/events/$id');
      return Map<String, dynamic>.from(res.data['event'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /events/mine -> { events: [...] } (creator's own events, any status)
  static Future<List<Map<String, dynamic>>> myEvents() async {
    try {
      final res = await _dio.get('/events/mine', options: _authOptions);
      final list = (res.data['events'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /events — create a draft event with tiers.
  static Future<Map<String, dynamic>> createEvent(Map<String, dynamic> body) async {
    try {
      final res = await _dio.post('/events', data: body, options: _authOptions);
      return Map<String, dynamic>.from(res.data['event'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /events/:id/publish
  static Future<Map<String, dynamic>> publishEvent(String id) async {
    try {
      final res = await _dio.post('/events/$id/publish', options: _authOptions);
      return Map<String, dynamic>.from(res.data['event'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // --------------------------------------------------------------- orders

  /// POST /orders/intent -> { orderId, clientSecret, amountCents, ... }
  static Future<Map<String, dynamic>> createOrderIntent({
    required String eventId,
    required String tierId,
    required int quantity,
    String? promoCode,
  }) async {
    try {
      final res = await _dio.post('/orders/intent', data: {
        'eventId': eventId,
        'tierId': tierId,
        'quantity': quantity,
        if (promoCode != null && promoCode.isNotEmpty) 'promoCode': promoCode,
      }, options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /orders -> { orders: [...] }
  static Future<List<Map<String, dynamic>>> myOrders() async {
    try {
      final res = await _dio.get('/orders', options: _authOptions);
      final list = (res.data['orders'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /orders/:id -> { order } (includes tickets once PAID)
  static Future<Map<String, dynamic>> order(String id) async {
    try {
      final res = await _dio.get('/orders/$id', options: _authOptions);
      return Map<String, dynamic>.from(res.data['order'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /tickets -> { tickets: [...] } (wallet)
  static Future<List<Map<String, dynamic>>> myTickets() async {
    try {
      final res = await _dio.get('/tickets', options: _authOptions);
      final list = (res.data['tickets'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------------ session

  /// Persist a { token, user } auth response in the shape the existing
  /// profile/settings screens expect (SignupModel JSON), and attach the
  /// bearer token to API clients.
  static Future<void> saveSession(Map<String, dynamic> authResponse) async {
    final prefs = AppPreferences();
    await prefs.isPreferenceReady;
    final user = Map<String, dynamic>.from(authResponse['user'] as Map? ?? {});
    final token = authResponse['token']?.toString() ?? '';
    final role = user['role']?.toString() ?? 'fan';
    final isCreator = role == 'creator';

    setToken(token);
    Constants.isUserCreator = isCreator;

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
    final model = SignupModel.fromJson({
      'user': legacyUser,
      'access_token': token,
    });
    model.accessToken = token;

    prefs.setAccessToken(token: token);
    prefs.setUserData(data: jsonEncode(model));
    prefs.setIsLoggedIn(loggedIn: true);
    prefs.setRole(role: role);
    prefs.setUserEmail(email: user['email']?.toString() ?? '');
    prefs.setUserName(userName: legacyUser['fullName'] as String);
  }

  /// Route to the right dashboard after login/signup.
  static void goToDashboard() {
    if (Constants.isUserCreator) {
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } else {
      Get.offAllNamed(Routes.USER_DASHBOARD);
    }
  }
}
