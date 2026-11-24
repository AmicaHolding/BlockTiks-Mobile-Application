import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../controllers/onboarding_name_controller.dart';

/// New-account step: name (required) + what-brings-you-here (A3).
class OnboardingNameView extends GetView<OnboardingNameController> {
  const OnboardingNameView({Key? key}) : super(key: key);

  static const _intentLabels = {
    'going_out': 'Going out',
    'hosting_friends': 'Hosting friends',
    'running_events': 'Running events',
  };

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      // A gated sign-up: Back must return past the used OTP/sign-in
      // screens to the gated action, not strand the user mid-auth.
      onBack: controller.comingFrom.isNotEmpty
          ? controller.popAuthScreens
          : null,
      title: 'What should we call you?',
      subtitle: 'Your name on tickets and invites.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SahraAuthField(
            controller: controller.nameController,
            label: 'Name',
            hint: 'Mazen Khoury',
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.name],
          ),
          const SizedBox(height: 24),
          Text('What brings you here?',
              style: sahraText(size: 15, weight: FontWeight.w600)),
          const SizedBox(height: 10),
          Obx(() => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: OnboardingNameController.intents
                    .map((key) => SahraChip(
                          label: _intentLabels[key]!,
                          selected: controller.intent.value == key,
                          onTap: () => controller.intent.value =
                              controller.intent.value == key ? '' : key,
                        ))
                    .toList(),
              )),
          const SizedBox(height: 28),
          Obx(() => SahraPillButton(
                label: 'Continue',
                enabled: !controller.isSaving.value,
                onTap: controller.saveName,
              )),
        ],
      ),
    );
  }
}
