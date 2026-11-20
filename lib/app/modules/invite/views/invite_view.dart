import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import '../controllers/invite_controller.dart';

/// `/i/{code}` — the personal-invite landing page (I-rules). Guests read the
/// invite and reply; hosts see the guest list and the "Sell tickets instead"
/// handoff to Studio (I7).
class InviteView extends GetView<InviteController> {
  const InviteView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      body: SafeArea(
        child: Obx(() {
          if (controller.isLoading.value) {
            return const Center(
                child: CircularProgressIndicator(color: Color(0xFFF2D9A0)));
          }
          final inv = controller.invite;
          if (inv.isEmpty) {
            return Center(
                child: Text('Invite not found or expired.',
                    style: sahraText(color: ColorConstant.nightMuted)));
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            children: [
              Text('You are invited',
                  style: sahraText(
                      color: ColorConstant.gold, size: 13, weight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text(inv['title']?.toString() ?? inv['name']?.toString() ?? 'An invite',
                  style: sahraText(size: 28, weight: FontWeight.w800, height: 1.1)),
              const SizedBox(height: 16),
              SahraCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _row('Host',
                        inv['host_name']?.toString() ??
                            (inv['host'] is Map
                                ? inv['host']['name']?.toString() ?? ''
                                : '')),
                    if (inv['starts_at'] != null || inv['when'] != null)
                      _row('When',
                          (inv['starts_at'] ?? inv['when'])?.toString() ?? ''),
                    if (inv['place_text'] != null || inv['where'] != null || inv['place_hidden'] == true)
                      _row('Where',
                          inv['place_hidden'] == true
                              ? 'Hidden until you say Going'
                              : (inv['place_text'] ?? inv['where'])
                                  ?.toString() ??
                                  ''),
                    if (inv['note'] != null)
                      _row('Note', inv['note']?.toString() ?? ''),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (controller.isHost.value) ...[
                _guestList(),
                const SizedBox(height: 20),
                TextButton(
                  onPressed: controller.moveToOrg,
                  child: Text('Sell tickets instead',
                      style: sahraText(
                          color: ColorConstant.gold,
                          size: 15,
                          weight: FontWeight.w600)),
                ),
              ] else ...[
                _respond(),
              ],
            ],
          );
        }),
      ),
    );
  }

  Widget _row(String label, String value) {
    if (value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
            width: 60,
            child: Text(label,
                style: sahraText(color: ColorConstant.nightMuted, size: 13))),
        Expanded(
            child: Text(value,
                style: sahraText(size: 14, weight: FontWeight.w500))),
      ]),
    );
  }

  Widget _respond() {
    final inv = controller.invite;
    final allowsPlusOnes = inv['allow_plus_ones'] == true ||
        inv['plus_ones'] == true ||
        inv['plus_ones'] == 1;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (allowsPlusOnes)
        Row(children: [
          Text('Plus ones',
              style: sahraText(color: ColorConstant.nightMuted, size: 14)),
          const Spacer(),
          Obx(() => SahraStepper(
                value: controller.plusOnes.value.toString(),
                onDecrement: () {
                  if (controller.plusOnes.value > 0) {
                    controller.plusOnes.value--;
                  }
                },
                onIncrement: () => controller.plusOnes.value++,
              )),
        ]),
      const SizedBox(height: 16),
      SahraPillButton(
          label: controller.myResponse.value == 'requested'
              ? 'Requested'
              : 'Count me in',
          enabled: !controller.isResponding.value &&
              controller.myResponse.value != 'going' &&
              controller.myResponse.value != 'requested',
          onTap: () => controller.respond('going')),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(
            child: OutlinedButton(
          onPressed: controller.myResponse.value == 'no'
              ? null
              : () => controller.respond('no'),
          // `maybe` is a first-class RSVP state too.
          style: OutlinedButton.styleFrom(
            foregroundColor: ColorConstant.whiteA700,
            side: BorderSide(color: ColorConstant.nightBorder),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: const StadiumBorder(),
          ),
          child: Text("Can't make it",
              style: sahraText(color: ColorConstant.whiteA700, size: 15)),
        )),
        const SizedBox(width: 8),
        Expanded(
            child: OutlinedButton(
          onPressed: controller.myResponse.value == 'maybe'
              ? null
              : () => controller.respond('maybe'),
          style: OutlinedButton.styleFrom(
            foregroundColor: ColorConstant.whiteA700,
            side: BorderSide(color: ColorConstant.nightBorder),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: const StadiumBorder(),
          ),
          child: Text('Maybe',
              style: sahraText(color: ColorConstant.whiteA700, size: 15)),
        )),
      ]),
      if (controller.myResponse.value.isNotEmpty) ...[
        const SizedBox(height: 14),
        Center(
            child: Text(
                'Your reply: ${controller.myResponse.value}',
                style: sahraText(
                    color: ColorConstant.nightMuted, size: 13))),
      ],
    ]);
  }

  Widget _guestList() {
    return Obx(() {
      final guests = controller.guests;
      return SahraCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Guest list (${guests.length})',
            style: sahraText(size: 15, weight: FontWeight.w700)),
        const SizedBox(height: 10),
        if (guests.isEmpty)
          Text('No replies yet.',
              style: sahraText(color: ColorConstant.nightMuted, size: 14)),
        for (final g in guests)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(children: [
              Expanded(
                  child: Text(g['name']?.toString() ?? 'Guest',
                      style: sahraText(size: 14))),
              Text(g['response']?.toString() ?? '',
                  style: sahraText(
                      color: ColorConstant.nightMuted, size: 13)),
            ]),
          ),
      ]));
    });
  }
}
