import 'dart:async';

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

  /// Hero carousel state — swipeable PageView cycling the featured events,
  /// with dot indicator and gentle auto-advance.
  final PageController _heroPages = PageController();
  Timer? _heroTimer;
  int _heroCount = 0;
  bool _heroUserDragging = false;

  static const int _heroMax = 5;

  @override
  void initState() {
    super.initState();
    _heroTimer = Timer.periodic(
        const Duration(seconds: 6), (_) => _autoAdvanceHero());
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroPages.dispose();
    super.dispose();
  }

  void _autoAdvanceHero() {
    if (!mounted || _heroUserDragging) return;
    if (_heroCount < 2 || !_heroPages.hasClients) return;
    final current =
        _heroPages.page?.round() ?? controller.currentImage.value;
    if (current < 0 || current >= _heroCount) {
      _heroPages.jumpToPage(0);
      return;
    }
    _heroPages.animateToPage((current + 1) % _heroCount,
        duration: const Duration(milliseconds: 450), curve: Curves.easeOut);
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

  /// City picker, spec 30 "changing your city": bottom sheet of supported
  /// cities. TODO(api-gap: feed city is filtered client-side; move to
  /// `GET /feed?city=` once the events endpoint accepts a city param)
  Future<void> _pickCity() async {
    final picked = await Get.bottomSheet<String>(
      Container(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        decoration: BoxDecoration(
            color: ColorConstant.nightElevated,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24))),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 18),
              decoration: BoxDecoration(
                  color: ColorConstant.nightBorder,
                  borderRadius: BorderRadius.circular(99))),
          Text('Pick your city',
              style: sahraText(size: 22, weight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Events are local, what’s on is different everywhere.',
              style: sahraText(color: ColorConstant.nightMuted, size: 13.5)),
          const SizedBox(height: 16), ...ForYouController.cities.map((c) {
            final selected = controller.city.value == c;
            return Material(
              type: MaterialType.transparency,
              child: ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(c,
                  style: sahraText(
                      size: 16,
                      weight: selected ? FontWeight.w700 : FontWeight.w500,
                      color:
                          selected ? ColorConstant.gold : ColorConstant.whiteA700)),
              trailing:
                  selected ? Icon(Icons.check_rounded, color: ColorConstant.gold) : null,
              onTap: () => Get.back(result: c),
            ));
          }),
        ]),
      ),
      isScrollControlled: true,
    );
    if (picked != null) controller.selectCity(picked);
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
            Obx(() {
              if (controller.isLoading.value)
                return SliverToBoxAdapter(
                    child: Padding(
                        padding: const EdgeInsets.all(48),
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
              final events = controller.cityEvents;
              if (events.isEmpty)
                return SliverToBoxAdapter(
                    child: _emptyCity());
              final featured = events.take(_heroMax).toList();
              final rest = events.skip(featured.length).toList();
              return SliverList(
                  delegate: SliverChildListDelegate([
                _heroCarousel(featured),
                if (rest.isNotEmpty) ...[
                  const SahraSectionLabel('More coming up'),
                  ...rest.map(_eventRow),
                ],
                const SizedBox(height: 28),
              ]));
            }),
          ],
        ),
      ),
    );
  }

  /// Header · Sahra logo, city pill (opens the city sheet), bell w/ unread
  /// dot that opens Inbox.
  Widget _header() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(children: [
        CustomImageView(
            imagePath: ImageConstant.logoGold, width: 64, fit: BoxFit.fitWidth),
        const Spacer(),
        GestureDetector(
          onTap: _pickCity,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface,
                borderRadius: BorderRadius.circular(999)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Obx(() => Text(controller.city.value,
                  style: sahraText(size: 14, weight: FontWeight.w500))),
              const SizedBox(width: 6),
              Icon(Icons.keyboard_arrow_down_rounded,
                  color: ColorConstant.gold, size: 18),
            ]),
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          onTap: controller.openInbox,
          child: Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface,
                borderRadius: BorderRadius.circular(14)),
            child: Stack(children: [
              Icon(Icons.notifications_outlined,
                  color: ColorConstant.whiteA700, size: 20),
              Obx(() => controller.hasUnread.value
                  ? Positioned(
                      top: 2,
                      right: 2,
                      child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                              color: ColorConstant.rumman,
                              shape: BoxShape.circle)))
                  : const SizedBox.shrink()),
            ]),
          ),
        ),
      ]),
    );
  }

  /// Hero carousel · swipes through the featured events (top [_heroMax]),
  /// dots below, auto-advances every 6s while the user isn't touching it.
  Widget _heroCarousel(List<Map<String, dynamic>> featured) {
    _heroCount = featured.length;
    if (featured.length == 1) return _hero(featured.first);
    if (controller.currentImage.value >= featured.length) {
      // City/events changed under the carousel, resync after layout.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        controller.currentImage.value = 0;
        if (_heroPages.hasClients) _heroPages.jumpToPage(0);
      });
    }
    return Column(children: [
      SizedBox(
        height: 322, // hero card footprint (18 top + 300 + 4 bottom)
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n is ScrollStartNotification) {
              // dragDetails is non-null only for real user drags.
              _heroUserDragging = n.dragDetails != null;
            } else if (n is ScrollEndNotification) {
              _heroUserDragging = false;
            }
            return false;
          },
          child: PageView.builder(
            controller: _heroPages,
            itemCount: featured.length,
            onPageChanged: (i) => controller.currentImage.value = i,
            itemBuilder: (_, i) => _hero(featured[i]),
          ),
        ),
      ),
      const SizedBox(height: 10),
      Obx(() {
        final active = controller.currentImage.value
            .clamp(0, featured.length - 1);
        return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < featured.length; i++)
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                  color: i == active
                      ? ColorConstant.gold
                      : ColorConstant.nightBorder,
                  borderRadius: BorderRadius.circular(99)),
            ),
        ]);
      }),
    ]);
  }

  /// Hero, photo card with "Selling fast" tag (rule T8).
  Widget _hero(Map<String, dynamic> event) {
    final image = event['imageUrl']?.toString() ?? '';
    final title = event['title']?.toString() ?? 'Event';
    final date = formatEventDate(event['startsAt']?.toString(),
        tz: event['venueTimezone']?.toString());
    final venue = event['venue']?.toString() ??
        event['location']?.toString() ??
        '';
    final price = lowestTierPrice(event);
    return GestureDetector(
      onTap: () => controller.openEvent(event),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 18, 20, 4),
        height: 300,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          color: ColorConstant.nightElevated,
          image: image.isNotEmpty
              ? DecorationImage(
                  image: CachedNetworkImageProvider(image),
                  fit: BoxFit.cover)
              : null,
        ),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0x66000000),
                  Colors.transparent,
                  Color(0xE6101826)
                ]),
          ),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const SahraStatusPill('Selling fast'),
                ]),
                const Spacer(),
                Text(title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: sahraText(
                        size: 26, weight: FontWeight.w800, height: 1.1)),
                const SizedBox(height: 6),
                Text(
                  [
                    date,
                    if (venue.isNotEmpty) venue,
                    if (price != null)
                      'From ${formatMoney((price * 100).round(), event['currency']?.toString())}',
                  ].join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: sahraText(
                      color: ColorConstant.gold,
                      size: 13.5,
                      weight: FontWeight.w500),
                ),
              ]),
        ),
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

  /// Empty-city state · "changing your city" sheet destination.
  Widget _emptyCity() {
    return Padding(
      padding: const EdgeInsets.all(28),
      child: Column(children: [
        const SizedBox(height: 60),
        Text('Nothing in ${controller.city.value} yet',
            style: sahraText(size: 22, weight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text('Your next sahra is waiting somewhere.',
            style: sahraText(color: ColorConstant.nightMuted, size: 14)),
        const SizedBox(height: 22),
        SahraPillButton(
            label: 'Back to Dubai',
            onTap: () => controller.selectCity('Dubai')),
      ]),
    );
  }
}
