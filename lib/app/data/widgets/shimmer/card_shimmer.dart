import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/custom_divider.dart';
import 'package:block_tix/app/data/widgets/skeleton.dart';

class CardShimmer extends StatelessWidget {
  const CardShimmer({Key? key, this.count}) : super(key: key);

  final int? count;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: EdgeInsets.zero,
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      separatorBuilder: (
        context,
        index,
      ) {
        return const CustomDivider();
      },
      itemCount: count ?? 4,
      itemBuilder: (context, index) {
        return Container(
          padding: getPadding(top: 5, bottom: 5),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Skeleton(
                width: getSize(46),
                height: getSize(46),
              ),
              const SizedBox(
                width: 10,
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Skeleton(
                    width: getSize(100),
                    height: getSize(14),
                  ),
                  const SizedBox(
                    height: 2,
                  ),
                  Skeleton(
                    width: getSize(70),
                    height: getSize(12),
                  ),
                ],
              ),
              const Spacer(),
              Skeleton(
                width: getSize(24),
                height: getSize(24),
              ),
            ],
          ),
        );
      },
    );
  }
}
