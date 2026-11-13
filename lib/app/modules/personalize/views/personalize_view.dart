import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../controllers/personalize_controller.dart';
import '../../sign_in/views/widgets/auth_pill_button.dart';

class PersonalizeView extends GetView<PersonalizeController> {
  const PersonalizeView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      screenName: 'Personalize'.tr,
      sidePadding: false,
      basicAppBar: true,
      showBackBtn: false,
      leadingImagePath: ImageConstant.imgBackIcon,
      bottomNavigationBar: AuthPillButton(
        onTap: () {
          DummyContent.dummyConcerts.map((item) {
            return item.isSelected.value = false;
          });
          Get.offAllNamed(Routes.LOADER);
        },
        text: "Continue",
        margin: getMargin(all: 16),
      ),
      child: MasonryGridView.count(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        itemCount: DummyContent.dummyConcerts.length,
        itemBuilder: (context, index) {
          final item = DummyContent.dummyConcerts[index];
          return Tile(
            item: item,
            index: index,
            extent: (index % 3 + 1) * 130,
          );
        },
      ),
    );
  }
}

class Tile extends StatelessWidget {
  final int index;
  final double extent;
  final DummyConcertModel item;

  Tile({required this.index, required this.extent, required this.item});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (item.isSelected.value) {
          DummyContent.dummyConcerts[index].isSelected.value = false;
        } else {
          DummyContent.dummyConcerts[index].isSelected.value = true;
        }
      },
      child: Obx(() => ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
            height: extent,
            decoration: BoxDecoration(
                image: DecorationImage(
                    fit: BoxFit.cover, image: AssetImage(item.image)),
                border: item.isSelected.value
                    ? Border.all(color: ColorConstant.primaryAccent, width: 2)
                    : null),
            child: Stack(
              children: [
                // Bottom scrim so the title stays legible over photography.
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Color(0xB3000000),
                        ],
                        stops: [0.55, 1.0],
                      ),
                    ),
                  ),
                ),
                Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: getPadding(all: 12),
                    child: Text(
                      item.title,
                      style: AppStyle.heading3Manrope.copyWith(
                        fontSize: getFontSize(15),
                      ),
                    ),
                  ),
                ),
                Obx(() => item.isSelected.value
                    ? Align(
                        alignment: Alignment.topRight,
                        child: Padding(
                            padding: getPadding(all: 8),
                            child: Container(
                              decoration: BoxDecoration(
                                color: ColorConstant.primaryAccent,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(2),
                              child: Icon(
                                Icons.check,
                                color: ColorConstant.whiteA700,
                                size: 16,
                              ),
                            )),
                      )
                    : const Offstage()),
              ],
            ),
          ))),
    );
  }
}
