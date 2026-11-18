import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';


import '../controllers/all_guests_controller.dart';

class AllGuestsView extends GetView<AllGuestsController> {
  const AllGuestsView({Key? key, this.embedded = false}) : super(key: key);

  /// Inside the creator dashboard PageView there is no room for a second
  /// scaffold/app bar, so the tab renders only the guest-list body.
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final body = _body(context);
    if (embedded) {
      return Container(
        color: ColorConstant.night,
        child: SafeArea(child: body),
      );
    }
    return BaseViewPageScreen(
      bodyPadding: true,
      sidePadding: false,
      screenName: 'Guest List',
      centerTitle: true,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      child: body,
    );
  }

  Widget _body(BuildContext context) {
    return RefreshIndicator(
      onRefresh: controller.fetchGuests,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Text('Guest list',
              style: sahraText(size: 26, weight: FontWeight.w700)),
          const SizedBox(height: 12),
          _eventPicker(),
          const SizedBox(height: 12),
          _statsRow(),
          const SizedBox(height: 14),
          _searchField(),
          const SizedBox(height: 12),
          _filterRow(),
          const SizedBox(height: 12),
          Obx(() {
            if (controller.loadError.value != null) {
              return SahraEmptyState(
                title: "Couldn't load guests",
                message: controller.loadError.value,
                actionLabel: 'Retry',
                onAction: controller.fetchGuests,
              );
            }
            final guests = controller.visibleGuests;
            if (guests.isEmpty && !controller.isLoading.value) {
              return SahraEmptyState(
                title: controller.events.isEmpty
                    ? 'No published events yet'
                    : 'No guests match',
                message: controller.searchQuery.value.isNotEmpty
                    ? 'Try a different name, email or order #'
                    : 'Try another filter',
              );
            }
            return Column(
              children: guests.map(_guestTile).toList(),
            );
          }),
        ],
      ),
    );
  }

  Widget _eventPicker() {
    return Obx(() {
      if (controller.events.length <= 1) {
        final title = controller.selectedEventTitle;
        return SahraCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.event_available_outlined,
                  color: ColorConstant.gold, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title.isNotEmpty ? title : 'Select an event',
                    style: sahraText(size: 14, weight: FontWeight.w600)),
              ),
              if (controller.isLoading.value)
                const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
        );
      }
      return SizedBox(
        height: 38,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: controller.events.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, index) {
            final e = controller.events[index];
            final id = e['id']?.toString() ?? '';
            final selected = controller.selectedEventId.value == id;
            return SahraChip(
              label: (e['title'] ?? 'Event').toString(),
              selected: selected,
              onTap: () => controller.selectEvent(id),
            );
          },
        ),
      );
    });
  }

  Widget _statsRow() {
    return Obx(() => Row(
          children: [
            _stat('Checked in', '${controller.checkedIn.value}',
                'of ${controller.total.value}'),
            const SizedBox(width: 10),
            _stat(
                'Not in',
                '${(controller.total.value - controller.checkedIn.value).clamp(0, controller.total.value)}',
                'pending'),
            const SizedBox(width: 10),
            _stat('All', '${controller.total.value}', 'guests'),
          ],
        ));
  }

  Widget _stat(String label, String value, String caption) {
    return Expanded(
      child: SahraCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: sahraText(color: ColorConstant.nightMuted, size: 11)),
            const SizedBox(height: 2),
            Text(value, style: sahraText(size: 20, weight: FontWeight.w700)),
            Text(caption,
                style: sahraText(color: ColorConstant.nightMuted, size: 10)),
          ],
        ),
      ),
    );
  }

  Widget _searchField() {
    return Container(
      decoration: BoxDecoration(
        color: ColorConstant.nightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ColorConstant.nightBorder),
      ),
      child: TextField(
        onChanged: controller.setSearch,
        style: sahraText(color: ColorConstant.whiteA700, size: 14),
        decoration: InputDecoration(
          isDense: true,
          border: InputBorder.none,
          hintText: 'Search name, email or order #',
          hintStyle: sahraText(color: ColorConstant.nightMuted, size: 13),
          prefixIcon: Icon(Icons.search_rounded,
              color: ColorConstant.nightMuted, size: 20),
          suffixIcon: Obx(() => controller.searchQuery.value.isEmpty
              ? const SizedBox.shrink()
              : IconButton(
                  icon: Icon(Icons.close_rounded,
                      color: ColorConstant.nightMuted, size: 18),
                  onPressed: () => controller.setSearch(''),
                )),
        ),
      ),
    );
  }

  Widget _filterRow() {
    return SizedBox(
      height: 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: controller.filter.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) => Center(
            child: Obx(() => SahraChip(
                  label:
                      '${controller.filter[index]} · ${_filterCount(index)}',
                  selected: controller.selectedFilter.value == index,
                  onTap: () => controller.selectedFilter.value = index,
                ))),
      ),
    );
  }

  int _filterCount(int index) {
    switch (index) {
      case 1:
        return controller.checkedIn.value;
      case 2:
        return (controller.total.value - controller.checkedIn.value)
            .clamp(0, controller.total.value);
      default:
        return controller.total.value;
    }
  }

  Widget _guestTile(Map<String, dynamic> g) {
    final isIn = g['status'] == 'USED';
    final name = g['name']?.toString() ?? 'Guest';
    final email = g['email']?.toString() ?? '';
    final code = g['code']?.toString() ?? '';
    final tier = g['sectionName']?.toString().isNotEmpty == true
        ? g['sectionName'].toString()
        : (g['tierName']?.toString() ?? '');
    final checking = controller.checkingInCode.value == code;
    final checkedAt = formatEventTime(g['checkedInAt']?.toString() ?? '');

    return SahraCard(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: ColorConstant.nightElevated,
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'G',
              style: sahraText(
                  color: ColorConstant.gold, size: 15, weight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(size: 15, weight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  [
                    if (email.isNotEmpty) email,
                    if (tier.isNotEmpty) tier,
                    if (code.isNotEmpty) code,
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: sahraText(color: ColorConstant.nightMuted, size: 11),
                ),
                if (isIn && checkedAt.isNotEmpty)
                  Text('In at $checkedAt',
                      style: sahraText(
                          color: ColorConstant.successGreen, size: 11)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (isIn)
            Row(mainAxisSize: MainAxisSize.min, children: [
              SahraStatusPill('In',
                  color: ColorConstant.successGreen,
                  background:
                      ColorConstant.successGreen.withValues(alpha: .14)),
              const SizedBox(width: 8),
              // Undo check-in (spec 56), a mistaken tap is fixable.
              GestureDetector(
                onTap: checking ? null : () => controller.undoCheckIn(code),
                child: Icon(Icons.undo_rounded,
                    color: ColorConstant.nightMuted, size: 20),
              ),
            ])
          else
            GestureDetector(
              onTap: checking ? null : () => controller.checkIn(code),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
                    : Text('Check in',
                        style: sahraText(
                            color: ColorConstant.night,
                            size: 12,
                            weight: FontWeight.w700)),
              ),
            ),
        ],
      ),
    );
  }
}
