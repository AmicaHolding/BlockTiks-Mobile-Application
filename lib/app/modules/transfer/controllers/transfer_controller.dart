import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_snackbar.dart';
import 'package:get/get.dart';
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

  Future<void> send() async {
    final to = recipient.value.trim();
    if (to.isEmpty) {
      CustomSnackBar.showCustomErrorToast(message: 'Enter the recipient email');
      return;
    }
    if (!to.contains('@')) {
      CustomSnackBar.showCustomErrorToast(
          message: 'Enter a valid recipient email');
      return;
    }
    if (ticketCode.isEmpty) {
      CustomSnackBar.showCustomErrorToast(
          message: 'This ticket is not ready to transfer yet');
      return;
    }
    isSending.value = true;
    try {
      await ApiService.transferTicket(ticketCode, to);
      CustomSnackBar.showCustomSnackBar(
        title: 'Ticket sent',
        message: 'The recipient now owns this ticket.',
      );
      Get.back();
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
