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
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: TextField(
              style: TextStyle(color: Colors.white),
              decoration: InputDecoration(
                icon: CustomImageView(
                  svgPath: ImageConstant.search,
                ),
                hintText: 'Search',
                hintStyle: TextStyle(color: Colors.white70),
                border: InputBorder.none,
              ),
            ),
          ),
          TabBar(
            controller: controller.tabController,
            indicatorColor: ColorConstant.primaryPink,
            // Set indicator color
            indicatorWeight: 3.0,
            // Set indicator thickness
            isScrollable: false,
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: Colors.white,
            // Set label color
            unselectedLabelColor: ColorConstant.answerColor,
            // Set unselected label color
            tabs: const [
              Tab(text: '5 Followers'),
              Tab(text: '8 Following'),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: controller.tabController,
              children: [
                Container(
                  margin: getMargin(top: 20, bottom: 20),
                  child: ListView.builder(
                    scrollDirection: Axis.vertical,
                    itemCount: 5,
                    itemBuilder: (_, index) {
                      return UserTile(
                        name: "Name $index",
                        isFollowing: index % 3 == 0,
                      );
                    },
                  ),
                ),
                Container(
                  margin: getMargin(top: 20, bottom: 20),
                  child: ListView.builder(
                    scrollDirection: Axis.vertical,
                    itemCount: 8,
                    itemBuilder: (_, index) {
                      return UserTile(
                        name: "Name $index",
                        isFollowing: index % 3 == 0,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
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
        padding: getPadding(left: 15, right: 15, top: 10, bottom: 10),
        margin: getMargin(bottom: 15),
        decoration: BoxDecoration(
            color: ColorConstant.whiteA700.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            SizedBox(
              width: 30,
              height: 30,
              child: CustomImageView(
                imagePath: DummyContent.images[Random().nextInt(DummyContent.images.length)],
                width: 30,
                height: 30,
                radius: BorderRadius.circular(5),
              ),
            ),
            const SizedBox(
              width: 15,
            ),
            MyText(
              title: name,
              fontSize: 16,
            ),
            const Spacer(),
            CustomButton(
              onTap: onTap,
              width: 100,
              height: 25,
              text: isFollowing ? "Following" : "Follow",
              variant: isFollowing ? ButtonVariant.FillGray300 : null,
            )
          ],
        ),
      ),
    );
  }
}
