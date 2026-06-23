import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/resell_tab/controllers/resell_tab_controller.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';

class History extends StatelessWidget {
  History({
    super.key,
  });

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MyText(
          title: "Recent",
          clr: Colors.white,
          fontSize: 20,
          customWeight: FontWeight.bold,
        ),
        SizedBox(
          height: getSize(15),
        ),
        const BidWidget(
          title: "Claypaky",
          askingPrice: 820,
          askingExpiration: "6 Days",
          isFulfilled: true,
        ),
        const BidWidget(
          title: "Cyberpunk",
          askingPrice: 500,
          isExpired: true,
        ),
      ],
    );
  }
}
