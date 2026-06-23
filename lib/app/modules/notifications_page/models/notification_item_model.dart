import '../../../data/core/app_export.dart';

class NotificationModel {
  final int id;
  final String title;
  final String description;
  final String time;
  final String icon;
  final RxBool isRead;

  NotificationModel({
    required this.id,
    required this.title,
    required this.description,
    required this.time,
    required this.icon,
    required this.isRead,
  });
}
