import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';

import '../controllers/referrals_controller.dart';

class ReferralsView extends GetView<ReferralsController> {
  const ReferralsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
          backgroundColor: ColorConstant.night,
          foregroundColor: ColorConstant.whiteA700,
          elevation: 0,
          title: Text('Referrals',
              style: sahraText(size: 22, weight: FontWeight.w800))),
      body: Obx(() {
        if (controller.isLoading.value) {
          return Center(
              child: CircularProgressIndicator(color: ColorConstant.gold));
        }
        if (controller.loadError.value != null) {
          return Center(
              child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(controller.loadError.value!,
                      textAlign: TextAlign.center,
                      style: sahraText(color: ColorConstant.nightMuted))));
        }
        final bonus = controller.bonusCents.value;
        final hasBonus = bonus > 0;
        return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              Text(
                  hasBonus
                      ? 'Bring a friend.\nYou both get ${controller.bonusLabel}.'
                      : 'Bring a friend.\nEarn rewards when they join.',
                  style: sahraText(
                      size: 28, weight: FontWeight.w800, height: 1.1)),
              const SizedBox(height: 6),
              Text(
                  hasBonus
                      ? 'They get it on sign-up. You earn when they buy their first ticket.'
                      : 'Share your code, friends get a welcome bonus at sign-up.',
                  style: sahraText(color: ColorConstant.nightMuted, size: 15)),
              const SizedBox(height: 20),
              SahraCard(
                child: Column(children: [
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Your code',
                                  style: sahraText(
                                      color: ColorConstant.nightMuted,
                                      size: 12)),
                              Text(controller.code.value,
                                  style: sahraText(
                                      size: 24,
                                      weight: FontWeight.w800,
                                      letterSpacing: 2)),
                            ]),
                        TextButton(
                            onPressed: controller.copyCode,
                            child: Text('Copy',
                                style: sahraText(
                                    color: ColorConstant.gold,
                                    size: 14,
                                    weight: FontWeight.w600))),
                      ]),
                  const SizedBox(height: 12),
                  SahraPillButton(
                      label: 'Share invite', onTap: controller.shareInvite),
                ]),
              ),
              if (controller.referredByCode.value.isEmpty) ...[
                const SizedBox(height: 14),
                SahraCard(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Have a code?',
                            style:
                                sahraText(size: 15, weight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text('Apply a friend’s referral code to your account.',
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 12)),
                        const SizedBox(height: 10),
                        Row(children: [
                          Expanded(
                            child: TextField(
                              controller: controller.applyCodeController,
                              textCapitalization: TextCapitalization.characters,
                              style: sahraText(size: 15),
                              decoration: InputDecoration(
                                hintText: 'Referral code',
                                hintStyle: sahraText(
                                    color: ColorConstant.nightMuted, size: 13),
                                filled: true,
                                fillColor: ColorConstant.nightDeep,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                              ),
                              onChanged: (_) => controller.canApply,
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            width: 104,
                            child: Obx(() {
                              controller.codeVersion.value;
                              return SahraPillButton(
                                label: controller.isApplying.value
                                    ? 'Applying…'
                                    : 'Apply',
                                enabled: controller.canApply,
                                onTap: controller.applyCode,
                              );
                            }),
                          ),
                        ]),
                      ]),
                ),
              ] else ...[
                const SizedBox(height: 14),
                SahraCard(
                  child: Text(
                      'You joined via referral code ${controller.referredByCode.value}',
                      style:
                          sahraText(color: ColorConstant.nightMuted, size: 13)),
                ),
              ],
              const SizedBox(height: 18),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('Your friends',
                    style: sahraText(size: 17, weight: FontWeight.w600)),
                Text('${controller.friendCount.value} joined',
                    style: sahraText(
                        color: ColorConstant.gold,
                        size: 14,
                        weight: FontWeight.w600)),
              ]),
              const SizedBox(height: 8),
              if (controller.friends.isEmpty)
                SahraCard(
                    child: Text('No friends joined yet',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 14)))
              else
                ...controller.friends.map((f) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: SahraCard(
                        child: Row(children: [
                          CircleAvatar(
                              radius: 19,
                              backgroundColor: ColorConstant.nightElevated,
                              child: Icon(Icons.person_outline_rounded,
                                  size: 18, color: ColorConstant.nightMuted)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text('Friend',
                                    style: sahraText(
                                        size: 15, weight: FontWeight.w600)),
                                Text(
                                    'Joined ${dateLabel(f['joinedAt']?.toString())}',
                                    style: sahraText(
                                        color: ColorConstant.nightMuted,
                                        size: 13)),
                              ])),
                        ]),
                      ),
                    )),
            ]);
      }),
    );
  }

  /// e.g. "March 24, 2026"
  String dateLabel(String? iso) =>
      formatEventDate(iso, includeTime: false);
}
