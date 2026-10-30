import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../models/client_model.dart';

class HomeScreen extends StatefulWidget {
  final ClientModel client;
  final void Function(int index)? onSwitchTab;

  const HomeScreen({
    super.key,
    required this.client,
    this.onSwitchTab,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late ClientModel _client;
  List<Map<String, dynamic>> _visitHistory = [];
  bool _historyLoading = true;
  bool _historyUnavailable = false;
  Timer? _pollTimer;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  // Custom palette for the new requested design:
  static const Color _bgDark = Color(0xFF061A12);
  static const Color _cardDark = Color(0xFF0C251C);
  static const Color _cardBorder = Color(0xFF153C2C);
  static const Color _iconBoxDark = Color(0xFF133628);
  static const Color _amber = Color(0xFFF5A623);
  static const Color _cream = Color(0xFFF5EFE6);
  static const Color _creamMuted = Color(0xFF9BB3A5);
  static const Color _darkInk = Color(0xFF071F15);
  static const Color _oliveMuted = Color(0xFF6B7D74);

  @override
  void initState() {
    super.initState();
    _client = widget.client;
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 260));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
    _refreshData();
    _refreshVisitHistory();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _silentPoll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _silentPoll() async {
    try {
      final res = await getApi(
        '/clients/me',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && mounted) {
          final updated = Map<String, dynamic>.from(data['client']);
          updated['token'] = _client.token;
          final updatedClient = ClientModel.fromJson(updated);
          setState(() => _client = updatedClient);
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('heiwa_session_client', jsonEncode(updatedClient.toJson()));
        }
      }
    } catch (_) {}

    try {
      final response = await getApi(
        '/clients/me/history',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true && mounted) {
        final history = (data['history'] as List<dynamic>? ?? [])
            .map((r) => Map<String, dynamic>.from(r as Map))
            .toList();
        setState(() {
          _visitHistory = history;
          _historyUnavailable = false;
        });
      }
    } catch (_) {}
  }

  Future<void> _refreshData() async {
    try {
      final res = await getApi(
        '/clients/me',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final updated = Map<String, dynamic>.from(data['client']);
          updated['token'] = _client.token;
          if (mounted) setState(() => _client = ClientModel.fromJson(updated));
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('heiwa_session_client', jsonEncode(ClientModel.fromJson(updated).toJson()));
        }
      }
    } catch (_) {}
  }

  Future<void> _refreshVisitHistory() async {
    if (mounted) setState(() => _historyLoading = true);
    try {
      final response = await getApi(
        '/clients/me/history',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final history = (data['history'] as List<dynamic>? ?? [])
            .map((record) => Map<String, dynamic>.from(record as Map))
            .toList();
        if (mounted) {
          setState(() {
            _visitHistory = history;
            _historyUnavailable = false;
          });
        }
      } else if (mounted) {
        setState(() => _historyUnavailable = true);
      }
    } catch (_) {
      if (mounted) setState(() => _historyUnavailable = true);
    } finally {
      if (mounted) setState(() => _historyLoading = false);
    }
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final sessions = _client.alkalineSessions;
    final intakeLitres = sessions * 0.5;

    return Container(
      color: _bgDark,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 96 + MediaQuery.paddingOf(context).bottom),
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Greeting Header ───────────────────────────────────────────
              Text(
                '$_greeting, ${_client.firstName}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _creamMuted,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 3),
              const Text(
                'Your wellness journey starts here.',
                style: TextStyle(
                  fontSize: 23,
                  height: 1.18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: 30,
                height: 3,
                decoration: BoxDecoration(
                  color: _amber,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              const SizedBox(height: 18),

              // ── 1. Membership Card (Cream & Amber) ────────────────────────
              _buildMembershipCard(),

              const SizedBox(height: 14),

              // ── 2. Wellness Progress Card (Dark Green & Amber) ───────────
              _buildProgressCard(),

              const SizedBox(height: 14),

              // ── 3. 2x2 Stat Cards Grid ───────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      icon: Icons.person_pin_rounded,
                      iconColor: const Color(0xFF6EE7B7),
                      iconBg: const Color(0xFF123B2A),
                      value: _client.checkins.toString(),
                      label: 'Check-ins',
                      onTap: () => widget.onSwitchTab?.call(2), // Reports
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      icon: Icons.event_busy_rounded,
                      iconColor: const Color(0xFFF87171),
                      iconBg: const Color(0xFF2C1A1C),
                      value: _client.absences.toString(),
                      label: 'Absences',
                      onTap: () => widget.onSwitchTab?.call(2), // Reports
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      icon: Icons.spa_rounded,
                      iconColor: _amber,
                      iconBg: const Color(0xFF2E2412),
                      value: sessions.toString(),
                      label: 'Sessions',
                      onTap: () => widget.onSwitchTab?.call(1), // Wellness
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      icon: Icons.water_drop_rounded,
                      iconColor: const Color(0xFF38BDF8),
                      iconBg: const Color(0xFF0F2E36),
                      value: '${intakeLitres.toStringAsFixed(1)}L',
                      label: 'Alkaline intake',
                      onTap: () => widget.onSwitchTab?.call(3), // Alkaline
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // ── 4. Recent Visits Section ───────────────────────────────────
              _buildRecentVisitsSection(),
            ],
          ),
        ),
      ),
    );
  }

  // ── MEMBERSHIP CARD ────────────────────────────────────────────────────────
  Widget _buildMembershipCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      decoration: BoxDecoration(
        color: _cream,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Subtle watermark flame / petal on right
          Positioned(
            right: -6,
            bottom: -12,
            child: Opacity(
              opacity: 0.12,
              child: Icon(
                Icons.spa_rounded,
                size: 118,
                color: _darkInk,
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: MEMBERSHIP dot + ACTIVE pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(right: 7),
                        decoration: const BoxDecoration(
                          color: _darkInk,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const Text(
                        'MEMBERSHIP',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: _darkInk,
                          letterSpacing: 1.4,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _amber,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          margin: const EdgeInsets.only(right: 5),
                          decoration: const BoxDecoration(
                            color: _darkInk,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const Text(
                          'ACTIVE',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            color: _darkInk,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Full Name
              Text(
                _client.fullName.isEmpty ? _client.username : _client.fullName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: _darkInk,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 2),

              // @username
              Text(
                '@${_client.username}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _oliveMuted,
                ),
              ),

              const SizedBox(height: 12),

              // ID Badge pill (Amber)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: _amber,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'ID: ${_client.clientIdNumber.isNotEmpty ? _client.clientIdNumber : _client.id}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                    color: _darkInk,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── PROGRESS CARD ──────────────────────────────────────────────────────────
  Widget _buildProgressCard() {
    final sessions = _client.alkalineSessions;
    final remainder = sessions % 10;
    final progress = remainder == 0 && sessions > 0 ? 1.0 : remainder / 10;
    final toNext = sessions == 0 ? 10 : (10 - remainder) % 10;
    final pct = (progress * 100).round();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cardDark,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _cardBorder, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _iconBoxDark,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.trending_up_rounded,
                  color: _amber,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Wellness progress',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      toNext == 0
                          ? 'Milestone reached — keep going!'
                          : '$toNext more session${toNext == 1 ? '' : 's'} to your next milestone',
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: _creamMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '$pct%',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: _amber,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: _bgDark,
              valueColor: const AlwaysStoppedAnimation<Color>(_amber),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$sessions sessions · $pct% to next 10-session milestone',
            style: const TextStyle(fontSize: 11, color: _creamMuted),
          ),
        ],
      ),
    );
  }

  // ── 2x2 STAT CARD ──────────────────────────────────────────────────────────
  Widget _statCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String value,
    required String label,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _cardDark,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _cardBorder, width: 1.2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(height: 12),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _creamMuted,
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 18,
                    color: _creamMuted,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── RECENT VISITS ──────────────────────────────────────────────────────────
  Widget _buildRecentVisitsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent visits',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            if (_visitHistory.isNotEmpty)
              GestureDetector(
                onTap: () => widget.onSwitchTab?.call(2), // View all in Reports
                child: const Text(
                  'View all',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _amber,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          width: 28,
          height: 3,
          decoration: BoxDecoration(
            color: _amber,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(height: 14),

        if (_historyLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 30),
            child: Center(child: CircularProgressIndicator(color: _amber)),
          )
        else if (_historyUnavailable || _visitHistory.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
            decoration: BoxDecoration(
              color: _cardDark,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _cardBorder),
            ),
            child: const Center(
              child: Text(
                'No recent visits recorded yet.',
                style: TextStyle(fontSize: 13, color: _creamMuted),
              ),
            ),
          )
        else
          Column(
            children: [
              for (var i = 0; i < (_visitHistory.length > 4 ? 4 : _visitHistory.length); i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _visitCard(_visitHistory[i]),
                ),
            ],
          ),
      ],
    );
  }

  Widget _visitCard(Map<String, dynamic> visit) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final displayDate = _formatVisitDate(rawDate);
    final type = (visit['type'] ?? 'Visit').toString();
    final loggedBy = (visit['logged_by'] ?? 'Staff').toString();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => widget.onSwitchTab?.call(3), // Switch to Alkaline
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: _cream,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: _cardDark,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.event_available_rounded,
                  color: _cream,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayDate,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: _darkInk,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$type · ${loggedBy[0].toUpperCase()}${loggedBy.substring(1)}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: _oliveMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: _darkInk,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatVisitDate(String raw) {
    if (raw.isEmpty) return 'Recent visit';
    try {
      final dt = DateTime.parse(raw).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final m = months[dt.month - 1];
      final d = dt.day;
      final y = dt.year;
      final hour12 = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
      final minStr = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      final hourStr = hour12.toString().padLeft(2, '0');
      return '$m $d, $y, $hourStr:$minStr $ampm';
    } catch (_) {
      return raw;
    }
  }
}
