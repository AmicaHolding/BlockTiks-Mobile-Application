import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

class PaymentPageController extends GetxController {
  RxInt selectedPayment = 0.obs;
  RxBool isProcessing = false.obs;

  int platinum = 0;
  int gold = 0;
  int silver = 0;
  int bronze = 0;

  bool fromPlaceBid = false;

  // Event/ticket context passed through from the previous screen.
  String eventTitle = 'DJ Maksmellow Orignawa';
  String eventType = 'Music Concert';

  // Backend checkout context parsed from route arguments.
  String? eventId;
  String? tierId;
  String? sectionId; // seated events
  String? sectionName;
  String? listingCode; // resale purchases
  String? listingName;
  String? eventDate;
  String? eventVenue;
  String? imageUrl;
  int quantity = 1;
  String? promoCode;
  String currency = 'usd';
  List<String> seatLabels = [];
  List<Map<String, dynamic>> selections = [];
  int subtotalCents = 0;

  // Extra arguments to forward to the ticket screen after checkout.
  Map<String, dynamic> ticketArgs = {};

  // Manual card entry (replaces the unvalidated CreditCardForm).
  final GlobalKey<FormState> cardFormKey = GlobalKey<FormState>();
  TextEditingController cardNumberController = TextEditingController();
  TextEditingController expiryController = TextEditingController();
  TextEditingController cvvController = TextEditingController();
  TextEditingController nameController = TextEditingController();

  int _readInt(dynamic v, int fallback) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v?.toString() ?? '') ?? fallback;
  }

  @override
  void onInit() {
    super.onInit();
    var data = Get.arguments;
    if (data != null && data is Map) {
      if (data[Constants.paramPlaceBid] != null) {
        fromPlaceBid = data[Constants.paramPlaceBid];
      }
      if (data['platinum'] != null) platinum = data['platinum'];
      if (data['gold'] != null) gold = data['gold'];
      if (data['silver'] != null) silver = data['silver'];
      if (data['bronze'] != null) bronze = data['bronze'];
      if (data['title'] != null) eventTitle = data['title'].toString();
      if (data['type'] != null) eventType = data['type'].toString();

      // Defensive parsing of checkout context, accept the common key
      // variants other screens may pass.
      final id = data['eventId'] ?? data['id'];
      if (id != null && id.toString().isNotEmpty) eventId = id.toString();
      final tid = data['tierId'] ?? data['tier'];
      if (tid != null && tid.toString().isNotEmpty) tierId = tid.toString();
      final sid = data['sectionId'];
      if (sid != null && sid.toString().isNotEmpty) {
        sectionId = sid.toString();
        sectionName = data['sectionName']?.toString() ?? sectionId;
      }
      final lc = data['listingCode'];
      if (lc != null && lc.toString().isNotEmpty) {
        listingCode = lc.toString();
      }
      listingName = data['listingName']?.toString();
      eventDate = data['date']?.toString();
      eventVenue = data['venue']?.toString();
      imageUrl = data['imageUrl']?.toString();
      final qty = data['quantity'] ?? data['qty'];
      if (qty != null) quantity = _readInt(qty, 1);
      if (data['promoCode'] != null) {
        promoCode = data['promoCode'].toString();
      }
      final cur = data['currency'];
      if (cur != null && cur.toString().isNotEmpty) {
        currency = cur.toString().toLowerCase();
      }
      final seats = data['seatLabels'];
      if (seats is List) {
        seatLabels =
            seats.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
      }
      if (data['subtotalCents'] != null) {
        subtotalCents = _readInt(data['subtotalCents'], 0);
      }
      final sels = data['selections'];
      if (sels is List) {
        selections = sels
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }

      // Forward any ticket context (event name, date, tier, qty...) to the
      // purchased ticket screen so it can render real data.
      ticketArgs = Map<String, dynamic>.from(data)
        ..remove(Constants.paramPlaceBid)
        ..remove('platinum')
        ..remove('gold')
        ..remove('silver')
        ..remove('bronze');
    }
  }

  /// Validates the manual card form. Returns true when the entered card
  /// details are complete enough to proceed with the (simulated) checkout.
  bool validateCard() {
    return cardFormKey.currentState?.validate() ?? false;
  }

  bool get hasBackendContext =>
      listingCode != null ||
      (eventId != null &&
          (selections.isNotEmpty ||
              ((tierId != null || sectionId != null) && quantity > 0)));

  /// Display subtotal before backend fees. Falls back to legacy counters.
  int get displaySubtotalCents {
    if (subtotalCents > 0) return subtotalCents;
    final legacyCount = platinum + gold + silver + bronze;
    return legacyCount * 40500;
  }

  /// Mirrors the backend default platform fee (5%) until the intent
  /// response returns the authoritative feesCents/totalCents.
  int get estimatedFeesCents => (displaySubtotalCents * 5 / 100).round();

  // Promo code input, validated/applied server-side at intent creation.
  final TextEditingController promoController = TextEditingController();
  final Rxn<String> appliedPromo = Rxn<String>();

  /// Discount in cents when a promo is applied. Unknown client-side: the
  /// backend computes it in the order-intent response.
  /// TODO(api-gap: no promo-validate endpoint, discount preview needs
  /// `POST /promos/validate` or a dry-run `POST /orders/intent`)
  int get promoDiscountCents => 0;

  void applyPromo() {
    final code = promoController.text.trim();
    if (code.isEmpty) return;
    appliedPromo.value = code;
    promoCode = code;
  }

  void clearPromo() {
    appliedPromo.value = null;
    promoCode = null;
    promoController.clear();
  }

  int get estimatedTotalCents => displaySubtotalCents + estimatedFeesCents - promoDiscountCents;

  /// Currency-aware money label for checkout totals.
  String money(int cents) => formatMoney(cents, currency);

  int get ticketQuantity {
    if (listingCode != null) return 1;
    if (selections.isNotEmpty) {
      return selections.fold<int>(
          0, (sum, t) => sum + (_readInt(t['quantity'], 1)));
    }
    if (sectionId != null) return quantity;
    final legacyCount = platinum + gold + silver + bronze;
    return legacyCount > 0 ? legacyCount : quantity;
  }

  // TODO(decision-16): checkout holds reserve inventory for 10 minutes
  // with a visible countdown, needs the intent response to return a
  // `holdExpiresAt` to render it.

  /// Checkout entry point invoked from the Buy button (via the loader).
  /// Creates real order intents on the backend when we have event context;
  /// otherwise falls back to the clearly-labeled simulated flow.
  Future<void> checkout() async {
    if (fromPlaceBid) {
      Get.offAllNamed(Routes.USER_DASHBOARD);
      return;
    }
    if (!hasBackendContext) {
      _simulatedSuccess();
      return;
    }
    await _createIntents();
  }

  /// Creates one order intent per selected tier (the backend intent
  /// endpoint handles a single tier per order).
  Future<void> _createIntents() async {
    if (isProcessing.value) return;
    isProcessing.value = true;
    try {
      final results = <Map<String, dynamic>>[];
      if (listingCode != null) {
        // Resale purchase, one listing per order.
        results.add(await ApiService.createOrderIntent(
          listingCode: listingCode,
          promoCode: promoCode,
        ));
      } else if (selections.isNotEmpty) {
        for (final sel in selections) {
          final qty = _readInt(sel['quantity'], 1);
          final selSection = sel['sectionId']?.toString();
          final selTier = sel['tierId']?.toString() ?? '';
          if (qty <= 0 || (selSection == null && selTier.isEmpty)) continue;
          results.add(await ApiService.createOrderIntent(
            eventId: eventId!,
            tierId: selSection == null ? selTier : null,
            sectionId: selSection,
            quantity: qty,
            promoCode: promoCode,
          ));
        }
      } else if (sectionId != null) {
        results.add(await ApiService.createOrderIntent(
          eventId: eventId!,
          sectionId: sectionId,
          quantity: quantity,
          seats: seatLabels.isNotEmpty ? seatLabels : null,
          promoCode: promoCode,
        ));
      } else {
        results.add(await ApiService.createOrderIntent(
          eventId: eventId!,
          tierId: tierId!,
          quantity: quantity,
          promoCode: promoCode,
        ));
      }

      if (results.isEmpty) {
        CustomSnackBar.showCustomErrorToast(
            message: 'No valid tickets selected');
        return;
      }

      final orderIds =
          results.map((r) => r['orderId']?.toString() ?? '').toList();

      // Real checkout: present the Stripe PaymentSheet for each order's
      // PaymentIntent (backend creates one order per ticket tier).
      final paidOrderIds = <String>[];
      for (var i = 0; i < results.length; i++) {
        final clientSecret = results[i]['clientSecret']?.toString() ?? '';
        final orderId = orderIds[i];
        if (clientSecret.isEmpty) {
          CustomSnackBar.showCustomErrorToast(
              message: 'Missing payment details for order $orderId');
          continue;
        }
        final paid = await _payWithStripe(clientSecret, orderId);
        if (!paid) return; // canceled or failed, remaining orders stay PENDING
        paidOrderIds.add(orderId);
      }

      if (paidOrderIds.isEmpty) return;

      Get.offNamed(Routes.PURCHASED_TICKET, arguments: {
        ...ticketArgs,
        'orderIds': paidOrderIds,
        'orderId': paidOrderIds.first,
      });
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '');
      CustomSnackBar.showCustomErrorToast(message: msg);
    } finally {
      isProcessing.value = false;
    }
  }

  /// Presents the Stripe PaymentSheet for one PaymentIntent, then waits for
  /// the backend webhook to mark the order PAID (issues the tickets).
  /// Returns true when payment succeeded (even if fulfillment is still
  /// propagating), false when the user canceled or payment failed.
  Future<bool> _payWithStripe(String clientSecret, String orderId) async {
    try {
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          merchantDisplayName: 'Sahra',
          paymentIntentClientSecret: clientSecret,
          style: ThemeMode.dark,
        ),
      );
      await Stripe.instance.presentPaymentSheet();

      // Webhook fulfillment is async, poll briefly so the ticket screen
      // usually renders real tickets. If it lags, the wallet still updates.
      for (var i = 0; i < 10; i++) {
        await Future.delayed(const Duration(seconds: 1));
        try {
          final order = await ApiService.order(orderId);
          final status = order['status']?.toString();
          if (status == 'PAID') return true;
          if (status == 'FAILED' || status == 'CANCELLED') {
            CustomSnackBar.showCustomErrorToast(
                message: 'Payment did not complete, order $orderId $status');
            return false;
          }
        } catch (_) {
          // transient, keep polling
        }
      }
      return true;
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) return false;
      CustomSnackBar.showCustomErrorToast(
          message: e.error.message ?? 'Payment failed');
      return false;
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(message: 'Payment failed: $e');
      return false;
    }
  }

  /// Legacy simulated success for flows without backend event context
  /// (e.g. marketplace bids). Clearly labeled as simulated downstream.
  void _simulatedSuccess() {
    final ticketCount = (platinum) + (gold) + (silver) + (bronze);
    Get.offNamed(Routes.PURCHASED_TICKET, arguments: {
      ...ticketArgs,
      Constants.paramTicket: ticketCount > 0 ? ticketCount : quantity,
      'simulated': true,
    });
  }

  @override
  void onClose() {
    cardNumberController.dispose();
    expiryController.dispose();
    cvvController.dispose();
    nameController.dispose();
    promoController.dispose();
    super.onClose();
  }
}
