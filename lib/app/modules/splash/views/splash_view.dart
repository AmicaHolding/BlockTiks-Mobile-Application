import '../../../data/core/app_export.dart';
import '../../../data/widgets/sahra_ui.dart';
import '../controllers/splash_controller.dart';

class SplashView extends GetView<SplashController> {
  const SplashView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation:
                  controller.sizeAnimation ?? const AlwaysStoppedAnimation(0.0),
              builder: (context, child) {
                final progress = ((controller.sizeAnimation?.value ?? 50) / 300)
                    .clamp(0.0, 1.0);
                return Transform.scale(
                  scale: 0.86 + (progress * 0.14),
                  child: Opacity(
                    opacity: progress,
                    child: Image.asset(ImageConstant.logoGold,
                        width: 150, fit: BoxFit.contain),
                  ),
                );
              },
            ),
            const SizedBox(height: 18),
            Text('SAHRA.APP',
                style: sahraText(
                    color: ColorConstant.nightMuted,
                    size: 14,
                    letterSpacing: 3.2)),
          ],
        ),
      ),
    );
  }
}
