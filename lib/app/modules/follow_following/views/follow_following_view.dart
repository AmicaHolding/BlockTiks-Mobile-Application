import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/dummy_content.dart';

import '../controllers/follow_following_controller.dart';

class FollowFollowingView extends GetView<FollowFollowingController> {
  const FollowFollowingView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
      showBackBtn: true,
      showLogo: false,
      centerTitle: true,
      screenName: "@Username",
      sidePadding: false,
      bodyPadding: true,
      child: Column(
        children: [
          Container(
            margin: getMargin(bottom: 16),
            padding: getPadding(left: 16, right: 16),
            decoration: BoxDecoration(
              color: ColorConstant.elevated,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              onChanged: (val) => controller.searchQuery.value = val,
              style: AppStyle.bodyInter,
              decoration: InputDecoration(
                icon: CustomImageView(
                  svgPath: ImageConstant.search,
                ),
                hintText: 'Search',
                hintStyle: AppStyle.bodySmallInter,
                border: InputBorder.none,
              ),
            ),
          ),
          TabBar(
            controller: controller.tabController,
            indicatorColor: ColorConstant.primaryAccent,
            indicatorWeight: 3.0,
            isScrollable: false,
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: ColorConstant.whiteA700,
            unselectedLabelColor: ColorConstant.white60,
            labelStyle: AppStyle.heading3Manrope,
            unselectedLabelStyle: AppStyle.bodySmallInter,
            tabs: const [
              Tab(text: '5 Followers'),
              Tab(text: '8 Following'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: controller.tabController,
              children: [
                _userList(total: 5),
                _userList(total: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _userList({required int total}) {
    return Obx(() {
      final indices = controller.filteredIndices(total);
      if (indices.isEmpty) {
        return Center(
          child: Text('No users found', style: AppStyle.bodySmallInter),
        );
      }
      return Container(
        margin: getMargin(top: 20, bottom: 20),
        child: ListView.builder(
          scrollDirection: Axis.vertical,
          itemCount: indices.length,
          itemBuilder: (_, index) {
            final i = indices[index];
            return UserTile(
              name: "Name $i",
              isFollowing: i % 3 == 0,
            );
          },
        ),
      );
    });
  }
}

class UserTile extends StatelessWidget {
  const UserTile(
      {super.key, required this.name, this.isFollowing = false, this.onTap});

  final String name;
  final bool isFollowing;
  final void Function()? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Get.toNamed(Routes.OTHER_USER_PROFILE);
      },
      child: Container(
        padding: getPadding(left: 16, right: 16, top: 12, bottom: 12),
        margin: getMargin(bottom: 12),
        decoration: BoxDecoration(
            color: ColorConstant.elevated,
            borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            SizedBox(
              width: 40,
              height: 40,
              child: CustomImageView(
                imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                width: 40,
                height: 40,
                radius: BorderRadius.circular(20),
              ),
            ),
            const SizedBox(
              width: 15,
            ),
            MyText(
              title: name,
              family: 'Manrope',
              customWeight: FontWeight.w600,
              fontSize: 15,
            ),
            const Spacer(),
            CustomButton(
              onTap: onTap,
              width: 100,
              height: 28,
              text: isFollowing ? "Following" : "Follow",
              variant: isFollowing ? ButtonVariant.FillGray300 : null,
            )
          ],
        ),
      ),
    );
  }
}
