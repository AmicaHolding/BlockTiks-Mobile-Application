class NotificationsModel {
  bool? status;
  String? message;
  Data? data;

  NotificationsModel({
    this.status,
    this.message,
    this.data,
  });

  NotificationsModel.fromJson(Map<String, dynamic> json) {
    status = json['status'] as bool?;
    message = json['message'] as String?;
    data = (json['data'] as Map<String, dynamic>?) != null
        ? Data.fromJson(json['data'] as Map<String, dynamic>)
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = <String, dynamic>{};
    json['status'] = status;
    json['message'] = message;
    json['data'] = data?.toJson();
    return json;
  }
}

class Data {
  List<Result>? result;
  Pagination? pagination;

  Data({
    this.result,
    this.pagination,
  });

  Data.fromJson(Map<String, dynamic> json) {
    result = (json['result'] as List?)
        ?.map((dynamic e) => Result.fromJson(e as Map<String, dynamic>))
        .toList();
    pagination = (json['pagination'] as Map<String, dynamic>?) != null
        ? Pagination.fromJson(json['pagination'] as Map<String, dynamic>)
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = <String, dynamic>{};
    json['result'] = result?.map((e) => e.toJson()).toList();
    json['pagination'] = pagination?.toJson();
    return json;
  }
}

class Result {
  String? id;
  String? receiverId;
  String? senderId;
  String? referenceId;
  String? messageTitle;
  String? messageBody;
  int? notificationType;
  bool? forEveryone;
  bool? forAdmin;
  String? status;
  bool? isDeleted;
  String? createdAt;
  String? updatedAt;

  Result({
    this.id,
    this.receiverId,
    this.senderId,
    this.referenceId,
    this.messageTitle,
    this.messageBody,
    this.notificationType,
    this.forEveryone,
    this.forAdmin,
    this.status,
    this.isDeleted,
    this.createdAt,
    this.updatedAt,
  });

  Result.fromJson(Map<String, dynamic> json) {
    id = json['_id'] as String?;
    receiverId = json['receiverId'] as String?;
    senderId = json['senderId'] as String?;
    referenceId = json['referenceId'] as String?;
    messageTitle = json['messageTitle'] as String?;
    messageBody = json['messageBody'] as String?;
    notificationType = json['notificationType'] as int?;
    forEveryone = json['forEveryone'] as bool?;
    forAdmin = json['forAdmin'] as bool?;
    status = json['status'] as String?;
    isDeleted = json['is_deleted'] as bool?;
    createdAt = json['createdAt'] as String?;
    updatedAt = json['updatedAt'] as String?;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = <String, dynamic>{};
    json['_id'] = id;
    json['receiverId'] = receiverId;
    json['senderId'] = senderId;
    json['referenceId'] = referenceId;
    json['messageTitle'] = messageTitle;
    json['messageBody'] = messageBody;
    json['notificationType'] = notificationType;
    json['forEveryone'] = forEveryone;
    json['forAdmin'] = forAdmin;
    json['status'] = status;
    json['is_deleted'] = isDeleted;
    json['createdAt'] = createdAt;
    json['updatedAt'] = updatedAt;
    return json;
  }
}

class Pagination {
  int? totalRecords;
  int? limit;
  int? current;
  int? totalPages;
  int? lastPage;
  bool? hasNext;
  bool? hasPrevious;

  //Cursor? cursor;

  Pagination({
    this.totalRecords,
    this.limit,
    this.current,
    this.totalPages,
    this.lastPage,
    this.hasNext,
    this.hasPrevious,
    //this.cursor,
  });

  Pagination.fromJson(Map<String, dynamic> json) {
    totalRecords = json['totalRecords'] as int?;
    limit = json['limit'] as int?;
    current = json['current'] as int?;
    totalPages = json['totalPages'] as int?;
    lastPage = json['lastPage'] as int?;
    hasNext = json['hasNext'] as bool?;
    hasPrevious = json['hasPrevious'] as bool?;
    // cursor = (json['cursor'] as Map<String,dynamic>?) != null ? Cursor.fromJson(json['cursor'] as Map<String,dynamic>) : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = <String, dynamic>{};
    json['totalRecords'] = totalRecords;
    json['limit'] = limit;
    json['current'] = current;
    json['totalPages'] = totalPages;
    json['lastPage'] = lastPage;
    json['hasNext'] = hasNext;
    json['hasPrevious'] = hasPrevious;
    // json['cursor'] = cursor?.toJson();
    return json;
  }
}
//
// class Cursor {
//
//
//   Cursor({
//
// });
//
// Cursor.fromJson(Map<String, dynamic> json) {
//
// }
//
// Map<String, dynamic> toJson() {
//   final Map<String, dynamic> json = <String, dynamic>{};
//
//   return json;
// }
// }
