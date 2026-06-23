import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/add_individual_controller.dart';

class AddIndividualView extends GetView<AddIndividualController> {
  const AddIndividualView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AddIndividualView'),
        centerTitle: true,
      ),
      body: const Center(
        child: Text(
          'AddIndividualView is working',
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}
