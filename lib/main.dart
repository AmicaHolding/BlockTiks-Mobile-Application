import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:keyboard_actions/external/platform_check/platform_check.dart';
import 'package:block_tix/app/data/utils/check_internet_connection.dart';

import 'app/data/core/app_export.dart';
import 'app/data/localization/app_localization.dart';
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
  // Stripe.publishableKey = Constants.stripePublicAPIKey;
  // Stripe.merchantIdentifier = 'merchant.flutter.stripe.test';
  // Stripe.urlScheme = 'flutterstripe';
  // await Stripe.instance.applySettings();

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

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  // final AppPreferences _appPreferences = AppPreferences();

  @override
  void initState() {
    super.initState();

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
