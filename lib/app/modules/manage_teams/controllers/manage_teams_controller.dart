import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/media_selection_tile.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:get/get.dart';

class ManageTeamsController extends GetxController with GetSingleTickerProviderStateMixin {
  late TabController tabController;

  Rxn<String> selectedRole = Rxn<String>();

  TextEditingController username = TextEditingController();


  List<String> roles = DummyContent.dummyRoles;

  RxList<DummyCreateTeamsModel> teams = <DummyCreateTeamsModel>[].obs;

  bool fromAddHost = false;

  @override
  void onInit() {
    var data = Get.arguments;
    if(data!= null && data['fromCoHost']!= null){
      fromAddHost = data['fromCoHost'];
    }
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
  }


  void showIndividualDialog(BuildContext context,{bool fromTeam = false,int index = -1}){
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
        ),
        child: Container(
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16.0),
              color: ColorConstant.bg),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  color: ColorConstant.bg,
                  padding: const EdgeInsets.only(top: 8.0),
                  margin: const EdgeInsets.only(bottom: 0),
                  child: Padding(
                    padding: const EdgeInsets.only(
                        top: 10.0, left: 16, right: 16, bottom: 10),
                    child: Row(
                      crossAxisAlignment:
                      CrossAxisAlignment.center,
                      mainAxisSize: MainAxisSize.max,
                      children: [
                        // GestureDetector(
                        //   onTap: () {
                        //     Get.back();
                        //   },
                        //   child: Container(
                        //     height:getSize(30),
                        //     width:getSize(30),
                        //     decoration: BoxDecoration(
                        //         color: ColorConstant.whiteA700.withOpacity(0.1),
                        //         borderRadius: BorderRadius.circular(8)
                        //     ),
                        //     alignment: Alignment.center,
                        //     child: Padding(
                        //       padding: getPadding(left: 8),
                        //       child: Icon(Icons.arrow_back_ios,
                        //         color: ColorConstant.whiteA700,
                        //         size: 18,
                        //       ),
                        //     ),
                        //   ),
                        // ),
                        Expanded(
                            flex: 2,
                            child: Center(
                              child: AppbarTitle(
                                text: "Invite Individual",
                                margin: EdgeInsets.only(
                                    right:
                                    getHorizontalSize(
                                        28.0),
                                    left: 20),
                              ),
                            )
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: getPadding(left: 10,right: 16,top: 20,bottom: 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        margin: getMargin(bottom: 30),
                        // padding: getPadding(left: 15,right: 15,),

                        child: SearchField(
                          controller: username,
                          hintText: "Search handle or email",
                        ),
                      ),
                      Container(
                        margin: getMargin(bottom: 30),
                        padding: getPadding(left: 15,right: 15,),
                        decoration: BoxDecoration(
                            color: ColorConstant.whiteA700.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8)
                        ),
                        child: Obx(() => DropdownButton<String>(
                          value: selectedRole.value,
                          dropdownColor: ColorConstant.black900,
                          hint: const MyText(title: 'Select Role'),
                          icon: Icon(Icons.keyboard_arrow_down_sharp,color: ColorConstant.whiteA700,),
                          // The down arrow icon
                          isExpanded: true,
                          underline: const SizedBox(),
                          // Remove the default underline
                          items: roles.map((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: MyText(title: value),
                            );
                          }).toList(),
                          onChanged: (String? newValue) {
                            selectedRole.value = newValue;  // No need to assign null before assigning newValue
                          },
                        )),
                      ),

                      Padding(
                        padding: getPadding(top: 16,bottom: 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            Expanded(
                                child: Container()),
                            const SizedBox(
                              width: 10,
                            ),
                            Expanded(
                                child: CustomButton(
                                  text: "Send",
                                  onTap: () {
                                    if(username.text.trim().isNotEmpty && selectedRole.value != null){
                                      if(fromTeam){
                                        teams[index].members = teams[index].members+1;
                                        teams.refresh();
                                      }
                                      username.text = '';
                                      selectedRole.value = null;
                                      Get.back();
                                    }else{
                                      CustomSnackBar.showCustomErrorToast(message: "Please provide complete detail");
                                    }

                                  },
                                )),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void showEditTeamDialog(BuildContext context,int index){
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(14),
            topRight: Radius.circular(14),
          )),
      builder: (BuildContext bc) {
        return SafeArea(
          child: Container(
            padding: getPadding(left: 16, right: 16, top: 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  children: [
                    GestureDetector(
                      onTap: () {
                        Get.back();
                      },
                      child: MyText(
                        title: "lbl_cancel".tr,
                        clr: ColorConstant.blueGray400,
                        fontSize: getFontSize(14),
                        customWeight: FontWeight.w400,
                      ),
                    ),
                    SizedBox(
                      width: size.width,
                      child: Center(
                        child: MyText(
                          title: "lbl_select_option".tr,
                          clr: ColorConstant.blueGray900,
                          fontSize: getFontSize(16),
                          customWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "Edit".tr,
                    onPressed: () {
                      Get.back();
                      Get.toNamed(Routes.ADD_TEAM);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "Add Members".tr,
                    onPressed: () {
                      Get.back();
                      showIndividualDialog(context,fromTeam: true,index: index);
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
                MediaSelectionTileAndroid(
                    title: "Delete".tr,
                    onPressed: () {
                      Get.back();
                      teams.removeAt(index);
                      teams.refresh();
                    }),
                SizedBox(
                  height: getVerticalSize(20),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
