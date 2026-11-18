import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart' as fmt;
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:block_tix/app/services/api_service.dart';

class CreatorHomeTabController extends GetxController {
  /// The signed-in creator's events (any status) from `GET /events/mine`.
  RxList<Map<String, dynamic>> events = <Map<String, dynamic>>[].obs;

  /// Memberships (org context) for the "Get ready to sell" checklist.
  final RxList<Map<String, dynamic>> memberships =
      <Map<String, dynamic>>[].obs;

  Map<String, dynamic>? get org =>
      memberships.isEmpty ? null : memberships.first['org'] as Map<String, dynamic>?;

  /// Fresh org = no live (published upcoming) event, the Events tab then
  /// shows the "Get ready to sell" checklist instead of the list (flow M5).
  bool get isFreshOrg => upcomingEvents.isEmpty;

  /// The "Get ready to sell" checklist (mobile prototype, fresh org).
  /// [{n:title, d:detail, ok:done}]
  List<Map<String, dynamic>> get orgChecklist {
    final o = org;
    final meta = [
      o?['type']?.toString() ?? '',
      o?['city']?.toString() ?? '',
    ].where((e) => e.isNotEmpty).join(' · ');
    final verified = (o?['verified'] ?? o?['verificationStatus'] ??
            memberships.firstOrNull?['verification_status'])
        ?.toString()
        .toLowerCase() ==
        'yes';
    return [
      {'n': 'Organisation created', 'd': meta.isEmpty ? 'Done' : meta, 'ok': true},
      {
        'n': 'Draft your first event',
        'd': 'On the web, in Studio',
        'ok': events.isNotEmpty,
      },
      {
        'n': 'Verify ID + trade licence',
        'd': verified ? 'Approved' : 'Needed before tickets go on sale',
        'ok': verified,
      },
      {
        'n': 'Add a business bank account',
        'd': 'Needed before your first payout',
        // TODO(api-gap: no payout-account field on the org contract)
        'ok': false,
      },
    ];
  }
  RxBool isLoading = true.obs;
  Rxn<String> loadError = Rxn<String>();

  @override
  void onInit() {
    super.onInit();
    loadEvents();
  }

  Future<void> loadEvents() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final list = await ApiService.myEvents();
      events.assignAll(list);
      _loadMemberships();
    } catch (e) {
      loadError.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  /// Events that are published and haven't started yet.
  Future<void> _loadMemberships() async {
    try {
      memberships.value = await ApiService.memberships();
    } catch (_) {
      // Checklist is additive, fine without org data.
    }
  }

  List<Map<String, dynamic>> get upcomingEvents {
    final now = DateTime.now();
    return events.where((e) {
      if ((e['status']?.toString() ?? '') != 'PUBLISHED') return false;
      final start = _startsAt(e);
      return start == null || start.isAfter(now);
    }).toList();
  }

  /// Drafts, cancelled/completed events and published events in the past.
  List<Map<String, dynamic>> get pastEvents {
    final upcomingIds = upcomingEvents.map((e) => e['id'].toString()).toSet();
    return events
        .where((e) => !upcomingIds.contains(e['id'].toString()))
        .toList();
  }

  static DateTime? eventStartsAt(Map<String, dynamic> e) => _startsAt(e);

  static DateTime? _startsAt(Map<String, dynamic> e) {
    final raw = e['startsAt']?.toString();
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw)?.toLocal();
  }

  /// e.g. "March 24, 2026" (venue time when the event carries a timezone).
  static String formatEventDate(Map<String, dynamic> e) =>
      fmt.formatEventDate(e['startsAt']?.toString(),
          includeTime: false, tz: e['venueTimezone']?.toString());

  static String statusLabel(Map<String, dynamic> e) =>
      (e['status']?.toString() ?? 'DRAFT').toUpperCase();

  showSheet(BuildContext ctx, {bool fromAsk = true}) {
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
        topLeft: Radius.circular(14),
        topRight: Radius.circular(14),
      )),
      backgroundColor: Colors.transparent,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                    color: ColorConstant.elevated,
                    borderRadius: BorderRadius.circular(
                      14,
                    )),
                padding: getPadding(left: 16, right: 16, top: 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Make changes to this action".tr,
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(16),
                      customWeight: FontWeight.w600,
                    ),
                    SizedBox(
                      height: getVerticalSize(5),
                    ),
                    MyText(
                      title: "Are you sure you want to make a change".tr,
                      clr: ColorConstant.white60,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w400,
                    ),
                    SizedBox(
                      height: getVerticalSize(10),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: () {
                        Get.back();
                        WebHandoffSheet.show(feature: 'Editing events');
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Duplicate",
                          clr: ColorConstant.primaryAccent,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              MediaSelectionTileAndroid(
                  title: "Cancel".tr,
                  textColor: ColorConstant.bg,
                  onPressed: () {
                    Get.back();
                  }),
              SizedBox(
                height: getVerticalSize(20),
              ),
            ],
          ),
        );
      },
    );
  }

  showUpcomingEventSheet(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
        topLeft: Radius.circular(14),
        topRight: Radius.circular(14),
      )),
      backgroundColor: Colors.transparent,
      builder: (BuildContext bc) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: BoxDecoration(
                    color: ColorConstant.elevated,
                    borderRadius: BorderRadius.circular(
                      14,
                    )),
                padding: getPadding(left: 16, right: 16, top: 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Make changes to this action".tr,
                      clr: ColorConstant.whiteA700,
                      fontSize: getFontSize(16),
                      customWeight: FontWeight.w600,
                    ),
                    SizedBox(
                      height: getVerticalSize(5),
                    ),
                    MyText(
                      title: "Are you sure you want to make a change".tr,
                      clr: ColorConstant.white60,
                      fontSize: getFontSize(14),
                      customWeight: FontWeight.w400,
                    ),
                    SizedBox(
                      height: getVerticalSize(10),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: () {
                        Get.back();
                        WebHandoffSheet.show(feature: 'Editing events');
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Edit",
                          clr: ColorConstant.primaryAccent,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                    const CustomDivider(),
                    GestureDetector(
                      onTap: () {
                        Get.back();
                        CustomSnackBar.showCustomToast(
                            message: "Event Deleted Successfully");
                      },
                      child: Container(
                        width: size.width,
                        padding: getPadding(top: 10, bottom: 15),
                        alignment: Alignment.center,
                        child: MyText(
                          title: "Delete",
                          clr: ColorConstant.errorRed,
                          fontSize: getFontSize(14),
                          customWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: getVerticalSize(20),
              ),
              MediaSelectionTileAndroid(
                  title: "Cancel".tr,
                  textColor: ColorConstant.bg,
                  onPressed: () {
                    Get.back();
                  }),
              SizedBox(
                height: getVerticalSize(20),
              ),
            ],
          ),
        );
      },
    );
  }
}
