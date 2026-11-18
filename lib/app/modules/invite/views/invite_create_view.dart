import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_auth.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';
import '../controllers/invite_controller.dart';

/// Who's-it-for / create-invite form (I1–I4): title, when, place_text, note,
/// plus-ones and guest-list toggles. Submits POST /invites and lands on
/// the host's `/i/{code}` view to share the link.
class InviteCreateView extends GetView<InviteController> {
  InviteCreateView({Key? key}) : super(key: key);

  final TextEditingController name = TextEditingController();
  final TextEditingController when = TextEditingController();
  final TextEditingController where = TextEditingController();
  final TextEditingController note = TextEditingController();
  final RxBool allowPlusOnes = true.obs;
  final RxBool showGuests = true.obs;
  final RxBool isSaving = false.obs;

  @override
  Widget build(BuildContext context) {
    return SahraAuthScaffold(
      title: 'New invite',
      subtitle: 'For people you know. Friends reply with a tap.',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SahraAuthField(
            controller: name, label: 'What is it?', hint: 'Dinner at my place'),
        const SizedBox(height: 14),
        SahraAuthField(
            controller: when,
            label: 'When',
            hint: 'Fri 28 Nov, 8pm'),
        const SizedBox(height: 14),
        SahraAuthField(
            controller: where, label: 'Where', hint: 'Marina, Dubai'),
        const SizedBox(height: 14),
        SahraAuthField(
            controller: note,
            label: 'Note (optional)',
            hint: 'Bring something sweet'),
        const SizedBox(height: 20),
        Obx(() => SahraRowLink(
            label: 'Guests can bring plus ones',
            value: allowPlusOnes.value ? 'On' : 'Off',
            onTap: () => allowPlusOnes.value = !allowPlusOnes.value)),
        Obx(() => SahraRowLink(
            label: 'Guests see who else is coming',
            value: showGuests.value ? 'On' : 'Off',
            onTap: () => showGuests.value = !showGuests.value)),
        const SizedBox(height: 24),
        Obx(() => SahraPillButton(
            label: 'Create invite',
            enabled: !isSaving.value,
            onTap: _create)),
        const SizedBox(height: 10),
        Center(
          child: Text('Planning to charge? Sell tickets instead.',
              style:
                  sahraText(color: ColorConstant.nightMuted, size: 13)),
        ),
      ]),
    );
  }

  Future<void> _create() async {
    if (name.text.trim().isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Give it a name');
      return;
    }
    if (where.text.trim().isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Add a place');
      return;
    }
    isSaving.value = true;
    try {
      // Backend contract: title + place_text required; starts_at must be a
      // parseable ISO timestamp when given. Parsed input is local time —
      // send it as UTC so the backend doesn't re-interpret the wall time.
      final parsedWhen =
          DateTime.tryParse(when.text.trim());
      if (when.text.trim().isNotEmpty && parsedWhen == null) {
        CustomSnackBar.showCustomErrorToast(
            message: 'Pick a valid date and time (e.g. 2026-11-28 20:00)');
        isSaving.value = false;
        return;
      }
      final res = await ApiService.createInvite({
        'title': name.text.trim(),
        'place_text': where.text.trim(),
        if (parsedWhen != null)
          'starts_at': parsedWhen.toUtc().toIso8601String(),
        if (note.text.trim().isNotEmpty) 'note': note.text.trim(),
        'allow_plus_ones': allowPlusOnes.value,
        'show_guest_list': showGuests.value,
      });
      final invite = res['invite'] is Map ? res['invite'] as Map : res;
      final code = invite['code']?.toString() ?? '';
      if (code.isNotEmpty) {
        Get.offNamed('/i/$code');
      } else {
        Get.back();
      }
      CustomSnackBar.showCustomToast(message: 'Invite created');
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSaving.value = false;
    }
  }
}
