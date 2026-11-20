import 'dart:async';
import 'dart:math';

import 'package:block_tix/app/data/core/app_export.dart';
import 'package:block_tix/app/data/widgets/sahra_ui.dart';
import 'package:block_tix/app/services/api_service.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// V3 money formatting: fils → "AED 12.30".
String sahraFils(int minor) => 'AED ${(minor / 100).toStringAsFixed(2)}';

// ---------------------------------------------------------------------------
// W1: wallet balances card (Cash / Pending / Credits) for the Plans tab.
// ---------------------------------------------------------------------------
class SahraWalletCard extends StatefulWidget {
  const SahraWalletCard({super.key});
  @override
  State<SahraWalletCard> createState() => _SahraWalletCardState();
}

class _SahraWalletCardState extends State<SahraWalletCard> {
  Map<String, dynamic>? _wallet;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.wallet();
      if (mounted) {
        setState(() {
          _wallet = res['wallet'] as Map<String, dynamic>?;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _col(String label, String value, {Color? color}) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: sahraText(color: ColorConstant.nightMuted, size: 11)),
          const SizedBox(height: 2),
          Text(value,
              style: sahraText(
                  color: color ?? ColorConstant.gold,
                  size: 16,
                  weight: FontWeight.w700)),
        ],
      );

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
          padding: EdgeInsets.symmetric(vertical: 12),
          child: Center(child: CircularProgressIndicator()));
    }
    final w = _wallet;
    if (w == null) return const SizedBox.shrink();
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Wallet',
              style: sahraText(size: 15, weight: FontWeight.w700)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _col('Cash', sahraFils((w['cashMinor'] as num?)?.toInt() ?? 0)),
              _col('Pending', sahraFils((w['pendingMinor'] as num?)?.toInt() ?? 0)),
              _col('Credits', sahraFils((w['creditsMinor'] as num?)?.toInt() ?? 0)),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Q1-Q3: live rotating QR — fetches a fresh payload every 5s (server rotates
// every 15s); locked until 24h before doors, works offline per window.
// ---------------------------------------------------------------------------
class SahraLiveQr extends StatefulWidget {
  const SahraLiveQr({super.key, required this.ticketCode});
  final String ticketCode;
  @override
  State<SahraLiveQr> createState() => _SahraLiveQrState();
}

class _SahraLiveQrState extends State<SahraLiveQr> {
  Timer? _timer;
  String? _payload;
  String? _lockedUntil;
  int _refreshIn = 15;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final res = await ApiService.ticketQr(widget.ticketCode);
      if (mounted) {
        setState(() {
          _payload = res['payload']?.toString();
          _lockedUntil = null;
          _refreshIn = (res['refreshInSeconds'] as num?)?.toInt() ?? 15;
        });
      }
    } on Exception catch (e) {
      if (mounted) {
        final msg = e.toString();
        setState(() => _lockedUntil ??= msg.contains('locked') ? 'soon' : null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_payload == null) {
      return Column(
        children: [
          const SizedBox(height: 20),
          Icon(Icons.lock_outline, color: ColorConstant.nightMuted, size: 40),
          const SizedBox(height: 8),
          Text(
            _lockedUntil != null
                ? 'QR unlocks 24h before doors'
                : 'Loading live code…',
            style: sahraText(color: ColorConstant.nightMuted, size: 13)),
        ],
      );
    }
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: ColorConstant.whiteA700,
            borderRadius: BorderRadius.circular(16),
          ),
          child: QrImageView(
              data: _payload!, size: 200, eyeStyle: const QrEyeStyle(
                  eyeShape: QrEyeShape.square, color: Colors.black)),
        ),
        const SizedBox(height: 8),
        Text('Live code · refreshes in ${_refreshIn}s',
            style: sahraText(color: ColorConstant.nightMuted, size: 12)),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// B4-B6: waiting-room section for the event page — join, position, your turn.
// ---------------------------------------------------------------------------
class SahraWaitingRoom extends StatefulWidget {
  const SahraWaitingRoom({super.key, required this.eventId});
  final String eventId;
  @override
  State<SahraWaitingRoom> createState() => _SahraWaitingRoomState();
}

class _SahraWaitingRoomState extends State<SahraWaitingRoom> {
  Map<String, dynamic>? _entry;
  Timer? _poll;
  bool _busy = false;
  bool _open = false;
  String? _deviceId;

  // B5: the device id has to survive app restarts for the server-side
  // one-place-per-device check to mean anything.
  Future<String> _device() async {
    if (_deviceId != null) return _deviceId!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('wr_device_id');
    if (id == null) {
      id = 'app-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(1 << 20)}';
      await prefs.setString('wr_device_id', id);
    }
    _deviceId = id;
    return id;
  }

  @override
  void initState() {
    super.initState();
    _refresh();
    _poll = Timer.periodic(const Duration(seconds: 10), (_) => _refresh());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final res = await ApiService.waitingRoomStatus(widget.eventId);
      if (mounted) {
        setState(() {
          _entry = res['entry'] as Map<String, dynamic>?;
          _open = res['open'] == true || _entry != null;
        });
      }
    } catch (_) {}
  }

  Future<void> _join() async {
    setState(() => _busy = true);
    try {
      final res = await ApiService.joinWaitingRoom(widget.eventId,
          deviceId: await _device());
      if (mounted) {
        setState(() => _entry = res['entry'] as Map<String, dynamic>?);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _busy = false);
    }
    _refresh();
  }

  Future<void> _leave() async {
    setState(() => _busy = true);
    try {
      await ApiService.leaveWaitingRoom(widget.eventId);
    } catch (_) {}
    if (mounted) setState(() => _busy = false);
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    // B4: the room card only exists once the organiser enables the room (or
    // the fan already holds a place in it).
    if (!_open && _entry == null) return const SizedBox.shrink();
    final status = _entry?['status']?.toString() ?? '';
    final position = (_entry?['position'] as num?)?.toInt();
    final holdUntil = _entry?['holdUntil']?.toString();

    String line;
    String? sub;
    if (status == 'admitted') {
      line = "It's your turn — buy now";
      sub = holdUntil != null ? 'Held until $holdUntil' : null;
    } else if (status == 'waiting' || status == 'queued') {
      line = position != null ? 'You’re #$position in line' : 'You’re in the waiting room';
      sub = 'Random place when sales open · 10 min to buy when it’s your turn';
    } else if (status == 'left') {
      line = 'You left the line';
      sub = 'Rejoin within 5 minutes to keep your place';
    } else if (status == 'expired' || status == 'not_selected') {
      line = status == 'expired' ? 'Your turn expired' : 'Not picked in the draw';
      sub = 'Join again to go to the back of the line';
    } else if (status == 'removed') {
      line = 'You were removed from the line';
    } else {
      line = 'High demand — join the waiting room';
      sub = 'Everyone gets a random place when sales open';
    }

    final inLine = status == 'waiting' || status == 'queued' || status == 'admitted';
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.hourglass_top_rounded,
                color: ColorConstant.gold, size: 18),
            const SizedBox(width: 8),
            Text('Waiting room',
                style: sahraText(size: 14, weight: FontWeight.w700)),
          ]),
          const SizedBox(height: 8),
          Text(line, style: sahraText(size: 14, weight: FontWeight.w600)),
          if (sub != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(sub,
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            ),
          const SizedBox(height: 10),
          if (inLine)
            SahraPillButton(
                label: 'Leave the line', dark: true, enabled: !_busy, onTap: _leave)
          else if (status != 'removed')
            SahraPillButton(
                label: 'Join the waiting room', enabled: !_busy, onTap: _join),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// G1-G5: group-pay sheet — split an order into shares; buyer covers or
// releases seats friends don't pay inside the 30-minute hold.
// ---------------------------------------------------------------------------
class SahraGroupPay extends StatefulWidget {
  const SahraGroupPay({super.key, required this.orderId, this.isOwner = true});
  final String orderId;
  final bool isOwner;
  @override
  State<SahraGroupPay> createState() => _SahraGroupPayState();
}

class _SahraGroupPayState extends State<SahraGroupPay> {
  List<Map<String, dynamic>> _shares = [];
  bool _loading = true;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final shares = await ApiService.listShares(widget.orderId);
      if (mounted) setState(() { _shares = shares; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addShare() async {
    final contact = TextEditingController();
    final amount = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ColorConstant.nightSurface,
        title: Text('Add a share', style: sahraText(size: 15)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: contact,
              style: sahraText(size: 13),
              decoration: InputDecoration(
                  hintText: 'Friend (phone or email)',
                  hintStyle:
                      sahraText(color: ColorConstant.nightMuted, size: 13))),
          TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              style: sahraText(size: 13),
              decoration: InputDecoration(
                  hintText: 'Amount (fils)',
                  hintStyle:
                      sahraText(color: ColorConstant.nightMuted, size: 13))),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Add')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.createShares(widget.orderId, [
        {
          'shareId': 's-${DateTime.now().millisecondsSinceEpoch}',
          'amountMinor': int.tryParse(amount.text.trim()) ?? 0,
          'contact': contact.text.trim(),
        },
      ]);
      _load();
    } catch (_) {}
  }

  Future<void> _act(String shareId, String action) async {
    try {
      if (action == 'pay') await ApiService.payShare(widget.orderId, shareId);
      if (action == 'cover') await ApiService.coverShare(widget.orderId, shareId);
      if (action == 'release') await ApiService.releaseShare(widget.orderId, shareId);
    } catch (_) {}
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()));
    }
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.group_outlined, color: ColorConstant.gold, size: 18),
            const SizedBox(width: 8),
            Text('Split the bill',
                style: sahraText(size: 14, weight: FontWeight.w700)),
          ]),
          const SizedBox(height: 8),
          if (_shares.isEmpty)
            Text('Friends pay their own share — seats held 30 minutes.',
                style: sahraText(color: ColorConstant.nightMuted, size: 12)),
          if (widget.isOwner)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: GestureDetector(
                onTap: _addShare,
                child: Text('+ Add a share',
                    style: sahraText(color: ColorConstant.gold, size: 12))),
            ),
          for (final s in _shares)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(
                  child: Text(
                      '${s['contact'] ?? s['shareId']} · ${sahraFils((s['amountMinor'] as num?)?.toInt() ?? 0)}',
                      style: sahraText(size: 13)),
                ),
                Text(s['status']?.toString() ?? '',
                    style: sahraText(
                        color: s['status'] == 'paid'
                            ? ColorConstant.gold
                            : ColorConstant.nightMuted,
                        size: 12,
                        weight: FontWeight.w600)),
                if (widget.isOwner && s['status'] == 'pending') ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _act(s['shareId'].toString(), 'cover'),
                    child: Text('Cover',
                        style: sahraText(color: ColorConstant.gold, size: 12))),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _act(s['shareId'].toString(), 'release'),
                    child: Text('Release',
                        style: sahraText(color: ColorConstant.rumman, size: 12))),
                ] else if (!widget.isOwner && s['status'] == 'pending') ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _act(s['shareId'].toString(), 'pay'),
                    child: Text('Pay',
                        style: sahraText(color: ColorConstant.gold, size: 12))),
                ],
              ]),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// PE2: date-poll section — guests vote (up to 4 options), host locks a date.
// ---------------------------------------------------------------------------
class SahraInvitePoll extends StatefulWidget {
  const SahraInvitePoll({super.key, required this.inviteId, required this.poll,
      required this.isHost, this.onChanged});
  final String inviteId;
  final Map<String, dynamic> poll;
  final bool isHost;
  final VoidCallback? onChanged;
  @override
  State<SahraInvitePoll> createState() => _SahraInvitePollState();
}

class _SahraInvitePollState extends State<SahraInvitePoll> {
  late Set<String> _mine;

  @override
  void initState() {
    super.initState();
    _mine = Set.from((widget.poll['my_option_ids'] as List?)?.cast<String>() ?? []);
  }

  Future<void> _toggle(String optionId) async {
    setState(() {
      _mine.contains(optionId) ? _mine.remove(optionId) : _mine.add(optionId);
    });
    try {
      await ApiService.voteInvitePoll(widget.inviteId, _mine.toList());
      widget.onChanged?.call();
    } catch (_) {}
  }

  Future<void> _lock(String optionId) async {
    try {
      await ApiService.lockInvitePoll(widget.inviteId, optionId);
      widget.onChanged?.call();
    } catch (_) {}
  }

  String _fmt(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return iso;
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${m[d.month - 1]} ${d.day}, ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (widget.poll['locked'] == true) return const SizedBox.shrink();
    final options = (widget.poll['options'] as List?) ?? [];
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Vote on a date',
              style: sahraText(size: 14, weight: FontWeight.w700)),
          const SizedBox(height: 8),
          for (final o in options)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [
                Expanded(
                  child: SahraChip(
                    label:
                        '${_fmt(o['starts_at']?.toString() ?? '')}  ·  ${(o['votes'] as num?)?.toInt() ?? 0}',
                    selected: _mine.contains(o['id']),
                    onTap: () => _toggle(o['id'].toString()),
                  ),
                ),
                if (widget.isHost) ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _lock(o['id'].toString()),
                    child: Text('Pick',
                        style: sahraText(color: ColorConstant.gold, size: 12))),
                ],
              ]),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// PE4/PE5: activity feed — comments, likes, one-level replies.
// ---------------------------------------------------------------------------
class SahraInviteActivity extends StatefulWidget {
  const SahraInviteActivity({super.key, required this.inviteId});
  final String inviteId;
  @override
  State<SahraInviteActivity> createState() => _SahraInviteActivityState();
}

class _SahraInviteActivityState extends State<SahraInviteActivity> {
  List<Map<String, dynamic>> _posts = [];
  final _controller = TextEditingController();
  String? _replyTo;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final posts = await ApiService.inviteActivity(widget.inviteId);
      if (mounted) setState(() => _posts = posts);
    } catch (_) {}
  }

  Future<void> _post() async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;
    _controller.clear();
    final parent = _replyTo;
    setState(() => _replyTo = null);
    try {
      await ApiService.postInviteActivity(widget.inviteId, body, parentId: parent);
      _load();
    } catch (_) {}
  }

  Future<void> _like(String postId) async {
    try {
      await ApiService.likeInviteActivity(widget.inviteId, postId);
      _load();
    } catch (_) {}
  }

  Widget _postTile(Map<String, dynamic> p, {bool reply = false}) {
    return Padding(
      padding: EdgeInsets.only(left: reply ? 20 : 0, top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text(
                  (p['authorName'] ?? p['author'] ?? 'Guest').toString() +
                      (p['kind'] == 'blast' ? ' · host' : ''),
                  style: sahraText(size: 12, weight: FontWeight.w700)),
            ),
            GestureDetector(
              onTap: p['legacy'] == true ? null : () => _like(p['id'].toString()),
              child: Text('♥ ${(p['likeCount'] as num?)?.toInt() ?? 0}',
                  style: sahraText(
                      color: p['liked_by_me'] == true
                          ? ColorConstant.rumman
                          : ColorConstant.nightMuted,
                      size: 12)),
            ),
            if (!reply && p['legacy'] != true) ...[
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () => setState(() => _replyTo = p['id'].toString()),
                child: Text('Reply',
                    style: sahraText(color: ColorConstant.gold, size: 12))),
            ],
          ]),
          Text(p['body']?.toString() ?? '', style: sahraText(size: 13)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Activity', style: sahraText(size: 14, weight: FontWeight.w700)),
          for (final p in _posts) ...[
            _postTile(p),
            for (final r in (p['replies'] as List?) ?? [])
              _postTile(Map<String, dynamic>.from(r as Map), reply: true),
          ],
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _controller,
                style: sahraText(size: 13),
                decoration: InputDecoration(
                  hintText: _replyTo != null ? 'Reply…' : 'Say something…',
                  hintStyle: sahraText(color: ColorConstant.nightMuted, size: 13),
                  isDense: true,
                  border: InputBorder.none,
                ),
                onSubmitted: (_) => _post(),
              ),
            ),
            GestureDetector(
              onTap: _post,
              child: Icon(Icons.send_rounded, color: ColorConstant.gold, size: 20),
            ),
          ]),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// PE6: photo album — host or Going guests add photos (200/invite, 20/upload).
// ---------------------------------------------------------------------------
class SahraInvitePhotos extends StatefulWidget {
  const SahraInvitePhotos({super.key, required this.inviteId, this.canAdd = false});
  final String inviteId;
  final bool canAdd;
  @override
  State<SahraInvitePhotos> createState() => _SahraInvitePhotosState();
}

class _SahraInvitePhotosState extends State<SahraInvitePhotos> {
  List<Map<String, dynamic>> _photos = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.invitePhotos(widget.inviteId);
      if (mounted) {
        setState(() => _photos =
            ((res['photos'] as List?) ?? [])
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList());
      }
    } catch (_) {}
  }

  Future<void> _add() async {
    // TODO(api-gap): wire the device image picker; until then this adds a
    // pasted URL so the album contract is exercisable.
    final controller = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ColorConstant.nightSurface,
        title: Text('Add photo link', style: sahraText(size: 15)),
        content: TextField(controller: controller, style: sahraText(size: 13)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: const Text('Add')),
        ],
      ),
    );
    if (url == null || url.isEmpty) return;
    try {
      await ApiService.addInvitePhotos(widget.inviteId, [url]);
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return SahraCard(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
                child: Text('Photos',
                    style: sahraText(size: 14, weight: FontWeight.w700))),
            if (widget.canAdd)
              GestureDetector(
                onTap: _add,
                child: Text('+ Add',
                    style: sahraText(color: ColorConstant.gold, size: 12))),
          ]),
          if (_photos.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Photos from the invite live here',
                  style: sahraText(color: ColorConstant.nightMuted, size: 12)),
            )
          else
            SizedBox(
              height: 84,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _photos.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(_photos[i]['url']?.toString() ?? '',
                      width: 84, height: 84, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                          width: 84,
                          color: ColorConstant.night,
                          child: Icon(Icons.photo,
                              color: ColorConstant.nightMuted))),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
