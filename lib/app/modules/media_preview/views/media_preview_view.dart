import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/square_image.dart';
import '../controllers/media_preview_controller.dart';

class MediaPreviewView extends GetView<MediaPreviewController> {
  const MediaPreviewView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black.withAlpha(490),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
              splashRadius: 18,
              onPressed: () {
                Navigator.pop(context);
              },
              icon: const Icon(Icons.cancel))
        ],
      ),
      body: SafeArea(
        child: GestureDetector(
          onVerticalDragUpdate: (details) {
            int sensitivity = 15;
            if (details.delta.dy > sensitivity) {
              // Down Swipe
              Navigator.pop(context);
            } else if (details.delta.dy < -sensitivity) {
              // Up Swipe
              Navigator.pop(context);
            }
          },
          child: Obx(() => Column(
                children: [
                  SizedBox(
                    height: getVerticalSize(10),
                  ),
                  Expanded(
                      child: PhotoViewGallery.builder(
                    scrollPhysics: const BouncingScrollPhysics(),
                    builder: (BuildContext context, int index) {
                      return PhotoViewGalleryPageOptions(
                        imageProvider: NetworkImage(
                          controller.mediaList[index],
                          // width: size.width,
                          // height: size.height,
                        ),
                        // initialScale: PhotoViewComputedScale.contained * 0.8,
                        heroAttributes: PhotoViewHeroAttributes(tag: index),
                      );
                    },
                    itemCount: controller.mediaList.length,
                    loadingBuilder: (context, event) => Center(
                      child: SizedBox(
                        width: 20.0,
                        height: 20.0,
                        child: CircularProgressIndicator(
                          value: event == null
                              ? 0
                              : event.cumulativeBytesLoaded /
                                  event.expectedTotalBytes!.toInt(),
                        ),
                      ),
                    ),
                    pageController: controller.pageController,
                    onPageChanged: controller.scrollToPosition,
                  )),
                  SizedBox(
                    height: getVerticalSize(2),
                  ),
                  SizedBox(
                    height: controller.listViewHeight,
                    child: ListView.builder(
                        controller: controller.scrollController,
                        scrollDirection: Axis.horizontal,
                        itemCount: controller.mediaList.length,
                        itemBuilder: (context, index) {
                          return Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: GestureDetector(
                              onTap: () {
                                controller.pageController!.jumpToPage(index);
                              },
                              child: Obx(() => squareImage(
                                  getVerticalSize(100),
                                  getVerticalSize(100),
                                  // controller.mediaList[index].caption == Constants.mimeTypeVideo ?
                                  // controller.mediaList[index]
                                  //     :
                                  controller.mediaList[index],
                                  1,
                                  isSelected: index == controller.index.value,
                                  isVideo: false,
                                  fromMediaPreview: true,
                                  placeholder: controller.placeholder ??
                                      ImageConstant.placeholderPost)),
                            ),
                          );
                        }),
                  ),
                ],
              )),
        ),
      ),
    );
  }
}
