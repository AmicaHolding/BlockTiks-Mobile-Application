import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/follow_following/views/follow_following_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/add_co_host_controller.dart';

class AddCoHostView extends GetView<AddCoHostController> {
  const AddCoHostView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return  BaseViewPageScreen(
      hideAppBar: false,
      sidePadding: false,
      bodyPadding: true,
      showNotification: false,
      showBackBtn: true,
      screenName: "Add Co Host",
      centerTitle: true,
      // actions: [
      //   GestureDetector(
      //     onTap: (){
      //       Get.toNamed(Routes.MANAGE_TEAMS,arguments: {'fromCoHost': true});
      //     },
      //     child: Icon(Icons.person_add_alt_outlined,color: ColorConstant.whiteA700.withValues(alpha: .7),
      //     ),
      //   ),
      // ],
      child: Column(
        children: [
          SizedBox(height: getSize(16),),
          SearchField(),
          TabBar(
            controller: controller.tabController,
            indicatorColor: ColorConstant.primaryPink,
            // Set indicator color
            indicatorWeight: 3.0,
            // Set indicator thickness
            isScrollable: false,
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: Colors.white,
            // Set label color
            unselectedLabelColor: ColorConstant.answerColor,
            // Set unselected label color
            tabs: const [
              Tab(text: 'Teams'),
              Tab(text: 'Individuals'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: controller.tabController,
              children: [
                SingleChildScrollView(
                  child: Container(
                    margin: getMargin(top: 20, bottom: 20),
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          ListView.builder(
                            scrollDirection: Axis.vertical,
                            physics: NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                            itemCount: DummyContent.dummyTeams.length,
                            itemBuilder: (_, index) {
                              return AddCoHostTile(
                                model: DummyContent.dummyTeams[index],
                              );
                            },
                          ),
                          SizedBox(height: getSize(20),),
                          GestureDetector(
                            onTap: (){
                              Get.toNamed(Routes.ADD_TEAM)!.then((value) {
                                // if(value != null){
                                //   controller.teams.add(DummyCreateTeamsModel(title: value['title'], members: value['members']));
                                //   controller.teams.refresh();
                                // }
                              });
                            },
                            child: MyText(
                              title: "+ Add Team",
                              fontSize: 16,
                              customWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),

                  ),
                ),
                Container(
                  margin: getMargin(top: 20, bottom: 20),
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        ListView.builder(
                          scrollDirection: Axis.vertical,
                          physics: NeverScrollableScrollPhysics(),
                          shrinkWrap: true,
                          itemCount: DummyContent.dummyIndividual.length,
                          itemBuilder: (_, index) {
                            return AddCoHostTile(
                              model: DummyContent.dummyIndividual[index],
                            );
                          },
                        ),
                        SizedBox(height: getSize(20),),
                        GestureDetector(
                          onTap: ()=> controller.showIndividualDialog(context),
                          child: MyText(
                            title: "+ Add Teammate",
                            fontSize: 16,
                            customWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: getSize(16),),
        ],
      ),
    );
  }
}


class AddCoHostTile extends StatelessWidget{
  AddCoHostTile({super.key,required this.model,this.isLast = false});

  final DummyTeamsModel model;
  final bool isLast;

  final controller = Get.put(AddCoHostController());

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: ColorConstant.whiteA700.withValues(alpha: .05),
        borderRadius: BorderRadius.circular(getSize(5))
      ),
      padding: getPadding(left: 12,right: 12,top: 10,bottom: 10),
      margin: getMargin(bottom: isLast? 10 : 15),
      child: Row(
        children: [
          GestureDetector(
            onTap: (){
              model.isSelected.value = !model.isSelected.value;
            },
            child: Obx(()=> CustomImageView(
              svgPath: model.isSelected.value ? ImageConstant.check : ImageConstant.uncheck,
              height: getSize(24),
              width: getSize(24),
              color: ColorConstant.whiteA700.withValues(alpha: .35),
            )),
          ),
          SizedBox(width: getSize(20),),
          Expanded(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: getSize(155)
              ),
              child: MyText(title: model.title,fontSize: 16,
              ),
            ),
          ),
          Obx(()=> model.isSelected.value ?
          Container(
            width: getSize(132),
            height: getSize(30),
            padding: getPadding(left: 5,right: 5,),
            decoration: BoxDecoration(
                color: ColorConstant.whiteA700.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)
            ),
            child: Obx(() => DropdownButton<String>(
              value: controller.selectedRole.value,
              dropdownColor: ColorConstant.black900,
              hint: const MyText(title: 'Role'),
              icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
              // The down arrow icon
              isExpanded: true,
              underline: const SizedBox(),
              // Remove the default underline
              items: controller.roles.map((String value) {
                return DropdownMenuItem<String>(
                  value: value,
                  child: Row(
                    children: [
                      Icon(controller.icons[value == 'Checker' ? 0 : 1],color: ColorConstant.whiteA700, ),
                      SizedBox(width: getSize(10),),
                      MyText(title: value),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (String? newValue) {
                controller.selectedRole.value = newValue;  // No need to assign null before assigning newValue
              },
            )),
          ) : Offstage(),)
        ],
      ),
    );
  }

}
