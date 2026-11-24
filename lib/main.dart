import 'dart:async';
import 'dart:convert';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:keyboard_actions/external/platform_check/platform_check.dart';
import 'package:block_tix/app/data/utils/check_internet_connection.dart';

import 'app/data/core/app_export.dart';
import 'app/data/localization/app_localization.dart';
import 'app/modules/invite/controllers/invite_controller.dart';
import 'app/data/utils/logger.dart';

// Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
//   // If you're going to use other Firebase services in the background, such as Firestore,
//   // make sure you call `initializeApp` before using other Firebase services.
//   // await Firebase.initializeApp();
//   debugPrint('Handling a background message ${message.notification}');
//   flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
// }

final internetChecker = CheckInternetConnection();

/// Create a [AndroidNotificationChannel] for heads up notifications
late AndroidNotificationChannel channel;

/// Initialize the [FlutterLocalNotificationsPlugin] package.
late FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  /// Stripe ............................
  Constants.assertStripeKeyConfigured();
  Stripe.publishableKey = Constants.stripePublishableKey;
  await Stripe.instance.applySettings();

  Logger.init(kReleaseMode ? LogMode.live : LogMode.debug);
  // await Firebase.initializeApp();
  //
  // await Firebase.initializeApp();
  // FirebaseCrashlytics.instance.crash();
  SystemChrome.setPreferredOrientations(
      [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);

  flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  // Set the background messaging handler early on, as a named top-level function
  // FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  channel = const AndroidNotificationChannel(
    '1', // id
    // 'high_importance_channel', // id
    "Block Tix", // title
    description: 'This channel is used for important notifications.',
    // description
    importance: Importance.high,
  );

  /// Create an Android Notification Channel.
  ///
  /// We use this channel in the `AndroidManifest.xml` file to override the
  /// default FCM channel to enable heads up notifications.
  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  if (PlatformCheck.isAndroid) {
    var initializationSettingsAndroid =
        const AndroidInitializationSettings('notif_icon');
    // var initializationSettingsIOS = IOSInitializationSettings();
    var initializationSettings = InitializationSettings(
        android:
            initializationSettingsAndroid /*, iOS: initializationSettingsIOS*/);

    await flutterLocalNotificationsPlugin.initialize(initializationSettings,
        onSelectNotification: (value) => onSelectNotification(value));
  }

  /// Update the iOS foreground notification presentation options to allow
  /// heads up notifications.
  // await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
  //   alert: true,
  //   badge: true,
  //   sound: true,
  // );
  // FCMController fcmController = Get.put(FCMController());
  runApp(const MyApp());
}

/// Catch-all for route names the OS pushes that aren't GetX pages —
/// currently `sahra://...` custom-scheme links. Parses the URI, forwards it
/// to the same handler as app_links, and falls back to the dashboard.
class _DeepLinkRedirect extends StatefulWidget {
  const _DeepLinkRedirect();

  @override
  State<_DeepLinkRedirect> createState() => _DeepLinkRedirectState();
}

class _DeepLinkRedirectState extends State<_DeepLinkRedirect> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // The settings name carries the URI the OS pushed; Get.routing.current
      // only reports this page's own name once the frame lands.
      final raw = ModalRoute.of(context)?.settings.name ?? '';

      final uri = Uri.tryParse(raw);
      if (uri != null && uri.scheme == 'sahra') {
        if (_MyAppState._splashUp) {
          // Splash is still up — queue the link; pushing now would be
          // wiped by splash's landing navigation. Close this overlay.
          _MyAppState._openWhenSplashLands(uri);
          if (context.mounted) Navigator.of(context).pop();
          return;
        }
        if (_MyAppState._handleDeepLink(uri)) return;
      }
      // GetX rewrites settings.name to the page's declared name, so the URI
      // may be gone — but app_links delivers the same link to
      // _handleDeepLink, which already pushed the target page under us.
      final last = _MyAppState.lastLink;
      if (last != null &&
          DateTime.now().difference(last.$2).inSeconds < 5) {
        // Navigator.pop, not Get.back() — GetX's back() closes a snackbar
        // queue that hasn't initialized during the OS route push and throws.
        if (context.mounted) Navigator.of(context).pop();
        return;
      }
      Get.offAllNamed(Routes.USER_DASHBOARD);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
        body: Center(child: CircularProgressIndicator()));
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  // final AppPreferences _appPreferences = AppPreferences();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSub;

  /// The last sahra:// URI this app handled and when — lets the
  /// unknown-route redirect tell its delivery apart from app_links'.
  static (Uri, DateTime)? lastLink;

  /// Routes `sahra://event/<id>` and `sahra://i/<code>` invite links.
  /// Returns true when the URI was recognised.
  static bool _handleDeepLink(Uri uri) {
    if (uri.scheme != 'sahra') return false;
    lastLink = (uri, DateTime.now());
    if (uri.host == 'event' && uri.pathSegments.isNotEmpty) {
      Get.toNamed(Routes.EVENT_DETAIL,
          arguments: {'id': uri.pathSegments.first});
      return true;
    }
    if (uri.host == 'i' && uri.pathSegments.isNotEmpty) {
      // arguments too — Get.parameters is still empty while the pushed
      // route's controller is running onInit (GetX resolves params later).
      final code = uri.pathSegments.first;
      Get.toNamed('/i/$code', arguments: {'code': code});
      // When the invite page is already on the stack GetX dedupes the push,
      // so refresh whatever controller is live — that also retries a page
      // that failed while the backend was unreachable.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (Get.isRegistered<InviteController>(tag: code)) {
          Get.find<InviteController>(tag: code).load(code);
        }
      });
      return true;
    }
    return false;
  }

  /// True while the app is still starting: splash, or the transient
  /// unknown-route page the OS pushes for sahra:// links — that page sits
  /// on top of whatever is underneath, so look one route down.
  static bool get _splashUp {
    final r = Get.routing;
    if (r.current.isEmpty || r.current == Routes.SPLASH) return true;
    if (r.current == '/__deep_link') {
      return r.previous.isEmpty || r.previous == Routes.SPLASH;
    }
    return false;
  }

  /// Polls until the splash route has navigated away, then opens the link.
  /// Capped so a stuck splash can't loop forever.
  static void _openWhenSplashLands(Uri uri) {
    var tries = 0;
    void tick() {
      tries++;
      if (tries > 60 || !_splashUp) {
        _handleDeepLink(uri);
        return;
      }
      Future.delayed(const Duration(milliseconds: 200), tick);
    }

    Future.delayed(const Duration(milliseconds: 400), tick);
  }

  @override
  void initState() {
    super.initState();
    _linkSub = _appLinks.uriLinkStream.listen((uri) {
      // On a cold launch the stream can fire while splash is still up —
      // a page pushed now is wiped by splash's landing navigation, so
      // defer it like the initial link.
      if (_splashUp) {
        _openWhenSplashLands(uri);
      } else {
        _handleDeepLink(uri);
      }
    }, onError: (_) {});
    _appLinks.getInitialLink().then((uri) {
      // Cold start: push the link's route only after the splash landing
      // navigation completes, so offAllNamed can't pop the pushed screen.
      if (uri != null) _openWhenSplashLands(uri);
    }).catchError((_) {});

    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.black,
      // Dark color for the status bar
      statusBarIconBrightness: Brightness.light,
      // White icons on the status bar
      statusBarBrightness:
          Brightness.dark, // For iOS: sets status bar text and icons to light
    ));
    // FirebaseMessaging.instance
    //     .getInitialMessage()
    //     .then((RemoteMessage? message) {
    //   if (message != null) {
    //     debugPrint(message.notification!.title!);
    //
    //     Future.delayed(const Duration(milliseconds: 500), () async {
    //       var map = (message.data);
    //       var ref_id = map['ref_id'];
    //       var type = map['notification_type'];
    //       var payload = ExtraPayload(refId: ref_id, type: type);
    //       debugPrint(payload.toJson());
    //       _appPreferences.setHasNotification(hasNotification: true);
    //       _appPreferences.setPayload(data: jsonEncode(payload));
    //     });
    //   }
    // });
    //
    // FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
    //   debugPrint(message);
    //   // RemoteNotification? notification = message.data;
    //   var map12 = (message.notification);
    //   if (map12 != null) {
    //     flutterLocalNotificationsPlugin.show(
    //         int.parse(channel.id),
    //         map12.title,
    //         map12.body,
    //         NotificationDetails(
    //           iOS: const IOSNotificationDetails(),
    //           android: AndroidNotificationDetails(
    //             channel.id,
    //             channel.name,
    //             channelDescription: channel.description,
    //             icon: 'notif_icon',
    //           ),
    //         ),
    //         payload: PlatformCheck.isAndroid
    //             ? jsonEncode(message.data)
    //             : null); // _appPreferences.setNotification(loggedIn: true);
    //     var map = (message.data);
    //     var ref_id = map['ref_id'];
    //     var type = map['notification_type'];
    //     var payload = ExtraPayload(refId: ref_id, type: type);
    //     debugPrint(payload.toJson());
    //
    //     //if (message.notification != null) {
    //       FlutterAppBadger.isAppBadgeSupported().then((value) async {
    //         if (value) {
    //           FlutterAppBadger.updateBadgeCount(1);
    //         }
    //       });
    //     //}
    //   }
    // });
    //
    // FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) async {
    //   debugPrint(message.notification!.title!);
    //   debugPrint('A new onMessageOpenedApp event was published!');
    //   debugPrint(message.data);
    //   var map = (message.data);
    //   var ref_id = map['ref_id'];
    //   var type = map['notification_type'];
    //   var payload = ExtraPayload(refId: ref_id, type: type);
    //   debugPrint(payload.toJson());
    //   HelperFunction.navigateFromNotification(payload, false);
    // });
    // initializeFCM();
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
        debugShowCheckedModeBanner: false,
        translations: AppLocalization(),
        // locale: Get.deviceLocale,
        locale: const Locale('en', 'US'),
        fallbackLocale: const Locale('en', 'US'),
        title: 'Block Tix',
        initialBinding: InitialBindings(),
        // showSemanticsDebugger: true,
        initialRoute: AppPages.INITIAL,
        getPages: AppPages.routes,
        // iOS pushes `sahra://...` links through the platform route channel
        // (didPushRouteInformation) as the raw URI, which matches no named
        // route — land it here and forward to the deep-link handler.
        unknownRoute: GetPage(
            name: '/__deep_link', page: () => const _DeepLinkRedirect()),
        builder: (context, child) {
          return MediaQuery(
              data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.0)),
              child: child!);
        });
  }
}

void initializeFCM() async {
  // FirebaseMessaging messaging = FirebaseMessaging.instance;
  // NotificationSettings settings = await messaging.requestPermission(
  //   alert: true,
  //   badge: true,
  //   sound: true,
  //   carPlay: false,
  //   provisional: false,
  //   announcement: false,
  //   criticalAlert: false,
  // );

  // messaging.getToken().then((token) {
  //   debugPrint("FCM TOKEN: $token");
  // });
}

Future<void> onSelectNotification(dynamic map1) async {
  debugPrint("onSelectNotification clicked");
  debugPrint(map1);
  var map = jsonDecode(map1);
  // ignore: unused_local_variable
  var ref_id = map['ref_id'];
  // ignore: unused_local_variable
  var type = map['notification_type'];

  // var payload = ExtraPayload(refId: ref_id, type: type);
  // debugPrint(payload.toJson().toString());
  // debugPrint("HERERERE12312312312312311");
  // HelperFunction.navigateFromNotification(payload, false);
}
