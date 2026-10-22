import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../models/client_model.dart';

class HomeScreen extends StatefulWidget {
  final ClientModel client;
  const HomeScreen({super.key, required this.client});

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
    final intake = (sessions * 0.5);
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(14, 14, 14, 96 + MediaQuery.paddingOf(context).bottom),
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$_greeting, ${_client.firstName}',
                style: const TextStyle(
                    fontSize: 12.5, fontWeight: FontWeight.w700, color: kTextTertiary)),
            const SizedBox(height: 4),
            const Text('Your wellness journey starts here.',
                style: TextStyle(
                    fontSize: 22,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                    color: kTextPrimary,
                    letterSpacing: -0.5)),
            const SizedBox(height: 16),
            _buildMembershipCard(),
            const SizedBox(height: 12),
            _buildProgressCard(),
            const SizedBox(height: 10),
            // Row 1: Check-ins & Absences
            Row(
              children: [
                Expanded(
                  child: _miniStat(
                    icon: Icons.how_to_reg_rounded,
                    value: _client.checkins.toString(),
                    label: 'Check-ins',
                    tint: kEmeraldLight.withValues(alpha: 0.15),
                    iconColor: kEmeraldLight,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _miniStat(
                    icon: Icons.event_busy_rounded,
                    value: _client.absences.toString(),
                    label: 'Absences',
                    tint: kRose.withValues(alpha: 0.15),
                    iconColor: kRose,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Row 2: Sessions & Today's Hydration (alkaline intake)
            Row(
              children: [
                Expanded(
                  child: _miniStat(
                    icon: Icons.spa_rounded,
                    value: sessions.toString(),
                    label: 'Sessions',
                    tint: kLavender.withValues(alpha: 0.15),
                    iconColor: kLavender,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _hydrationCard(intake),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _buildRecentVisitsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildMembershipCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: kGradientDarkTeal,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 8),
            spreadRadius: -4,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.only(right: 7),
                    decoration: const BoxDecoration(
                      color: kTurquoiseLight,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const Text('MEMBERSHIP',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: kTurquoiseLight,
                          letterSpacing: 1.4)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  border: Border.all(
                    color: const Color(0xFF10B981).withValues(alpha: 0.45),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      margin: const EdgeInsets.only(right: 5),
                      decoration: const BoxDecoration(
                        color: Color(0xFF34D399),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const Text('ACTIVE',
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF6EE7B7),
                            letterSpacing: 0.9)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(_client.fullName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  color: kTextPrimary,
                  letterSpacing: -0.3)),
          const SizedBox(height: 2),
          Text('@${_client.username}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: kTextTertiary)),
          if (_client.clientIdNumber.isNotEmpty) ...{
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF14B8A6).withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(
                  color: const Color(0xFF14B8A6).withValues(alpha: 0.35),
                  width: 1,
                ),
              ),
              child: Text('ID: ${_client.clientIdNumber}',
                  style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: kTurquoiseLight,
                      letterSpacing: 0.4)),
            ),
          },
        ],
      ),
    );
  }

  Widget _buildProgressCard() {
    final sessions = _client.alkalineSessions;
    final remainder = sessions % 10;
    final progress = remainder == 0 && sessions > 0 ? 1.0 : remainder / 10;
    final toNext = sessions == 0 ? 10 : (10 - remainder) % 10;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0EA5E9), Color(0xFF14B8A6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Icon(Icons.trending_up_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Wellness progress',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: kTextPrimary)),
                    Text(
                      toNext == 0
                          ? 'Milestone reached — keep going!'
                          : '$toNext more session${toNext == 1 ? '' : 's'} to your next milestone',
                      style: const TextStyle(
                          fontSize: 10.5, color: kTextTertiary),
                    ),
                  ],
                ),
              ),
              Text(
                '${(progress * 100).round()}%',
                style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: kEmeraldLight),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, value, _) => LinearProgressIndicator(
                value: value,
                minHeight: 7,
                backgroundColor: kEmeraldLight.withValues(alpha: 0.15),
                valueColor: const AlwaysStoppedAnimation<Color>(kEmeraldLight),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text('$sessions sessions · ${(progress * 100).round()}% to next 10-session milestone',
              style: const TextStyle(fontSize: 10, color: kTextTertiary)),
        ],
      ),
    );
  }

  Widget _miniStat({
    required IconData icon,
    required String value,
    required String label,
    required Color tint,
    Color iconColor = kEmeraldLight,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
                color: tint,
                borderRadius: BorderRadius.circular(AppRadius.xs + 2)),
            child: Icon(icon, color: iconColor, size: 17),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: kTextPrimary,
                    height: 1)),
          ),
          const SizedBox(height: 3),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: kTextTertiary)),
        ],
      ),
    );
  }

  /// Vivid hydration card — replaces the old dull water drop
  Widget _hydrationCard(double intakeLitres) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0EA5E9), Color(0xFF38BDF8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppRadius.xs + 2),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.4),
                  blurRadius: 8,
                  spreadRadius: -2,
                ),
              ],
            ),
            child: const Icon(Icons.water_drop_rounded, color: Colors.white, size: 17),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text('${intakeLitres.toStringAsFixed(1)}L',
                style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF38BDF8),
                    height: 1)),
          ),
          const SizedBox(height: 3),
          const Text('Alkaline intake',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: kTextTertiary)),
        ],
      ),
    );
  }

  Widget _buildRecentVisitsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent visits',
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: kTextPrimary)),
        const SizedBox(height: 12),
        if (_historyLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_historyUnavailable)
          _historyMessage(Icons.cloud_off_rounded, 'Visit history is unavailable.')
        else if (_visitHistory.isEmpty)
          _historyMessage(Icons.event_note_rounded, 'No visits have been recorded yet.')
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: kDarkSurfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: const Color(0xFF1B5E5B)),
            ),
            child: Column(
              children: [
                for (var i = 0; i < (_visitHistory.length > 3 ? 3 : _visitHistory.length); i++)
                  _visitHistoryRow(_visitHistory[i], showDivider: i != (_visitHistory.length > 3 ? 2 : _visitHistory.length - 1)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _historyMessage(IconData icon, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 34),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: kEmeraldLight.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 25, color: kEmeraldLight),
          ),
          const SizedBox(height: 14),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: kTextTertiary)),
        ],
      ),
    );
  }

  Widget _visitHistoryRow(Map<String, dynamic> visit, {required bool showDivider}) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final parsedDate = DateTime.tryParse(rawDate.replaceFirst(' ', 'T'));
    final dateLabel = parsedDate == null
        ? (rawDate.isEmpty ? 'Visit date unavailable' : rawDate)
        : '${_monthName(parsedDate.month)} ${parsedDate.day}, ${parsedDate.year}';
    final type = (visit['type'] ?? 'Visit').toString();
    final visitLabel = type.isEmpty ? 'Visit' : '${type[0].toUpperCase()}${type.substring(1)}';
    final loggedBy = (visit['logged_by'] ?? '').toString();
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
          border: showDivider
              ? const Border(bottom: BorderSide(color: Color(0xFF1B5E5B)))
              : null),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: kEmeraldLight.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppRadius.sm + 2),
            ),
            child: const Icon(Icons.event_available_rounded,
                color: kEmeraldLight, size: 20),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(dateLabel,
                    style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: kTextPrimary)),
                const SizedBox(height: 3),
                Text(
                    loggedBy.isEmpty
                        ? visitLabel
                        : '$visitLabel · ${loggedBy[0].toUpperCase()}${loggedBy.substring(1)}',
                    style: const TextStyle(
                        fontSize: 11.5, color: kTextTertiary)),
              ],
            ),
          ),
          const Icon(Icons.check_circle_rounded, color: kEmeraldLight, size: 17),
        ],
      ),
    );
  }

  String _monthName(int month) => const [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ][month - 1];
}
