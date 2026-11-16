import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';
import 'package:block_tix/app/modules/creator_dashboard/controllers/creator_dashboard_controller.dart';
import 'package:intl/intl.dart';

import 'package:get/get.dart';

import '../controllers/creator_home_tab_controller.dart';

class CreatorHomeTabView extends StatelessWidget {
  CreatorHomeTabView({Key? key}) : super(key: key);

  final CreatorHomeTabController controller =
      Get.put(CreatorHomeTabController());

  @override
  Widget build(BuildContext context) {
    return Container(
      color: ColorConstant.night,
      child: RefreshIndicator(
        onRefresh: controller.loadEvents,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            _header(),
            const SizedBox(height: 18),
            Obx(() {
              if (controller.isLoading.value && controller.events.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(48),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (controller.loadError.value != null &&
                  controller.events.isEmpty) {
                return SahraEmptyState(
                  title: "Couldn't load events",
                  message: controller.loadError.value,
                  actionLabel: 'Retry',
                  onAction: controller.loadEvents,
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _tonightCard(),
                  const SizedBox(height: 14),
                  _doorActions(),
                  const SizedBox(height: 22),
                  _upcomingSection(),
                  const SizedBox(height: 18),
                  _studioCard(),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Events',
                  style: sahraText(size: 26, weight: FontWeight.w700)),
              const SizedBox(height: 3),
              Text('Door mode — scan, guests and live events',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ],
          ),
        ),
        SahraStatusPill('Studio',
            color: ColorConstant.gold,
            background: ColorConstant.gold.withValues(alpha: .14)),
      ],
    );
  }

  Widget _tonightCard() {
    final event = controller.upcomingEvents.isEmpty
        ? controller.events.firstWhere(
            (e) => e['status']?.toString() == 'PUBLISHED',
            orElse: () =>
                controller.events.isEmpty ? const {} : controller.events.first,
          )
        : controller.upcomingEvents.first;
    if (event.isEmpty) {
      return SahraEmptyState(
        title: 'No events yet',
        message:
            'Create your first event in Sahra Studio, then run the door from here.',
        actionLabel: 'Open Studio',
        onAction: () => WebHandoffSheet.show(feature: 'Creating events'),
      );
    }
    final startsAt = CreatorHomeTabController.eventStartsAt(event);
    final date = startsAt == null
        ? 'Date to be announced'
        : DateFormat('EEE d MMM · h:mm a').format(startsAt);
    return GestureDetector(
      onTap: () => _openEvent(event),
      child: SahraCard(
        padding: EdgeInsets.zero,
        radius: 22,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Stack(
            children: [
              Container(
                height: 190,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      ColorConstant.nightElevated,
                      ColorConstant.nightDeep
                    ],
                  ),
                ),
                child: Center(
                  child: Icon(Icons.nightlife_rounded,
                      size: 54,
                      color: ColorConstant.gold.withValues(alpha: .5)),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, ColorConstant.nightDeep],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('TONIGHT',
                        style: sahraText(
                            color: ColorConstant.gold,
                            size: 11,
                            weight: FontWeight.w700,
                            letterSpacing: 1.2)),
                    const SizedBox(height: 6),
                    Text(event['title']?.toString() ?? 'Untitled Event',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: sahraText(size: 24, weight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(date,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 12)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _doorActions() {
    return Row(
      children: [
        Expanded(
          child: _actionTile(
            icon: Icons.qr_code_scanner_rounded,
            label: 'Scan tickets',
            onTap: () => Get.toNamed(Routes.MY_SCANNER),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _actionTile(
            icon: Icons.groups_rounded,
            label: 'Guest list',
            onTap: _openGuests,
          ),
        ),
      ],
    );
  }

  Widget _actionTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: SahraCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: ColorConstant.gold.withValues(alpha: .14),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: ColorConstant.gold, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(label,
                  style: sahraText(size: 14, weight: FontWeight.w600)),
            ),
            Icon(Icons.chevron_right_rounded,
                color: ColorConstant.nightMuted, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _upcomingSection() {
    final upcoming = controller.upcomingEvents;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text('Upcoming',
                  style: sahraText(size: 18, weight: FontWeight.w700)),
            ),
            Text('${upcoming.length}',
                style: sahraText(color: ColorConstant.nightMuted, size: 12)),
          ],
        ),
        const SizedBox(height: 10),
        if (upcoming.isEmpty)
          SahraCard(
            child: Text('No upcoming published events.',
                style: sahraText(color: ColorConstant.nightMuted, size: 13)),
          )
        else
          ...upcoming.map((e) => SahraEventTile(
                event: e,
                onTap: () => _openEvent(e),
              )),
        if (controller.pastEvents.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text('Drafts & past',
              style: sahraText(size: 18, weight: FontWeight.w700)),
          const SizedBox(height: 10),
          ...controller.pastEvents.take(5).map((e) => _pastTile(e)),
        ],
      ],
    );
  }

  Widget _pastTile(Map<String, dynamic> event) {
    final status = CreatorHomeTabController.statusLabel(event);
    return GestureDetector(
      onTap: () => _openEvent(event),
      child: SahraCard(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event['title']?.toString() ?? 'Untitled Event',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: sahraText(size: 14, weight: FontWeight.w600)),
                  const SizedBox(height: 3),
                  Text(CreatorHomeTabController.formatEventDate(event),
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 11)),
                ],
              ),
            ),
            SahraStatusPill(status,
                color: status == 'PUBLISHED'
                    ? ColorConstant.successGreen
                    : ColorConstant.warningOrange,
                background: ColorConstant.nightElevated),
          ],
        ),
      ),
    );
  }

  Widget _studioCard() {
    return SahraCard(
      color: ColorConstant.nightElevated,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('STUDIO',
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 11,
                      weight: FontWeight.w700,
                      letterSpacing: 1.2)),
              const Spacer(),
              Icon(Icons.open_in_new_rounded,
                  color: ColorConstant.nightMuted, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          Text(
              'Create events, edit tiers, promo codes, payouts and analytics on sahra.app/studio',
              style: sahraText(
                  color: ColorConstant.nightMuted, size: 13, height: 1.45)),
          const SizedBox(height: 12),
          SahraPillButton(
            label: 'Open Sahra Studio',
            onTap: () => WebHandoffSheet.show(feature: 'Creating events'),
          ),
        ],
      ),
    );
  }

  void _openEvent(Map<String, dynamic> event) {
    Get.toNamed(Routes.CREATOR_EVENT, arguments: {
      'id': event['id']?.toString(),
      'title': event['title']?.toString(),
    });
  }

  void _openGuests() {
    try {
      final dash = Get.find<CreatorDashboardController>();
      dash.selectedIndex.value = 1;
      dash.changePage(1);
    } catch (_) {
      Get.toNamed(Routes.ALL_GUESTS);
    }
  }
}
