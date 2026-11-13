import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/resell_tab/controllers/resell_tab_controller.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';

class Asks extends StatelessWidget {
  Asks({
    super.key,
  });

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MyText(
          title: "Ongoing",
          family: 'Manrope',
          customWeight: FontWeight.w700,
          fontSize: 20,
        ),
        SizedBox(
          height: getSize(15),
        ),
        BidWidget(
          title: "DJ Orignawa",
          askingPrice: 500,
          askingExpiration: "2 Days",
          onTap: () => Get.toNamed(Routes.ASK_BID,
              arguments: {'fromSell': true, 'title': "DJ Orignawa"}),
          onOptionsTap: () {
            controller.showSheet(context);
          },
        ),
        BidWidget(
          title: "Retrowita",
          askingPrice: 820,
          askingExpiration: "6 Days",
          onTap: () => Get.toNamed(Routes.ASK_BID,
              arguments: {'fromSell': true, 'title': "Retrowita"}),
          onOptionsTap: () {
            controller.showSheet(context);
          },
        ),
      ],
    );
  }
}
