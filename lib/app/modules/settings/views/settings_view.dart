import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_switch.dart';

import '../controllers/settings_controller.dart';

class SettingsView extends GetView<SettingsController> {
  const SettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      sidePadding: false,
      showLogo: true,
      showBackBtn: true,
      basicAppBar: true,
      resizeToAvoidBottomInset: true,
      showNotification: true,
      bottomNavigationBar: SafeArea(
        child: CustomButton(
          text: "lbl_save".tr,
          margin: getMargin(right: 20, left: 20, bottom: 30, top: 10),
          shape: ButtonShape.RoundedBorder10,
          onTap: () {
            Get.back();
          },
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          children: [
            MyText(
              title: 'Settings',
              clr: ColorConstant.whiteA700,
              fontSize: 18,
              customWeight: FontWeight.w600,
            ),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.topLeft,
              child: MyText(
                title: 'Notifications',
                family: 'Manrope',
                fontSize: 18,
                customWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Obx(() => settingWidget(
                  title: "App Notifications",
                  desc: "Enable app notification popup",
                  switchVal: controller.notificationSwitchValue.value,
                  onChanged: (val) {
                    controller.notificationSwitchValue.value =
                        !controller.notificationSwitchValue.value;
                  },
                )),
            Obx(() => settingWidget(
                  title: "Email Notification",
                  desc: "Enable email notification",
                  switchVal: controller.emailSwitchValue.value,
                  onChanged: (val) {
                    controller.emailSwitchValue.value =
                        !controller.emailSwitchValue.value;
                  },
                )),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.topLeft,
              child: MyText(
                title: 'Security & Privacy',
                family: 'Manrope',
                fontSize: 18,
                customWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            settingWidget(
                title: "Change Password",
                desc: "Set new login Password",
                isSwitch: false),
            Obx(() => settingWidget(
                  title: "Two-step verification",
                  desc: "Enable sms verification",
                  switchVal: controller.twoStepSwitchValue.value,
                  onChanged: (val) {
                    controller.twoStepSwitchValue.value =
                        !controller.twoStepSwitchValue.value;
                  },
                )),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.topLeft,
              child: MyText(
                title: 'Regional Preferences',
                family: 'Manrope',
                fontSize: 18,
                customWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            settingWidget(
                title: "Language",
                desc: "Set your preferred language",
                trailing: SizedBox(
                  width: 100,
                  child: Obx(() => DropdownButton<String>(
                        value: controller.selectedLanguage.value,
                        dropdownColor: ColorConstant.black900,
                        hint: const MyText(title: 'Select type'),
                        icon: const Icon(Icons.keyboard_arrow_down_sharp),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: controller.languages.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: MyText(title: value),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          controller.selectedLanguage.value = newValue!;
                        },
                      )),
                )),
            settingWidget(
                title: "Currency",
                desc: "Set your currency",
                trailing: SizedBox(
                  width: 100,
                  child: Obx(() => DropdownButton<String>(
                        value: controller.selectedCurrency.value,
                        dropdownColor: ColorConstant.black900,
                        hint: const MyText(title: 'Select type'),
                        icon: const Icon(Icons.keyboard_arrow_down_sharp),
                        // The down arrow icon
                        isExpanded: true,
                        underline: const SizedBox(),
                        // Remove the default underline
                        items: controller.currencies.map((String value) {
                          return DropdownMenuItem<String>(
                            value: value,
                            child: MyText(title: value),
                          );
                        }).toList(),
                        onChanged: (String? newValue) {
                          controller.selectedCurrency.value = newValue!;
                        },
                      )),
                )),
          ],
        ),
      ),
    );
  }

  Widget settingWidget(
      {required String title,
      String? desc,
      bool isSwitch = true,
      bool switchVal = false,
      Function(bool)? onChanged,
      Widget? trailing}) {
    return Container(
      margin: getMargin(bottom: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MyText(
                title: title,
                family: 'Manrope',
                fontSize: 16,
              ),
              MyText(
                title: desc ?? "",
                family: 'Manrope',
                customWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ],
          ),
          trailing ??
              (isSwitch
                  ? CustomSwitch(
                      value: switchVal,
                      onChanged: onChanged,
                    )
                  : const Icon(
                      Icons.arrow_forward_ios,
                      color: Colors.white,
                    ))
        ],
      ),
    );
  }
}
