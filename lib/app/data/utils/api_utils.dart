class ApiUtils {
  static const authBaseUrl = 'https://auth-serv.tekstagearea.com/v1/api/';
  static const baseUrl = 'https://zillow-backend.tekstagearea.com/api/v1/';

  ///s3bucket end point
  static const s3Endpoint = 'https://block_tix-app.s3.us-east-1.amazonaws.com/';
  static const uploadsFolder = 'uploads/';
  static const adsFolder = 'ads/';

  ///auth api urls
  static const authPath = 'auth/';

  static const loginApiUrl = '$authBaseUrl${authPath}login';
  static const socialLoginApiUrl = '$authBaseUrl${authPath}social-auth';
  static const signupApiUrl = '$authBaseUrl${authPath}signup';
  static const resendVerificationOtpApiUrl =
      '$authBaseUrl${authPath}resend-verification-otp';
  static const verifyUserApiUrl = '$authBaseUrl${authPath}verify-account';
  static const forgotPasswordApiUrl = '$authBaseUrl${authPath}forgot-password';
  static const resendOtpApiUrl = '$authBaseUrl${authPath}resend-otp';
  static const verifyOtpApiUrl = '$authBaseUrl${authPath}verify-otp';
  static const resetPasswordApiUrl = '$authBaseUrl${authPath}reset-password';
  static const changePasswordApiUrl = '$authBaseUrl${authPath}change-password';
  static const updateProfileApiUrl = '$authBaseUrl${authPath}update-profile';
  static const getProfileApiUrl = '$authBaseUrl${authPath}get-profile';
  static const logoutApiUrl = '$authBaseUrl${authPath}logout';
  static const userListApiUrl = '$authBaseUrl${authPath}user-list';
  static const deleteUserApiUrl = '$authBaseUrl${authPath}delete-user/';

  // apis
  static const getReportOptions = '${baseUrl}report-types';
  static const getPreferences = '${baseUrl}preference';
  static const getProperties = '${baseUrl}property';

  static String getSingleProperty(String id) => "$getProperties/mls/$id";
  static const likeProperty = '$getPreferences/save-property';
  static const unlikeProperty = '$getPreferences/remove-saved-property';
  static const shareProperty = '$getProperties/share';

  static String updatePreferences(String id) => "$getPreferences/$id";

  static String resetPreferences(String id) => "$getPreferences/reset/$id";
  static String hideReel = "$getPreferences/add-property-hidelist";
  static String reportReelOrAd = "${baseUrl}report/add-report";

  static String contactUs = "${baseUrl}contact-us/add-contact-us";

  static String getSearches = "${baseUrl}saved-search";
  static String addToSearch = "$getSearches/add-saved-search";
  static String deleteAllSearches = "${baseUrl}saved-search/all";

  static String deleteOneSearch(String id) => "$getSearches/$id";

  static String getAds = "${baseUrl}ads/rotated";

  // Static Pages

  static String getTermAndCond = "${baseUrl}pages/terms-and-condition";
  static String getPrivacyPolicy = "${baseUrl}pages/privacy-policy";
  static String getAboutUs = "${baseUrl}pages/about-us";

  // Faqs
  static String getFaqs = "${baseUrl}faqs";

  // Delete Account
  static String getDeleteAccOpt = "${baseUrl}delete-options";
  static const deleteAccUrl = '$authBaseUrl${authPath}delete-user';

  //Notifications
  static String getNotifications = "${baseUrl}notification/";

  static String markSeenNotification(id) => "${baseUrl}notification/$id";


  //packages
  static String getPackages = "${baseUrl}package";

  //cards
  static String cards = "${baseUrl}card";
  static String getCards = "$cards/my-cards";
  static String addCard = "$cards/add-card";
  static String deleteCard(id) => "$cards/$id";

  // ads
  static String getAdsByStatus = "${baseUrl}ads";
  static String createAdd = "$getAdsByStatus/add-iad";


  //properties
  static String getMyProperties = "$getProperties/my-properties";

  static String addProperty = "$getProperties/add-property";
}
