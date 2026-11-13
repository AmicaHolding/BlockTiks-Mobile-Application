import 'package:block_tix/app/data/core/app_export.dart';
import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/add_individual_controller.dart';

class AddIndividualView extends GetView<AddIndividualController> {
  const AddIndividualView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorConstant.bg,
      appBar: AppBar(
        backgroundColor: ColorConstant.bg,
        title: const MyText(title: 'Add Individual'),
        centerTitle: true,
      ),
      body: Center(
        child: MyText(
          title: 'AddIndividualView is working',
          fontSize: 20,
        ),
      ),
    );
  }
}
