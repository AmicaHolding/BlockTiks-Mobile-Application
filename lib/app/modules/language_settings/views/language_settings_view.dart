import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/language_settings_controller.dart';

class LanguageSettingsView extends GetView<LanguageSettingsController> {
  const LanguageSettingsView({Key? key}) : super(key: key);

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
                child: Text('Language & numbers',
                    style: sahraText(size: 28, weight: FontWeight.w800)),
              ),
              const SizedBox(height: 22),
              const SahraSmallLabel('Language'),
              _segmented(const [
                ['en', 'English'],
                ['ar', 'العربية'],
              ], () => controller.lang.value, controller.setLang),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Obx(() => Text(controller.langNote,
                    style: sahraText(
                        color: ColorConstant.nightMuted, size: 13))),
              ),
              const SizedBox(height: 22),
              const SahraSmallLabel('Numbers'),
              _segmented(const [
                ['latn', '123'],
                ['arab', '١٢٣'],
              ], () => controller.nums.value, controller.setNums),
              const SizedBox(height: 22),
              const SahraSmallLabel('Preview'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SahraCard(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Obx(() => Text(controller.numPreview,
                            style: sahraText(
                                size: 18, weight: FontWeight.w700))),
                        const SizedBox(height: 6),
                        Text(
                          'Applies to every price and date in the app. Try it, then open an event.',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 13),
                        ),
                      ]),
                ),
              ),
            ]),
      ),
    );
  }

  Widget _segmented(List<List<String>> options, String Function() current,
      void Function(String) onPick) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Obx(() => Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
                color: ColorConstant.nightSurface,
                borderRadius: BorderRadius.circular(14)),
            child: Row(
              children: options.map((o) {
                final selected = current() == o[0];
                return Expanded(
                  child: GestureDetector(
                    onTap: () => onPick(o[0]),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: selected
                            ? ColorConstant.gold
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(o[1],
                          style: sahraText(
                              color: selected
                                  ? ColorConstant.night
                                  : ColorConstant.whiteA700,
                              size: 15,
                              weight: FontWeight.w600)),
                    ),
                  ),
                );
              }).toList(),
            ),
          )),
    );
  }
}
