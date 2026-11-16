import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

class CreatorHomeTabController extends GetxController {
  /// The signed-in creator's events (any status) from `GET /events/mine`.
  RxList<Map<String, dynamic>> events = <Map<String, dynamic>>[].obs;
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
    } catch (e) {
      loadError.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  /// Events that are published and haven't started yet.
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

  static String formatEventDate(Map<String, dynamic> e) {
    final dt = _startsAt(e);
    if (dt == null) return '';
    return DateFormat('EEEE, d MMMM yyyy').format(dt);
  }

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
