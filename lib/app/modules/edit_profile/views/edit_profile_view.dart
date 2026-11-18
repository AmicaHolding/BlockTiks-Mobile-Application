import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/edit_profile_controller.dart';

class EditProfileView extends GetView<EditProfileController> {
  const EditProfileView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.sand,
      body: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return Center(
                child: CircularProgressIndicator(color: ColorConstant.night));
          }
          return Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                        onPressed: () => Get.back(closeOverlays: true),
                        icon: Icon(Icons.arrow_back_ios_new,
                            color: ColorConstant.ink)),
                    Text('Edit profile',
                        style: sahraText(
                            color: ColorConstant.ink,
                            size: 17,
                            weight: FontWeight.w700)),
                    TextButton(
                        onPressed:
                            controller.isSaving.value ? null : controller.save,
                        child: Text('Save',
                            style: sahraText(
                                color: ColorConstant.rumman,
                                size: 16,
                                weight: FontWeight.w700))),
                  ]),
            ),
            Expanded(
              child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 22, 24, 32),
                  children: [
                    Center(
                        child: CircleAvatar(
                            radius: 48,
                            backgroundColor: ColorConstant.night,
                            child: Text(controller.initials,
                                style: sahraText(
                                    color: ColorConstant.gold,
                                    size: 32,
                                    weight: FontWeight.w800)))),
                    const SizedBox(height: 10),
                    Center(
                        child: Text('Change photo',
                            style: sahraText(
                                color: ColorConstant.ink,
                                size: 14,
                                weight: FontWeight.w600,
                                letterSpacing: 0.2))),
                    const SizedBox(height: 22),
                    _field(controller.firstNameController, 'Full name',
                        hint: 'First name'),
                    const SizedBox(height: 14),
                    _field(controller.lastNameController, 'Last name',
                        hint: 'Last name'),
                    const SizedBox(height: 14),
                    _field(controller.firstNameArController, 'Name in Arabic',
                        hint: 'الاسم بالعربية', arabic: true),
                    const SizedBox(height: 14),
                    _readonlyEmail(),
                    const SizedBox(height: 14),
                    _field(controller.phoneController, 'Mobile',
                        hint: '+971 50 000 0000',
                        keyboard: TextInputType.phone),
                    const SizedBox(height: 14),
                    Row(children: [
                      Expanded(
                          child: _field(controller.cityController, 'City',
                              hint: 'Dubai')),
                      const SizedBox(width: 12),
                      Expanded(
                          child: _field(
                              controller.dobController, 'Date of birth',
                              hint: '14 Mar 1996')),
                    ]),
                    const SizedBox(height: 8),
                    Text(
                        'Date of birth is used for 18+ events only. Never shown.',
                        style: sahraText(
                            color: ColorConstant.ink.withValues(alpha: 0.55),
                            size: 12)),
                    const SizedBox(height: 26),
                    Center(
                      child: TextButton(
                        onPressed: controller.isDeleting.value
                            ? null
                            : controller.deleteAccount,
                        child: Text(
                            controller.isDeleting.value
                                ? 'Deleting…'
                                : 'Delete account',
                            style: sahraText(
                                color: ColorConstant.rumman,
                                size: 14,
                                weight: FontWeight.w600)),
                      ),
                    ),
                  ]),
            ),
          ]);
        }),
      ),
    );
  }

  Widget _field(TextEditingController controller, String label,
      {String? hint, bool arabic = false, TextInputType? keyboard}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label,
          style: sahraText(
              color: ColorConstant.ink, size: 13, weight: FontWeight.w600)),
      const SizedBox(height: 6),
      TextField(
        controller: controller,
        keyboardType: keyboard,
        style: arabic
            ? sahraArabic(color: ColorConstant.ink, size: 16)
            : sahraText(color: ColorConstant.ink, size: 16),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: sahraText(
              color: ColorConstant.ink.withValues(alpha: 0.35), size: 16),
          filled: true,
          fillColor: ColorConstant.lightCard,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: ColorConstant.dune, width: 1.5)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: ColorConstant.dune, width: 1.5)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: ColorConstant.night, width: 1.5)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        ),
      ),
    ]);
  }

  Widget _readonlyEmail() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Email',
          style: sahraText(
              color: ColorConstant.ink, size: 13, weight: FontWeight.w600)),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
            color: ColorConstant.lightCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: ColorConstant.dune, width: 1.5)),
        child: Row(children: [
          Expanded(
              child: Text(controller.emailController.text,
                  style: sahraText(
                      color: ColorConstant.ink.withValues(alpha: 0.6),
                      size: 16))),
          Obx(() => controller.emailVerified.value.isEmpty
              ? const SizedBox.shrink()
              : Text(controller.emailVerified.value,
                  style: sahraText(
                      color: ColorConstant.successGreen,
                      size: 12,
                      weight: FontWeight.w700))),
        ]),
      ),
      Obx(() => controller.emailVerified.value.isEmpty
          ? Padding(
              padding: const EdgeInsets.only(top: 6),
              child: GestureDetector(
                onTap: controller.isResendingVerification.value
                    ? null
                    : controller.resendVerification,
                child: Text(
                    controller.isResendingVerification.value
                        ? 'Sending…'
                        : 'Resend verification email',
                    style: sahraText(
                        color: ColorConstant.gold,
                        size: 13,
                        weight: FontWeight.w600)),
              ),
            )
          : const SizedBox.shrink()),
    ]);
  }
}
