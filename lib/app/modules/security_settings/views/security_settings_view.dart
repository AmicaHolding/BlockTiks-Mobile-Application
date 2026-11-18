import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/security_settings_controller.dart';

class SecuritySettingsView extends GetView<SecuritySettingsController> {
  const SecuritySettingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              const SahraBackHeader(title: ''),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
                child: Text('Sign-in & security',
                    style: sahraText(size: 28, weight: FontWeight.w800)),
              ),
              const SizedBox(height: 18),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(children: [
                  SahraRowLink(
                      label: 'Change password',
                      onTap: controller.changePassword),
                  Obx(() => SahraRowLink(
                      label: 'Sign out other devices',
                      value: controller.otherSessions.value > 0
                          ? '${controller.otherSessions.value} active'
                          : 'None',
                      onTap: controller.signOutOthers)),
                ]),
              ),
              const SizedBox(height: 30),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Obx(() => GestureDetector(
                      onTap: controller.isDeleting.value
                          ? null
                          : controller.deleteAccount,
                      child: Text('Delete account',
                          style: sahraText(
                              color: const Color(0xFFE0626A),
                              size: 15,
                              weight: FontWeight.w600)),
                    )),
              ),
            ]),
      ),
    );
  }
}
