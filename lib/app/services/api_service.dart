import 'dart:convert';
import 'dart:io';
import 'dart:math';

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

  /// True when a session token is available (A8 sign-in gate check).
  static Future<bool> isLoggedIn() async {
    if (_token != null && _token!.isNotEmpty) return true;
    final prefs = AppPreferences();
    await prefs.isPreferenceReady;
    final token = await prefs.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// A8/A2 gated-action helper: routes to sign-in when signed out and
  /// returns false; returns true when the action may continue.
  static Future<bool> requireAuth({String comingFrom = ''}) async {
    if (await isLoggedIn()) return true;
    Get.toNamed(Routes.SIGN_IN,
        arguments: {'comingFrom': comingFrom});
    return false;
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
    prefs.setIsLoggedIn(loggedIn: false);
  }

  /// On 401, transparently refresh the session and retry the request once.
  static Future<void> _onDioError(
      DioException err, ErrorInterceptorHandler handler) async {
    final status = err.response?.statusCode;
    final path = err.requestOptions.path;
    final isAuthCall = path.startsWith('/auth/login') ||
        path.startsWith('/auth/signup') ||
        path.startsWith('/auth/otp') ||
        path.startsWith('/auth/apple') ||
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
      // Refresh failed, the session is dead; clear local tokens so the
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

  /// Auth options plus an `Idempotency-Key` header. Required by the API
  /// contract on every money-moving or inventory-changing POST
  /// (orders, listings, transfers, offers, check-ins, broadcasts, payouts).
  /// Each logical call gets a fresh key; callers that retry a failed request
  /// should reuse the key so the backend can dedupe.
  static String newIdempotencyKey() {
    final rand = Random.secure();
    final t = DateTime.now().toUtc().microsecondsSinceEpoch.toRadixString(36);
    final r = List.generate(16, (_) => rand.nextInt(36).toRadixString(36))
        .join();
    return 'sahra-$t-$r';
  }

  static Options _idemOptions([String? key]) => Options(
        headers: {
          if (_token != null && _token!.isNotEmpty)
            'Authorization': 'Bearer $_token',
          'Idempotency-Key': key ?? newIdempotencyKey(),
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

  // ------------------------------------------------------------------- OTP

  /// POST /auth/otp/start {contact} -> { challenge_id, channel,
  /// resend_after, expires_at, dev_code? } (v2 contract, no passwords).
  static Future<Map<String, dynamic>> otpStart(String contact) async {
    try {
      final res = await _dio.post('/auth/otp/start', data: {'contact': contact});
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/otp/verify {challenge_id,code,device} -> { token,
  /// refresh_token, session_id, user, is_new, memberships[], landing }.
  static Future<Map<String, dynamic>> otpVerify(
      {required String challengeId, required String code}) async {
    try {
      final res = await _dio.post('/auth/otp/verify', data: {
        'challenge_id': challengeId,
        'code': code,
        'device': 'mobile',
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /auth/apple {identity_token,name?,device?} -> same verify shape.
  static Future<Map<String, dynamic>> appleAuth(
      {required String identityToken, String? name}) async {
    try {
      final res = await _dio.post('/auth/apple', data: {
        'identity_token': identityToken,
        if (name != null && name.isNotEmpty) 'name': name,
        'device': 'mobile',
      });
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// PATCH /me {name,intent[],city,interests[],...} — v2 profile route.
  static Future<Map<String, dynamic>> updateMe(
      Map<String, dynamic> fields) async {
    try {
      final res = await _dio.patch('/me', data: fields, options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /me/plans -> { waiting_on_you, upcoming, waiting, past } (I10).
  static Future<Map<String, dynamic>> mePlansFull() async {
    try {
      final res = await _dio.get('/me/plans', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// PUT /me/mode {mode,org_id?} — persist A4 last-mode server-side.
  static Future<void> putMyMode(String mode, {String? orgId}) async {
    try {
      await _dio.put('/me/mode',
          data: {'mode': mode, if (orgId != null) 'org_id': orgId},
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /me/memberships -> { memberships[], invites[] }.
  static Future<Map<String, dynamic>> meMemberships() async {
    try {
      final res = await _dio.get('/me/memberships', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // --------------------------------------------------------------- invites

  /// POST /invites — create a personal invite (host). Per I-rules the body
  /// carries name/when/where/cover/note/guest_limit/approve/plus_ones/
  /// show_guests/hide_address.
  static Future<Map<String, dynamic>> createInvite(
      Map<String, dynamic> body) async {
    try {
      final res =
          await _dio.post('/invites', data: body, options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /invites/:code — guest read. Sends the bearer token when one
  /// exists so the server recognizes hosts and Going guests (hidden place).
  static Future<Map<String, dynamic>> inviteByCode(String code) async {
    try {
      final res =
          await _dio.get('/invites/$code', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /invites/:id/rsvp {status,plus_ones?} — guest reply. Status is
  /// `going|maybe|no`; the invite may turn Going into `requested` when the
  /// host approves guests (I3). Plus-ones only while going.
  static Future<Map<String, dynamic>> respondToInvite(
      String code, String status, {int plusOnes = 0}) async {
    try {
      final res = await _dio.post('/invites/$code/rsvp',
          data: {
            'status': status,
            // I5: plus-ones are only valid while going — sending them with
            // maybe/no makes the server reject the whole reply.
            if (status == 'going' && plusOnes > 0) 'plus_ones': plusOnes,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /invites/:id/guests — host guest list.
  static Future<List<Map<String, dynamic>>> inviteGuests(String id) async {
    try {
      final res =
          await _dio.get('/invites/$id/guests', options: _authOptions);
      final list = (res.data['guests'] as List?) ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /invites/:id/move {org_id} — I7 invite → paid event conversion.
  static Future<Map<String, dynamic>> moveInvite(
      String inviteId, String orgId) async {
    try {
      final res = await _dio.post('/invites/$inviteId/move',
          data: {'org_id': orgId}, options: _authOptions);
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

  /// POST /auth/verify-email/request, email a fresh verification link.
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

  /// PATCH /auth/me, update profile fields.
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

  /// POST /auth/logout, revokes the presented refresh token server-side,
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
      // Logout is best-effort, local session is cleared regardless.
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

  /// POST /events, create a draft event with tiers.
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

  /// POST /orders/intent -> { orderId, clientSecret, amountCents... }
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
    String? idempotencyKey,
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
          options: _idemOptions(idempotencyKey));
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
      String eventId, String code, {String? idempotencyKey}) async {
    try {
      final res = await _dio.post('/events/$eventId/checkin',
          data: {'code': code}, options: _idemOptions(idempotencyKey));
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      // ALREADY_USED comes back as 409, surface the body, not just the message.
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
      String ticketCode, int priceCents, {String? idempotencyKey}) async {
    try {
      final res = await _dio.post('/tickets/$ticketCode/list',
          data: {'priceCents': priceCents},
          options: _idemOptions(idempotencyKey));
      return Map<String, dynamic>.from(res.data['listing'] as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /listings/:code, cancel my ACTIVE listing.
  static Future<void> cancelListing(String ticketCode) async {
    try {
      await _dio.delete('/listings/$ticketCode', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /tickets/:id/check-in, undo a manual check-in (door mode).
  /// Contract: `DELETE /tickets/{id}/check-in`.
  // TODO(api-gap: manual check-in undo, verify the backend exposes
  // DELETE /tickets/:id/check-in; guests list currently only supports
  // POST /events/:id/checkin)
  static Future<void> undoCheckIn(String ticketCode) async {
    try {
      await _dio.delete('/tickets/$ticketCode/check-in',
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /tickets/:code/transfer { recipientEmail } or { recipient } for
  /// phone numbers. The spec contract is `POST /transfers {ticket_ids[],to}`
  /// where `to` accepts email or phone with country code.
  // TODO(api-gap: transfer accepts email or phone with country code via
  // POST /transfers {ticket_ids[],to}; this MVP endpoint is per-ticket and
  // email-first, phone numbers go through `recipient` until it ships)
  static Future<Map<String, dynamic>> transferTicket(
      String ticketCode, String to,
      {String? idempotencyKey}) async {
    final trimmed = to.trim();
    final isEmail = trimmed.contains('@');
    try {
      final res = await _dio.post('/tickets/$ticketCode/transfer',
          data: isEmail
              ? {'recipientEmail': trimmed.toLowerCase()}
              : {'recipient': trimmed},
          options: _idemOptions(idempotencyKey));
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
    String? idempotencyKey,
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
          options: _idemOptions(idempotencyKey));
      return Map<String, dynamic>.from(
          res.data['offer'] as Map? ?? res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /offers/:id, cancel my ACTIVE offer.
  static Future<void> cancelOffer(String offerId) async {
    try {
      await _dio.delete('/offers/$offerId', options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ------------------------------------------------------ venue (creator)

  /// PATCH /events/:id { venueLayout }, set seated-event sections.
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

  /// DELETE /auth/me, soft-delete the current account.
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
      {String? currency, String? idempotencyKey}) async {
    try {
      final res = await _dio.post('/account/withdraw',
          data: {
            'amountCents': amountCents,
            if (currency != null && currency.isNotEmpty) 'currency': currency,
          },
          options: _idemOptions(idempotencyKey));
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

  /// POST /account/payouts/refresh, re-check onboarding after Stripe return.
  static Future<Map<String, dynamic>> payoutsRefresh() async {
    try {
      final res =
          await _dio.post('/account/payouts/refresh', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /account/referrals/apply { code }, existing users enter a code.
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

  /// POST /events/:id/broadcasts, creator attendee message.
  static Future<Map<String, dynamic>> createBroadcast(
    String eventId, {
    String? audience,
    required String message,
    Map<String, dynamic>? audienceFilter,
    Map<String, bool>? channels,
    String? idempotencyKey,
  }) async {
    try {
      final res = await _dio.post('/events/$eventId/broadcasts',
          data: {
            'message': message,
            if (audience != null && audience.isNotEmpty) 'audience': audience,
            if (audienceFilter != null) 'audienceFilter': audienceFilter,
            if (channels != null) 'channels': channels,
          },
          options: _idemOptions(idempotencyKey));
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /events/:id/broadcasts, creator's sent attendee messages.
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

  // ------------------------------------------ hosting / profile switcher

  /// GET /me/memberships -> [{org,role,event_scope,verification_status}]
  // TODO(api-gap: memberships endpoint not confirmed on this backend,   // creator role is currently inferred from user.role instead)
  static Future<List<Map<String, dynamic>>> memberships() async {
    try {
      final res = await _dio.get('/me/memberships', options: _authOptions);
      final list = (res.data['memberships'] as List?) ??
          (res.data is List ? res.data as List : const []);
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// PUT /me/mode {mode,org_id?} -> {landing}, switch personal <-> org.
  // TODO(api-gap: last-mode persistence, backend should return
  // `landing:{mode:"personal"}|{mode:"org",org_id,role}` on sign-in)
  static Future<Map<String, dynamic>> setMode(
      {required String mode, String? orgId}) async {
    try {
      final res = await _dio.put('/me/mode',
          data: {
            'mode': mode,
            if (orgId != null && orgId.isNotEmpty) 'orgId': orgId,
          },
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /orgs {name,type,city} -> {org}, host sign-up creates the org.
  // TODO(api-gap: organisation creation, verify POST /orgs contract
  // {name,type,city} exists on this backend)
  static Future<Map<String, dynamic>> createOrg({
    required String name,
    required String type,
    required String city,
  }) async {
    try {
      final res = await _dio.post('/orgs',
          data: {'name': name.trim(), 'type': type, 'city': city},
          options: _authOptions);
      return Map<String, dynamic>.from(
          res.data['org'] as Map? ?? res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // --------------------------------------------------- events / reminders

  /// PUT /events/:id/reminder · "Remind me" for not-yet-on-sale events.
  // TODO(api-gap: reminder endpoints PUT/DELETE /events/:id/reminder)
  static Future<void> setReminder(String eventId) async {
    try {
      await _dio.put('/events/$eventId/reminder',
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// DELETE /events/:id/reminder
  static Future<void> clearReminder(String eventId) async {
    try {
      await _dio.delete('/events/$eventId/reminder',
          options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /tickets/:id/credential -> {qr_payload,version,rotates_at}
  // TODO(api-gap: rotating QR credential endpoint, tickets currently
  // render their `code` directly into the QR instead of a signed payload)
  static Future<Map<String, dynamic>> ticketCredential(
      String ticketCode) async {
    try {
      final res = await _dio.get('/tickets/$ticketCode/credential',
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// PATCH /me/notification-settings {push,email,sms,selling,remind,weekly}
  // TODO(api-gap: notification settings persistence endpoint)
  static Future<void> updateNotificationSettings(
      Map<String, bool> settings) async {
    try {
      await _dio.patch('/me/notification-settings',
          data: settings, options: _authOptions);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// Persist a { token, user } auth response in the shape the existing
  /// profile/settings screens expect (SignupModel JSON), and attach the
  /// bearer token to API clients.
  static Future<void> saveSession(Map<String, dynamic> authResponse) async {
    final prefs = AppPreferences();
    await prefs.isPreferenceReady;
    final user = Map<String, dynamic>.from(authResponse['user'] as Map? ?? {});
    final token = authResponse['token']?.toString() ?? '';
    // v2 auth contract returns snake_case; keep camelCase fallback.
    final refreshToken = authResponse['refreshToken']?.toString() ??
        authResponse['refresh_token']?.toString() ??
        '';
    final role = user['role']?.toString() ?? 'fan';
    // v2: org-role memberships make a user a door-mode operator too.
    final memberships = authResponse['memberships'];
    final hasOrgMembership =
        memberships is List && memberships.isNotEmpty;
    final isCreator = role == 'creator' || hasOrgMembership;

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

  /// Route to the right dashboard after login/signup. A4 last-mode:
  /// signed-in creators land back in door mode, fans land on For You.
  /// TODO(api-gap: server `landing:{mode}` + memberships are the source of
  /// truth for last-mode; we persist it locally until the contract ships)
  static Future<void> goToDashboard() async {
    String mode = Constants.isUserCreator ? 'creator' : 'fan';
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      final saved = await prefs.getLastMode();
      if (saved.isNotEmpty) mode = saved;
    } catch (_) {}
    await setLastModeLocal(mode);
    if (mode == 'creator' && Constants.isUserCreator) {
      Get.offAllNamed(Routes.CREATOR_DASHBOARD);
    } else {
      Get.offAllNamed(Routes.USER_DASHBOARD);
    }
  }

  /// Persist the last-used mode locally (and optimistically to the server).
  static Future<void> setLastModeLocal(String mode) async {
    try {
      final prefs = AppPreferences();
      await prefs.isPreferenceReady;
      prefs.setLastMode(mode: mode);
    } catch (_) {}
  }

  // ---------------------------------------------------------- v3 wallet

  /// GET /wallet — cash, pending and credits balances.
  static Future<Map<String, dynamic>> wallet() async {
    try {
      final res = await _dio.get('/wallet', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /wallet/withdraw {amountMinor, instant}
  static Future<Map<String, dynamic>> walletWithdraw(
      int amountMinor, {bool instant = false}) async {
    try {
      final res = await _dio.post('/wallet/withdraw',
          data: {'amountMinor': amountMinor, 'instant': instant},
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  // ----------------------------------------------------------- v3 misc

  /// GET /tickets/:code/qr — rotating live-QR payload (unlocks 24h before doors).
  static Future<Map<String, dynamic>> ticketQr(String code) async {
    try {
      final res = await _dio.get('/tickets/$code/qr', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// POST /events/:id/waiting-room — join the release waiting room.
  static Future<Map<String, dynamic>> joinWaitingRoom(String eventId,
      {String? deviceId}) async {
    try {
      final res = await _dio.post('/events/$eventId/waiting-room',
          data: {if (deviceId != null) 'deviceId': deviceId},
          options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// GET /events/:id/waiting-room — my queue position/status.
  static Future<Map<String, dynamic>> waitingRoomStatus(String eventId) async {
    try {
      final res = await _dio.get('/events/$eventId/waiting-room', options: _authOptions);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      _throw(e);
    }
  }

  /// v3 all-in display helper: shown price = round(face × 1.07).
  static int allInPrice(int faceCents) => (faceCents * 1.07).round();
}
