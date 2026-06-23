import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';
import 'package:block_tix/app/modules/resell_tab/controllers/resell_tab_controller.dart';

class MarketPlace extends StatelessWidget {
  MarketPlace({
    super.key,
  });

  final controller = Get.put(ResellTabController());

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          CustomListView(
            title: "Hot Tickets",
            fromMarketPlace: true,
            onTap: (){
              Get.toNamed(Routes.PLACE_BID);
            },
          ),
          CustomListView(
            title: "Newly Released",
            fromMarketPlace: true,
          ),
        ],
      ),
    );
  }
}
