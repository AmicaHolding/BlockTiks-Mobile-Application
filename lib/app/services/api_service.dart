import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:block_tix/app/Shared_prefrences/app_prefrences.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/sign_up/models/signup_model.dart';

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
  ))
    ..interceptors.add(InterceptorsWrapper(onError: _onDioError));

  static String? _token;
  static String? _refreshToken;
  static Future<bool>? _refreshInFlight;

  static void setToken(String? token) {
    _token = token;
  }

  static void setRefreshToken(String? refreshToken) {
    _refreshToken = refreshToken;
  }

  /// Restore persisted tokens into memory after app boot. Falls back to a
  /// refresh-token exchange when no usable access token is stored.
  /// Returns true when an access token is available.
  static Future<bool> restoreSession() async {
    final prefs = AppPreferences();
    await prefs.isPreferenceReady;
    final token = await prefs.getAccessToken();
    final refreshToken = await prefs.getRefreshToken();
    setToken(token);
    setRefreshToken(refreshToken);
    if (token != null && token.isNotEmpty) return true;
    return refreshSession();
  }

  /// Exchange the stored refresh token for a new access/refresh pair
  /// (rotating refresh tokens). Concurrent callers share one exchange.
  static Future<bool> refreshSession() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  static Future<bool> _doRefresh() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final res = await _dio.post('/auth/refresh', data: {
        'refreshToken': refreshToken,
      });
      final data = Map<String, dynamic>.from(res.data as Map);
      final token = data['token']?.toString() ?? '';
      if (token.isEmpty) return false;
      final newRefreshToken = data['refreshToken']?.toString() ?? '';
      setToken(token);
      if (newRefreshToken.isNotEmpty) {
        _refreshToken = newRefreshToken;
      }
      await _persistTokens(
          token, newRefreshToken.isNotEmpty ? newRefreshToken : null);
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> _persistTokens(
      String accessToken, String? refreshToken) async {
    final prefs = AppPreferences();
    await prefs.isPreferenceReady;
    prefs.setAccessToken(token: accessToken);
    if (refreshToken != null) prefs.setRefreshToken(token: refreshToken);
  }

  /// Drop all local auth state (tokens + cached session flags).
  static Future<void> clearSession() async {
    setToken(null);
    setRefreshToken(null);
    final prefs = AppPreferences();
    await prefs.clearAuthTokens();
  }

  /// On 401, transparently refresh the session and retry the request once.
  static Future<void> _onDioError(
      DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final path = err.requestOptions.path;
    final isAuthCall = path.startsWith('/auth/login') ||
        path.startsWith('/auth/signup') ||
        path.startsWith('/auth/refresh') ||
        path.startsWith('/auth/logout') ||
        path.startsWith('/auth/forgot') ||
        path.startsWith('/auth/reset') ||
        path.startsWith('/auth/verify') ||
        path.startsWith('/auth/change-password');
    final alreadyRetried = err.requestOptions.extra['sahraRetried'] == true;
    if (status == 401 && !isAuthCall && !alreadyRetried) {
      if (await refreshSession()) {
        err.requestOptions.headers['Authorization'] = 'Bearer $_token';
        err.requestOptions.extra['sahraRetried'] = true;
        try {
          final response = await _dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } on DioException catch (retryError) {
          return handler.next(retryError);
        }
      }
      // Refresh failed — the session is dead; clear local tokens so the
      // next app boot routes to login instead of looping on 401s.
      await clearSession();
    }
    handler.next(err);
  }

  static Options get _authOptions => Options(
        headers: {
          if (_token != null && _token!.isNotEmpty)
            'Authorization': 'Bearer $_token',
        },
      );

  static String _errorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null)
      return data['message'].toString();
    if (e.response == null) {
      return 'Cannot reach the Sahra backend at $baseUrl. Start it with ./dev.sh --seed.';
    }
    return e.message ?? 'Request failed';
  }

  static Never _throw(DioException e) => throw Exception(_errorMessage(e));

  // ------------------------------------------------------------------ auth

  /// POST /auth/signup -> { token, refreshToken, user }
  static Future<Map<String, dynamic>> signup({
    required String firstName,
    String? lastName,
    required String email,
    String? phone,
    required String password,
    String role = 'user',
    String? referralCode,
  }) async {
    try {
      final res = await _dio.post('/auth/signup', data: {
        'firstName': firstName,
        'lastName': lastName ?? '',
        'email': email,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        'password': password,
        'role': role,
        if (referralCode != null && referralCode.trim().isNotEmpty)
          'referralCode': referralCode.trim(),
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

  /// POST /auth/refresh -> { token, refreshToken, user? }
  /// Exposed for callers that want to force a refresh outside the
  /// automatic 401 retry (e.g. before a long-running flow).
  static Future<bool> refresh() => refreshSession();

  /// POST /auth/verify-email/request — email a fresh verification link.
  static Future<void> verifyEmailRequest() async {
    try {
      await _dio.post('/auth/verify-email/request', options: _authOptions);
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
  static Future<Map<String, dynamic>> updateProfile(
      Map<String, dynamic> fields) async {
    try {
      final res =
          await _dio.patch('/auth/me', data: fields, options: _authOptions);
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
      await _dio.post('/auth/change-password',
          data: {
            'currentPassword': currentPassword,
            'newPassword': newPassword,
          },
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/logout — revokes the presented refresh token server-side,
  /// then clears local session state.
  static Future<void> logout() async {
    final refreshToken = _refreshToken;
    try {
      await _dio.post('/auth/logout',
          data: {
            if (refreshToken != null && refreshToken.isNotEmpty)
              'refreshToken': refreshToken,
          },
          options: _authOptions);
    } catch (_) {
      // Logout is best-effort — local session is cleared regardless.
    }
    await clearSession();
  }

  // ---------------------------------------------------------------- events

  /// GET /events?category=&q=&cursor=&limit= -> { events: [...], nextCursor }
  static Future<List<Map<String, dynamic>>> events(
      {String? category, String? q, String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/events', queryParameters: {
        if (category != null && category.isNotEmpty) 'category': category,
        if (q != null && q.isNotEmpty) 'q': q,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (limit != null) 'limit': limit,
      });
      final list = (res.data['events'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// Paginated variant of [events] that also returns the next cursor.
  static Future<Map<String, dynamic>> eventsPage(
      {String? category, String? q, String? cursor, int limit = 50}) async {
    try {
      final res = await _dio.get('/events', queryParameters: {
        if (category != null && category.isNotEmpty) 'category': category,
        if (q != null && q.isNotEmpty) 'q': q,
        'limit': limit,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      });
      final list = (res.data['events'] as List?) ?? [];
      return {
        'items': list.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
        'nextCursor': res.data['nextCursor'],
      };
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

  /// GET /events/:id/seats?sectionId= -> { sectionId, seats, currency }
  /// Seat-level availability for a venue section (exact-seat checkout).
  static Future<Map<String, dynamic>> sectionSeats(
      String eventId, String sectionId) async {
    try {
      final res = await _dio.get('/events/$eventId/seats', queryParameters: {
        'sectionId': sectionId,
      });
      return Map<String, dynamic>.from(res.data as Map);
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
  static Future<Map<String, dynamic>> createEvent(
      Map<String, dynamic> body) async {
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
  /// Three purchase kinds: GA tier (tierId), seated section (sectionId),
  /// or a resale listing (listingCode).
  static Future<Map<String, dynamic>> createOrderIntent({
    String? eventId,
    String? tierId,
    String? sectionId,
    String? listingCode,
    int quantity = 1,
    String? promoCode,
    List<String>? seats,
  }) async {
    try {
      final res = await _dio.post('/orders/intent',
          data: {
            if (eventId != null) 'eventId': eventId,
            if (tierId != null) 'tierId': tierId,
            if (sectionId != null) 'sectionId': sectionId,
            if (listingCode != null) 'listingCode': listingCode,
            'quantity': quantity,
            if (promoCode != null && promoCode.isNotEmpty)
              'promoCode': promoCode,
            if (seats != null && seats.isNotEmpty) 'seats': seats,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /orders -> { orders: [...], nextCursor } (?cursor=, ?limit=)
  static Future<List<Map<String, dynamic>>> myOrders(
      {String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/orders',
          queryParameters: {
            if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
            if (limit != null) 'limit': limit,
          },
          options: _authOptions);
      final list = (res.data['orders'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// Paginated variant of [myOrders] that also returns the next cursor.
  static Future<Map<String, dynamic>> myOrdersPage(
      {String? cursor, int limit = 50}) async {
    try {
      final res = await _dio.get('/orders',
          queryParameters: {
            'limit': limit,
            if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
          },
          options: _authOptions);
      final list = (res.data['orders'] as List?) ?? [];
      return {
        'items': list.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
        'nextCursor': res.data['nextCursor'],
      };
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

  /// GET /tickets -> { tickets: [...], nextCursor } (wallet)
  static Future<List<Map<String, dynamic>>> myTickets(
      {String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/tickets',
          queryParameters: {
            if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
            if (limit != null) 'limit': limit,
          },
          options: _authOptions);
      final list = (res.data['tickets'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /tickets/sellable -> my VALID tickets not currently listed.
  static Future<List<Map<String, dynamic>>> sellableTickets() async {
    try {
      final res = await _dio.get('/tickets/sellable', options: _authOptions);
      final list = (res.data['tickets'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------- door ops (creator)

  /// POST /events/:id/checkin { code } -> { result, ticket? }
  /// result: OK | ALREADY_USED | WRONG_EVENT | NOT_FOUND | FORBIDDEN
  static Future<Map<String, dynamic>> checkInTicket(
      String eventId, String code) async {
    try {
      final res = await _dio.post('/events/$eventId/checkin',
          data: {'code': code}, options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      // ALREADY_USED comes back as 409 — surface the body, not just the message.
      final data = e.response?.data;
      if (data is Map && data['result'] != null) {
        return Map<String, dynamic>.from(data);
      }
      _throw(e);
    }
  }

  /// GET /events/:id/guests -> { guests, checkedIn, total }
  static Future<Map<String, dynamic>> eventGuests(String eventId) async {
    try {
      final res =
          await _dio.get('/events/$eventId/guests', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------------- resale

  /// GET /listings?eventId=&cursor=&limit= -> { listings: [...], nextCursor }
  static Future<List<Map<String, dynamic>>> activeListings(
      {String? eventId, String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/listings', queryParameters: {
        if (eventId != null) 'eventId': eventId,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (limit != null) 'limit': limit,
      });
      final list = (res.data['listings'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /listings/mine -> { listings: [...], nextCursor }
  static Future<List<Map<String, dynamic>>> myListings(
      {String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/listings/mine',
          queryParameters: {
            if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
            if (limit != null) 'limit': limit,
          },
          options: _authOptions);
      final list = (res.data['listings'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /tickets/:code/list { priceCents }
  static Future<Map<String, dynamic>> createListing(
      String ticketCode, int priceCents) async {
    try {
      final res = await _dio.post('/tickets/$ticketCode/list',
          data: {'priceCents': priceCents}, options: _authOptions);
      return Map<String, dynamic>.from(res.data['listing'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /listings/:code — cancel my ACTIVE listing.
  static Future<void> cancelListing(String ticketCode) async {
    try {
      await _dio.delete('/listings/$ticketCode', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /tickets/:code/transfer { recipientEmail }
  static Future<Map<String, dynamic>> transferTicket(
      String ticketCode, String recipientEmail) async {
    try {
      final res = await _dio.post('/tickets/$ticketCode/transfer',
          data: {'recipientEmail': recipientEmail.trim().toLowerCase()},
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------- set your price

  /// GET /offers/mine -> { offers: [...], nextCursor }
  static Future<List<Map<String, dynamic>>> myOffers(
      {String? cursor, int? limit}) async {
    try {
      final res = await _dio.get('/offers/mine',
          queryParameters: {
            if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
            if (limit != null) 'limit': limit,
          },
          options: _authOptions);
      final list = (res.data['offers'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /offers
  static Future<Map<String, dynamic>> createOffer({
    required String eventId,
    required String tierName,
    String? sectionName,
    required int maxPriceCents,
    required int quantity,
  }) async {
    try {
      final res = await _dio.post('/offers',
          data: {
            'eventId': eventId,
            'tierName': tierName,
            if (sectionName != null && sectionName.isNotEmpty)
              'sectionName': sectionName,
            'maxPriceCents': maxPriceCents,
            'quantity': quantity,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(
          res.data['offer'] as Map? ?? res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /offers/:id — cancel my ACTIVE offer.
  static Future<void> cancelOffer(String offerId) async {
    try {
      await _dio.delete('/offers/$offerId', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------ venue (creator)

  /// PATCH /events/:id { venueLayout } — set seated-event sections.
  static Future<Map<String, dynamic>> setVenueLayout(
      String eventId, Map<String, dynamic> venueLayout) async {
    try {
      final res = await _dio.patch('/events/$eventId',
          data: {'venueLayout': venueLayout}, options: _authOptions);
      return Map<String, dynamic>.from(res.data['event'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------------ account

  /// POST /auth/forgot-password -> { ok, devCode?, expiresAt? }
  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final res =
          await _dio.post('/auth/forgot-password', data: {'email': email});
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/verify-reset-code -> { ok }
  static Future<Map<String, dynamic>> verifyResetCode({
    required String email,
    required String code,
  }) async {
    try {
      final res = await _dio.post('/auth/verify-reset-code', data: {
        'email': email,
        'code': code,
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/reset-password
  static Future<void> resetPassword({
    required String email,
    required String code,
    required String password,
  }) async {
    try {
      await _dio.post('/auth/reset-password', data: {
        'email': email,
        'code': code,
        'password': password,
      });
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /auth/me — soft-delete the current account.
  static Future<void> deleteAccount() async {
    try {
      await _dio.delete('/auth/me', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /notifications -> { notifications, unreadCount }
  static Future<Map<String, dynamic>> notifications() async {
    try {
      final res = await _dio.get('/notifications', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /notifications/read
  static Future<void> markNotificationsRead() async {
    try {
      await _dio.post('/notifications/read', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /transactions -> { transactions: [...] }
  static Future<List<Map<String, dynamic>>> transactions() async {
    try {
      final res = await _dio.get('/transactions', options: _authOptions);
      final list = (res.data['transactions'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /account/earnings -> { readyCents, pendingCents, lifetimeCents, currency }
  static Future<Map<String, dynamic>> earnings() async {
    try {
      final res = await _dio.get('/account/earnings', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/withdraw { amountCents, currency? }
  static Future<Map<String, dynamic>> withdraw(int amountCents,
      {String? currency}) async {
    try {
      final res = await _dio.post('/account/withdraw',
          data: {
            'amountCents': amountCents,
            if (currency != null && currency.isNotEmpty) 'currency': currency,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /account/payouts -> Connect account status.
  static Future<Map<String, dynamic>> payouts() async {
    try {
      final res = await _dio.get('/account/payouts', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/payouts/onboarding-link -> { url } (Stripe Express).
  static Future<Map<String, dynamic>> payoutsOnboardingLink() async {
    try {
      final res = await _dio.post('/account/payouts/onboarding-link',
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/payouts/refresh — re-check onboarding after Stripe return.
  static Future<Map<String, dynamic>> payoutsRefresh() async {
    try {
      final res =
          await _dio.post('/account/payouts/refresh', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/referrals/apply { code } — existing users enter a code.
  static Future<void> applyReferral(String code) async {
    try {
      await _dio.post('/account/referrals/apply',
          data: {'code': code.trim()}, options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /account/payment-methods -> { paymentMethods }
  static Future<List<Map<String, dynamic>>> paymentMethods() async {
    try {
      final res =
          await _dio.get('/account/payment-methods', options: _authOptions);
      final list = (res.data['paymentMethods'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/payment-methods/setup-intent -> { clientSecret }
  static Future<Map<String, dynamic>> paymentMethodSetupIntent() async {
    try {
      final res = await _dio.post('/account/payment-methods/setup-intent',
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/payment-methods/:id/detach
  static Future<void> detachPaymentMethod(String id) async {
    try {
      await _dio.post('/account/payment-methods/$id/detach',
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /account/promos -> { ready, used }
  static Future<Map<String, dynamic>> accountPromos() async {
    try {
      final res = await _dio.get('/account/promos', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /account/referrals -> { code, shareUrl, earnedCents, friends, note? }
  static Future<Map<String, dynamic>> referrals() async {
    try {
      final res = await _dio.get('/account/referrals', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /faqs -> { categories }
  static Future<List<Map<String, dynamic>>> faqs() async {
    try {
      final res = await _dio.get('/faqs');
      final list = (res.data['categories'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /events/:id/broadcasts — creator attendee message.
  static Future<Map<String, dynamic>> createBroadcast(
    String eventId, {
    String? audience,
    required String message,
    Map<String, dynamic>? audienceFilter,
    Map<String, bool>? channels,
  }) async {
    try {
      final res = await _dio.post('/events/$eventId/broadcasts',
          data: {
            'message': message,
            if (audience != null && audience.isNotEmpty) 'audience': audience,
            if (audienceFilter != null) 'audienceFilter': audienceFilter,
            if (channels != null) 'channels': channels,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /events/:id/broadcasts — creator's sent attendee messages.
  static Future<List<Map<String, dynamic>>> eventBroadcasts(
      String eventId) async {
    try {
      final res =
          await _dio.get('/events/$eventId/broadcasts', options: _authOptions);
      final list = (res.data['broadcasts'] as List?) ?? [];
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
    final refreshToken = authResponse['refreshToken']?.toString() ?? '';
    final role = user['role']?.toString() ?? 'fan';
    final isCreator = role == 'creator';

    setToken(token);
    if (refreshToken.isNotEmpty) {
      setRefreshToken(refreshToken);
    }
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
      'role': {
        'name': isCreator ? 'Creator' : 'User',
        'roleId': isCreator ? 2 : 1
      },
    };
    final model = SignupModel.fromJson({
      'user': legacyUser,
      'access_token': token,
    });
    model.accessToken = token;

    prefs.setAccessToken(token: token);
    if (refreshToken.isNotEmpty) {
      prefs.setRefreshToken(token: refreshToken);
    }
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
