class TicketModel {

  final int? id;
  final String? name;
  final num? price;
  final int? quantity;
  final String? date;
  final int? reserveTickets;



  TicketModel({
    this.id,
    this.name,
    this.price,
    this.quantity,
    this.date,
    this.reserveTickets,

  });

  factory TicketModel.fromJson(Map<String, dynamic> json) => TicketModel(
    id: json["id"],
    name: json["name"],
    price: json["price"],
    quantity: json["quantity"],
    date: json["date"],
    reserveTickets: json["reserveTickets"],
  );

  Map<String, dynamic> toJson() => {
    "id": id,
    "name": name,
    "price": price,
    "quantity": quantity,
    "date": date,
    "reserveTickets": reserveTickets,
  };
}
