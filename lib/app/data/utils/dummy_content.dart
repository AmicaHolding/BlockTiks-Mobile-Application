import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/modules/notifications_page/models/notification_item_model.dart';

class DummyContent {
  static List<NotificationModel> dummyNotifications = [
    NotificationModel(
      id: 1,
        title: "Title Here",
        icon: ImageConstant.n6,
        description:
            "Discount alert! up to 60% discount on washington property",
        time: '2h ago',
        isRead: false.obs),
    NotificationModel(
      id: 2,
        title: "Title Here",
        icon: ImageConstant.n7,
        description: "New property has been added in your searched area.",
        time: '2h ago',
        isRead: false.obs),
    NotificationModel(
      id: 3,
        title: "Title Here",
        icon: ImageConstant.n8,
        description: "New property has been added in your searched area.",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 4,
      title: "Title Here",
      icon: ImageConstant.n1,
      description: "Discount alert! up to 70% discount on washington property",
      time: '2h ago',
      isRead: false.obs,
    ),
    NotificationModel(
      id: 5,
        title: "Title Here",
        icon: ImageConstant.n9,
        description: "New property has been added in your searched area.",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 6,
        title: "Title Here",
        icon: ImageConstant.n10,
        description:
            "Discount alert! up to 70% discount on washington property",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 7,
        title: "Title Here",
        icon: ImageConstant.n10,
        description: "New property has been added in your searched area.",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 8,
        title: "Title Here",
        icon: ImageConstant.n4,
        description:
            "Discount alert! up to 70% discount on washington property",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 9,
        title: "Title Here",
        icon: ImageConstant.n10,
        description: "New property has been added in your searched area.",
        time: '2h ago',
        isRead: true.obs),
    NotificationModel(
      id: 10,
        title: "Title Here",
        icon: ImageConstant.n10,
        description:
            "Discount alert! up to 70% discount on washington property",
        time: '2h ago',
        isRead: true.obs),
  ];

  static List<DummyConcertModel> dummyConcerts = [
    DummyConcertModel(image: ImageConstant.f1, title: 'Festival 1', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f2, title: 'Festival 2', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f3, title: 'Festival 3', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f4, title: 'Festival 4', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f5, title: 'Festival 5', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f6, title: 'Festival 6', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f1, title: 'Festival 7', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f5, title: 'Festival 8', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f3, title: 'Festival 9', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f6, title: 'Festival 10', isSelected: false.obs),
    DummyConcertModel(image: ImageConstant.f2, title: 'Festival 11', isSelected: false.obs),
  ];

  static List<DummyTeamsModel> dummyTeams = [
    DummyTeamsModel(title: 'Club One', isSelected: false.obs),
    DummyTeamsModel(title: 'Club Two', isSelected: false.obs),
    DummyTeamsModel(title: 'Club Three', isSelected: false.obs),
  ];
  static List<DummyTeamsModel> dummyIndividual = [
    DummyTeamsModel(title: 'Muhammad Abu Hassan', isSelected: false.obs),
  ];

  static List<String> dummyRoles = [
    "Check In",
    "Co Host",
    "Guest"
  ];

  static List<String> images = [
    ImageConstant.user,
    ImageConstant.user1,
    ImageConstant.user2,
  ];
  
  static List<DummyBroadcastModel> broadcastMessages = [
    DummyBroadcastModel(message: 'This event is going to be the best event of my life.', name: 'Ana Steve'),
    DummyBroadcastModel(message: 'Happy event everyone!', name: 'Julia White'),
  ];

  static List<DummyGuestModel> guests = [
    DummyGuestModel(name: "Mohammad Abu Hassan", isCheckedIn: false),
    DummyGuestModel(name: "Mohammad Abu Hassan", isCheckedIn: true),
  ];
}

class DummyConcertModel {
  final String title;
  final String image;
  final RxBool isSelected;

  DummyConcertModel({
    required this.title,
    required this.image,
    required this.isSelected,
  });
}

class DummyTeamsModel {
  final String title;
  final RxBool isSelected;

  DummyTeamsModel({
    required this.title,
    required this.isSelected,
  });
}

class DummyCreateTeamsModel {
  final String title;
  int members;

  DummyCreateTeamsModel({
    required this.title,
    required this.members,
  });
}
class DummyIndividualModel {
  final String title;
  final String role;

  DummyIndividualModel({
    required this.title,
    required this.role,
  });
}

class DummyBroadcastModel {
  final String message;
  final String name;

  DummyBroadcastModel({
    required this.message,
    required this.name,
  });
}

class DummyGuestModel {
  final String name;
  final bool isCheckedIn;

  DummyGuestModel({
    required this.name,
    required this.isCheckedIn,
  });
}
