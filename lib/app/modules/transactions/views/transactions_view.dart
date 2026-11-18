import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/transactions_controller.dart';

class TransactionsView extends GetView<TransactionsController> {
  const TransactionsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
        backgroundColor: ColorConstant.night,
          foregroundColor: ColorConstant.whiteA700,
        elevation: 0,
        title: Text('Transactions',
            style: sahraText(size: 22, weight: FontWeight.w800)),
      ),
      body: Column(children: [
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: controller.tabs.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) => Center(
                child: Obx(() => SahraChip(
                  label: controller.tabs[index],
                  selected: controller.selectedTab.value == index,
                  onTap: () => controller.selectedTab.value = index,
                ))),
          ),
        ),
        Expanded(
          child: Obx(() {
            if (controller.isLoading.value) {
              return Center(
                  child: CircularProgressIndicator(color: ColorConstant.gold));
            }
            if (controller.loadError.value != null) {
              return Center(
                  child: Text(controller.loadError.value!,
                      style: sahraText(color: ColorConstant.nightMuted)));
            }
            final rows = controller.filtered;
            if (rows.isEmpty) {
              return Center(
                  child: Text('No transactions',
                      style: sahraText(color: ColorConstant.nightMuted)));
            }
            return RefreshIndicator(
              color: ColorConstant.gold,
              onRefresh: controller.fetch,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final t = rows[index];
                  return SahraCard(
                    child: Row(children: [
                      Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t['title']?.toString() ?? 'Transaction',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: sahraText(
                                      size: 15, weight: FontWeight.w600)),
                              const SizedBox(height: 3),
                              Text(t['subtitle']?.toString() ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 12)),
                              const SizedBox(height: 4),
                              Text(
                                  '${t['status'] ?? ''} · ${controller.dateLabel(t['createdAt']?.toString())}',
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 11)),
                            ]),
                      ),
                      const SizedBox(width: 12),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(controller.amountLabel(t),
                                style: sahraText(
                                    color: controller.amountColor(t),
                                    size: 15,
                                    weight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            SahraStatusPill(t['status']?.toString() ?? '',
                                color: t['status'] == 'Ready'
                                    ? ColorConstant.gold
                                    : ColorConstant.nightMuted),
                          ]),
                    ]),
                  );
                },
              ),
            );
          }),
        ),
      ]),
    );
  }
}
