import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/constants.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/for_you/views/for_you_view.dart';
import 'package:block_tix/app/modules/resell_tab/views/resell_tab_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/creator_home_tab_controller.dart';

class CreatorHomeTabView extends StatelessWidget {
  CreatorHomeTabView({Key? key}) : super(key: key);

  final CreatorHomeTabController controller = Get.put(CreatorHomeTabController());
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          Padding(
            padding: getPadding(all: 16),
            child: SearchField(
              onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
              readOnly: true,
            ),
          ),
          CustomButton(
            onTap: () => Get.toNamed(Routes.CREATE_EVENT),
            text: '+ Create new event',
            margin: getMargin(left: 16,right: 16),
          ),

          const SizedBox(height: 20),
          CustomListView(
            title: "Upcoming Events",
            showPrice: false,
            showDate: true,
            onTap: (){
              Get.toNamed(Routes.CREATOR_EVENT);
            },
            showOptions: true,
            onOptionsTap:(){
              controller.showUpcomingEventSheet(context);
            }
          ),
          const SizedBox(height: 5),
          Padding(
            padding: getPadding(all: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const MyText(
                  title: "Past Events",
                  clr: Colors.white,
                  fontSize: 20,
                  customWeight: FontWeight.bold,
                ),
                SizedBox(
                  height: getSize(15),
                ),
                BidWidget(
                  title: "DJ Orignawa",
                  date: "Friday, 22 September 2024",
                  fromCreator: true,
                  onTap: ()=> Get.toNamed(Routes.EVENT_DETAIL,arguments: {Constants.paramCreator:true}),
                  onOptionsTap: () {
                    controller.showSheet(context);
                  },
                ),
                BidWidget(
                  title: "Retrowita",
                  date: "Friday, 22 September 2024",
                  fromCreator: true,
                  onTap: ()=> Get.toNamed(Routes.EVENT_DETAIL,arguments: {Constants.paramCreator:true}),
                  onOptionsTap: () {
                    controller.showSheet(context);
                  },
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
