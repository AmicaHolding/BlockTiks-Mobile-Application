class Attachment {
  int? id;
  String? path;

  // int? instanceType;
  // int? instanceId;
  String? mimeType;

  // String? thumbnail;
  // String? thumbnailUrl;
  // int? duration;
  // String? createdAt;
  // String? updatedAt;
  // dynamic deletedAt;
  // String? createdAgo;
  // String? mediaUrl;
  // String? smallImage;
  // String? mediumImage;

  Attachment({
    this.id,
    this.path,
    // this.instanceType,
    // this.instanceId,
    this.mimeType,
    // this.thumbnail,
    // this.thumbnailUrl,
    // this.duration,
    // this.createdAt,
    // this.updatedAt,
    // this.deletedAt,
    // this.createdAgo,
    // this.mediaUrl,
    // this.smallImage,
    // this.mediumImage,
  });

  Attachment.fromJson(Map<String, dynamic> json) {
    id = json['id'] as int?;
    path = json['path'] as String?;
    // instanceType = json['instance_type'] as int?;
    // instanceId = json['instance_id'] as int?;
    mimeType = json['mime_type'] as String?;
    // thumbnail = json['thumbnail'] as String?;
    // thumbnailUrl = json['thumbnailUrl'] as String?;
    // duration = json['duration'] as int?;
    // createdAt = json['created_at'] as String?;
    // updatedAt = json['updated_at'] as String?;
    // deletedAt = json['deleted_at'];
    // createdAgo = json['created_ago'] as String?;
    // mediaUrl = json['mediaUrl'] as String?;
    // smallImage = json['smallImage'] as String?;
    // mediumImage = json['mediumImage'] as String?;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> json = <String, dynamic>{};
    json['id'] = id;
    json['path'] = path;
    // json['instance_type'] = instanceType;
    // json['instance_id'] = instanceId;
    json['mime_type'] = mimeType;
    // json['thumbnail'] = thumbnail;
    // json['thumbnailUrl'] = thumbnailUrl;
    // json['duration'] = duration;
    // json['created_at'] = createdAt;
    // json['updated_at'] = updatedAt;
    // json['deleted_at'] = deletedAt;
    // json['created_ago'] = createdAgo;
    // json['mediaUrl'] = mediaUrl;
    // json['smallImage'] = smallImage;
    // json['mediumImage'] = mediumImage;
    return json;
  }
}
