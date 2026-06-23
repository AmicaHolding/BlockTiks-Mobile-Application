import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/follow_following/views/follow_following_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/manage_teams_controller.dart';

class ManageTeamsView extends GetView<ManageTeamsController> {
  const ManageTeamsView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: false,
      sidePadding: false,
      showLogo: true,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      child: Padding(
        padding: getPadding(left: 16, right: 16),
        child: Column(
          children: [
            MyText(
              title:'Teams',
                customWeight: FontWeight.w700,
                fontSize: 22,
                clr: ColorConstant.whiteA700,
            ),
            SizedBox(
              height: getSize(15),
            ),
            SearchField(),
            SizedBox(
              height: getSize(5),
            ),
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
                  Container(
                    margin: getMargin(top: 20, bottom: 20),
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          Obx(() => ListView.builder(
                            scrollDirection: Axis.vertical,
                            physics: NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                            itemCount:controller.teams.length,
                            itemBuilder: (_, index) {
                              final item = controller.teams[index];
                              return TeamTile(
                                name: item.title,
                                description: "${item.members} Members",
                                isTeam: true,
                                onOptionsTap: (){
                                  controller.showEditTeamDialog(context, index);
                                },
                                onTap: (){
                                  if(controller.fromAddHost){
                                    Get.back();
                                    CustomSnackBar.showCustomToast(message: "New team added in co host");
                                  }
                                },
                              );
                            },
                          )),
                          SizedBox(height: getSize(15),),
                          GestureDetector(
                            onTap: (){
                              Get.toNamed(Routes.ADD_TEAM)!.then((value) {
                                if(value != null){
                                  controller.teams.add(DummyCreateTeamsModel(title: value['title'], members: value['members']));
                                  controller.teams.refresh();
                                }
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
                  Container(
                    margin: getMargin(top: 20, bottom: 20),
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          ListView.builder(
                            scrollDirection: Axis.vertical,
                            physics: NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                            itemCount: 4,
                            itemBuilder: (_, index) {
                              return TeamTile(
                                name: "Name $index",
                                description: DummyContent.dummyRoles[Random().nextInt(DummyContent.dummyRoles.length)],
                                isTeam: false,
                                onTap: (){
                                  if(controller.fromAddHost){
                                    Get.back();
                                    CustomSnackBar.showCustomToast(message: "New person added in co host");
                                  }else{
                                    Get.toNamed(Routes.OTHER_USER_PROFILE);
                                  }

                                },
                                onOptionsTap: (){
                                  controller.showIndividualDialog(context);
                                },
                              );
                            },
                          ),
                          SizedBox(height: getSize(15),),
                          GestureDetector(
                            onTap: ()=>  controller.showIndividualDialog(context),
                            child: MyText(
                              title: "+ Add Individual",
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
          ],
        ),
      ),
    );
  }
}

class TeamTile extends StatelessWidget {
  const TeamTile(
      {super.key, required this.name,required this.description,required this.isTeam, this.onOptionsTap, this.onTap});

  final String name;
  final String description;
  final bool isTeam;
  final void Function()? onOptionsTap;
  final void Function()? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: getPadding(left: 15, right: 15, top: 10, bottom: 10),
        margin: getMargin(bottom: 15),
        decoration: BoxDecoration(
            color: ColorConstant.whiteA700.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            isTeam? Offstage() :CustomImageView(
              imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
              width: 30,
              height: 30,
              radius: BorderRadius.circular(5),
              margin: getMargin(right: 15),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText(
                  title: name,
                  fontSize: 16,
                  customWeight: FontWeight.w600,
                ),
                MyText(
                  title: description,
                  fontSize: 14,
                  clr: ColorConstant.white60,
                ),
              ],
            ),
            const Spacer(),
            // !isTeam ?
            CustomImageView(
              onTap: onOptionsTap,
              svgPath: ImageConstant.optionsTicket,
              width: getSize(25),
              height: getSize(15),
              fit: BoxFit.fitHeight,
            )
                // :
            // Icon(Icons.edit,color: ColorConstant.whiteA700,)
          ],
        ),
      ),
    );
  }
}
