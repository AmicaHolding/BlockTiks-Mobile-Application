import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/notifications_page/models/notification_item_model.dart';

class NotificationsItem extends StatelessWidget {
  final NotificationModel item;
  final void Function()? onTap;

  const NotificationsItem({super.key, required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Obx(() => Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: item.isRead.value
                  ? Colors.transparent
                  : ColorConstant.gray50.withValues(alpha: 0.1),
            ),
            padding: getPadding(left: 16, right: 16, top: 8, bottom: 8),
            child: Row(
              children: [
                Container(
                  width: getSize(45),
                  height: getSize(45),
                  padding: getPadding(all: 10),
                  margin: getMargin(right: 15),
                  decoration: BoxDecoration(
                      shape: BoxShape.circle, color: ColorConstant.primaryPink),
                  alignment: Alignment.center,
                  child: CustomImageView(
                    svgPath: item.icon,
                    color: ColorConstant.whiteA700,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText(
                        title: item.title,
                        fontSize: getFontSize(16),
                        customWeight: FontWeight.w500,
                      ),
                      MyText(
                        title: item.description,
                        fontSize: getFontSize(14),
                        line: 1,
                        toverflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Container(
                //   margin: getMargin(left: getHorizontalSize(30)),
                //   child: MyText(
                //     title: item.time.toString(),
                //     fontSize: getFontSize(12),
                //     customWeight: FontWeight.w500,
                //   ),
                // ),
              ],
            ),
          )),
    );
  }
}
