// // import 'package:block_tix/app/data/core/app_export.dart';
//
//
// class CustomButton2 extends StatelessWidget {
//   final String title;
//   final String? semanticLabel;
//   final double? width;
//   final double? height;
//
//   final double? marginHorizontal;
//   final Function() onTap;
//
//   final TextStyle? textStyle;
//   final RoundedLoadingButtonController? controller;
//
//   CustomButton2({
//     required this.title,
//     required this.onTap,
//     this.semanticLabel,
//     this.controller,
//     this.width,
//     this.height,
//     this.textStyle,
//     this.marginHorizontal,
//     Key? key,
//   }) : super(key: key);
//
//   final Responsive responsive = Responsive();
//
//   @override
//   Widget build(BuildContext context) {
//     responsive.setContext(context);
//     return controller == null
//         ? GestureDetector(
//             onTap: onTap,
//             child: Container(
//               decoration:  BoxDecoration(
//                 color: ColorConstant.yellow,
//                 borderRadius: const BorderRadius.all(Radius.circular(0.0)),
//               ),
//               width: responsive.setWidth(100),
//               height: height ?? responsive.setHeight(7),
//               child: Center(
//                 child: Text(
//                   title,
//                   semanticsLabel: semanticLabel,
//                   textAlign: TextAlign.center,
//                   style: textStyle,
//                 ),
//               ),
//             ),
//           )
//         : RoundedLoadingButton(
//             width: responsive.setWidth(100),
//             height: height ?? responsive.setHeight(7),
//             onPressed: onTap,
//             animateOnTap: false,
//             borderRadius: 14,
//             controller: controller!,
//             color: ColorConstant.yellow,
//             child: Text(
//               title,
//               semanticsLabel: semanticLabel,
//               textAlign: TextAlign.center,
//               style: textStyle,
//             ),
//           );
//   }
// }
