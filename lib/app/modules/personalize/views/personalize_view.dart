import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/data/widgets/web_handoff_sheet.dart';

import '../controllers/personalize_controller.dart';

class PersonalizeView extends GetView<PersonalizeController> {
  const PersonalizeView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    Container(
                        width: 22,
                        height: 4,
                        decoration: BoxDecoration(
                            color: ColorConstant.gold,
                            borderRadius: BorderRadius.circular(99))),
                    const SizedBox(width: 6),
                    Container(
                        width: 22,
                        height: 4,
                        decoration: BoxDecoration(
                            color: ColorConstant.gold,
                            borderRadius: BorderRadius.circular(99))),
                  ]),
                  TextButton(
                      onPressed: () => controller.continueToApp(skip: true),
                      child: Text('Skip',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 14))),
                ]),
          ),
          Expanded(
            child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
                children: [
                  Obx(() => Text('Make it yours, ${controller.firstName.value}',
                      style: sahraText(
                          size: 28, weight: FontWeight.w800, height: 1.1))),
                  const SizedBox(height: 6),
                  Text('This shapes what you see on For You.',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 15)),
                  const SizedBox(height: 22),
                  Text('Your city',
                      style: sahraText(size: 14, weight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Obx(() => Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: controller.cities
                          .map((city) => SahraChip(
                              label: city,
                              selected: controller.selectedCity.value == city,
                              onTap: () => controller.selectCity(city)))
                          .toList())),
                  const SizedBox(height: 22),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Pick 3 things you love',
                            style:
                                sahraText(size: 14, weight: FontWeight.w600)),
                        Obx(() => Text(
                            '${controller.selectedInterests.length} of 3',
                            style: sahraText(
                                color: ColorConstant.gold,
                                size: 14,
                                weight: FontWeight.w600))),
                      ]),
                  const SizedBox(height: 10),
                  Obx(() => GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                crossAxisSpacing: 8,
                                mainAxisSpacing: 8,
                                childAspectRatio: 1.15),
                        itemCount: controller.interests.length,
                        itemBuilder: (context, index) {
                          final interest = controller.interests[index];
                          final selected =
                              controller.selectedInterests.contains(interest);
                          return GestureDetector(
                            onTap: () => controller.toggleInterest(interest),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: selected
                                    ? ColorConstant.gold
                                    : ColorConstant.nightSurface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                    color: selected
                                        ? ColorConstant.gold
                                        : ColorConstant.nightBorder,
                                    width: 1.5),
                              ),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Align(
                                        alignment: Alignment.topRight,
                                        child: Text(selected ? '✓' : '',
                                            style: sahraText(
                                                color: ColorConstant.night,
                                                size: 12,
                                                weight: FontWeight.w800))),
                                    Text(interest,
                                        style: sahraText(
                                            color: selected
                                                ? ColorConstant.night
                                                : ColorConstant.whiteA700,
                                            size: 13,
                                            weight: FontWeight.w600)),
                                  ]),
                            ),
                          );
                        },
                      )),
                  const SizedBox(height: 18),
                  GestureDetector(
                    onTap: () =>
                        WebHandoffSheet.show(feature: 'Creating events'),
                    child: SahraCard(
                      color: ColorConstant.nightSurface,
                      child: Row(children: [
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text('Hosting events?',
                                  style: sahraText(
                                      size: 14, weight: FontWeight.w600)),
                              const SizedBox(height: 2),
                              Text('Set up Sahra Studio for your team',
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 13)),
                            ])),
                        Text('Set up',
                            style: sahraText(
                                color: ColorConstant.gold,
                                size: 14,
                                weight: FontWeight.w600)),
                      ]),
                    ),
                  ),
                ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: Obx(() => SahraPillButton(
                label:
                    controller.isSaving.value ? 'Saving…' : "Show me what's on",
                onTap: () => controller.continueToApp(),
                enabled: controller.canContinue)),
          ),
        ]),
      ),
    );
  }
}
