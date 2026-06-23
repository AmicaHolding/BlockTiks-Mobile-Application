import 'package:block_tix/app/data/core/app_export.dart';

class CustomDialogue extends StatelessWidget {
  final String dialogueBoxHeading;
  final String? semanticsHeading;
  final String dialogueBoxText;
  final String? noLbl;
  final String? yesLbl;
  final VoidCallback actionOnYes;
  final String? semanticsOnYes;
  final String? semanticsOnNo;
  final VoidCallback actionOnNo;
  final double? height;

  CustomDialogue(
      {Key? key,
      required this.dialogueBoxHeading,
      required this.dialogueBoxText,
      required this.actionOnNo,
      required this.actionOnYes,
      this.semanticsHeading,
      this.noLbl,
      this.yesLbl,
      this.semanticsOnYes,
      this.semanticsOnNo,
      this.height = 20})
      : super(key: key);

  final Responsive responsive = Responsive();

  @override
  Widget build(BuildContext context) {
    responsive.setContext(context);
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14.0)),
      child: SizedBox(
        height: responsive.setHeight(18),
        width: responsive.setWidth(10),
        child: Column(
          children: [
            SizedBox(
              height: responsive.setHeight(3),
            ),
            MyText(
              title: dialogueBoxHeading,
              center: true,
              letterSpacing: 0.09,
              fontSize: getFontSize(15),
              customWeight: FontWeight.w600,
              // style: AppStyle.txtSourceSansProRegular15Black900.copyWith(letterSpacing: 0.09),
            ),
            // Text(dialogueBoxHeading,
            //     semanticsLabel: semanticsHeading,
            //     // style: AppStyle.txtSourceSansProSemiBold16Black900 /*fontSize: 15, color: Colors.black, fontWeight: FontWeight.bold*/
            //     ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 7),
              child: MyText(
                title: dialogueBoxText,
                center: true,
                letterSpacing: 0.09,
                fontSize: 14,
                customWeight: FontWeight.w400,
              ),
            ),
            const Spacer(),
            const Spacer(),
            Container(
              height: 0.7,
              color: ColorConstant.textFieldHintColor.withOpacity(0.6),
            ),

            // Row()
            SizedBox(
              height: responsive.setHeight(5),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: actionOnNo,
                      child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12.0),
                              border: Border.all(color: Colors.transparent)),
                          child: MyText(
                            title: noLbl ?? 'no_lbl'.tr,
                            fontSize: responsive.setTextScale(14),
                            clr: ColorConstant.yellow,
                            customWeight: FontWeight.w400,
                          )
                          // Text(
                          //   'no_lbl'.tr,
                          //   semanticsLabel: semanticsOnNo,
                          //   // style: AppStyle.textStyleRegularSourceSansPro(
                          //   //     fontSize: responsive.setTextScale(14), color: ColorConstant.yellow, fontWeight: FontWeight.w400),
                          // ),
                          ),
                    ),
                  ),
                  Container(
                    width: 1,
                    color: ColorConstant.textFieldHintColor.withOpacity(0.6),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: actionOnYes,
                      child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12.0),
                              border: Border.all(color: Colors.transparent)),
                          child: MyText(
                            title: yesLbl ?? 'yes_lbl'.tr,
                            fontSize: responsive.setTextScale(14),
                            clr: ColorConstant.yellow,
                            customWeight: FontWeight.w400,
                          )

                          // Text(
                          //   'yes_lbl'.tr,
                          //   semanticsLabel: semanticsOnYes,
                          //   style: AppStyle.textStyleRegularSourceSansPro(
                          //       fontSize: responsive.setTextScale(14),color: ColorConstant.yellow, fontWeight: FontWeight.w400),
                          // ),
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
