import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/faqs_controller.dart';

class FaqsView extends GetView<FaqsController> {
  const FaqsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
          backgroundColor: ColorConstant.night,
          elevation: 0,
          title: Text('Help',
              style: sahraText(size: 22, weight: FontWeight.w800))),
      body: Obx(() {
        if (controller.isLoading.value) {
          return Center(
              child: CircularProgressIndicator(color: ColorConstant.gold));
        }
        if (controller.loadError.value != null) {
          return Center(
              child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(controller.loadError.value!,
                      textAlign: TextAlign.center,
                      style: sahraText(color: ColorConstant.nightMuted))));
        }
        final faqs = controller.flatFaqs;
        return Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              onChanged: (v) => controller.searchQuery.value = v,
              style: sahraText(size: 15),
              decoration: InputDecoration(
                hintText: 'Search questions',
                hintStyle: sahraText(color: ColorConstant.nightMuted, size: 15),
                prefixIcon: Icon(Icons.search, color: ColorConstant.nightMuted),
                filled: true,
                fillColor: ColorConstant.nightSurface,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          SizedBox(
            height: 46,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: controller.categoryNames.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final name = controller.categoryNames[index];
                return Obx(() => SahraChip(
                    label: name,
                    selected: controller.category.value == name,
                    onTap: () => controller.category.value = name));
              },
            ),
          ),
          Expanded(
            child: faqs.isEmpty
                ? Center(
                    child: Text('No questions found',
                        style: sahraText(color: ColorConstant.nightMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                    itemCount: faqs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final faq = faqs[index];
                      final i = faq['index'] as int;
                      final open = controller.expanded.contains(i);
                      return SahraCard(
                        padding: EdgeInsets.zero,
                        child: Column(children: [
                          InkWell(
                            onTap: () => controller.toggle(i),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(children: [
                                Expanded(
                                    child: Text(faq['q']?.toString() ?? '',
                                        style: sahraText(
                                            size: 15,
                                            weight: FontWeight.w600))),
                                const SizedBox(width: 12),
                                Text(open ? '−' : '+',
                                    style: sahraText(
                                        color: ColorConstant.gold,
                                        size: 20,
                                        weight: FontWeight.w700)),
                              ]),
                            ),
                          ),
                          if (open)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              child: Text(faq['a']?.toString() ?? '',
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 14)),
                            ),
                        ]),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: SahraCard(
                child: Row(children: [
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text('Still stuck?',
                            style:
                                sahraText(size: 14, weight: FontWeight.w600)),
                        Text('We reply in Arabic or English',
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 13)),
                      ])),
                  TextButton(
                      onPressed: () {},
                      child: Text('Chat',
                          style: sahraText(
                              color: ColorConstant.night,
                              size: 14,
                              weight: FontWeight.w600))),
                ]),
              ),
            ),
          ),
        ]);
      }),
    );
  }
}
