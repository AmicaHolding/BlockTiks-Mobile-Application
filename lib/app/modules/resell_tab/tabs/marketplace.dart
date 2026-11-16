import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/modules/resell_tab/controllers/resell_tab_controller.dart';

class MarketPlace extends StatelessWidget {
  MarketPlace({super.key});

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(children: [
        const SahraSmallLabel('Resale'),
        Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SahraCard(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Selling starts from Tickets',
                      style: sahraText(size: 18, weight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(
                      'Choose a ticket you hold, set your price, and manage the sale from the Tickets tab.',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 13)),
                  const SizedBox(height: 14),
                  SahraPillButton(
                      label: 'Open my tickets',
                      onTap: () => Get.toNamed(Routes.WALLET)),
                ]))),
      ]),
    );
  }
}
