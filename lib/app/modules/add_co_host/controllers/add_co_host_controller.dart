import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:get/get.dart';

class AddCoHostController extends GetxController with GetSingleTickerProviderStateMixin {
  late TabController tabController;

  Rxn<String> selectedRole = Rxn<String>();

  List<String> roles = [
    "Checker",
    "Admin"
  ];
  List<IconData> icons = [
    Icons.logout_sharp,
    Icons.admin_panel_settings_outlined
  ];

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();


  RxList<DummyIndividualModel> users = <DummyIndividualModel>[].obs;
  TextEditingController userNameController = TextEditingController();
  TextEditingController teamNameController = TextEditingController();


  void showIndividualDialog(BuildContext context){
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
                          controller: userNameController,
                          hintText: "Search handle or email",
                        ),
                      ),
                      Container(
                        padding: getPadding(left: 15,right: 15,),
                        decoration: BoxDecoration(
                            color: ColorConstant.whiteA700.withValues(alpha: 0.1),
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
                                    Get.back();
                                    users.add(DummyIndividualModel(title: userNameController.text,role: selectedRole.value??"Check In"));
                                    userNameController.text = "";
                                    selectedRole.value = null;
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

  @override
  void onInit() {
    super.onInit();
    tabController = TabController(length: 2, vsync: this);
  }
}
