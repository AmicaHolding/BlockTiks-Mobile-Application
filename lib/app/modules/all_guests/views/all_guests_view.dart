import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/all_guests_controller.dart';

class AllGuestsView extends GetView<AllGuestsController> {
  const AllGuestsView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: true,
      sidePadding: false,
      screenName: "Guest List",
      centerTitle: true,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Event picker — the guest list is per-event.
            Obx(() => SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: controller.events.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, index) {
                      final e = controller.events[index];
                      final id = e['id']?.toString() ?? '';
                      final selected = controller.selectedEventId.value == id;
                      return GestureDetector(
                        onTap: () => controller.selectEvent(id),
                        child: Container(
                          padding: getPadding(left: 14, right: 14, top: 8, bottom: 8),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            color: selected ? ColorConstant.gold : Colors.transparent,
                            border: Border.all(
                              color: selected ? Colors.transparent : ColorConstant.hairline,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: MyText(
                            title: (e['title'] ?? 'Event').toString(),
                            fontSize: 12,
                            customWeight: FontWeight.w600,
                            clr: selected ? ColorConstant.night : ColorConstant.whiteA700,
                          ),
                        ),
                      );
                    },
                  ),
                )),
            SizedBox(height: getSize(12)),
            // Check-in progress.
            Obx(() => Row(
                  children: [
                    _stat('Checked in', '${controller.checkedIn.value}'),
                    const SizedBox(width: 10),
                    _stat('Total', '${controller.total.value}'),
                    const Spacer(),
                    if (controller.isLoading.value)
                      const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                )),
            SizedBox(height: getSize(16)),
            // Filter chips.
            SizedBox(
              height: 30,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: controller.filter.length,
                itemBuilder: (context, index) {
                  return GestureDetector(
                    onTap: () {
                      controller.selectedFilter.value = index;
                      controller.filterItems();
                    },
                    child: Obx(() => Container(
                          margin: getMargin(right: 8),
                          padding: getPadding(left: 14, right: 14, top: 6, bottom: 6),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: controller.selectedFilter.value == index
                                  ? Colors.transparent
                                  : ColorConstant.hairline,
                            ),
                            color: controller.selectedFilter.value == index
                                ? ColorConstant.gold
                                : Colors.transparent,
                          ),
                          alignment: Alignment.center,
                          child: MyText(
                            title: controller.filter[index],
                            fontSize: 11,
                            customWeight: FontWeight.w600,
                            clr: controller.selectedFilter.value == index
                                ? ColorConstant.night
                                : ColorConstant.whiteA700,
                          ),
                        )),
                  );
                },
              ),
            ),
            SizedBox(height: getSize(16)),
            Obx(() {
              if (controller.loadError.value != null) {
                return Padding(
                  padding: getPadding(bottom: 20),
                  child: Column(
                    children: [
                      MyText(
                        title: "Couldn't load guests",
                        family: 'Manrope',
                        customWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                      const SizedBox(height: 6),
                      MyText(
                        title: controller.loadError.value ?? '',
                        family: 'Inter',
                        fontSize: 12,
                        clr: ColorConstant.white60,
                        center: true,
                      ),
                      const SizedBox(height: 10),
                      PrimaryPillButton(
                        text: 'Retry',
                        onTap: controller.fetchGuests,
                      ),
                    ],
                  ),
                );
              }
              final guests = controller.visibleGuests;
              if (guests.isEmpty && !controller.isLoading.value) {
                return Padding(
                  padding: getPadding(bottom: 30),
                  child: Center(
                    child: MyText(
                      title: controller.events.isEmpty
                          ? 'No published events yet'
                          : 'No guests match this filter',
                      family: 'Inter',
                      fontSize: 13,
                      clr: ColorConstant.white60,
                    ),
                  ),
                );
              }
              return Column(
                children: guests.map((g) => _guestTile(g)).toList(),
              );
            }),
            SizedBox(height: getSize(30)),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Container(
      padding: getPadding(left: 14, right: 14, top: 10, bottom: 10),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ColorConstant.nightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MyText(
            title: label,
            family: 'Inter',
            fontSize: 11,
            clr: ColorConstant.nightMuted,
          ),
          MyText(
            title: value,
            family: 'Manrope',
            customWeight: FontWeight.w700,
            fontSize: 20,
            clr: ColorConstant.whiteA700,
          ),
        ],
      ),
    );
  }

  Widget _guestTile(Map<String, dynamic> g) {
    final isIn = g['status'] == 'USED';
    final name = g['name']?.toString() ?? 'Guest';
    final tier = g['sectionName']?.toString().isNotEmpty == true
        ? g['sectionName'].toString()
        : (g['tierName']?.toString() ?? '');
    final code = g['code']?.toString() ?? '';
    final checking = controller.checkingInCode.value == code;

    return Container(
      padding: getPadding(left: 16, right: 16, top: 12, bottom: 12),
      margin: getMargin(bottom: 10),
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ColorConstant.nightBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: ColorConstant.nightElevated,
            child: MyText(
              title: name.isNotEmpty ? name[0].toUpperCase() : 'G',
              family: 'Manrope',
              customWeight: FontWeight.w700,
              fontSize: 16,
              clr: ColorConstant.gold,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText(
                  title: name,
                  family: 'Manrope',
                  customWeight: FontWeight.w600,
                  fontSize: 15,
                ),
                const SizedBox(height: 2),
                MyText(
                  title: [
                    if (tier.isNotEmpty) tier,
                    if (code.isNotEmpty) code,
                    if (g['createdAt'] != null)
                      formatEventDate(g['createdAt'].toString(), includeTime: false),
                  ].join(' · '),
                  family: 'Inter',
                  fontSize: 11,
                  clr: ColorConstant.white60,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (isIn)
            Container(
              padding: getPadding(left: 10, right: 10, top: 5, bottom: 5),
              decoration: BoxDecoration(
                color: ColorConstant.successGreen.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(999),
              ),
              child: MyText(
                title: 'In',
                family: 'Inter',
                fontSize: 11,
                customWeight: FontWeight.w600,
                clr: ColorConstant.successGreen,
              ),
            )
          else
            GestureDetector(
              onTap: checking ? null : () => controller.checkIn(code),
              child: Container(
                padding: getPadding(left: 14, right: 14, top: 8, bottom: 8),
                decoration: BoxDecoration(
                  color: ColorConstant.gold,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: checking
                    ? const SizedBox(
                        height: 14,
                        width: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : MyText(
                        title: 'Check in',
                        family: 'Inter',
                        fontSize: 12,
                        customWeight: FontWeight.w700,
                        clr: ColorConstant.night,
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
