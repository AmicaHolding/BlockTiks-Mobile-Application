import 'package:flutter/material.dart';

import 'package:get/get.dart';

import '../controllers/team_detail_controller.dart';

class TeamDetailView extends GetView<TeamDetailController> {
  const TeamDetailView({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TeamDetailView'),
        centerTitle: true,
      ),
      body: const Center(
        child: Text(
          'TeamDetailView is working',
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}
