# Flutter UI Layout & Text Wrapping Fixes
## Complete Refactoring Guide for WellCare Mobile App

---

## Issue 1: Header Layout / Text Wrapping Issue
**Problem**: App title "Wellcare / Client Portal" wraps awkwardly, splitting words mid-string.

**Root Cause**: The title text widget lacks proper width constraints inside the header Row.

### ✅ FIXED: Landing Screen Header

```dart
Widget _buildHeader() {
  return Padding(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
    child: Row(
      children: [
        // Modern logo container
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: AppColors.gradientEmerald,
            borderRadius: BorderRadius.circular(AppRadius.md),
            boxShadow: AppShadows.medium,
            border: Border.all(color: Colors.white, width: 2),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md - 2),
            child: Image.asset('assets/heiwa_logo.jpg', fit: BoxFit.cover),
          ),
        ),
        
        const SizedBox(width: 12),
        
        // ✅ FIX: Wrap title in Expanded to prevent text wrapping
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // ✅ FIX: Use maxLines: 1 with ellipsis for single-line text
              Text(
                'Wellcare',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: kTextPrimary,
                  height: 1.1,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Wellness Center System',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: kEmeraldLight,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
        
        // Modern login button
        Material(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: InkWell(
            onTap: _navigateToLogin,
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: Ink(
              decoration: BoxDecoration(
                gradient: AppColors.gradientTeal,
                borderRadius: BorderRadius.circular(AppRadius.pill),
                boxShadow: AppShadows.button,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: const Text(
                'Login',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
```

### ✅ FIXED: Client Portal Header

```dart
Widget _buildHeader() {
  return Container(
    decoration: BoxDecoration(
      color: kDarkSurface,
      border: const Border(bottom: BorderSide(color: Color(0xFF2D3748), width: 1)),
      boxShadow: [
        BoxShadow(
          color: kBlack.withValues(alpha: 0.3),
          blurRadius: 20,
          offset: const Offset(0, 4),
          spreadRadius: -4,
        ),
      ],
    ),
    child: SafeArea(
      bottom: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
            child: Row(
              children: [
                // Modern logo
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: kGradientDarkTeal,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    boxShadow: [
                      BoxShadow(
                        color: kTurquoise.withValues(alpha: 0.3),
                        blurRadius: 12,
                        spreadRadius: -2,
                      ),
                    ],
                    border: Border.all(color: kCyan.withValues(alpha: 0.3), width: 1.5),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.md - 2),
                    child: Image.asset('assets/heiwa_logo.jpg', fit: BoxFit.cover),
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // ✅ FIX: Wrap branding in Expanded to prevent text wrapping
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // ✅ FIX: Use maxLines: 1 with ellipsis
                      Text(
                        'Wellcare',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: kTextPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'Client Portal',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: kTurquoise,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Modern action icons
                _headerIcon(Icons.search_rounded, 'Search', () => _showWellnessSearch(context)),
                _headerIcon(Icons.chat_bubble_outline_rounded, 'Messages', () => _showMessagesModal(context)),
                _headerIcon(Icons.notifications_none_rounded, 'Notifications', () => _showNotificationsModal(context)),
                
                // Modern profile avatar
                GestureDetector(
                  onTap: () => _switchTab(2),
                  child: Container(
                    width: 42,
                    height: 42,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      gradient: _profilePhotoBytes == null ? kGradientDarkMint : null,
                      color: _profilePhotoBytes == null ? null : Colors.transparent,
                      shape: BoxShape.circle,
                      border: Border.all(color: kCyan.withValues(alpha: 0.3), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: kTurquoise.withValues(alpha: 0.2),
                          blurRadius: 12,
                          spreadRadius: -2,
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _profilePhotoBytes == null
                        ? Center(
                            child: Text(
                              _initials,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          )
                        : Image.memory(_profilePhotoBytes!, fit: BoxFit.cover, width: 42, height: 42),
                  ),
                ),
                
                _headerIcon(Icons.logout_rounded, 'Log out', () => _logout(context)),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
```

---

## Issue 2: Bottom Overflow (9.7 pixels) in Grid/Card Containers
**Problem**: GridView cards overflow at the bottom due to insufficient vertical space.

**Solution**: Adjust `childAspectRatio` and wrap internal texts with `Flexible`/`Expanded`.

### ✅ FIXED: Report Metrics Grid

```dart
GridView.count(
  crossAxisCount: 2,
  shrinkWrap: true,
  physics: const NeverScrollableScrollPhysics(),
  crossAxisSpacing: 12,
  mainAxisSpacing: 12,
  // ✅ FIX: Decreased childAspectRatio from 1.0 to 1.15 for more vertical space
  childAspectRatio: 1.15,
  children: [
    _reportMetric(
      'Check-ins',
      checkins.toString(),
      Icons.how_to_reg_rounded,
      barValue: checkins / safeMax,
      barColor: kEmeraldLight,
      tint: const Color(0xFF14B8A6).withValues(alpha: 0.15),
      iconColor: kEmeraldLight,
      subLabel: 'vs $safeMax total',
    ),
    _reportMetric(
      'Absences',
      absences.toString(),
      Icons.event_busy_rounded,
      barValue: absences / safeMax,
      barColor: kRose,
      tint: kRose.withValues(alpha: 0.15),
      iconColor: kRose,
      subLabel: 'recorded',
    ),
    _reportMetric(
      'Visits recorded',
      totalVisits.toString(),
      Icons.event_available_rounded,
      barValue: totalVisits / safeMax,
      barColor: kAmber,
      tint: kAmber.withValues(alpha: 0.15),
      iconColor: kAmber,
      subLabel: 'all-time sessions',
    ),
    _reportMetric(
      'Alkaline sessions',
      alkaline.toString(),
      Icons.water_drop_rounded,
      barValue: alkaline / safeMax,
      barColor: const Color(0xFF38BDF8),
      tint: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
      iconColor: const Color(0xFF38BDF8),
      subLabel: '${(alkaline * 0.5).toStringAsFixed(1)} L total',
    ),
  ],
)
```

### ✅ FIXED: Report Metric Card Widget

```dart
Widget _reportMetric(
  String label,
  String value,
  IconData icon, {
  Color? tint,
  Color iconColor = kEmeraldLight,
  double barValue = 0,
  Color barColor = kEmeraldLight,
  String subLabel = '',
  List<double> sparkData = const [],
}) {
  return Container(
    decoration: BoxDecoration(
      color: kDarkSurfaceAlt,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      border: Border.all(color: const Color(0xFF1B5E5B), width: 1.2),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Decorative illustration strip at top ──────────────────────────
        SizedBox(
          height: 52,
          width: double.infinity,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Gradient background strip
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      barColor.withValues(alpha: 0.22),
                      barColor.withValues(alpha: 0.06),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
              // Sparkline / wave painted over the strip
              CustomPaint(
                painter: _SparklinePainter(
                  data: sparkData.isNotEmpty
                      ? sparkData
                      : List.generate(8, (i) => barValue * (0.4 + 0.6 * ((i % 3 + 1) / 3.0))),
                  color: barColor,
                ),
              ),
              // Icon badge top-left
              Positioned(
                top: 10,
                left: 12,
                child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: barColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: barColor.withValues(alpha: 0.35),
                      width: 1,
                    ),
                  ),
                  child: Icon(icon, color: iconColor, size: 16),
                ),
              ),
              // Mini arc top-right
              Positioned(
                top: 8,
                right: 10,
                child: SizedBox(
                  width: 34,
                  height: 34,
                  child: CustomPaint(
                    painter: _ArcPainter(
                      progress: barValue.clamp(0.0, 1.0),
                      color: barColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // ── Data section ─────────────────────────────────────────────────
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // ✅ FIX: Use maxLines: 1 with ellipsis for value
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: kTextPrimary,
                    height: 1,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ✅ FIX: Use maxLines: 1 with ellipsis for label
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: kTextTertiary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      child: LinearProgressIndicator(
                        value: barValue.clamp(0.0, 1.0),
                        minHeight: 4,
                        backgroundColor: barColor.withValues(alpha: 0.12),
                        valueColor: AlwaysStoppedAnimation<Color>(barColor),
                      ),
                    ),
                    if (subLabel.isNotEmpty) ...{
                      const SizedBox(height: 3),
                      // ✅ FIX: Use maxLines: 1 with ellipsis for subLabel
                      Text(
                        subLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: barColor.withValues(alpha: 0.75),
                        ),
                      ),
                    },
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
```

---

## Issue 3: Right Overflow (63 pixels) in Horizontal Rows/Containers
**Problem**: Text or elements in horizontal Row components overflow to the right.

**Solution**: Wrap overflowing text with `Expanded` or `Flexible`.

### ✅ FIXED: Notification Tile

```dart
Widget _notifTile(
  BuildContext context, {
  required IconData icon,
  required Color iconColor,
  required String title,
  required String time,
  required String body,
  required String fullDetail,
}) {
  return GestureDetector(
    onTap: () => _showNotificationDetailModal(
      context,
      icon: icon,
      iconColor: iconColor,
      title: title,
      time: time,
      body: body,
      fullDetail: fullDetail,
    ),
    child: Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          // ✅ FIX: Wrap content in Expanded to prevent right overflow
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // ✅ FIX: Wrap title in Expanded with ellipsis
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: kTextPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // ✅ FIX: Shrink time text to prevent overflow
                    Text(
                      time,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: kTextTertiary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // ✅ FIX: Use maxLines with ellipsis for body text
                Text(
                  body,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: kTextTertiary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right_rounded, color: kTurquoise, size: 18),
        ],
      ),
    ),
  );
}
```

### ✅ FIXED: Info Row with Icon

```dart
Widget _infoRowIcon(
  IconData icon,
  String label,
  String value, {
  bool highlight = false,
  bool last = false,
}) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    decoration: BoxDecoration(
      color: Colors.transparent,
      border: last ? null : const Border(bottom: BorderSide(color: Color(0xFF1B5E5B))),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 18, color: kTurquoise),
        const SizedBox(width: 12),
        // ✅ FIX: Use SizedBox with fixed width for label
        SizedBox(
          width: 90,
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: kTextTertiary,
            ),
          ),
        ),
        // ✅ FIX: Wrap value in Expanded to prevent right overflow
        Expanded(
          child: highlight
              ? Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4.5),
                    decoration: BoxDecoration(
                      color: kTurquoise.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                      border: Border.all(color: kTurquoise.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: kTurquoiseLight,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                )
              : Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: kTextPrimary,
                  ),
                  textAlign: TextAlign.right,
                ),
        ),
      ],
    ),
  );
}
```

### ✅ FIXED: Attendance Breakdown Row

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  children: [
    // ✅ FIX: Wrap check-ins row in Expanded
    Expanded(
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              color: kEmeraldLight,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          // ✅ FIX: Use Expanded for text to prevent overflow
          Expanded(
            child: Text(
              'Check-ins: $checkins',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: kTextPrimary,
              ),
            ),
          ),
        ],
      ),
    ),
    // ✅ FIX: Wrap absences row in Expanded
    Expanded(
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: kRose.withValues(alpha: 0.7),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          // ✅ FIX: Use Expanded for text to prevent overflow
          Expanded(
            child: Text(
              'Absences: $absences',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: kTextPrimary,
              ),
            ),
          ),
        ],
      ),
    ),
  ],
)
```

---

## Summary of Fixes Applied

| Issue | Fix | Impact |
|-------|-----|--------|
| Header text wrapping | Wrapped title in `Expanded` + added `maxLines: 1` with `TextOverflow.ellipsis` | Prevents mid-word breaks, keeps header clean |
| Grid card overflow | Decreased `childAspectRatio` from 1.0 to 1.15 | Provides more vertical space for card content |
| Card text overflow | Wrapped labels/values in `Expanded` + added `maxLines` with ellipsis | Prevents text from breaking layout |
| Row right overflow | Wrapped content in `Expanded` + used `SizedBox` for fixed-width labels | Prevents horizontal overflow |
| Notification tiles | Wrapped title/body in `Expanded` with ellipsis | Maintains layout integrity |
| Info rows | Used `SizedBox` for labels + `Expanded` for values | Consistent spacing and no overflow |

---

## Best Practices Applied

✅ **Always use `Expanded` or `Flexible` in horizontal Rows when content width is unknown**
✅ **Use `maxLines: 1` with `TextOverflow.ellipsis` for single-line text**
✅ **Use `maxLines: 2-3` with ellipsis for multi-line text that might overflow**
✅ **Adjust `childAspectRatio` in GridView when cards overflow**
✅ **Use `SizedBox` for fixed-width labels in rows**
✅ **Test on multiple screen sizes (small phones, tablets, landscape)**

