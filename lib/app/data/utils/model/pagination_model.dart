class Pagination {
  final int? limit;
  final int? current;
  final int? totalRecords;

  // final int? totalPages;
  final int? lastPage;

  // final bool? hasNext;
  // final bool? hasPrevious;
  // final Cursor? cursor;

  Pagination({
    this.totalRecords,
    this.limit,
    this.current,
    // this.totalPages,
    this.lastPage,
    // this.hasNext,
    // this.hasPrevious,
    // this.cursor,
  });

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
        totalRecords: json["totalRecords"],
        limit: json["limit"],
        current: json["current"],
        // totalPages: json["totalPages"],
        lastPage: json["lastPage"],
        // hasNext: json["hasNext"],
        // hasPrevious: json["hasPrevious"],
        // cursor: json["cursor"] == null ? null : Cursor.fromJson(json["cursor"]),
      );

  Map<String, dynamic> toJson() => {
        "totalRecords": totalRecords,
        "limit": limit,
        "current": current,
        // "totalPages": totalPages,
        "lastPage": lastPage,
        // "hasNext": hasNext,
        // "hasPrevious": hasPrevious,
        // "cursor": cursor?.toJson(),
      };
}

class Cursor {
  Cursor();

  factory Cursor.fromJson(Map<String, dynamic> json) => Cursor();

  Map<String, dynamic> toJson() => {};
}
