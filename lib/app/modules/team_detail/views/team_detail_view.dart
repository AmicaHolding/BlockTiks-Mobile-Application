import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/team_detail_controller.dart';

class TeamDetailView extends GetView<TeamDetailController> {
  const TeamDetailView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.bg,
      appBar: AppBar(
        backgroundColor: ColorConstant.bg,
        title: const MyText(title: 'Team Detail'),
        centerTitle: true,
      ),
      body: Center(
        child: MyText(
          title: 'TeamDetailView is working',
          fontSize: 20,
        ),
      ),
    );
  }
}
