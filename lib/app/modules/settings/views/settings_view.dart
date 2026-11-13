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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MyText(
              title: 'Settings',
              family: 'Manrope',
              clr: ColorConstant.whiteA700,
              fontSize: 18,
              customWeight: FontWeight.w700,
            ),
            const SizedBox(height: 20),
            const _SectionHeader(title: 'Notifications'),
            const SizedBox(height: 10),
            settingsGroup(children: [
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
            ]),
            const SizedBox(height: 20),
            const _SectionHeader(title: 'Security & Privacy'),
            const SizedBox(height: 10),
            settingsGroup(children: [
              settingWidget(
                title: "Change Password",
                desc: "Set new login Password",
                isSwitch: false,
                onTap: () => Get.toNamed(Routes.CHANGE_PASSWORD,
                    arguments:
                        controller.profileData.value?.user?.email ?? ""),
              ),
              Obx(() => settingWidget(
                    title: "Two-step verification",
                    desc: "Enable sms verification",
                    switchVal: controller.twoStepSwitchValue.value,
                    onChanged: (val) {
                      controller.twoStepSwitchValue.value =
                          !controller.twoStepSwitchValue.value;
                    },
                  )),
            ]),
            const SizedBox(height: 20),
            const _SectionHeader(title: 'Regional Preferences'),
            const SizedBox(height: 10),
            settingsGroup(children: [
              settingWidget(
                title: "Language",
                desc: "Set your preferred language",
                trailing: SizedBox(
                  width: 100,
                  child: Obx(() => DropdownButton<String>(
                        value: controller.selectedLanguage.value,
                        dropdownColor: ColorConstant.elevated,
                        hint: const MyText(title: 'Select type'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,
                            color: ColorConstant.white60),
                        isExpanded: true,
                        underline: const SizedBox(),
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
                ),
              ),
              settingWidget(
                title: "Currency",
                desc: "Set your currency",
                trailing: SizedBox(
                  width: 100,
                  child: Obx(() => DropdownButton<String>(
                        value: controller.selectedCurrency.value,
                        dropdownColor: ColorConstant.elevated,
                        hint: const MyText(title: 'Select type'),
                        icon: Icon(Icons.keyboard_arrow_down_sharp,
                            color: ColorConstant.white60),
                        isExpanded: true,
                        underline: const SizedBox(),
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
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget settingsGroup({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: ColorConstant.elevated,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            if (i > 0)
              Container(
                height: 1,
                color: ColorConstant.hairline,
                margin: getMargin(left: 16, right: 16),
              ),
            children[i],
          ],
        ],
      ),
    );
  }

  Widget settingWidget(
      {required String title,
      String? desc,
      bool isSwitch = true,
      bool switchVal = false,
      Function(bool)? onChanged,
      Widget? trailing,
      void Function()? onTap}) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.zero,
        padding: getPadding(left: 16, right: 16, top: 14, bottom: 14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText(
                    title: title,
                    family: 'Manrope',
                    customWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                  SizedBox(height: getSize(3)),
                  MyText(
                    title: desc ?? "",
                    family: 'Inter',
                    customWeight: FontWeight.w400,
                    fontSize: 13,
                    clr: ColorConstant.white60,
                  ),
                ],
              ),
            ),
            trailing ??
                (isSwitch
                    ? CustomSwitch(
                        value: switchVal,
                        onChanged: onChanged,
                      )
                    : Icon(
                        Icons.chevron_right,
                        color: ColorConstant.white60,
                      ))
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: getPadding(left: 4),
      child: MyText(
        title: title,
        family: 'Manrope',
        customWeight: FontWeight.w600,
        fontSize: 13,
        clr: ColorConstant.white60,
      ),
    );
  }
}
