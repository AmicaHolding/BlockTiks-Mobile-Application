import 'package:block_tix/app/data/core/app_export.dart';

/// "Host events on Sahra" intro, same account, adds an organisation.
class HostIntroController extends GetxController {
  static const points = <Map<String, String>>[
    {
      't': 'Build events on the web',
      'd':
          'Tickets, seating, promo codes and payouts live in Studio at studio.sahra.app.',
    },
    {
      't': 'Run the door from this app',
      'd':
          'Switch profile to scan tickets, check the guest list and message guests.',
    },
    {
      't': 'Verify when you’re ready to sell',
      'd':
          'Draft freely. We ask for ID and a trade licence before tickets go on sale, and a bank account before payouts.',
    },
  ];

  void setup() => Get.toNamed(Routes.HOST_ORG);
}
