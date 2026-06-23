import 'package:get/get.dart';

import '../modules/add_co_host/bindings/add_co_host_binding.dart';
import '../modules/add_co_host/views/add_co_host_view.dart';
import '../modules/add_drop/bindings/add_drop_binding.dart';
import '../modules/add_drop/views/add_drop_view.dart';
import '../modules/add_individual/bindings/add_individual_binding.dart';
import '../modules/add_individual/views/add_individual_view.dart';
import '../modules/add_team/bindings/add_team_binding.dart';
import '../modules/add_team/views/add_team_view.dart';
import '../modules/all_guests/bindings/all_guests_binding.dart';
import '../modules/all_guests/views/all_guests_view.dart';
import '../modules/analytic/bindings/analytic_binding.dart';
import '../modules/analytic/views/analytic_view.dart';
import '../modules/ask_bid/bindings/ask_bid_binding.dart';
import '../modules/ask_bid/views/ask_bid_view.dart';
import '../modules/broadcast_message/bindings/broadcast_message_binding.dart';
import '../modules/broadcast_message/views/broadcast_message_view.dart';
import '../modules/change_password/bindings/change_password_binding.dart';
import '../modules/change_password/views/change_password_view.dart';
import '../modules/create_event/bindings/create_event_binding.dart';
import '../modules/create_event/views/create_event_view.dart';
import '../modules/creator_dashboard/bindings/creator_dashboard_binding.dart';
import '../modules/creator_dashboard/views/creator_dashboard_view.dart';
import '../modules/creator_event/bindings/creator_event_binding.dart';
import '../modules/creator_event/views/creator_event_view.dart';
import '../modules/creator_home_tab/bindings/creator_home_tab_binding.dart';
import '../modules/creator_home_tab/views/creator_home_tab_view.dart';
import '../modules/creator_promo_code/bindings/creator_promo_code_binding.dart';
import '../modules/creator_promo_code/views/creator_promo_code_view.dart';
import '../modules/creator_search/bindings/creator_search_binding.dart';
import '../modules/creator_search/views/creator_search_view.dart';
import '../modules/edit_profile/bindings/edit_profile_binding.dart';
import '../modules/edit_profile/views/edit_profile_view.dart';
import '../modules/event_detail/bindings/event_detail_binding.dart';
import '../modules/event_detail/views/event_detail_view.dart';
import '../modules/event_settings/bindings/event_settings_binding.dart';
import '../modules/event_settings/views/event_settings_view.dart';
import '../modules/event_tickets_drop/bindings/event_tickets_drop_binding.dart';
import '../modules/event_tickets_drop/views/event_tickets_drop_view.dart';
import '../modules/faqs/bindings/faqs_binding.dart';
import '../modules/faqs/views/faqs_view.dart';
import '../modules/follow_following/bindings/follow_following_binding.dart';
import '../modules/follow_following/views/follow_following_view.dart';
import '../modules/for_you/bindings/for_you_binding.dart';
import '../modules/for_you/views/for_you_view.dart';
import '../modules/forget_password/bindings/forget_password_binding.dart';
import '../modules/forget_password/views/forget_password_view.dart';
import '../modules/get_started/bindings/get_started_binding.dart';
import '../modules/get_started/views/get_started_view.dart';
import '../modules/loader/bindings/loader_binding.dart';
import '../modules/loader/views/loader_view.dart';
import '../modules/manage_teams/bindings/manage_teams_binding.dart';
import '../modules/manage_teams/views/manage_teams_view.dart';
import '../modules/media_preview/bindings/media_preview_binding.dart';
import '../modules/media_preview/views/media_preview_view.dart';
import '../modules/my_scanner/bindings/my_scanner_binding.dart';
import '../modules/my_scanner/views/my_scanner_view.dart';
import '../modules/notifications_page/bindings/notifications_page_binding.dart';
import '../modules/notifications_page/views/notifications_page_view.dart';
import '../modules/other_user_profile/bindings/other_user_profile_binding.dart';
import '../modules/other_user_profile/views/other_user_profile_view.dart';
import '../modules/otp_verification_screen/bindings/otp_verification_screen_binding.dart';
import '../modules/otp_verification_screen/views/otp_verification_screen_view.dart';
import '../modules/payment_options/bindings/payment_options_binding.dart';
import '../modules/payment_options/views/payment_options_view.dart';
import '../modules/payment_page/bindings/payment_page_binding.dart';
import '../modules/payment_page/views/payment_page_view.dart';
import '../modules/personalize/bindings/personalize_binding.dart';
import '../modules/personalize/views/personalize_view.dart';
import '../modules/place_bid/bindings/place_bid_binding.dart';
import '../modules/place_bid/views/place_bid_view.dart';
import '../modules/place_bid_detail/bindings/place_bid_detail_binding.dart';
import '../modules/place_bid_detail/views/place_bid_detail_view.dart';
import '../modules/profile_settings/bindings/profile_settings_binding.dart';
import '../modules/profile_settings/views/profile_settings_view.dart';
import '../modules/profile_tab/bindings/profile_tab_binding.dart';
import '../modules/profile_tab/views/profile_tab_view.dart';
import '../modules/promo_codes/bindings/promo_codes_binding.dart';
import '../modules/promo_codes/views/promo_codes_view.dart';
import '../modules/purchased_ticket/bindings/purchased_ticket_binding.dart';
import '../modules/purchased_ticket/views/purchased_ticket_view.dart';
import '../modules/referrals/bindings/referrals_binding.dart';
import '../modules/referrals/views/referrals_view.dart';
import '../modules/remind_me/bindings/remind_me_binding.dart';
import '../modules/remind_me/views/remind_me_view.dart';
import '../modules/resell_tab/bindings/resell_tab_binding.dart';
import '../modules/resell_tab/views/resell_tab_view.dart';
import '../modules/reset_password_screen/bindings/reset_password_screen_binding.dart';
import '../modules/reset_password_screen/views/reset_password_screen_view.dart';
import '../modules/search/bindings/search_binding.dart';
import '../modules/search/views/search_view.dart';
import '../modules/send_tickets/bindings/send_tickets_binding.dart';
import '../modules/send_tickets/views/send_tickets_view.dart';
import '../modules/set_date/bindings/set_date_binding.dart';
import '../modules/set_date/views/set_date_view.dart';
import '../modules/settings/bindings/settings_binding.dart';
import '../modules/settings/views/settings_view.dart';
import '../modules/sign_in/bindings/sign_in_binding.dart';
import '../modules/sign_in/views/sign_in_view.dart';
import '../modules/sign_up/bindings/sign_up_binding.dart';
import '../modules/sign_up/views/sign_up_view.dart';
import '../modules/splash/bindings/splash_binding.dart';
import '../modules/splash/views/splash_view.dart';
import '../modules/team_detail/bindings/team_detail_binding.dart';
import '../modules/team_detail/views/team_detail_view.dart';
import '../modules/transactions/bindings/transactions_binding.dart';
import '../modules/transactions/views/transactions_view.dart';
import '../modules/transfer/bindings/transfer_binding.dart';
import '../modules/transfer/views/transfer_view.dart';
import '../modules/upcoming_event/bindings/upcoming_event_binding.dart';
import '../modules/upcoming_event/views/upcoming_event_view.dart';
import '../modules/user_dashboard/bindings/user_dashboard_binding.dart';
import '../modules/user_dashboard/views/user_dashboard_view.dart';
import '../modules/venue_layout/bindings/venue_layout_binding.dart';
import '../modules/venue_layout/views/venue_layout_view.dart';
import '../modules/wallet/bindings/wallet_binding.dart';
import '../modules/wallet/views/wallet_view.dart';
import '../modules/withdraw/bindings/withdraw_binding.dart';
import '../modules/withdraw/views/withdraw_view.dart';

// ignore_for_file: constant_identifier_names

part 'app_routes.dart';

class AppPages {
  AppPages._();

  static const INITIAL = Routes.SPLASH;

  static final routes = [
    GetPage(
      name: _Paths.SPLASH,
      page: () => const SplashView(),
      binding: SplashBinding(),
    ),
    GetPage(
      name: _Paths.GET_STARTED,
      page: () => GetStartedView(),
      binding: GetStartedBinding(),
    ),
    GetPage(
      name: _Paths.SIGN_IN,
      page: () => SignInView(),
      binding: SignInBinding(),
    ),
    GetPage(
      name: _Paths.SIGN_UP,
      page: () => SignUpView(),
      binding: SignUpBinding(),
    ),
    GetPage(
      name: _Paths.NOTIFICATIONS_PAGE,
      page: () => const NotificationsPageView(),
      binding: NotificationsPageBinding(),
    ),
    GetPage(
      name: _Paths.SETTINGS,
      page: () => const SettingsView(),
      binding: SettingsBinding(),
    ),
    GetPage(
      name: _Paths.CHANGE_PASSWORD,
      page: () => ChangePasswordView(),
      binding: ChangePasswordBinding(),
    ),
    GetPage(
      name: _Paths.FAQS,
      page: () => const FaqsView(),
      binding: FaqsBinding(),
    ),
    GetPage(
      name: _Paths.FORGET_PASSWORD,
      page: () => ForgetPasswordView(),
      binding: ForgetPasswordBinding(),
    ),
    GetPage(
      name: _Paths.OTP_VERIFICATION_SCREEN,
      page: () => const OtpVerificationScreenView(),
      binding: OtpVerificationScreenBinding(),
    ),
    GetPage(
      name: _Paths.RESET_PASSWORD_SCREEN,
      page: () => ResetPasswordScreenView(),
      binding: ResetPasswordScreenBinding(),
    ),
    GetPage(
      name: _Paths.USER_DASHBOARD,
      page: () => UserDashboardView(),
      binding: UserDashboardBinding(),
    ),
    GetPage(
      name: _Paths.PROFILE_TAB,
      page: () => ProfileTabView(),
      binding: ProfileTabBinding(),
    ),
    GetPage(
      name: _Paths.EDIT_PROFILE,
      page: () => const EditProfileView(),
      binding: EditProfileBinding(),
    ),
    GetPage(
      name: _Paths.MEDIA_PREVIEW,
      page: () => const MediaPreviewView(),
      binding: MediaPreviewBinding(),
    ),
    GetPage(
      name: _Paths.PAYMENT_OPTIONS,
      page: () => const PaymentOptionsView(),
      binding: PaymentOptionsBinding(),
    ),
    GetPage(
      name: _Paths.PERSONALIZE,
      page: () => const PersonalizeView(),
      binding: PersonalizeBinding(),
    ),
    GetPage(
      name: _Paths.LOADER,
      page: () => const LoaderView(),
      binding: LoaderBinding(),
    ),
    GetPage(
      name: _Paths.FOR_YOU,
      page: () => ForYouView(),
      binding: ForYouBinding(),
    ),
    GetPage(
      name: _Paths.EVENT_DETAIL,
      page: () => const EventDetailView(),
      binding: EventDetailBinding(),
    ),
    GetPage(
      name: _Paths.PAYMENT_PAGE,
      page: () => const PaymentPageView(),
      binding: PaymentPageBinding(),
    ),
    GetPage(
      name: _Paths.PURCHASED_TICKET,
      page: () => const PurchasedTicketView(),
      binding: PurchasedTicketBinding(),
    ),
    GetPage(
      name: _Paths.TRANSFER,
      page: () => const TransferView(),
      binding: TransferBinding(),
    ),
    GetPage(
      name: _Paths.RESELL_TAB,
      page: () => ResellTabView(),
      binding: ResellTabBinding(),
    ),
    GetPage(
      name: _Paths.PLACE_BID,
      page: () => const PlaceBidView(),
      binding: PlaceBidBinding(),
    ),
    GetPage(
      name: _Paths.PLACE_BID_DETAIL,
      page: () => const PlaceBidDetailView(),
      binding: PlaceBidDetailBinding(),
    ),
    GetPage(
      name: _Paths.WALLET,
      page: () => WalletView(),
      binding: WalletBinding(),
    ),
    GetPage(
      name: _Paths.WITHDRAW,
      page: () => const WithdrawView(),
      binding: WithdrawBinding(),
    ),
    GetPage(
      name: _Paths.SEARCH,
      page: () => const SearchView(),
      binding: SearchBinding(),
    ),
    GetPage(
      name: _Paths.ASK_BID,
      page: () => const AskBidView(),
      binding: AskBidBinding(),
    ),
    GetPage(
      name: _Paths.TRANSACTIONS,
      page: () => const TransactionsView(),
      binding: TransactionsBinding(),
    ),
    GetPage(
      name: _Paths.PROMO_CODES,
      page: () => const PromoCodesView(),
      binding: PromoCodesBinding(),
    ),
    GetPage(
      name: _Paths.REFERRALS,
      page: () => const ReferralsView(),
      binding: ReferralsBinding(),
    ),
    GetPage(
      name: _Paths.OTHER_USER_PROFILE,
      page: () => const OtherUserProfileView(),
      binding: OtherUserProfileBinding(),
    ),
    GetPage(
      name: _Paths.FOLLOW_FOLLOWING,
      page: () => const FollowFollowingView(),
      binding: FollowFollowingBinding(),
    ),
    GetPage(
      name: _Paths.PROFILE_SETTINGS,
      page: () => const ProfileSettingsView(),
      binding: ProfileSettingsBinding(),
    ),
    GetPage(
      name: _Paths.UPCOMING_EVENT,
      page: () => const UpcomingEventView(),
      binding: UpcomingEventBinding(),
    ),
    GetPage(
      name: _Paths.ANALYTIC,
      page: () => AnalyticView(),
      binding: AnalyticBinding(),
    ),
    GetPage(
      name: _Paths.REMIND_ME,
      page: () => const RemindMeView(),
      binding: RemindMeBinding(),
    ),
    GetPage(
      name: _Paths.CREATOR_DASHBOARD,
      page: () => CreatorDashboardView(),
      binding: CreatorDashboardBinding(),
    ),
    GetPage(
      name: _Paths.CREATOR_HOME_TAB,
      page: () => CreatorHomeTabView(),
      binding: CreatorHomeTabBinding(),
    ),
    GetPage(
      name: _Paths.CREATE_EVENT,
      page: () => const CreateEventView(),
      binding: CreateEventBinding(),
    ),
    GetPage(
      name: _Paths.ADD_CO_HOST,
      page: () => const AddCoHostView(),
      binding: AddCoHostBinding(),
    ),
    GetPage(
      name: _Paths.EVENT_SETTINGS,
      page: () => const EventSettingsView(),
      binding: EventSettingsBinding(),
    ),
    GetPage(
      name: _Paths.EVENT_TICKETS_DROP,
      page: () => const EventTicketsDropView(),
      binding: EventTicketsDropBinding(),
    ),
    GetPage(
      name: _Paths.VENUE_LAYOUT,
      page: () => const VenueLayoutView(),
      binding: VenueLayoutBinding(),
    ),
    GetPage(
      name: _Paths.MANAGE_TEAMS,
      page: () => const ManageTeamsView(),
      binding: ManageTeamsBinding(),
    ),
    GetPage(
      name: _Paths.SET_DATE,
      page: () => const SetDateView(),
      binding: SetDateBinding(),
    ),
    GetPage(
      name: _Paths.ADD_DROP,
      page: () => const AddDropView(),
      binding: AddDropBinding(),
    ),
    GetPage(
      name: _Paths.ADD_TEAM,
      page: () => const AddTeamView(),
      binding: AddTeamBinding(),
    ),
    GetPage(
      name: _Paths.ADD_INDIVIDUAL,
      page: () => const AddIndividualView(),
      binding: AddIndividualBinding(),
    ),
    GetPage(
      name: _Paths.TEAM_DETAIL,
      page: () => const TeamDetailView(),
      binding: TeamDetailBinding(),
    ),
    GetPage(
      name: _Paths.CREATOR_EVENT,
      page: () => const CreatorEventView(),
      binding: CreatorEventBinding(),
    ),
    GetPage(
      name: _Paths.MY_SCANNER,
      page: () => const MyScannerView(),
      binding: MyScannerBinding(),
    ),
    GetPage(
      name: _Paths.ALL_GUESTS,
      page: () => const AllGuestsView(),
      binding: AllGuestsBinding(),
    ),
    GetPage(
      name: _Paths.BROADCAST_MESSAGE,
      page: () => const BroadcastMessageView(),
      binding: BroadcastMessageBinding(),
    ),
    GetPage(
      name: _Paths.CREATOR_SEARCH,
      page: () => const CreatorSearchView(),
      binding: CreatorSearchBinding(),
    ),
    GetPage(
      name: _Paths.CREATOR_PROMO_CODE,
      page: () => const CreatorPromoCodeView(),
      binding: CreatorPromoCodeBinding(),
    ),
    GetPage(
      name: _Paths.SEND_TICKETS,
      page: () => const SendTicketsView(),
      binding: SendTicketsBinding(),
    ),
  ];
}
