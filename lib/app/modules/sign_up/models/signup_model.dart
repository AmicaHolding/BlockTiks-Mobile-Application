class SignupModel {
  User? user;
  String? accessToken;

  SignupModel({
    this.user,
    this.accessToken,
  });

  factory SignupModel.fromJson(Map<String, dynamic> json) => SignupModel(
        user: json["user"] == null ? null : User.fromJson(json["user"]),
        accessToken: json["access_token"],
      );

  Map<String, dynamic> toJson() =>
      {"user": user?.toJson(), "access_token": accessToken};
}

class User {
  String? id;
  String? firstName;
  String? lastName;
  String? profileImage;
  dynamic fullName;
  dynamic coverImage;
  dynamic address;
  Location? location;
  String? email;
  Role? role;
  bool? pushNotification;
  bool? isVerified;
  String? projectId;
  String? phone;
  String? accountDeleteReason;
  dynamic additionalFields;
  bool? isDeleted;
  bool? isSocial;
  String? status;
  DateTime? createdAt;
  DateTime? updatedAt;

  User({
    this.id,
    this.firstName,
    this.lastName,
    this.profileImage,
    this.fullName,
    this.coverImage,
    this.address,
    this.location,
    this.email,
    this.role,
    this.pushNotification,
    this.isVerified,
    this.projectId,
    this.phone,
    this.accountDeleteReason,
    this.additionalFields,
    this.isDeleted,
    this.isSocial,
    this.status,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json["_id"],
        firstName: json["firstName"],
        lastName: json["lastName"],
        profileImage: json["profileImage"],
        fullName: json["fullName"],
        coverImage: json["coverImage"],
        address: json["address"],
        location: json["location"] == null
            ? null
            : Location.fromJson(json["location"]),
        email: json["email"],
        role: json["role"] == null ? null : Role.fromJson(json["role"]),
        pushNotification: json["pushNotification"],
        isVerified: json["isVerified"],
        projectId: json["projectId"],
        phone: json["phone"],
        accountDeleteReason: json["accountDeleteReason"],
        additionalFields: json["additionalFields"],
        isDeleted: json["isDeleted"],
        isSocial: json["isSocial"],
        status: json["status"],
        createdAt: json["createdAt"] == null
            ? null
            : DateTime.parse(json["createdAt"]),
        updatedAt: json["updatedAt"] == null
            ? null
            : DateTime.parse(json["updatedAt"]),
      );

  Map<String, dynamic> toJson() => {
        "_id": id,
        "firstName": firstName,
        "lastName": lastName,
        "profileImage": profileImage,
        "fullName": fullName,
        "coverImage": coverImage,
        "address": address,
        "location": location?.toJson(),
        "email": email,
        "role": role?.toJson(),
        "pushNotification": pushNotification,
        "isVerified": isVerified,
        "projectId": projectId,
        "phone": phone,
        "accountDeleteReason": accountDeleteReason,
        "additionalFields": additionalFields,
        "isDeleted": isDeleted,
        "isSocial": isSocial,
        "status": status,
        "createdAt": createdAt?.toIso8601String(),
        "updatedAt": updatedAt?.toIso8601String(),
      };
}

class Location {
  String? type;
  List<num?>? coordinates;

  Location({
    this.type,
    this.coordinates,
  });

  factory Location.fromJson(Map<String, dynamic> json) => Location(
        type: json["type"],
        coordinates: json["coordinates"] == null
            ? []
            : List<num?>.from(json["coordinates"]!.map((x) => x)),
      );

  Map<String, dynamic> toJson() => {
        "type": type,
        "coordinates": coordinates == null
            ? []
            : List<dynamic>.from(coordinates!.map((x) => x)),
      };
}

class Role {
  String? id;
  String? name;
  int? roleId;
  String? projectId;
  bool? isDeleted;
  DateTime? createdAt;
  DateTime? updatedAt;

  Role({
    this.id,
    this.name,
    this.roleId,
    this.projectId,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  factory Role.fromJson(Map<String, dynamic> json) => Role(
        id: json["_id"],
        name: json["name"],
        roleId: json["roleId"],
        projectId: json["projectId"],
        isDeleted: json["is_deleted"],
        createdAt: json["createdAt"] == null
            ? null
            : DateTime.parse(json["createdAt"]),
        updatedAt: json["updatedAt"] == null
            ? null
            : DateTime.parse(json["updatedAt"]),
      );

  Map<String, dynamic> toJson() => {
        "_id": id,
        "name": name,
        "roleId": roleId,
        "projectId": projectId,
        "is_deleted": isDeleted,
        "createdAt": createdAt?.toIso8601String(),
        "updatedAt": updatedAt?.toIso8601String(),
      };
}
