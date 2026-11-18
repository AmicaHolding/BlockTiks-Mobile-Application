import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/host_org_controller.dart';

class HostOrgView extends GetView<HostOrgController> {
  const HostOrgView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: Column(children: [
          const SahraBackHeader(title: ''),
          Expanded(
            child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 10, 24, 24),
                children: [
                  Text('Your organisation',
                      style:
                          sahraText(size: 28, weight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    'The name fans see on your events. Invite your team after.',
                    style: sahraText(
                        color: ColorConstant.nightMuted, size: 15),
                  ),
                  const SizedBox(height: 22),
                  Text('Organisation name',
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 13,
                          weight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: controller.nameController,
                    textCapitalization: TextCapitalization.words,
                    style: sahraText(),
                    cursorColor: ColorConstant.gold,
                    decoration: InputDecoration(
                      hintText: 'Mawja Live Productions',
                      hintStyle:
                          sahraText(color: ColorConstant.nightMuted),
                      filled: true,
                      fillColor: ColorConstant.nightSurface,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 16),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(
                              color: ColorConstant.gold, width: 1.5)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('Based in',
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 13,
                          weight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Obx(() => Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: HostOrgController.cities
                          .map((c) => SahraChip(
                              label: c,
                              selected: controller.city.value == c,
                              onTap: () => controller.city.value = c))
                          .toList())),
                  const SizedBox(height: 20),
                  Text('What describes you best?',
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 13,
                          weight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Obx(() => Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: HostOrgController.types
                          .map((t) => SahraChip(
                              label: t,
                              selected: controller.type.value == t,
                              onTap: () => controller.type.value = t))
                          .toList())),
                  Obx(() => controller.error.value == null
                      ? const SizedBox.shrink()
                      : Padding(
                          padding: const EdgeInsets.only(top: 14),
                          child: Text(controller.error.value!,
                              style: sahraText(
                                  color: const Color(0xFFE0626A),
                                  size: 14)),
                        )),
                ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
            child: Column(children: [
              Obx(() => SahraPillButton(
                  label:
                      controller.isSaving.value ? 'Setting up…' : 'Create organisation',
                  enabled: !controller.isSaving.value,
                  onTap: controller.create)),
              if (controller.fromSignup)
                TextButton(
                  onPressed: controller.skip,
                  child: Text('Not now',
                      style: sahraText(
                          color: ColorConstant.nightMuted,
                          size: 15,
                          weight: FontWeight.w600)),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}
