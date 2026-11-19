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

  // Pagination & Filter state
  int _currentPage = 1;
  static const int _itemsPerPage = 6;
  String _selectedTypeFilter = 'All'; // 'All' | 'Check-in' | 'Alkaline' | 'Absence'
  DateTime? _selectedDateFilter;

  bool get _hasCheckedInToday {
    final now = DateTime.now();
    for (final v in _visitHistory) {
      final type = (v['type'] ?? '').toString().toLowerCase();
      // Check for attendance / check-in / biometric / visit
      final isCheckin = type.contains('check-in') ||
          type.contains('visit') ||
          type.contains('attendance') ||
          type.contains('biometric') ||
          type.contains('fingerprint');
      if (isCheckin) {
        if (_matchesDate(v, now)) {
          return true;
        }
      }
    }
    return false;
  }

  bool _matchesDate(Map<String, dynamic> record, DateTime target) {
    final rawDate = (record['date'] ?? '').toString();
    final rawCreated = (record['created_at'] ?? '').toString();
    final rawCheckin = (record['checkin_date'] ?? '').toString();
    return _isSameCalendarDay(rawCheckin, target) ||
        _isSameCalendarDay(rawCreated, target) ||
        _isSameCalendarDay(rawDate, target);
  }

  bool _isSameCalendarDay(String raw, DateTime target) {
    if (raw.isEmpty) return false;
    final iso = '${target.year.toString().padLeft(4, '0')}-${target.month.toString().padLeft(2, '0')}-${target.day.toString().padLeft(2, '0')}';
    if (raw.startsWith(iso)) return true;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final mStr = months[target.month - 1];
    final fmt1 = '$mStr ${target.day}, ${target.year}';
    final fmt2 = '$mStr ${target.day.toString().padLeft(2, '0')}, ${target.year}';
    if (raw.contains(fmt1) || raw.contains(fmt2)) return true;

    try {
      final dt = DateTime.parse(raw).toLocal();
      return dt.year == target.year && dt.month == target.month && dt.day == target.day;
    } catch (_) {
      return false;
    }
  }

  String _formatShortDate(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  List<Map<String, dynamic>> _getFilteredTimelineItems() {
    final now = DateTime.now();
    final todayFormatted = _formatShortDate(now);
    final items = <Map<String, dynamic>>[];

    // Synthetic "Absent today" entry if client hasn't checked in today
    if (!_hasCheckedInToday) {
      items.add({
        'isSyntheticAbsentToday': true,
        'type': 'Absence',
        'date': todayFormatted,
        'created_at': now.toIso8601String(),
        'logged_by': 'System',
      });
    }

    items.addAll(_visitHistory);

    return items.where((item) {
      final typeLower = (item['type'] ?? '').toString().toLowerCase();
      final isAbsence = item['isSyntheticAbsentToday'] == true || typeLower.contains('absent') || typeLower.contains('absence');
      final isAlkaline = typeLower.contains('alkaline') || typeLower.contains('water');
      final isCheckin = !isAbsence && !isAlkaline;

      if (_selectedTypeFilter == 'Check-in' && !isCheckin) return false;
      if (_selectedTypeFilter == 'Alkaline' && !isAlkaline) return false;
      if (_selectedTypeFilter == 'Absence' && !isAbsence) return false;

      if (_selectedDateFilter != null && !_matchesDate(item, _selectedDateFilter!)) {
        return false;
      }

      return true;
    }).toList();
  }

  Future<void> _pickFilterDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateFilter ?? now,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1, 12, 31),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: _amber,
              onPrimary: _darkInk,
              surface: _cardDark,
              onSurface: _cream,
            ),
            dialogTheme: const DialogThemeData(backgroundColor: _cardDark),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedDateFilter = picked;
        _currentPage = 1;
      });
    }
  }
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
            Builder(
              builder: (_) {
                final filteredItems = _getFilteredTimelineItems();
                final hasActiveFilter = _selectedTypeFilter != 'All' || _selectedDateFilter != null;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
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
                                color: _amber.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${filteredItems.length} ${filteredItems.length == 1 ? 'event' : 'events'}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: _amber,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (hasActiveFilter)
                          GestureDetector(
                            onTap: () => setState(() {
                              _selectedTypeFilter = 'All';
                              _selectedDateFilter = null;
                              _currentPage = 1;
                            }),
                            child: const Text(
                              'Clear filters',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
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

                    // ── Date Search & Type Filter Bar ────────────────────────
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _cardDark,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _cardBorder, width: 1.2),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Date picker search row
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: _pickFilterDate,
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _bgDark,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: _selectedDateFilter != null
                                            ? _amber
                                            : _cardBorder,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.calendar_month_rounded,
                                          size: 17,
                                          color: _selectedDateFilter != null ? _amber : _creamMuted,
                                        ),
                                        const SizedBox(width: 9),
                                        Expanded(
                                          child: Text(
                                            _selectedDateFilter != null
                                                ? 'Date: ${_formatShortDate(_selectedDateFilter!)}'
                                                : 'Search specific date...',
                                            style: TextStyle(
                                              fontSize: 12.5,
                                              fontWeight: _selectedDateFilter != null
                                                  ? FontWeight.w800
                                                  : FontWeight.w500,
                                              color: _selectedDateFilter != null
                                                  ? _cream
                                                  : _creamMuted,
                                            ),
                                          ),
                                        ),
                                        const Icon(
                                          Icons.search_rounded,
                                          size: 17,
                                          color: _amber,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              if (_selectedDateFilter != null) ...[
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => setState(() {
                                    _selectedDateFilter = null;
                                    _currentPage = 1;
                                  }),
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: const Color(0xFFEF4444).withValues(alpha: 0.35),
                                      ),
                                    ),
                                    child: const Icon(
                                      Icons.close_rounded,
                                      size: 17,
                                      color: Color(0xFFF87171),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 10),
                          // Type filter chips (All / Check-in / Alkaline / Absence)
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: ['All', 'Check-in', 'Alkaline', 'Absence'].map((filter) {
                                final isSelected = _selectedTypeFilter == filter;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () => setState(() {
                                      _selectedTypeFilter = filter;
                                      _currentPage = 1;
                                    }),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isSelected ? _amber : _bgDark,
                                        borderRadius: BorderRadius.circular(99),
                                        border: Border.all(
                                          color: isSelected ? _amber : _cardBorder,
                                        ),
                                      ),
                                      child: Text(
                                        filter == 'Absence' ? 'Absences' : filter,
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w800,
                                          color: isSelected ? _darkInk : _creamMuted,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ],
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
                    else if (filteredItems.isEmpty)
                      _emptyState(
                        hasActiveFilter ? Icons.search_off_rounded : Icons.event_note_rounded,
                        hasActiveFilter
                            ? 'No ${_selectedTypeFilter == 'All' ? 'logs or absences' : _selectedTypeFilter.toLowerCase()} found${_selectedDateFilter != null ? ' on ${_formatShortDate(_selectedDateFilter!)}' : ''}.'
                            : 'No attendance records yet.',
                      )
                    else
                      _buildTimeline(filteredItems),
                  ],
                );
              },
            ),
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
          _summaryRow(
            'Absences',
            (_hasCheckedInToday ? _client.absences : (_client.absences + 1)).toString(),
            const Color(0xFFEF4444),
          ),
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

  // ── TIMELINE WITH PAGINATION ────────────────────────────────────────────────
  Widget _buildTimeline(List<Map<String, dynamic>> filteredItems) {
    final totalItems = filteredItems.length;
    final totalPages = (totalItems / _itemsPerPage).ceil().clamp(1, 9999);
    final safePage = _currentPage.clamp(1, totalPages);
    final startIdx = (safePage - 1) * _itemsPerPage;
    final endIdx = (startIdx + _itemsPerPage).clamp(0, totalItems);
    final pageItems = filteredItems.sublist(startIdx, endIdx);

    return Column(
      children: [
        for (var i = 0; i < pageItems.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: pageItems[i]['isSyntheticAbsentToday'] == true
                ? _buildAbsentTodayCard(pageItems[i]['date'].toString())
                : _timelineCard(pageItems[i]),
          ),

        // ── Pagination Bar ────────────────────────────────────────────────────
        if (totalPages > 1) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: _cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _cardBorder, width: 1.2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                OutlinedButton.icon(
                  onPressed: safePage > 1
                      ? () => setState(() => _currentPage = safePage - 1)
                      : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _amber,
                    disabledForegroundColor: _creamMuted.withValues(alpha: 0.35),
                    side: BorderSide(
                      color: safePage > 1
                          ? _amber.withValues(alpha: 0.5)
                          : _cardBorder,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.chevron_left_rounded, size: 18),
                  label: const Text('Prev', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Page $safePage of $totalPages',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: _cream,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Showing ${startIdx + 1}–$endIdx of $totalItems',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: _creamMuted,
                      ),
                    ),
                  ],
                ),
                OutlinedButton.icon(
                  onPressed: safePage < totalPages
                      ? () => setState(() => _currentPage = safePage + 1)
                      : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _amber,
                    disabledForegroundColor: _creamMuted.withValues(alpha: 0.35),
                    side: BorderSide(
                      color: safePage < totalPages
                          ? _amber.withValues(alpha: 0.5)
                          : _cardBorder,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Text('Next', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  label: const Icon(Icons.chevron_right_rounded, size: 18),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAbsentTodayCard(String todayFormatted) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF2C1A1C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
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
              color: const Color(0xFFEF4444).withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.event_busy_rounded,
              color: Color(0xFFEF4444),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      todayFormatted,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'TODAY',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Row(
                  children: [
                    Text(
                      'Absent',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFF87171),
                      ),
                    ),
                    SizedBox(width: 6),
                    Text(
                      '· No check-in logged today',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: _creamMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Icon(
            Icons.cancel_rounded,
            color: Color(0xFFEF4444),
            size: 20,
          ),
        ],
      ),
    );
  }

  Widget _timelineCard(Map<String, dynamic> visit) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final displayDate = _formatVisitDate(rawDate);
    final type = (visit['type'] ?? 'Visit').toString();
    final loggedBy = (visit['logged_by'] ?? 'Staff').toString();
    final isAlkaline = type.toLowerCase().contains('alkaline');
    final isAbsence = type.toLowerCase().contains('absent') || type.toLowerCase().contains('absence');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showAttendanceDetailsDialog(visit),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isAbsence ? const Color(0xFF2C1A1C) : _cream,
            borderRadius: BorderRadius.circular(16),
            border: isAbsence ? Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4), width: 1.2) : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
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
                  color: isAbsence
                      ? const Color(0xFFEF4444).withValues(alpha: 0.18)
                      : isAlkaline
                          ? _amber.withValues(alpha: 0.18)
                          : _cardDark,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isAbsence
                      ? Icons.event_busy_rounded
                      : isAlkaline
                          ? Icons.water_drop_rounded
                          : Icons.event_available_rounded,
                  color: isAbsence
                      ? const Color(0xFFEF4444)
                      : isAlkaline
                          ? _amber
                          : const Color(0xFF10B981),
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
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: isAbsence ? Colors.white : _darkInk,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isAbsence
                                ? const Color(0xFFEF4444).withValues(alpha: 0.22)
                                : isAlkaline
                                    ? _amber.withValues(alpha: 0.2)
                                    : const Color(0xFF10B981).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            type,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: isAbsence
                                  ? const Color(0xFFF87171)
                                  : isAlkaline
                                      ? _darkInk
                                      : const Color(0xFF065F46),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '· ${loggedBy.isNotEmpty ? '${loggedBy[0].toUpperCase()}${loggedBy.substring(1)}' : 'System'}',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: isAbsence ? _creamMuted : _oliveMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                isAbsence ? Icons.cancel_rounded : Icons.info_outline_rounded,
                color: isAbsence ? const Color(0xFFEF4444) : _darkInk,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAttendanceDetailsDialog(Map<String, dynamic> visit) {
    final rawDate = (visit['date'] ?? visit['created_at'] ?? '').toString();
    final displayDate = _formatVisitDate(rawDate);
    final type = (visit['type'] ?? 'Visit').toString();
    final loggedBy = (visit['logged_by'] ?? 'Staff').toString();
    final isAlkaline = type.toLowerCase().contains('alkaline');
    final staffId = visit['staff_id'];
    final id = visit['id'];

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Container(
          width: 440,
          constraints: const BoxConstraints(maxWidth: 440),
          decoration: BoxDecoration(
            color: _cardDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _amber.withValues(alpha: 0.5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.6),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: isAlkaline
                            ? _amber.withValues(alpha: 0.18)
                            : const Color(0xFF10B981).withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isAlkaline
                              ? _amber.withValues(alpha: 0.4)
                              : const Color(0xFF10B981).withValues(alpha: 0.4),
                          width: 1.2,
                        ),
                      ),
                      child: Icon(
                        isAlkaline ? Icons.water_drop_rounded : Icons.how_to_reg_rounded,
                        color: isAlkaline ? _amber : const Color(0xFF34D399),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Attendance Info',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isAlkaline
                                  ? _amber.withValues(alpha: 0.18)
                                  : const Color(0xFF10B981).withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              type,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: isAlkaline ? _amber : const Color(0xFF34D399),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Content Details Container
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: _bgDark,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: _cardBorder),
                  ),
                  child: Column(
                    children: [
                      _infoRow('Date & Time', displayDate, Icons.access_time_rounded),
                      const Divider(color: _cardBorder, height: 16),
                      _infoRow('Status', 'Recorded & Verified', Icons.check_circle_rounded, valueColor: const Color(0xFF34D399)),
                      const Divider(color: _cardBorder, height: 16),
                      _infoRow('Session Type', type, Icons.label_rounded),
                      const Divider(color: _cardBorder, height: 16),
                      _infoRow(
                        'Logged By',
                        '${loggedBy[0].toUpperCase()}${loggedBy.substring(1)}${staffId != null ? ' (Staff #$staffId)' : ''}',
                        Icons.person_rounded,
                      ),
                      if (id != null) ...[
                        const Divider(color: _cardBorder, height: 16),
                        _infoRow('Record ID', '#$id', Icons.fingerprint_rounded),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Close Button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: FilledButton.styleFrom(
                      backgroundColor: _amber,
                      foregroundColor: _darkInk,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text(
                      'Close',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, IconData icon, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _amber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(icon, size: 16, color: _amber),
          ),
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _creamMuted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: valueColor ?? Colors.white,
              ),
            ),
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
    // If string is already human-formatted (e.g. "Nov 8, 2026, 03:30 PM" or contains AM/PM)
    if (raw.contains(' AM') || raw.contains(' PM')) return raw;
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
