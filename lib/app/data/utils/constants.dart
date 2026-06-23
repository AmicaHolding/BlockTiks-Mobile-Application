// ignore_for_file: constant_identifier_names

import 'package:block_tix/app/data/core/app_export.dart';

class Constants {
  static bool isUserCreator = false;
  static const appbarIconSize = 25.0;
  static const paginationLimit = 10;

  static const int otpLength = 6;
  static const int shimmerDuration = 3;

  static const String paramComingFrom = 'coming-from';
  static const String paramSignup = 'signup';
  static const String paramLogin = 'login';
  static const String paramShowBack = 'show-back';
  static const String paramPlaceBid = 'place-bid';
  static const String paramTransform = 'transform';
  static const String paramEmail = 'email';
  static const String paramForget = 'forget-password';
  static const String paramUser = 'user';
  static const String paramCreator = 'creator';
  static const String paramEdit = 'edit';
  static const String paramDeposit = 'deposit';
  static const String paramTicket = 'ticket';

  static String mimeTypeImage = "image";
  static String mimeTypeVideo = "video";

  static const int EMAIL_VALIDATION = 35;
  static const int NAME_VALIDATION = 20;
  static const int NAME_MIN_VALIDATION = 2;
  static const int PASSWORD_MIN_VALIDATION = 8;
  static const int PASSWORD_VALIDATION = 15;
  static const int PHONE_MIN_VALIDATION = 10;
  static const int PHONE_VALIDATION = 15;
  static const int MAX_INPUT_LIMIT = 30;
  static const int refreshDelay = 800;
  static const int MAX_IMAGE_SIZE = 3; // in Mbs

  static bool showToast = true;
  static bool showNoInternetToast = false;

  static const debounceDuration = Duration(milliseconds: 1000);

}
