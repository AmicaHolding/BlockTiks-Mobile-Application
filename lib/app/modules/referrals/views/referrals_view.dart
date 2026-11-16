import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/referrals_controller.dart';

class ReferralsView extends GetView<ReferralsController> {
  const ReferralsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
          backgroundColor: ColorConstant.night,
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
        return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              Text('Bring a friend.\nYou both get AED 25.',
                  style: sahraText(
                      size: 28, weight: FontWeight.w800, height: 1.1)),
              const SizedBox(height: 6),
              Text(
                  'They get it on sign-up. You get yours when they buy their first ticket.',
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
              const SizedBox(height: 18),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('Your friends',
                    style: sahraText(size: 17, weight: FontWeight.w600)),
                Text(controller.aed(controller.earnedCents.value) + ' earned',
                    style: sahraText(
                        color: ColorConstant.gold,
                        size: 14,
                        weight: FontWeight.w600)),
              ]),
              const SizedBox(height: 8),
              if (controller.note.value.isNotEmpty)
                SahraCard(
                    child: Text(controller.note.value,
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 13))),
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
                              child: Text(f['initials']?.toString() ?? '•',
                                  style: sahraText(
                                      size: 13, weight: FontWeight.w600))),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(f['name']?.toString() ?? 'Friend',
                                    style: sahraText(
                                        size: 15, weight: FontWeight.w600)),
                                Text(f['status']?.toString() ?? '',
                                    style: sahraText(
                                        color: ColorConstant.nightMuted,
                                        size: 13)),
                              ])),
                          Text(f['amount']?.toString() ?? '',
                              style:
                                  sahraText(size: 14, weight: FontWeight.w700)),
                        ]),
                      ),
                    )),
            ]);
      }),
    );
  }
}
