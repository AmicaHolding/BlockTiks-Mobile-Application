import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/search/search_field.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/analytic_controller.dart';

class AnalyticView extends StatelessWidget {
  AnalyticView({Key? key,this.fromCreator = false}) : super(key: key);

  final bool fromCreator;

  final controller = Get.put(AnalyticController());
  @override
  Widget build(BuildContext context) {
    return BaseViewPageScreen(
        showLogo: true,
        basicAppBar: false,
        hideAppBar: fromCreator,
        showBackBtn: true,
        sidePadding: false,
        bodyPadding: false,
        showNotification: true,
      child: Padding(
        padding: getPadding(left: 16,right: 16),
        child: SingleChildScrollView(
          child: Column(
            children: [
              // fromCreator ? Padding(
              //   padding: getPadding(top: 16,bottom: 16),
              //   child: SearchField(
              //     onTap: () => Get.toNamed(Constants.isUserCreator ? Routes.CREATOR_SEARCH : Routes.SEARCH),
              //     readOnly: true,
              //   ),
              // ): Offstage(),
              // Container(
              //   margin: getMargin(bottom: 16),
              //   padding: getPadding(left: 16, right: 16),
              //   decoration: BoxDecoration(
              //     color: Colors.white.withValues(alpha: 0.1),
              //     borderRadius: BorderRadius.circular(10),
              //   ),
              //   child: TextField(
              //     onTap: () => Get.toNamed(Routes.SEARCH),
              //     readOnly: true,
              //     style: const TextStyle(color: Colors.white),
              //     decoration: InputDecoration(
              //       icon: CustomImageView(
              //         svgPath: ImageConstant.search,
              //       ),
              //       hintText: 'Search',
              //       hintStyle: TextStyle(color: Colors.white70),
              //       border: InputBorder.none,
              //     ),
              //   ),
              // ),
              Padding(
                padding: getPadding( bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(
                      height: 5,
                    ),
                    const MyText(title: "Balance"),
                    const SizedBox(
                      height: 3,
                    ),
                    Row(
                      children: [
                        const MyText(
                          title: "\$2000",
                          fontSize: 28,
                          customWeight: FontWeight.w800,
                        ),
                        const SizedBox(
                          width: 10,
                        ),
                        const MyText(
                          title: "USD",
                          fontSize: 16,
                        ),
                        const SizedBox(
                          width: 5,
                        ),
                        Icon(
                          Icons.arrow_drop_down,
                          color: ColorConstant.whiteA700,
                        )
                      ],
                    ),
                    const SizedBox(
                      height: 5,
                    ),
                    Row(
                      children: [
                        MyText(
                          title: "This week",
                          clr: ColorConstant.white60,
                        ),
                        const SizedBox(
                          width: 5,
                        ),
                        MyText(
                          title: "+10%",
                          clr: ColorConstant.green,
                        ),
                      ],
                    ),
                    const SizedBox(
                      height: 10,
                    ),
                  ],
                ),
              ),
              Container(
                height: getSize(220),
                width: size.width,
                child: LineChart(
                  LineChartData(
                    // backgroundColor: Colors.black,
                    gridData: FlGridData(show: false), // Removes the grid lines
                    borderData: FlBorderData(show: false), // Removes the border
                    titlesData: FlTitlesData(
                      topTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          interval: 1,
                          reservedSize:30,
                          getTitlesWidget: (value, _) {
                            switch (value.toInt()) {
                              case 0:
                                return const MyText(title: 'Mon',);
                              case 1:
                                return const MyText(title: 'Tue',);
                              case 2:
                                return const MyText(title: 'Wed',);
                              case 3:
                                return const MyText(title: 'Thu',);
                              case 4:
                                return const MyText(title: 'Fri',);
                              case 5:
                                return const MyText(title: 'Sat',);
                              case 6:
                                return const MyText(title: 'Sun',);
                              default:
                                return Container();
                            }
                          },
                        ),
                      ),
                      leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    minX: 0,
                    maxX: 6,
                    minY: 0,
                    maxY:10,
                    lineBarsData: [
                      LineChartBarData(
                        isCurved: true,
                        color: ColorConstant.primaryPink.withValues(alpha: 0.8),
                        barWidth: 3,
                        belowBarData: BarAreaData(
                          show: true,
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              ColorConstant.primaryPink.withValues(alpha: 0.5),
                              ColorConstant.primaryPink.withValues(alpha: 0.05),
                            ]
                          ),
                          // color: ColorConstant.primaryPink,
                        ),
                        dotData: FlDotData(show: false), // Removes dots
                        spots: [
                          FlSpot(0, 3),
                          FlSpot(1, 6),
                          FlSpot(2, 8),
                          FlSpot(3, 4),
                          FlSpot(4, 3),
                          FlSpot(5, 7),
                          FlSpot(6, 6),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              fromCreator
                  ? Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _userWidget("Total Sales","2000","32",showUSD: true),
                      ),
                      Expanded(
                        child: _userWidget("Total Customers","13,056","10",),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _userWidget("Total Events","64","1",),
                      ),
                      Expanded(
                        child: _userWidget("Engagement","35,152","10",decline: true),
                      ),
                    ],
                  ),
                ],
              )
                  : Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _userWidget("Number of tickets bought","26","32"),
                      ),
                      Expanded(
                        child: _userWidget("Number of tickets sold","6","10"),
                      ),
                    ],
                  ),
                  _userWidget("Total events","8","1"),
                ],
              ),
            ],
          ),
        ),
      )
    );
  }

  Widget _userWidget(String title,String amount,String progress,
      {bool showUSD = false, bool decline = false}){
    return Padding(
      padding: getPadding( bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(
            height: 5,
          ),
          MyText(title: title,fontSize: 12,),
          const SizedBox(
            height: 3,
          ),
          fromCreator ?
          Row(
            children: [
              MyText(
                title: "${showUSD ? "\$" : ""}$amount",
                fontSize: 28,
                customWeight: FontWeight.w800,
              ),
              !showUSD ? Offstage() : const SizedBox(
                width: 10,
              ),
              !showUSD ? Offstage() : const MyText(
                title: "USD",
                fontSize: 16,
              ),
              !showUSD ? Offstage() : const SizedBox(
                width: 5,
              ),
              !showUSD ? Offstage() : Icon(
                Icons.arrow_drop_down,
                color: ColorConstant.whiteA700,
              )
            ],
          )
          :MyText(
            title: amount,
            fontSize: 28,
            customWeight: FontWeight.w800,
          ),
          const SizedBox(
            height: 5,
          ),
          Row(
            children: [
              MyText(
                title: "This week",
                clr: ColorConstant.white60,
              ),
              const SizedBox(
                width: 5,
              ),
              MyText(
                title: "${decline ? "-" : "+"}$progress%",
                clr: decline ? ColorConstant.red : ColorConstant.green,
              ),
            ],
          ),
          const SizedBox(
            height: 10,
          ),
        ],
      ),
    );

  }
}
