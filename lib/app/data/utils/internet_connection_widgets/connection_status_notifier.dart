import 'dart:async';

import 'package:block_tix/app/data/utils/enum/connection_status.dart';
import 'package:block_tix/main.dart';

import '../../core/app_export.dart';

class ConnectionStatusValueNotifier extends ValueNotifier<ConnectionStatus> {
  // Will keep a subscription to
  // the class [CheckInternetConnection]
  late StreamSubscription _connectionSubscription;

  ConnectionStatusValueNotifier() : super(ConnectionStatus.online) {
    // Everytime there a new connection status is emitted
    // we will update the [value]. This will make the widget
    // to rebuild
    _connectionSubscription = internetChecker
        .internetStatus()
        .listen((newStatus) => value = newStatus);
  }

  @override
  void dispose() {
    _connectionSubscription.cancel();
    super.dispose();
  }
}
