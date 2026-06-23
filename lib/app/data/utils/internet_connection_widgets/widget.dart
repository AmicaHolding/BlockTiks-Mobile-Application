import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/enum/connection_status.dart';
import 'package:block_tix/app/data/utils/internet_connection_widgets/connection_status_notifier.dart';

class WarningWidgetValueNotifier extends StatelessWidget {
  const WarningWidgetValueNotifier({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: ConnectionStatusValueNotifier(),
      builder: (context, ConnectionStatus status, child) {
        return Visibility(
          visible: status != ConnectionStatus.online,
          child: Container(
            padding: getPadding(left: 10, right: 10, top: 7, bottom: 7),
            color: ColorConstant.redColor,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.wifi_off,
                ),
                const SizedBox(width: 10),
                MyText(
                  title: "msg_no_internet".tr,
                  fontSize: getFontSize(15),
                )
              ],
            ),
          ),
        );
      },
    );
  }
}
