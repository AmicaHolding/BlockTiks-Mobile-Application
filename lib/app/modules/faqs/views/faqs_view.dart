import 'package:block_tix/app/data/theme/app_style.dart';
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
                  color: ColorConstant.elevated,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TextField(
                  onChanged: (val) => controller.searchQuery.value = val,
                  style: GoogleFonts.getFont("Inter",
                      fontSize: 16, color: ColorConstant.whiteA700),
                  decoration: InputDecoration(
                    contentPadding: getPadding(
                      right: 30,
                    ),
                    icon: Icon(Icons.search,
                        color: ColorConstant.white60),
                    hintText: 'Search',
                    hintStyle:
                        TextStyle(color: ColorConstant.white60),
                    border: InputBorder.none,
                  ),
                ),
              ),
              SizedBox(
                height: getSize(20),
              ),
              Obx(() {
                final items = controller.filteredFaqs;
                if (items.isEmpty) {
                  return Padding(
                    padding: getPadding(top: 24, bottom: 24),
                    child: Center(
                      child: Text(
                        'No FAQs found',
                        style: AppStyle.bodySmallInter,
                      ),
                    ),
                  );
                }
                return Column(
                  children: items
                      .map((f) => FAQTile(
                            type: f['type']!,
                            question: f['question']!,
                            answer: f['answer']!,
                          ))
                      .toList(),
                );
              }),
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
