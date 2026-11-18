import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/host_intro_controller.dart';

class HostIntroView extends GetView<HostIntroController> {
  const HostIntroView({Key? key}) : super(key: key);

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
                  RichText(
                    text: TextSpan(children: [
                      TextSpan(
                          text: 'Host events\n',
                          style: sahraText(
                              size: 32,
                              weight: FontWeight.w800,
                              height: 1.05,
                              letterSpacing: -0.8)),
                      TextSpan(
                          text: 'on Sahra.',
                          style: sahraText(
                              color: ColorConstant.gold,
                              size: 32,
                              weight: FontWeight.w800,
                              height: 1.05,
                              letterSpacing: -0.8)),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Same account, same login. You add an organisation; your tickets stay yours.',
                    style: sahraText(
                        color: ColorConstant.nightMuted, size: 15, height: 1.5),
                  ),
                  const SizedBox(height: 26), ...List.generate(
                      HostIntroController.points.length,
                      (i) => _point(
                          '${i + 1}', HostIntroController.points[i])),
                ]),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
            child: Column(children: [
              SahraPillButton(
                  label: 'Set up my organisation',
                  onTap: controller.setup),
              const SizedBox(height: 6),
              TextButton(
                onPressed: Get.back,
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

  Widget _point(String index, Map<String, String> point) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
              color: ColorConstant.gold.withValues(alpha: .14),
              shape: BoxShape.circle),
          child: Text(index,
              style: sahraText(
                  color: ColorConstant.gold,
                  size: 14,
                  weight: FontWeight.w700)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(point['t']!,
                style: sahraText(size: 15, weight: FontWeight.w700)),
            const SizedBox(height: 3),
            Text(point['d']!,
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 13, height: 1.5)),
          ]),
        ),
      ]),
    );
  }
}
