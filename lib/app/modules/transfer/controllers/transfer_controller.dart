import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';

class TransferController extends GetxController {
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  final TextEditingController toController = TextEditingController();
  final RxString recipient = ''.obs;
  final RxInt version = 0.obs;
  final RxBool isSending = false.obs;

  String ticketCode = '';
  String ticketTitle = 'Ticket';
  String ticketType = 'Ticket';
  String ticketDate = '';
  String ticketTier = '';
  String ticketSection = '';
  String ticketSeat = '';
  String orderId = '';

  bool get canSend => recipient.value.trim().isNotEmpty && !isSending.value;

  @override
  void onInit() {
    super.onInit();
    toController.addListener(() {
      recipient.value = toController.text;
      version.value++;
    });
    final data = Get.arguments;
    if (data is Map) {
      ticketCode = (data['ticketCode'] ?? data['code'])?.toString() ?? '';
      ticketTitle = data['title']?.toString() ?? ticketTitle;
      ticketType = data['type']?.toString() ?? ticketType;
      ticketDate = data['date']?.toString() ?? ticketDate;
      ticketTier = data['tier']?.toString() ?? ticketTier;
      ticketSection = data['section']?.toString() ?? ticketSection;
      ticketSeat = data['seat']?.toString() ?? ticketSeat;
      orderId = data['orderId']?.toString() ?? orderId;
    }
  }

  /// Email or phone recipient (spec 35 · "their email or phone").
  // TODO(decision-14): unclaimed transfers return to sender after 48h or at
  // doors-open, surfaced in the confirm copy once the server tracks it
  // TODO(decision-17): transfers to phone numbers are allowed from day one
  bool _looksValidRecipient(String to) {
    if (to.contains('@')) return to.contains('.');
    final digits = to.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length >= 7;
  }

  Future<void> send() async {
    final to = recipient.value.trim();
    if (to.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Enter the recipient email or phone');
      return;
    }
    if (!_looksValidRecipient(to)) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Enter a valid email or phone number');
      return;
    }
    if (ticketCode.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: 'This ticket is not ready to transfer yet');
      return;
    }

    // Self-transfer prevention (spec 35).
    try {
      final me = await ApiService.me();
      final user = (me['user'] as Map?) ?? me;
      final own = [
        user['email'],
        user['phone'],
      ].whereType<String>().map((e) => e.toLowerCase()).toList();
      if (own.contains(to.toLowerCase())) {
        CustomSnackBar.showCustomErrorToast(
            message: "You can't send a ticket to yourself");
        return;
      }
    } catch (_) {
      // Best-effort check, the backend also rejects self-transfers.
    }

    final ok = await showSahraConfirm(
      title: 'Send this ticket?',
      body: 'It goes to $to. They get a new QR, you lose access.',
      okLabel: 'Send ticket',
    );
    if (!ok) return;

    isSending.value = true;
    try {
      await ApiService.transferTicket(ticketCode, to);
      Get.back(closeOverlays: true);
      CustomSnackBar.showCustomSnackBar(
        title: 'Ticket sent',
        message: 'The recipient now owns this ticket.',
      );
    } catch (e) {
      CustomSnackBar.showCustomErrorToast(
          message: e.toString().replaceFirst('Exception: ', ''));
    } finally {
      isSending.value = false;
    }
  }

  @override
  void onClose() {
    toController.dispose();
    super.onClose();
  }
}
