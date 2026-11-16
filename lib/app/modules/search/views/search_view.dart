import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/search_controller.dart';

class SearchView extends StatelessWidget {
  const SearchView({super.key, this.embedded = false});
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(MySearchController());
    final content = SafeArea(
      bottom: false,
      child: Column(children: [
        _searchBar(controller),
        _filters(controller),
        Expanded(child: _body(controller)),
      ]),
    );
    if (embedded) return content;
    return BaseviewScreen(
        showLogo: true,
        showBackBtn: true,
        sidePadding: false,
        showBottomBar: false,
        child: content);
  }

  Widget _searchBar(MySearchController c) {
    return Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
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

  Widget _filters(MySearchController c) {
    final cats = <String>{'All'};
    for (final e in c.recentEvents) {
      final cat = e['category']?.toString().trim() ?? '';
      if (cat.isNotEmpty) cats.add(cat);
    }
    return SizedBox(
        height: 42,
        child: Obx(() => ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: cats.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final cat = cats.elementAt(i);
                final selected = c.selectedCategory.value == cat ||
                    (cat == 'All' && c.selectedCategory.value == null);
                return SahraChip(
                    label: cat,
                    selected: selected,
                    onTap: () =>
                        c.selectedCategory.value = cat == 'All' ? null : cat);
              },
            )));
  }

  List<Map<String, dynamic>> _filtered(
      List<Map<String, dynamic>> events, MySearchController c) {
    final cat = c.selectedCategory.value;
    if (cat == null || cat.isEmpty) return events;
    return events.where((e) => e['category']?.toString() == cat).toList();
  }

  Widget _body(MySearchController c) {
    return Obx(() {
      if (c.isEmpty.value) {
        final recent = _filtered(c.recentEvents, c);
        return ListView(children: [
          const SahraSmallLabel('Popular right now'),
          ...recent.take(8).map((e) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SahraEventTile(
                  event: e,
                  onTap: () => Get.toNamed(Routes.EVENT_DETAIL, arguments: {
                        'id': e['id']?.toString() ?? '',
                        'title': e['title']?.toString() ?? ''
                      })))),
          if (recent.isEmpty)
            const SahraEmptyState(
                title: 'No events yet',
                message: 'Check back soon for the next sahra.'),
        ]);
      }
      if (c.searchLoading.value)
        return Center(
            child: CircularProgressIndicator(color: ColorConstant.gold));
      if (c.searchError.value != null)
        return SahraEmptyState(
            title: "Search didn't work",
            message: c.searchError.value,
            actionLabel: 'Retry',
            onAction: () => c.onSearchChanged(c.searchController.text));
      final results = _filtered(c.searchResults, c);
      return ListView(children: [
        if (results.isEmpty)
          const SahraEmptyState(
              title: 'No matches',
              message: 'Try another artist, venue, or event.'),
        ...results.map((e) => Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SahraEventTile(
                event: e,
                onTap: () => Get.toNamed(Routes.EVENT_DETAIL, arguments: {
                      'id': e['id']?.toString() ?? '',
                      'title': e['title']?.toString() ?? ''
                    })))),
      ]);
    });
  }
}
