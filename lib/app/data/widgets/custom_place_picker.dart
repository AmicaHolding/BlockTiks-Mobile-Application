// import 'dart:convert';
//
// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import 'package:google_places_flutter/models/place_details.dart';
// import 'package:google_places_flutter/models/prediction.dart';
//
// import 'package:rxdart/subjects.dart';
// import 'package:dio/dio.dart';
// import 'package:rxdart/rxdart.dart';
// import 'package:block_tix/app/data/utils/color_constant.dart';
// import 'package:block_tix/app/data/utils/image_constant.dart';
// import 'package:block_tix/app/data/utils/size_utils.dart';
// import 'package:block_tix/app/data/widgets/custom_image_view.dart';
// import 'package:block_tix/app/data/widgets/custom_text.dart';
//
// class CustomPlacePicker extends StatefulWidget {
//   InputDecoration inputDecoration;
//   ItemClick? itmClick;
//   GetPlaceDetailswWithLatLng? getPlaceDetailWithLatLng;
//   bool isLatLngRequired = true;
//
//   TextStyle textStyle;
//   String googleAPIKey;
//   int debounceTime = 600;
//   List<String>? countries = [];
//   TextEditingController textEditingController = TextEditingController();
//
//   CustomPlacePicker(
//       {required this.textEditingController,
//         required this.googleAPIKey,
//         this.debounceTime = 600,
//         this.inputDecoration = const InputDecoration(),
//         this.itmClick,
//         this.isLatLngRequired=true,
//         this.textStyle= const TextStyle(),
//         this.countries,
//         this.getPlaceDetailWithLatLng,
//       });
//
//   @override
//   _CustomPlacePickerState createState() =>
//       _CustomPlacePickerState();
// }
//
// class _CustomPlacePickerState
//     extends State<CustomPlacePicker> {
//   final subject = new PublishSubject<String>();
//   OverlayEntry? _overlayEntry;
//   List<Prediction> alPredictions = [];
//
//   TextEditingController controller = TextEditingController();
//   final LayerLink _layerLink = LayerLink();
//   bool isSearched = false;
//
//   @override
//   Widget build(BuildContext context) {
//     return CompositedTransformTarget(
//       link: _layerLink,
//       child: TextFormField(
//         decoration: widget.inputDecoration,
//         style: widget.textStyle,
//         controller: widget.textEditingController,
//         onChanged: (string) => (subject.add(string)),
//       ),
//     );
//   }
//
//   getLocation(String text) async {
//     Dio dio = new Dio();
//     String url =
//         "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=$text&key=${widget.googleAPIKey}";
//
//     if (widget.countries != null) {
//       // in
//
//       for (int i = 0; i < widget.countries!.length; i++) {
//         String country = widget.countries![i];
//
//         if (i == 0) {
//           url = url + "&components=country:$country";
//         } else {
//           url = url + "|" + "country:" + country;
//         }
//       }
//     }
//
//
//
//     Response response = await dio.get(url);
//     PlacesAutocompleteResponse subscriptionResponse =
//     PlacesAutocompleteResponse.fromJson(response.data);
//
//     if (text.length == 0) {
//       alPredictions.clear();
//       this._overlayEntry!.remove();
//       return;
//     }
//
//     isSearched = false;
//     if (subscriptionResponse.predictions!.length > 0) {
//       alPredictions.clear();
//       alPredictions.addAll(subscriptionResponse.predictions!);
//     }
//
//     //if (this._overlayEntry == null)
//
//     this._overlayEntry = null;
//     this._overlayEntry = this._createOverlayEntry();
//     Overlay.of(context)!.insert(this._overlayEntry!);
//     //   this._overlayEntry.markNeedsBuild();
//   }
//
//   @override
//   void initState() {
//     subject.stream
//         .distinct()
//         .debounceTime(Duration(milliseconds: widget.debounceTime))
//         .listen(textChanged);
//   }
//
//   textChanged(String text) async {
//     getLocation(text);
//   }
//
//   OverlayEntry? _createOverlayEntry() {
//     if (context != null && context.findRenderObject() != null) {
//       RenderBox renderBox = context.findRenderObject() as RenderBox;
//       var size = renderBox.size;
//       var offset = renderBox.localToGlobal(Offset.zero);
//       return OverlayEntry(
//           builder: (context) => Positioned(
//             left: 0,
//             top: size.height + offset.dy,
//             width: size.width,
//             child: CompositedTransformFollower(
//               showWhenUnlinked: false,
//               link: this._layerLink,
//               offset: Offset(0.0, size.height ),
//               child: Material(
//                   elevation: 0.0,
//                   child: Container(
//                     child: ListView.separated(
//                       padding: EdgeInsets.zero,
//                       shrinkWrap: true,
//                       separatorBuilder: (context,index){
//                         return SizedBox(height: getVerticalSize(10),);
//                       },
//                       itemCount: alPredictions.length,
//                       itemBuilder: (BuildContext context, int index) {
//                         return InkWell(
//                           onTap: () {
//                             if (index < alPredictions.length) {
//                               widget.itmClick!(alPredictions[index]);
//                               if (!widget.isLatLngRequired) return;
//                               getPlaceDetailsFromPlaceId(alPredictions[index]);
//                               removeOverlay();
//                             }
//                           },
//                           child: Container(
//                               padding: EdgeInsets.symmetric(horizontal: 10),
//                               child: customWidget(item : alPredictions[index]),
//                           )
//
//                               // Text(alPredictions[index].description!)),
//                         );
//                       },
//                     ),
//                   )),
//             ),
//           ));
//     }
//   }
//
//   removeOverlay() {
//     alPredictions.clear();
//     this._overlayEntry = this._createOverlayEntry();
//     if (context != null) {
//       Overlay.of(context)!.insert(this._overlayEntry!);
//       this._overlayEntry!.markNeedsBuild();
//     }
//   }
//
//   Future<Response?> getPlaceDetailsFromPlaceId(Prediction prediction) async {
//     //String key = GlobalConfiguration().getString('google_maps_key');
//
//     var url =
//         "https://maps.googleapis.com/maps/api/place/details/json?placeid=${prediction.placeId}&key=${widget.googleAPIKey}";
//     Response response = await Dio().get(
//       url,
//     );
//
//     PlaceDetails placeDetails = PlaceDetails.fromJson(response.data);
//
//     prediction.lat = placeDetails.result!.geometry!.location!.lat.toString();
//     prediction.lng = placeDetails.result!.geometry!.location!.lng.toString();
//
//     widget.getPlaceDetailWithLatLng!(prediction);
//
// //    prediction.latLng = new LatLng(
// //        placeDetails.result.geometry.location.lat,
// //        placeDetails.result.geometry.location.lng);
//   }
//
//   customWidget({required Prediction item}){
//     return Container(
//       color: ColorConstant.whiteA700,
//       child: Row(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           CustomImageView(
//             svgPath: ImageConstant.locationOutlined,
//             height: getVerticalSize(20),
//             fit: BoxFit.fitHeight,
//             margin: EdgeInsets.only(right: getSize(6)),
//           ),
//           Expanded(
//             child: Column(
//               crossAxisAlignment: CrossAxisAlignment.start,
//               children: [
//                 MyText(
//                   title: (item.description??"").split(", ").first,
//                   fontSize: getFontSize(12),
//                   customWeight: FontWeight.w500,
//                   clr: ColorConstant.opacBlackColor,
//                 ),
//                 Container(
//                   width: size.width,
//                   decoration: BoxDecoration(
//                     border: Border(
//                       bottom: BorderSide(
//                           color:ColorConstant.dividerColor,width: 0.5),
//                     ),
//                   ),
//                   padding: getPadding(top: getSize(8),bottom: getSize(8)),
//                   child: MyText(
//                     title: (item.description??"").split(", ").last,
//                     fontSize: getFontSize(12),
//                     customWeight: FontWeight.w400,
//                     clr: ColorConstant.gray60003,
//                   ),
//                 ),
//                 // CustomDivider()
//               ],
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }
//
// PlacesAutocompleteResponse parseResponse(Map responseBody) {
//   return PlacesAutocompleteResponse.fromJson(responseBody as Map<String, dynamic>);
// }
//
// PlaceDetails parsePlaceDetailMap(Map responseBody) {
//   return PlaceDetails.fromJson(responseBody as Map<String, dynamic>);
// }
//
// typedef ItemClick = void Function(Prediction postalCodeResponse);
// typedef GetPlaceDetailswWithLatLng = void Function(
//     Prediction postalCodeResponse);
