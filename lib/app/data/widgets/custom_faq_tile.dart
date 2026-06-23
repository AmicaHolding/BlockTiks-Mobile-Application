import 'package:block_tix/app/data/core/app_export.dart';

class FAQTile extends StatefulWidget {
  final String question;
  final String type;
  final String answer;

  FAQTile({required this.question, required this.answer, required this.type});

  @override
  _FAQTileState createState() => _FAQTileState();
}

class _FAQTileState extends State<FAQTile> with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _controller;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _rotationAnimation = Tween<double>(begin: 0, end: 0.5).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleExpand() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: _toggleExpand,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: _isExpanded
                  ? const BorderRadius.only(
                      topRight: Radius.circular(10),
                      topLeft: Radius.circular(10))
                  : BorderRadius.circular(10),
              color: ColorConstant.gray50.withOpacity(0.1),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MyText(
                        title: widget.type,
                        fontSize: 16,
                        customWeight: FontWeight.bold,
                      ),
                      MyText(
                        title: widget.question,
                        fontSize: 16,
                      ),
                    ],
                  ),
                ),
                RotationTransition(
                  turns: _rotationAnimation,
                  child: Icon(
                    Icons.expand_more,
                    color: ColorConstant.whiteA700,
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          height: _isExpanded ? null : 0,
          child: _isExpanded
              ? Container(
                  width: _isExpanded ? size.width : 0,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(10),
                        bottomRight: Radius.circular(10)),
                    color: ColorConstant.gray50.withOpacity(0.1),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: MyText(
                    title: widget.answer,
                    fontSize: 16,
                  ),
                )
              : null,
        ),
      ],
    );
  }
}
