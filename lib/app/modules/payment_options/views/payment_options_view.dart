import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:get/get.dart';

import '../controllers/payment_options_controller.dart';

class PaymentOptionsView extends GetView<PaymentOptionsController> {
  const PaymentOptionsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.night,
      appBar: AppBar(
          backgroundColor: ColorConstant.night,
          elevation: 0,
          title: Text('Payment options',
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
              Text('Paying for tickets',
                  style: sahraText(size: 14, weight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(
                  'Saved cards are stored by the payment provider, never on Sahra.',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
              const SizedBox(height: 12),
              if (controller.methods.isEmpty)
                SahraCard(
                    child: Text('No saved cards yet',
                        style: sahraText(
                            color: ColorConstant.nightMuted, size: 14)))
              else
                ...controller.methods.map((m) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: SahraCard(
                        child: Row(children: [
                          Container(
                            width: 46,
                            height: 30,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                                color: ColorConstant.nightElevated,
                                borderRadius: BorderRadius.circular(6)),
                            child: Text(
                                (m['brand']?.toString() ?? 'CARD')
                                    .toUpperCase(),
                                style: sahraText(
                                    color: ColorConstant.gold,
                                    size: 11,
                                    weight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      '${m['brand'] ?? 'Card'} ·· ${m['last4'] ?? '••••'}',
                                      style: sahraText(
                                          size: 15, weight: FontWeight.w600)),
                                  Text(
                                      'Expires ${m['expMonth'] ?? '--'}/${m['expYear'] ?? '--'}',
                                      style: sahraText(
                                          color: ColorConstant.nightMuted,
                                          size: 12)),
                                ]),
                          ),
                          TextButton(
                              onPressed: () =>
                                  controller.detach(m['id']?.toString() ?? ''),
                              child: Text('Remove',
                                  style: sahraText(
                                      color: ColorConstant.rumman,
                                      size: 13,
                                      weight: FontWeight.w600))),
                        ]),
                      ),
                    )),
              const SizedBox(height: 8),
              Obx(() => SahraPillButton(
                    label:
                        controller.isAdding.value ? 'Starting…' : 'Add a card',
                    onTap: controller.addCard,
                    enabled: !controller.isAdding.value,
                  )),
              const SizedBox(height: 22),
              Text('Getting paid for resales',
                  style: sahraText(size: 14, weight: FontWeight.w600)),
              const SizedBox(height: 10),
              SahraCard(
                child: Row(children: [
                  Container(
                    width: 46,
                    height: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: ColorConstant.nightElevated,
                        borderRadius: BorderRadius.circular(6)),
                    child: Text('IBAN',
                        style: sahraText(
                            color: ColorConstant.nightMuted,
                            size: 11,
                            weight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text('Payout account',
                            style:
                                sahraText(size: 15, weight: FontWeight.w600)),
                        Text('Payout accounts are not connected yet',
                            style: sahraText(
                                color: ColorConstant.nightMuted, size: 12)),
                      ])),
                ]),
              ),
            ]);
      }),
    );
  }
}
