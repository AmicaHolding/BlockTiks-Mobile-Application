import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/search_controller.dart';

class SearchView extends StatelessWidget {
  const SearchView({super.key, this.embedded = false});
  final bool embedded;

  static const _segments = [
    ['events', 'Events'],
    ['venues', 'Venues'],
    ['artists', 'Artists'],
  ];

  static const _trending = ['GA', 'Arabic night', 'Comedy', 'This weekend'];

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<MySearchController>();
    final content = SafeArea(
      bottom: false,
      child: Column(children: [
        if (!embedded) const SahraBackHeader(title: 'Search'),
        _searchBar(controller),
        _segmentsRow(controller),
        Expanded(child: _body(controller)),
      ]),
    );
    if (embedded) return content;
    return BaseviewScreen(
        showLogo: false,
        showBackBtn: false,
        sidePadding: false,
        showBottomBar: false,
        child: content);
  }

  Widget _searchBar(MySearchController c) {
    return Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
        child: Container(
          decoration: BoxDecoration(
              color: ColorConstant.nightSurface,
              borderRadius: BorderRadius.circular(14)),
          child: TextField(
            controller: c.searchController,
            onChanged: c.onSearchChanged,
            style: sahraText(size: 16),
            cursorColor: ColorConstant.gold,
            decoration: InputDecoration(
              hintText: 'Artists, events, venues',
              hintStyle: sahraText(color: ColorConstant.nightMuted),
              prefixIcon:
                  Icon(Icons.search_rounded, color: ColorConstant.nightMuted),
              suffixIcon: c.isEmpty.value
                  ? null
                  : GestureDetector(
                      onTap: () {
                        c.searchController.clear();
                        c.onSearchChanged('');
                      },
                      child: Icon(Icons.close_rounded,
                          color: ColorConstant.nightMuted)),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ));
  }

  /// Events | Venues | Artists, no Users segment (account search is not
  /// exposed on mobile).
  Widget _segmentsRow(MySearchController c) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      child: Obx(() => Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface,
                borderRadius: BorderRadius.circular(14)),
            child: Row(
                children: _segments.map((s) {
              final selected = c.segment.value == s[0];
              return Expanded(
                child: GestureDetector(
                  onTap: () => c.segment.value = s[0],
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: selected
                          ? ColorConstant.gold
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(s[1],
                        style: sahraText(
                            color: selected
                                ? ColorConstant.night
                                : ColorConstant.nightMuted,
                            size: 14,
                            weight: FontWeight.w600)),
                  ),
                ),
              );
            }).toList()),
          )),
    );
  }

  List<Map<String, dynamic>> _filtered(
      List<Map<String, dynamic>> events, MySearchController c) {
    final cat = c.selectedCategory.value;
    if (cat == null || cat.isEmpty) return events;
    return events.where((e) => e['category']?.toString() == cat).toList();
  }

  Widget _body(MySearchController c) {
    return Obx(() {
      if (c.isEmpty.value) return _idle(c);
      if (c.searchLoading.value)
        return Center(
            child: CircularProgressIndicator(color: ColorConstant.gold));
      if (c.searchError.value != null)
        return SahraEmptyState(
            title: "Search didn't work",
            message: c.searchError.value,
            actionLabel: 'Retry',
            onAction: () => c.onSearchChanged(c.searchController.text));
      switch (c.segment.value) {
        case 'venues':
          return _nameResults(c.venueResults, c, 'No venues match');
        case 'artists':
          return _nameResults(c.artistResults, c, 'No artists match');
        default:
          return _eventResults(c);
      }
    });
  }

  /// Idle state, recent searches, trending tags, then what's available now.
  Widget _idle(MySearchController c) {
    return ListView(children: [
      if (c.recentSearches.isNotEmpty) ...[
        SahraSectionLabel('Recent searches', trailing: GestureDetector(
            onTap: c.clearRecent,
            child: Text('Clear',
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 13)))), ...c.recentSearches.map((q) => ListTile(
              dense: true,
              leading: Icon(Icons.history_rounded,
                  color: ColorConstant.nightMuted, size: 20),
              title: Text(q, style: sahraText(size: 15)),
              onTap: () => c.applyQuery(q),
            )),
      ],
      const SahraSmallLabel('Trending'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Wrap(spacing: 8, runSpacing: 8, children: [
          ..._trending.map(
              (t) => SahraChip(label: t, onTap: () => c.applyQuery(t))),
        ]),
      ),
      const SahraSmallLabel('Available now'), ..._filtered(c.recentEvents, c).take(6).map((e) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SahraEventTile(event: e, onTap: () => _open(e)))),
      if (c.recentEvents.isEmpty)
        const SahraEmptyState(
            title: 'No events yet',
            message: 'Check back soon for the next sahra.'),
    ]);
  }

  /// Venues / artists rows, name + event count, tap focuses the events tab.
  Widget _nameResults(
      List<Map<String, dynamic>> rows, MySearchController c, String emptyTitle) {
    if (rows.isEmpty)
      return SahraEmptyState(
          title: emptyTitle,
          message: "Nothing for '${c.searchController.text}'. Try changing your city.");
    return ListView(children: [
      ...rows.map((r) => ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20),
            title: Text(r['name'].toString(),
                style: sahraText(size: 16, weight: FontWeight.w600)),
            subtitle: Text('${r['count']} event${r['count'] == 1 ? '' : 's'}',
                style:
                    sahraText(color: ColorConstant.nightMuted, size: 13)),
            trailing: Icon(Icons.chevron_right_rounded,
                color: ColorConstant.nightMuted),
            onTap: () => c.focusOn(r['name'].toString()),
          )),
    ]);
  }

  Widget _eventResults(MySearchController c) {
    final results = _filtered(c.eventResults, c);
    return ListView(children: [
      if (c.focus.value != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
          child: Wrap(children: [
            SahraChip(
                label: '× ${c.focus.value}',
                selected: true,
                onTap: () => c.focus.value = null),
          ]),
        ),
      if (results.isEmpty)
        SahraEmptyState(
            title: "Nothing for '${c.searchController.text}'",
            message: 'Try another artist, venue, or event, or change your city.'), ...results.map((e) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SahraEventTile(event: e, onTap: () => _open(e)))),
    ]);
  }

  void _open(Map<String, dynamic> e) =>
      Get.toNamed(Routes.EVENT_DETAIL, arguments: {
        'id': e['id']?.toString() ?? '',
        'title': e['title']?.toString() ?? ''
      });
}
