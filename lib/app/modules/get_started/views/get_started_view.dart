import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../controllers/get_started_controller.dart';

class GetStartedView extends GetView<GetStartedController> {
  GetStartedView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Image.asset(ImageConstant.logoGold,
                      width: 56, fit: BoxFit.contain),
                  Obx(() => Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                        color: ColorConstant.nightSurface,
                        borderRadius: BorderRadius.circular(99)),
                    child: Row(children: [
                      _langPill('EN', 'en'),
                      _langPill('عربي', 'ar'),
                    ]),
                  )),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 22, 20, 24),
                children: [
                  Container(
                    height: 300,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          ColorConstant.nightElevated,
                          ColorConstant.nightSurface,
                        ],
                      ),
                    ),
                    child: Center(
                      child: Text('crowd photo, warm stage light',
                          style: sahraText(
                              color: ColorConstant.nightMuted, size: 12)),
                    ),
                  ),
                  const SizedBox(height: 26),
                  Text('Every night out, in one place',
                      style: sahraText(
                          size: 32, weight: FontWeight.w800, height: 1.08)),
                  const SizedBox(height: 10),
                  Text(
                    'Concerts, comedy and match days across the Gulf. Can’t go? Sell your ticket in two taps.',
                    style: sahraText(
                        color: ColorConstant.nightMuted, size: 16, height: 1.5),
                  ),
                  const SizedBox(height: 18),
                  Row(children: [
                    Container(
                        width: 22,
                        height: 6,
                        decoration: BoxDecoration(
                            color: ColorConstant.gold,
                            borderRadius: BorderRadius.circular(99))),
                    const SizedBox(width: 6),
                    Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: ColorConstant.nightBorder,
                            shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                            color: ColorConstant.nightBorder,
                            shape: BoxShape.circle)),
                  ]),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Column(children: [
                SahraPillButton(
                    label: 'Create account',
                    onTap: () => Get.toNamed(Routes.SIGN_UP)),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Get.toNamed(Routes.SIGN_IN),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ColorConstant.gold,
                      backgroundColor: Colors.transparent,
                      side: BorderSide(color: ColorConstant.gold, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: const StadiumBorder(),
                    ),
                    child: Text('I have an account',
                        style: sahraText(
                            color: ColorConstant.gold,
                            size: 16,
                            weight: FontWeight.w700)),
                  ),
                ),

              ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _langPill(String label, String code) {
    final selected = controller.lang.value == code;
    return GestureDetector(
      // TODO(decision-1: Arabic copy isn't translated yet, the toggle is
      // persisted but the app still renders English strings)
      onTap: () => controller.lang.value = code,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
            color: selected ? ColorConstant.gold : Colors.transparent,
            borderRadius: BorderRadius.circular(99)),
        child: Text(label,
            style: sahraText(
                color: selected
                    ? ColorConstant.night
                    : ColorConstant.nightMuted,
                size: 13,
                weight: selected ? FontWeight.w700 : FontWeight.w600)),
      ),
    );
  }
}
