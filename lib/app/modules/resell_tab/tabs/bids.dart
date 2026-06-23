import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/resell_tab/controllers/resell_tab_controller.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';

class Bids extends StatelessWidget {
  Bids({
    super.key,
  });

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const MyText(
          title: "Ongoing",
          clr: Colors.white,
          fontSize: 20,
          customWeight: FontWeight.bold,
        ),
        SizedBox(
          height: getSize(15),
        ),
        BidWidget(
          title: "Cyberpunk",
          currentBid: 500,
          biddingExpiration: "2 Days",
          // onTap: () => Get.toNamed(Routes.PLACE_BID),
          onOptionsTap: () {
            controller.showSheet(context,fromAsk: false);
          },
        ),
        BidWidget(
          title: "Claypaky",
          currentBid: 820,
          biddingExpiration: "6 Days",
          // onTap: () => Get.toNamed(Routes.PLACE_BID),
          onOptionsTap: () {
            controller.showSheet(context,fromAsk: false);
          },
        ),
      ],
    );
  }
}
