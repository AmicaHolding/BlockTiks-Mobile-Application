import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:get/get.dart';

class CreatorEventController extends GetxController {
  RxList<DummyBroadcastModel> broadcastMessages = DummyContent.broadcastMessages.obs;
}
