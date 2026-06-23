import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/utils/helper_functions.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/modules/manage_teams/views/manage_teams_view.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/add_team_controller.dart';

class AddTeamView extends GetView<AddTeamController> {
  const AddTeamView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      bodyPadding: false,
      sidePadding: false,
      showLogo: false,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: false,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "Save".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            if(controller.formKey.currentState!.validate()){
              if(controller.teamNameController.text.trim().isNotEmpty && controller.users.isNotEmpty){
                Get.back(result:  {
                  "title": controller.teamNameController.text,
                  "members": controller.users.length
                });
              }else{
                CustomSnackBar.showCustomErrorToast(message: "Please add at least one member in the team");
              }
            }


          },
        ),
      ),
      child: Padding(
        padding: getPadding(left: 16, right: 16),
        child: Column(
          children: [
            Container(
              padding: getPadding(left: 16, right: 16),
              margin: getMargin(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Form(
                key: controller.formKey,
                child: TextFormField(
                  controller: controller.teamNameController,
                  // onTap: onTap,
                  style: GoogleFonts.getFont("Inter",
                      fontSize: 16, color: ColorConstant.whiteA700),
                  // onChanged: onChanged,
                  // readOnly: readOnly,
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    contentPadding: getPadding(
                      right: getSize(15),
                    ),
                    hintText:  "Team Name",
                    hintStyle: const TextStyle(color: ColorConstant.whiteColor),
                    border: InputBorder.none,
                  ),
                  validator: (val){
                    return HelperFunction.stringValidate(val);
                  },
                ),
              ),
            ),
            SizedBox(
              height: getSize(15),
            ),
            Expanded(
              child: SingleChildScrollView(
              child: Column(
                children: [
                  Obx(() => ListView.builder(
                    scrollDirection: Axis.vertical,
                    physics: NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    itemCount: controller.users.length,
                    itemBuilder: (_, index) {
                      final item = controller.users[index];
                      return TeamTile(
                        name: item.title,
                        description:item.role,
                        isTeam: false,
                      );
                    },
                  )),
                  SizedBox(height: getSize(15),),
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
            )
          ],
        ),
      ),
    );
  }
}
