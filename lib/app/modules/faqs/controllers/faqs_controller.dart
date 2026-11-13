import 'package:block_tix/app/data/core/app_export.dart';
import 'package:html/parser.dart';

class FaqsController extends GetxController {
  final RxString searchQuery = ''.obs;

  final List<Map<String, String>> faqs = [
    {
      'type': 'Tickets',
      'question': 'How do I buy tickets for an event?',
      'answer':
          'Browse events, pick your ticket tier, and complete checkout. Your ticket appears in My Tickets right after payment.',
    },
    {
      'type': 'Tickets',
      'question': 'How do I transfer tickets to another user?',
      'answer':
          'Open the ticket from My Tickets, tap Transfer, enter the recipient\'s email or phone number, and confirm. The recipient gets the ticket instantly.',
    },
    {
      'type': 'Resale',
      'question': 'How does ticket resale work?',
      'answer':
          'List your ticket at your chosen price from the Resale tab. When it sells, the payout goes to your BlockTix wallet.',
    },
    {
      'type': 'Account',
      'question': 'How do I change my password?',
      'answer':
          'Go to Profile → Settings → Security & Privacy → Change Password and enter your current and new password.',
    },
    {
      'type': 'Payments',
      'question': 'Which payment methods are supported?',
      'answer':
          'We accept major cards, Apple Pay, and Google Pay at checkout. Payouts are sent to your linked bank account.',
    },
  ];

  List<Map<String, String>> get filteredFaqs {
    final q = searchQuery.value.trim().toLowerCase();
    if (q.isEmpty) return faqs;
    return faqs
        .where((f) =>
            f['question']!.toLowerCase().contains(q) ||
            f['type']!.toLowerCase().contains(q) ||
            f['answer']!.toLowerCase().contains(q))
        .toList();
  }

  @override
  void onInit() {
    // getFaqs();
    super.onInit();
  }
}
