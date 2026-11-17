import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../controllers/for_you_controller.dart';

class ForYouView extends StatefulWidget {
  ForYouView({super.key});

  @override
  State<ForYouView> createState() => _ForYouViewState();
}

class _ForYouViewState extends State<ForYouView> {
  final ForYouController controller = Get.find<ForYouController>();
  String selectedCategory = 'All';

  List<Map<String, dynamic>> get visibleEvents {
    if (selectedCategory == 'All') return controller.events;
    return controller.events
        .where((e) => e['category']?.toString() == selectedCategory)
        .toList();
  }

  void openSearch() {
    if (Get.isRegistered<UserDashboardController>()) {
      final dashboard = Get.find<UserDashboardController>();
      dashboard.selectedIndex.value = 1;
      dashboard.changePage(1);
    } else {
      Get.toNamed(Routes.USER_DASHBOARD, arguments: {'index': 1});
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        color: ColorConstant.gold,
        backgroundColor: ColorConstant.nightSurface,
        onRefresh: controller.fetchEvents,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _header()),
            SliverToBoxAdapter(child: _searchAndChips()),
            Obx(() {
              if (controller.isLoading.value)
                return SliverToBoxAdapter(
                    child: Padding(
                        padding: EdgeInsets.all(48),
                        child: Center(
                            child: CircularProgressIndicator(
                                color: ColorConstant.gold))));
              if (controller.loadError.value != null) {
                return SliverToBoxAdapter(
                    child: SahraEmptyState(
                        title: "Couldn't load events",
                        message: controller.loadError.value,
                        actionLabel: 'Retry',
                        onAction: controller.fetchEvents));
              }
              final events = visibleEvents;
              if (events.isEmpty)
                return const SliverToBoxAdapter(
                    child: SahraEmptyState(
                        title: 'Nothing here yet',
                        message: 'Your next sahra is waiting.'));
              return SliverList(
                  delegate: SliverChildListDelegate([
                _featured(events.first),
                SahraSectionLabel('This weekend',
                    trailing: GestureDetector(
                        onTap: openSearch,
                        child: Text('See all',
                            style: sahraText(
                                color: ColorConstant.gold,
                                size: 14,
                                weight: FontWeight.w500)))),
                ...events.take(6).map(_eventRow),
                const SizedBox(height: 28),
              ]));
            }),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(children: [
        CustomImageView(
            imagePath: ImageConstant.logoGold, width: 64, fit: BoxFit.fitWidth),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
              color: ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(999)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text('Dubai', style: sahraText(size: 14, weight: FontWeight.w500)),
            const SizedBox(width: 6),
            Icon(Icons.keyboard_arrow_down_rounded,
                color: ColorConstant.gold, size: 18),
          ]),
        ),
      ]),
    );
  }

  Widget _searchAndChips() {
    final categories = <String>{'All'};
    for (final e in controller.events) {
      final c = e['category']?.toString().trim();
      if (c != null && c.isNotEmpty) categories.add(c);
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Good evening',
            style: sahraText(color: ColorConstant.gold, size: 15)),
        const SizedBox(height: 4),
        Text("What's the sahra tonight?",
            style: sahraText(
                size: 30,
                weight: FontWeight.w800,
                height: 1.1,
                letterSpacing: -.8)),
        const SizedBox(height: 18),
        GestureDetector(
          onTap: openSearch,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface,
                borderRadius: BorderRadius.circular(14)),
            child: Row(children: [
              Icon(Icons.search_rounded,
                  color: ColorConstant.nightMuted, size: 20),
              const SizedBox(width: 10),
              Text('Artists, venues, events',
                  style: sahraText(color: ColorConstant.nightMuted, size: 15)),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final cat = categories.elementAt(i);
                return SahraChip(
                    label: cat,
                    selected: selectedCategory == cat,
                    onTap: () => setState(() => selectedCategory = cat));
              },
            )),
      ]),
    );
  }

  Widget _featured(Map<String, dynamic> event) {
    final image = event['imageUrl']?.toString() ?? '';
    final title = event['title']?.toString() ?? 'Event';
    final date =
        formatEventDate(event['startsAt']?.toString(), includeTime: false);
    final location = event['location']?.toString() ?? '';
    final category = event['category']?.toString() ?? 'Event';
    final price = lowestTierPrice(event);
    return GestureDetector(
      onTap: () => controller.openEvent(event),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 12, 20, 8),
        decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: ColorConstant.nightElevated),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: SizedBox(
                  height: 132,
                  width: double.infinity,
                  child: image.isEmpty
                      ? Container(
                          decoration: const BoxDecoration(
                              gradient: LinearGradient(colors: [
                          Color(0xFF2F4560),
                          Color(0xFF22344D)
                        ])))
                      : CachedNetworkImage(
                          imageUrl: image, fit: BoxFit.cover))),
          Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                          child: Text(title,
                              style: sahraText(
                                  size: 20, weight: FontWeight.w600))),
                      const SizedBox(width: 10),
                      const SahraStatusPill('Featured'),
                    ]),
                    const SizedBox(height: 4),
                    Text(
                        '$category · $date · $location${price == null ? '' : ' · From \$${price.toStringAsFixed(price % 1 == 0 ? 0 : 2)}'}',
                        style: sahraText(color: ColorConstant.gold, size: 13)),
                  ])),
        ]),
      ),
    );
  }

  Widget _eventRow(Map<String, dynamic> event) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SahraEventTile(
          event: event, onTap: () => controller.openEvent(event)),
    );
  }
}
