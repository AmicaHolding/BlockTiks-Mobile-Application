// ignore_for_file: constant_identifier_names

part of 'app_pages.dart';

abstract class Routes {
  Routes._();

  static const SIGN_IN = _Paths.SIGN_IN;
  static const SPLASH = _Paths.SPLASH;
  static const GET_STARTED = _Paths.GET_STARTED;
  static const SIGN_UP = _Paths.SIGN_UP;
  static const FORGET_PASSWORD = _Paths.FORGET_PASSWORD;
  static const OTP_VERIFICATION_SCREEN = _Paths.OTP_VERIFICATION_SCREEN;
  static const RESET_PASSWORD_SCREEN = _Paths.RESET_PASSWORD_SCREEN;
  static const NOTIFICATIONS_PAGE = _Paths.NOTIFICATIONS_PAGE;
  static const CHANGE_PASSWORD = _Paths.CHANGE_PASSWORD;
  static const FAQS = _Paths.FAQS;
  static const USER_DASHBOARD = _Paths.USER_DASHBOARD;
  static const PROFILE_TAB = _Paths.PROFILE_TAB;
  static const EDIT_PROFILE = _Paths.EDIT_PROFILE;
  static const MEDIA_PREVIEW = _Paths.MEDIA_PREVIEW;
  static const PAYMENT_OPTIONS = _Paths.PAYMENT_OPTIONS;
  static const PERSONALIZE = _Paths.PERSONALIZE;
  static const FOR_YOU = _Paths.FOR_YOU;
  static const EVENT_DETAIL = _Paths.EVENT_DETAIL;
  static const PAYMENT_PAGE = _Paths.PAYMENT_PAGE;
  static const PURCHASED_TICKET = _Paths.PURCHASED_TICKET;
  static const TRANSFER = _Paths.TRANSFER;
  static const PLACE_BID = _Paths.PLACE_BID;
  static const WALLET = _Paths.WALLET;
  static const WITHDRAW = _Paths.WITHDRAW;
  static const SEARCH = _Paths.SEARCH;
  static const ASK_BID = _Paths.ASK_BID;
  static const TRANSACTIONS = _Paths.TRANSACTIONS;
  static const PROMO_CODES = _Paths.PROMO_CODES;
  static const REFERRALS = _Paths.REFERRALS;
  static const PROFILE_SETTINGS = _Paths.PROFILE_SETTINGS;
  static const CREATOR_DASHBOARD = _Paths.CREATOR_DASHBOARD;
  static const CREATOR_HOME_TAB = _Paths.CREATOR_HOME_TAB;
  static const CREATOR_EVENT = _Paths.CREATOR_EVENT;
  static const MY_SCANNER = _Paths.MY_SCANNER;
  static const ALL_GUESTS = _Paths.ALL_GUESTS;
  static const BROADCAST_MESSAGE = _Paths.BROADCAST_MESSAGE;
  static const SEND_TICKETS = _Paths.SEND_TICKETS;
  static const HOST_INTRO = _Paths.HOST_INTRO;
  static const HOST_ORG = _Paths.HOST_ORG;
  static const NOTIFICATION_SETTINGS = _Paths.NOTIFICATION_SETTINGS;
  static const LANGUAGE_SETTINGS = _Paths.LANGUAGE_SETTINGS;
  static const SECURITY_SETTINGS = _Paths.SECURITY_SETTINGS;
}

abstract class _Paths {
  _Paths._();

  static const SIGN_IN = '/sign-in';
  static const SPLASH = '/splash';
  static const GET_STARTED = '/get-started';
  static const SIGN_UP = '/sign-up';
  static const NOTIFICATIONS_PAGE = '/notifications-page';
  static const CHANGE_PASSWORD = '/change-password';
  static const FAQS = '/faqs';
  static const FORGET_PASSWORD = '/forget-password';
  static const OTP_VERIFICATION_SCREEN = '/otp-verification-screen';
  static const RESET_PASSWORD_SCREEN = '/reset-password-screen';
  static const USER_DASHBOARD = '/user-dashboard';
  static const PROFILE_TAB = '/profile-tab';
  static const EDIT_PROFILE = '/edit-profile';
  static const MEDIA_PREVIEW = '/media-preview';
  static const PAYMENT_OPTIONS = '/payment-options';
  static const PERSONALIZE = '/personalize';
  static const FOR_YOU = '/for-you';
  static const EVENT_DETAIL = '/event-detail';
  static const PAYMENT_PAGE = '/payment-page';
  static const PURCHASED_TICKET = '/purchased-ticket';
  static const TRANSFER = '/transfer';
  static const PLACE_BID = '/place-bid';
  static const WALLET = '/wallet';
  static const WITHDRAW = '/withdraw';
  static const SEARCH = '/search';
  static const ASK_BID = '/ask-bid';
  static const TRANSACTIONS = '/transactions';
  static const PROMO_CODES = '/promo-codes';
  static const REFERRALS = '/referrals';
  static const PROFILE_SETTINGS = '/profile-settings';
  static const CREATOR_DASHBOARD = '/creator-dashboard';
  static const CREATOR_HOME_TAB = '/creator-home-tab';
  static const CREATOR_EVENT = '/creator-event';
  static const MY_SCANNER = '/my-scanner';
  static const ALL_GUESTS = '/all-guests';
  static const BROADCAST_MESSAGE = '/broadcast-message';
  static const SEND_TICKETS = '/send-tickets';
  static const HOST_INTRO = '/host-intro';
  static const HOST_ORG = '/host-org';
  static const NOTIFICATION_SETTINGS = '/notification-settings';
  static const LANGUAGE_SETTINGS = '/language';
  static const SECURITY_SETTINGS = '/sign-in-security';
}
