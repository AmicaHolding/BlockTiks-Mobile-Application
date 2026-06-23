import 'package:block_tix/app/data/utils/color_constant.dart';
import 'package:block_tix/app/data/utils/size_utils.dart';
import 'package:block_tix/app/data/widgets/base/baseview_process_screen.dart';
import 'package:block_tix/app/data/widgets/custom_faq_tile.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/faqs_controller.dart';

class FaqsView extends GetView<FaqsController> {
  const FaqsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseviewScreen(
      basicAppBar: true,
      showBackBtn: true,
      sidePadding: false,
      showDivider: false,
      mainTopHeight: 0,
      isHideLogo: true,
      hideAppBar: false,
      safeAreaTop: true,
      isAgent: true,
      isServices: false,
      showBottomBar: false,
      child: Padding(
        padding: getPadding(all: 16),
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                padding: getPadding(left: 16, right: 16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TextField(
                  style: GoogleFonts.getFont("Inter",
                      fontSize: 16, color: ColorConstant.whiteA700),
                  decoration: InputDecoration(
                    contentPadding: getPadding(
                      right: 30,
                    ),
                    icon: Icon(Icons.search, color: Colors.white),
                    hintText: 'Search',
                    hintStyle: TextStyle(color: Colors.white70),
                    border: InputBorder.none,
                  ),
                ),
              ),
              SizedBox(
                height: getSize(20),
              ),
              FAQTile(
                type: "Transfer Tickets",
                question: "How to transfer tickets to another user?",
                answer: "How to transfer tickets to another user?",
              ),
            ],
          ),
        ),
      ),
      // backgroundColor: ColorConstant.bodyBackground,
      // child: RefreshIndicator(
      //   onRefresh: () async {
      //     await Future.delayed(const Duration(milliseconds: Constants.refreshDelay));
      //     controller.getFaqs();
      //   },
      //   child: SingleChildScrollView(
      //     child: Column(
      //       children: [
      //         Obx(
      //           () => Container(
      //             // padding: getPadding(left: getSize(10),right: getSize(10)),
      //             decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(getSize(10))),
      //             child: controller.faqsModelObj.value.data == null
      //                 ? const SizedBox(
      //                     height: 500,
      //                     child: FaqsShimmer(
      //                         //color: ColorConstant.blackColor,
      //                         ))
      //                 : controller.faqsModelObj.value.data!.result!.isEmpty
      //                     ? SizedBox(
      //                         height: 500,
      //                         child: Center(
      //                             child: Text(
      //                           "no_faqs_found".tr,
      //                           style: TextStyle(fontSize: getFontSize(14), fontWeight: FontWeight.w500, color: ColorConstant.blackColor),
      //                         )))
      //                     : ListView.builder(
      //                         physics: const NeverScrollableScrollPhysics(),
      //                         shrinkWrap: true,
      //                         itemCount: controller.faqsModelObj.value.data?.result?.length,
      //                         scrollDirection: Axis.vertical,
      //                         padding: EdgeInsets.zero,
      //                         itemBuilder: (context, index) {
      //                           final item = controller.faqsModelObj.value.data?.result![index];
      //                           return faqItem(item!.question!, item.answer!, isFirst: index == 0);
      //                         },
      //                       ),
      //           ),
      //         ),
      //       ],
      //     ),
      //   ),
      // ),
    );
  }
}
