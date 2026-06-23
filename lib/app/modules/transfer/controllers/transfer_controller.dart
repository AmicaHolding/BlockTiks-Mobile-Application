import 'package:block_tix/app/data/core/app_export.dart';
import 'package:get/get.dart';

class TransferController extends GetxController {

  RxInt selectedUser = (-1).obs;
  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
}
