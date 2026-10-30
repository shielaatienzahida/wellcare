import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme.dart';
import '../models/client_model.dart';

class WellnessScreen extends StatefulWidget {
  final ClientModel client;
  const WellnessScreen({super.key, required this.client});

  @override
  State<WellnessScreen> createState() => _WellnessScreenState();
}

class _WellnessScreenState extends State<WellnessScreen> {
  late ClientModel _client;
  List<Map<String, dynamic>> _visitHistory = [];
  bool _historyLoading = true;
  bool _historyUnavailable = false;

  // Design tokens aligned with Home:
  static const Color _bgDark = Color(0xFF061A12);
  static const Color _cardDark = Color(0xFF0C251C);
  static const Color _cardBorder = Color(0xFF153C2C);
  static const Color _amber = Color(0xFFF5A623);
  static const Color _cream = Color(0xFFF5EFE6);
  static const Color _creamMuted = Color(0xFF9BB3A5);
  static const Color _darkInk = Color(0xFF071F15);
  static const Color _oliveMuted = Color(0xFF6B7D74);

  @override
  void initState() {
    super.initState();
    _client = widget.client;
    _refreshVisitHistory();
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

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgDark,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ───────────────────────────────────────────────
            const Text(
              'My Wellness',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 3),
            const Text(
              'Your wellness journey and attendance history.',
              style: TextStyle(fontSize: 13, color: _creamMuted),
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

            // ── Membership Summary Card (Cream & Amber) ─────────────
            _buildProfileSummary(),

            const SizedBox(height: 22),

            // ── Attendance Timeline ──────────────────────────────────
            Row(
              children: [
                const Text(
                  'Attendance Timeline',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _amber.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${_visitHistory.length} events',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: _amber,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Container(
              width: 26,
              height: 2.5,
              decoration: BoxDecoration(
                color: _amber,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 14),

            if (_historyLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator(color: _amber)),
              )
            else if (_historyUnavailable)
              _emptyState(Icons.cloud_off_rounded, 'Attendance history is unavailable.')
            else if (_visitHistory.isEmpty)
              _emptyState(Icons.event_note_rounded, 'No attendance records yet.')
            else
              _buildTimeline(),
          ],
        ),
      ),
    );
  }

  // ── MEMBERSHIP SUMMARY (CREAM CARD) ────────────────────────────────────────
  Widget _buildProfileSummary() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                    'MEMBERSHIP SUMMARY',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: _darkInk,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _amber,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'ACTIVE',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    color: _darkInk,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _summaryRow('Total Check-ins', _client.checkins.toString(), const Color(0xFF10B981)),
          const SizedBox(height: 10),
          _summaryRow('Absences', _client.absences.toString(), const Color(0xFFEF4444)),
          const SizedBox(height: 10),
          _summaryRow('Alkaline Sessions', _client.alkalineSessions.toString(), _amber),
          if (_client.lastSeen.isNotEmpty) ...[
            const SizedBox(height: 10),
            _summaryRow('Last Visit', _client.lastSeen, const Color(0xFF0EA5E9)),
          ],
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, Color dotColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: _darkInk,
                ),
              ),
            ],
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w900,
              color: _darkInk,
            ),
          ),
        ],
      ),
    );
  }

  // ── TIMELINE (CREAM CARDS MATCHING HOME RECENT VISITS) ─────────────────────
  Widget _buildTimeline() {
    return Column(
      children: [
        for (var i = 0; i < _visitHistory.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _timelineCard(_visitHistory[i]),
          ),
      ],
    );
  }

  Widget _timelineCard(Map<String, dynamic> visit) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final displayDate = _formatVisitDate(rawDate);
    final type = (visit['type'] ?? 'Visit').toString();
    final loggedBy = (visit['logged_by'] ?? 'Staff').toString();
    final isAlkaline = type.toLowerCase().contains('alkaline');

    return Container(
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
            child: Icon(
              isAlkaline ? Icons.water_drop_rounded : Icons.event_available_rounded,
              color: isAlkaline ? _amber : _cream,
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _amber.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        type,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: _darkInk,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '· ${loggedBy[0].toUpperCase()}${loggedBy.substring(1)}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: _oliveMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Icon(
            Icons.check_circle_rounded,
            color: Color(0xFF10B981),
            size: 20,
          ),
        ],
      ),
    );
  }

  Widget _emptyState(IconData icon, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      decoration: BoxDecoration(
        color: _cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _cardBorder),
      ),
      child: Column(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: _amber.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 24, color: _amber),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: _creamMuted),
          ),
        ],
      ),
    );
  }

  String _formatVisitDate(String raw) {
    if (raw.isEmpty) return 'Recorded visit';
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
