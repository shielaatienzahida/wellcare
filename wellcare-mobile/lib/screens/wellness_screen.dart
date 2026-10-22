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
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My Wellness', style: AppText.h1),
          const SizedBox(height: 6),
          const Text('Your wellness journey and attendance history.',
              style: TextStyle(fontSize: 13, color: kTextTertiary)),
          const SizedBox(height: 18),
          _buildProfileSummary(),
          const SizedBox(height: 18),
          const Text('Attendance Timeline',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: kTextPrimary)),
          const SizedBox(height: 12),
          if (_historyLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_historyUnavailable)
            _emptyState(Icons.cloud_off_rounded, 'Attendance history is unavailable.')
          else if (_visitHistory.isEmpty)
            _emptyState(Icons.event_note_rounded, 'No attendance records yet.')
          else
            _buildTimeline(),
        ],
      ),
    );
  }

  Widget _buildProfileSummary() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF2D3748)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Membership Summary',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: kTextPrimary)),
          const SizedBox(height: 14),
          _summaryRow('Total Check-ins', _client.checkins.toString(), kMint),
          const SizedBox(height: 10),
          _summaryRow('Absences', _client.absences.toString(), kRose),
          const SizedBox(height: 10),
          _summaryRow('Alkaline Sessions', _client.alkalineSessions.toString(), kCyan),
          if (_client.lastSeen.isNotEmpty) ...{
            const SizedBox(height: 10),
            _summaryRow('Last Visit', _client.lastSeen, kTurquoise),
          },
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 10),
            Text(label,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: kTextSecondary)),
          ],
        ),
        Text(value,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: kTextPrimary)),
      ],
    );
  }

  Widget _buildTimeline() {
    return Column(
      children: [
        for (var i = 0; i < _visitHistory.length; i++)
          _timelineItem(_visitHistory[i], i == _visitHistory.length - 1),
      ],
    );
  }

  Widget _timelineItem(Map<String, dynamic> visit, bool isLast) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final parsedDate = DateTime.tryParse(rawDate.replaceFirst(' ', 'T'));
    final dateLabel = parsedDate == null
        ? (rawDate.isEmpty ? 'Visit date unavailable' : rawDate)
        : '${_monthName(parsedDate.month)} ${parsedDate.day}, ${parsedDate.year}';
    final timeLabel = parsedDate == null ? '' : '${parsedDate.hour.toString().padLeft(2, '0')}:${parsedDate.minute.toString().padLeft(2, '0')}';
    final type = (visit['type'] ?? 'Visit').toString();
    final visitLabel = type.isEmpty ? 'Visit' : '${type[0].toUpperCase()}${type.substring(1)}';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: kGradientDarkMint,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: kMint.withValues(alpha: 0.2),
                    blurRadius: 12,
                    spreadRadius: -2,
                  ),
                ],
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 60,
                color: kTurquoise.withValues(alpha: 0.2),
                margin: const EdgeInsets.only(top: 8),
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: kDarkSurfaceAlt,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: const Color(0xFF2D3748)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(dateLabel,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: kTextPrimary)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.access_time_rounded,
                          size: 14, color: kTextTertiary),
                      const SizedBox(width: 6),
                      Text(timeLabel.isEmpty ? 'Time not recorded' : timeLabel,
                          style: const TextStyle(
                              fontSize: 11,
                              color: kTextTertiary)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: kMint.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                      border: Border.all(color: kMint.withValues(alpha: 0.3)),
                    ),
                    child: Text(visitLabel,
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: kMint)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _emptyState(IconData icon, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF2D3748)),
      ),
      child: Column(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: kTurquoise.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 25, color: kTurquoise),
          ),
          const SizedBox(height: 14),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: kTextTertiary)),
        ],
      ),
    );
  }

  String _monthName(int month) => const [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ][month - 1];
}
