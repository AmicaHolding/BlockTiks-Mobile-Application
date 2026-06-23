import '../../../data/utils/model/pagination_model.dart';

class CardsModel {
  List<Cards>? cards;
  Pagination? pagination;

  CardsModel({this.cards, this.pagination});

  CardsModel.fromJson(Map<String, dynamic> json) {
    if (json['result'] != null) {
      cards = <Cards>[];
      json['result'].forEach((v) {
        cards!.add(Cards.fromJson(v));
      });
    }
    pagination = json['pagination'] != null
        ? Pagination.fromJson(json['pagination'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    if (cards != null) {
      data['result'] = cards!.map((v) => v.toJson()).toList();
    }
    if (pagination != null) {
      data['pagination'] = pagination!.toJson();
    }
    return data;
  }
}

class Cards {
  String? sId;
  String? userId;
  String? stripeCardId;
  String? stripePaymentMethodId;
  String? brand;
  String? last4digits;
  int? expMonth;
  int? expYear;
  bool? isDeleted;
  String? createdAt;
  String? updatedAt;

  Cards(
      {this.sId,
      this.userId,
      this.stripeCardId,
      this.stripePaymentMethodId,
      this.brand,
      this.last4digits,
      this.expMonth,
      this.expYear,
      this.isDeleted,
      this.createdAt,
      this.updatedAt});

  Cards.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    userId = json['userId'];
    stripeCardId = json['stripeCardId'];
    stripePaymentMethodId = json['stripePaymentMethodId'];
    brand = json['brand'];
    last4digits = json['last4digits'];
    expMonth = json['exp_month'];
    expYear = json['exp_year'];
    isDeleted = json['is_deleted'];
    createdAt = json['createdAt'];
    updatedAt = json['updatedAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['userId'] = userId;
    data['stripeCardId'] = stripeCardId;
    data['stripePaymentMethodId'] = stripePaymentMethodId;
    data['brand'] = brand;
    data['last4digits'] = last4digits;
    data['exp_month'] = expMonth;
    data['exp_year'] = expYear;
    data['is_deleted'] = isDeleted;
    data['createdAt'] = createdAt;
    data['updatedAt'] = updatedAt;
    return data;
  }
}
