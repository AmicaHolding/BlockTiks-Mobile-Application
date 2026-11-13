import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/utils/event_format.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:block_tix/app/modules/payment_page/views/payment_page_view.dart';
import 'package:block_tix/app/modules/user_dashboard/controllers/user_dashboard_controller.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';

import '../controllers/for_you_controller.dart';

class ForYouView extends StatelessWidget {
  final ForYouController controller = Get.put(ForYouController());
  final UserDashboardController userDashboardController = Get.put(UserDashboardController());

  ForYouView({super.key});

  /// Groups events by their backend `category` for the horizontal sections.
  Map<String, List<Map<String, dynamic>>> _groupByCategory(
      List<Map<String, dynamic>> events) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final e in events) {
      final cat = e['category']?.toString().trim();
      final key = (cat == null || cat.isEmpty) ? 'Events' : cat;
      map.putIfAbsent(key, () => []).add(e);
    }
    return map;
  }

  String _categoryLabel(String category) {
    if (category.isEmpty) return 'Events';
    return category[0].toUpperCase() + category.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
              child: Column(
    children: [
      SizedBox(
        height: getSize(450),
        child: Stack(
          children: [
            // Hero carousel — one slide per event (or a state placeholder).
            Obx(() {
              final slideCount = controller.isLoading.value
                  ? 1
                  : (controller.events.isEmpty ? 1 : controller.events.length);
              return CarouselSlider(
                options: CarouselOptions(
                  height: getSize(420),
                  autoPlay: slideCount > 1,
                  enlargeCenterPage: false,
                  viewportFraction: 1,
                  // p,
                  aspectRatio: MediaQuery.of(context).size.aspectRatio,
                  initialPage: 0,
                  onPageChanged: (index, reason) {
                    controller.currentImage.value = index;
                  },
                ),
                items: List.generate(slideCount, (i) {
                  final event = (!controller.isLoading.value &&
                          controller.events.isNotEmpty)
                      ? controller.events[i]
                      : null;
                  return _heroSlide(event);
                }),
              );
            }),
            Column(
              children: [
                SizedBox(height: getSize(58),),
                Padding(
                  padding: const EdgeInsets.only(
                      top: 10.0,
                      left: 25,
                      right: 16,
                      bottom: 10),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment:
                        CrossAxisAlignment.center,
                        mainAxisSize: MainAxisSize.max,
                        children: [
                          Container(),
                          Expanded(
                            flex: 1,
                            child: CustomImageView(
                              imagePath:
                              ImageConstant.logo,
                              height: getSize(Constants.appbarIconSize),
                              fit: BoxFit.fitHeight,
                            )
                          ),
                          Obx(
                                () => Stack(
                              children: [
                                CustomImageView(
                                  svgPath: ImageConstant
                                      .notificationBellIcon,
                                  height: getVerticalSize(23),
                                  onTap: () {
                                    Get.toNamed(Routes
                                        .NOTIFICATIONS_PAGE)!
                                        .then((value) {
                                      //userDashboardController.notificationUnreadCount.value = 0;
                                      // userDashboardController
                                      //     .fetchNotifications();
                                    });
                                    // CustomToast().showToast("in_progress".tr,false,context);
                                  },
                                ),
                                userDashboardController
                                    .notificationUnreadCount
                                    .value !=
                                    0
                                    ? Container(
                                  margin: const EdgeInsets
                                      .only(left: 7),
                                  height: 17,
                                  width: 17,
                                  decoration: BoxDecoration(
                                      borderRadius:
                                      BorderRadius
                                          .circular(
                                          100),
                                      color: ColorConstant
                                          .orangeA200),
                                  child: Center(
                                    child: Text(
                                      "${userDashboardController.notificationUnreadCount.value > 9 ? "9+" : userDashboardController.notificationUnreadCount.value}",
                                      style: AppStyle
                                          .txtAgeoMedium10BlackA500,
                                      textAlign: TextAlign
                                          .center,
                                    ),
                                  ),
                                )
                                    : const SizedBox.shrink()
                              ],
                            ),
                          )
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: getPadding(all: 16),
                  child: SearchField(
                    onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
                    readOnly: true,
                  ),
                ),
              ],
            ),
            Positioned(
              bottom: 0,
              left: 16,
              right: 16,
              child: Obx(() {
                final event = controller.currentEvent;
                final isLoading = controller.isLoading.value;
                final hasError = controller.loadError.value != null;
                final slideCount = isLoading || controller.events.isEmpty
                    ? 1
                    : controller.events.length;
                final price = event == null ? null : lowestTierPrice(event);
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MyText(
                      title: event == null
                          ? (isLoading
                              ? 'Loading events…'
                              : (hasError ? 'Something went wrong' : 'No events yet'))
                          : (event['category']?.toString().isNotEmpty == true
                              ? event['category'].toString()
                              : 'Event'),
                      family: 'Inter',
                      clr: ColorConstant.white60,
                      fontSize: 14,
                    ),
                    const SizedBox(height: 8),
                    MyText(
                      title: event == null
                          ? ''
                          : (event['title']?.toString() ?? ''),
                      family: 'Manrope',
                      customWeight: FontWeight.w700,
                      fontSize: 26,
                      height: 1.15,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        RichText(
                            text: TextSpan(children: [
                              TextSpan(
                                  text: price == null
                                      ? (event == null ? '' : 'Free   ')
                                      : '${formatDollars(price)}   ',
                                  style: AppStyle.whiteInterBold18),
                              if (price != null)
                                TextSpan(
                                    text: "/person".tr,
                                    style: AppStyle.white60InterNormal14),
                            ]),
                            textAlign: TextAlign.left),
                        SizedBox(
                          width: 100,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(slideCount, (index) {
                              return GestureDetector(
                                onTap: () => controller.goToSlide(index),
                                child: Obx(() => Container(
                                  width: 8.0,
                                  height: 8.0,
                                  margin: const EdgeInsets.symmetric(
                                      vertical: 3.0, horizontal: 4.0),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: controller.currentImage.value ==
                                        index
                                        ? ColorConstant.primaryAccent
                                        : ColorConstant.white60.withValues(alpha: 0.3),
                                  ),
                                )),
                              );
                            }),
                          ),
                        ),
                        MyText(
                          title: event == null
                              ? ''
                              : formatEventDate(
                                  event['startsAt']?.toString()),
                          family: 'Inter',
                          clr: ColorConstant.white60,
                          fontSize: getFontSize(
                            14,
                          ),
                          customWeight: FontWeight.w400,
                        )
                      ],
                    ),
                    SizedBox(
                      height: getSize(10),
                    ),
                    PrimaryPillButton(
                      onTap: () {
                        if (event != null) {
                          controller.openEvent(event);
                        } else if (hasError) {
                          controller.fetchEvents();
                        }
                      },
                      text: event == null
                          ? (hasError ? 'Retry' : 'Event Details')
                          : 'Event Details',
                    ),
                  ],
                );
              }),
            ),
          ],
        ),
      ),

      const SizedBox(height: 16),
      // Event sections grouped by category, with loading/empty/error states.
      Obx(() {
        if (controller.isLoading.value) {
          return Padding(
            padding: getPadding(top: 40, bottom: 40),
            child: Center(
              child: SizedBox(
                height: 28,
                width: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: ColorConstant.primaryAccent,
                ),
              ),
            ),
          );
        }
        if (controller.loadError.value != null) {
          return Padding(
            padding: getPadding(all: 24),
            child: Column(
              children: [
                MyText(
                  title: "Couldn't load events",
                  family: 'Manrope',
                  customWeight: FontWeight.w600,
                  fontSize: 16,
                ),
                const SizedBox(height: 8),
                MyText(
                  title: controller.loadError.value ?? '',
                  family: 'Inter',
                  fontSize: 13,
                  clr: ColorConstant.white60,
                  center: true,
                ),
                const SizedBox(height: 16),
                PrimaryPillButton(
                  text: 'Retry',
                  onTap: () => controller.fetchEvents(),
                ),
              ],
            ),
          );
        }
        if (controller.events.isEmpty) {
          return Padding(
            padding: getPadding(top: 40, bottom: 40),
            child: Center(
              child: MyText(
                title: 'No events yet',
                family: 'Manrope',
                customWeight: FontWeight.w600,
                fontSize: 16,
                clr: ColorConstant.white60,
              ),
            ),
          );
        }
        final groups = _groupByCategory(controller.events);
        return Column(
          children: [
            for (final entry in groups.entries)
              CustomListView(
                title: _categoryLabel(entry.key),
                showDate: true,
                events: entry.value,
              ),
          ],
        );
      }),
    ],
              ),
            );
  }

  /// Hero slide background: network image when available, otherwise a dark
  /// gradient with the event title initial.
  Widget _heroSlide(Map<String, dynamic>? event) {
    final url = event == null ? null : eventImageUrl(event);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            ColorConstant.elevated,
            ColorConstant.canvas,
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (url != null)
            CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              placeholder: (_, __) => const SizedBox.shrink(),
              errorWidget: (_, __, ___) => const SizedBox.shrink(),
            ),
          if (event != null && url == null)
            Center(
              child: MyText(
                title: eventInitial(event),
                family: 'Manrope',
                customWeight: FontWeight.w800,
                fontSize: 96,
                clr: ColorConstant.white60,
              ),
            ),
          if (controller.isLoading.value)
            const Center(
              child: SizedBox(
                height: 32,
                width: 32,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
          if (!controller.isLoading.value &&
              controller.events.isEmpty &&
              controller.loadError.value == null)
            Center(
              child: MyText(
                title: 'No events yet',
                family: 'Manrope',
                customWeight: FontWeight.w600,
                fontSize: 18,
                clr: ColorConstant.white60,
              ),
            ),
          if (!controller.isLoading.value &&
              controller.loadError.value != null)
            Center(
              child: Padding(
                padding: getPadding(all: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MyText(
                      title: "Couldn't load events",
                      family: 'Manrope',
                      customWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                    const SizedBox(height: 8),
                    PrimaryPillButton(
                      text: 'Retry',
                      onTap: () => controller.fetchEvents(),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class CustomListView extends StatelessWidget {
  final String title;
  final bool fromMarketPlace;
  final bool showDate;
  final bool showPrice;
  final bool showOptions;
  final void Function()? onTap;
  final void Function()? onOptionsTap;

  /// When provided, the section renders real event cards from the API
  /// instead of the legacy placeholder cards.
  final List<Map<String, dynamic>>? events;

  const CustomListView(
      {super.key, required this.title, this.fromMarketPlace = false,this.onTap,this.showDate = false,this.showPrice = true, this.showOptions = false,this.onOptionsTap, this.events});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: getPadding(
          left: fromMarketPlace ? 0 : 16, right: fromMarketPlace ? 0 : 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MyText(
            title: title,
            family: 'Manrope',
            clr: ColorConstant.whiteA700,
            fontSize: getFontSize(18),
            customWeight: FontWeight.w600,
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: events != null
                ? ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: events!.length,
                    itemBuilder: (_, index) {
                      final e = events![index];
                      final price = lowestTierPrice(e);
                      return TrendingCard(
                        imageUrl: eventImageUrl(e),
                        title: e['title']?.toString() ?? '',
                        type: (e['category']?.toString().isNotEmpty == true)
                            ? e['category'].toString()
                            : 'Event',
                        price: price == null ? '' : formatDollars(price),
                        dateText: formatEventShortDate(
                            e['startsAt']?.toString()),
                        fromMarketPlace: fromMarketPlace,
                        isLast: index == events!.length - 1,
                        onTap: () => Get.toNamed(Routes.EVENT_DETAIL,
                            arguments: {
                              'id': e['id']?.toString() ?? '',
                              'title': e['title']?.toString() ?? '',
                            }),
                        showDate: showDate,
                        showPrice: showPrice,
                        showOptions: showOptions,
                        onOptionsTap: onOptionsTap,
                      );
                    },
                  )
                : ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      TrendingCard(
                        imageUrl: ImageConstant.splashBg,
                        // Replace with your image URL
                        title: 'Cyberpunk',
                        type: "Music Concert",
                        price: '\$110',
                        fromMarketPlace: fromMarketPlace,
                        onTap: onTap,
                        showDate: showDate,
                        showPrice: showPrice,
                        showOptions: showOptions,
                        onOptionsTap: onOptionsTap,
                      ),
                      TrendingCard(
                        imageUrl: ImageConstant.splashBg,
                        // Replace with your image URL
                        title: 'Rock N Roll',
                        type: "Music Concert",
                        price: '\$140',
                        fromMarketPlace: fromMarketPlace,
                        onTap: onTap,
                        showDate: showDate,
                        showPrice: showPrice,
                        showOptions: showOptions,
                        onOptionsTap: onOptionsTap,
                      ),
                      TrendingCard(
                        imageUrl: ImageConstant.splashBg,
                        // Replace with your image URL
                        title: 'Epic Bass',
                        type: "Music Concert",
                        price: '\$60',
                        fromMarketPlace: fromMarketPlace,
                        isLast: true,
                        onTap: onTap,
                        showDate: showDate,
                        showPrice: showPrice,
                        showOptions: showOptions,
                        onOptionsTap: onOptionsTap,
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class TrendingCard extends StatelessWidget {
  final String? imageUrl;
  final String title;
  final String type;
  final String price;
  final String? dateText;
  final bool fromMarketPlace;
  final bool isExpanded;
  final bool isLast;
  final bool showDate;
  final bool showPrice;
  final bool showOptions;
  final void Function()? onTap;
  final void Function()? onOptionsTap;

  TrendingCard(
      {super.key,
      required this.imageUrl,
      required this.title,
      required this.type,
      required this.price,
        this.dateText,
        this.onTap,
        this.onOptionsTap,
      this.fromMarketPlace = false,
      this.showDate = false,
      this.isLast = false,
      this.showPrice = true,
      this.showOptions = false,
      this.isExpanded = false});

  /// Card artwork: network image for http(s) URLs, bundled asset otherwise,
  /// or a dark gradient with the title initial when there is no image.
  Widget _cardBackground() {
    final url = imageUrl;
    if (url != null && url.startsWith('http')) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        placeholder: (_, __) => Container(color: ColorConstant.elevated),
        errorWidget: (_, __, ___) => _initialFallback(),
      );
    }
    if (url != null && url.isNotEmpty) {
      return Image.asset(
        url,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    }
    return _initialFallback();
  }

  Widget _initialFallback() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            ColorConstant.elevated,
            ColorConstant.canvas,
          ],
        ),
      ),
      alignment: Alignment.center,
      child: MyText(
        title: title.isEmpty
            ? 'B'
            : String.fromCharCode(title.runes.first).toUpperCase(),
        family: 'Manrope',
        customWeight: FontWeight.w800,
        fontSize: 42,
        clr: ColorConstant.white60,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: (){
        if(onTap == null){
          Get.toNamed(Routes.UPCOMING_EVENT);
        }else{
          onTap!();
        }
      },
      child: Padding(
        padding: isLast ? getPadding(right: 0): getPadding(right: fromMarketPlace ? 15 : 10),
        child: SizedBox(
          width: getSize(fromMarketPlace ? 160 : 150),
          child: Stack(
            children: [
              Container(
                width: isExpanded ? size.width : getSize(150),
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(getSize(12)),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(child: _cardBackground()),
                    // Bottom scrim so overlay text stays legible.
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: getSize(90),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              ColorConstant.canvas.withValues(alpha: 0.85),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: getSize(10),
                      left: getSize(8),
                      right: getSize(showOptions ? 20 : 0),
                      child: Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              showPrice ? MyText(
                                title: price,
                                clr: ColorConstant.whiteA700,
                                fontSize: (14),
                              ): Offstage(),
                              SizedBox(height: getSize(4)),
                              MyText(
                                title: type,
                                clr: ColorConstant.white60,
                                fontSize: (10),
                              ),
                              SizedBox(height: getSize(4)),
                              Container(
                                width: getSize(120),
                                child: MyText(
                                  title: title,
                                  family: 'Manrope',
                                  customWeight: FontWeight.w600,
                                  clr: ColorConstant.whiteA700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  ],
                ),
              ),
              showOptions ? Positioned(
                right: 0,
                  bottom: 20,
                  child: CustomImageView(
                onTap: onOptionsTap,
                svgPath: ImageConstant.options,
                height: 15,
                width: 15,
              )): Offstage(),
              fromMarketPlace
                  ? Positioned(
                top: 5,
                right: 0,
                child: Container(
                  width: getSize(35),
                  height: getSize(35),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: ColorConstant.canvas,
                    border: Border.all(
                        color: ColorConstant.primaryAccent, width: 2),
                  ),
                  child: Center(
                    child: MyText(
                      title: "${Random().nextInt(100)}",
                        family: 'Manrope',
                        customWeight: FontWeight.w600,
                        clr: ColorConstant.whiteA700,
                        fontSize: 14,
                    ),
                  ),
                ),
              )
                  : const Offstage(),
              showDate && !fromMarketPlace
                  ? Positioned(
                top: 5,
                right: 5,
                child: Container(
                  // width: getSize(35),
                  height: getSize(35),
                  decoration: BoxDecoration(
                    // shape: BoxShape.circle,
                    color: ColorConstant.elevated,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: getPadding(left: 10,right: 10),
                  child: Center(
                    child: MyText(
                      title: dateText == null
                          ? "07/28"
                          : (dateText!.isEmpty ? "—" : dateText!),
                        family: 'Manrope',
                        customWeight: FontWeight.w600,
                        clr: ColorConstant.whiteA700,
                        fontSize: 12,
                    ),
                  ),
                ),
              )
                  : const Offstage(),
            ],
          ),
        ),
      ),
    );
  }
}
