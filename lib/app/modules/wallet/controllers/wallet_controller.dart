import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:get/get.dart';

class WalletController extends GetxController {
  final RxList<Map<String, dynamic>> tickets = <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> listings = <Map<String, dynamic>>[].obs;
  final RxList<Map<String, dynamic>> offers = <Map<String, dynamic>>[].obs;
  final RxBool isLoading = true.obs;
  final Rxn<String> loadError = Rxn<String>();

  /// Tickets that are still usable (VALID) vs everything else.
  List<Map<String, dynamic>> get validTickets => tickets
      .where((t) => t['status']?.toString() == 'VALID')
      .toList();

  List<Map<String, dynamic>> get otherTickets => tickets
      .where((t) => t['status']?.toString() != 'VALID')
      .toList();

  /// "Waiting" group, active Set-your-price orders (price watches).
  List<Map<String, dynamic>> get waitingOffers => offers
      .where((o) => o['status']?.toString() == 'ACTIVE')
      .toList();

  @override
  void onInit() {
    super.onInit();
    fetchTickets();
  }

  Future<void> fetchTickets() async {
    isLoading.value = true;
    loadError.value = null;
    try {
      final results = await Future.wait([
        ApiService.myTickets(),
        ApiService.myListings(),
        ApiService.myOffers(),
      ]);
      tickets.value = results[0];
      listings.value = results[1];
      offers.value = results[2];
    } catch (e) {
      loadError.value = e.toString().replaceFirst('Exception: ', '');
    } finally {
      isLoading.value = false;
    }
  }
}
