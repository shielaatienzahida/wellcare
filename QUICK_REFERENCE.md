# WellCare Mobile App - Quick Reference Guide

## Project Structure
```
wellcare-mobile/
├── lib/
│   ├── main.dart                    # App entry point with splash screen
│   ├── theme.dart                   # Design system (colors, typography, shadows)
│   ├── models/
│   │   └── client_model.dart        # Client data model
│   └── screens/
│       ├── landing_screen.dart      # Landing/onboarding screen
│       ├── login_screen.dart        # Login screen
│       ├── client_portal_screen.dart # Main portal with navigation
│       ├── home_screen.dart         # Home tab (NEW)
│       ├── wellness_screen.dart     # Wellness tab (NEW)
│       └── monitoring_screen.dart   # Staff monitoring screen
├── backend/
│   ├── server.js                    # Node.js backend
│   ├── db.js                        # Database adapter
│   └── migrate.js                   # Database migrations
└── assets/
    ├── heiwa_logo.jpg
    ├── card_alkaline.jpg
    ├── card_health.jpg
    ├── card_records.jpg
    └── card_analytics.jpg
```

## Color Reference

### Dark Theme
```dart
const kDarkBg = Color(0xFF0F1419);           // Background
const kDarkSurface = Color(0xFF1A1F2E);      // Primary surface
const kDarkSurfaceAlt = Color(0xFF242B3D);   // Secondary surface
```

### Accent Colors
```dart
const kTurquoise = Color(0xFF14B8A6);        // Primary accent
const kCyan = Color(0xFF06B6D4);             // Secondary accent
const kMint = Color(0xFF10B981);             // Success/positive
const kLavender = Color(0xFF8B5CF6);         // Premium/special
const kRose = Color(0xFFF43F5E);             // Attention/warning
```

### Text Colors
```dart
const kTextPrimary = Color(0xFFF8FAFC);      // Main text
const kTextSecondary = Color(0xFFCBD5E1);    // Secondary text
const kTextTertiary = Color(0xFF94A3B8);     // Tertiary text
```

## Key Components

### AppColors
```dart
AppColors.darkBg              // Dark background
AppColors.darkSurface         // Primary surface
AppColors.turquoise           // Primary accent
AppColors.textPrimary         // Main text
AppColors.gradientDarkTeal    // Teal gradient
```

### AppRadius
```dart
AppRadius.xs = 8              // Extra small
AppRadius.sm = 12             // Small
AppRadius.md = 16             // Medium
AppRadius.lg = 20             // Large
AppRadius.xl = 24             // Extra large
AppRadius.xxl = 28            // 2x large
AppRadius.xxxl = 32           // 3x large
```

### AppSpacing
```dart
AppSpacing.xs = 4             // Extra small
AppSpacing.sm = 8             // Small
AppSpacing.md = 12            // Medium
AppSpacing.lg = 16            // Large
AppSpacing.xl = 20            // Extra large
AppSpacing.xxl = 24           // 2x large
AppSpacing.xxxl = 32          // 3x large
AppSpacing.page               // Page padding (18, 8, 18, 32)
```

## Screen Navigation

### Bottom Navigation Tabs
| Tab | Icon | Color | Screen |
|-----|------|-------|--------|
| Home | home_rounded | Turquoise | HomeScreen |
| Wellness | favorite_rounded | Mint | WellnessScreen |
| Profile | person_rounded | Cyan | Profile Tab |
| Alkaline | water_drop_rounded | Lavender | Alkaline Tab |
| Reports | query_stats_rounded | Rose | Reports Tab |

## API Endpoints

### Client Endpoints
```
GET    /api/v1/clients/me              # Get current client
PATCH  /api/v1/clients/me              # Update client profile
GET    /api/v1/clients/me/history      # Get visit history
```

### Message Endpoints
```
GET    /api/v1/messages                # Get messages
POST   /api/v1/messages                # Send message
PATCH  /api/v1/messages/read           # Mark as read
```

## Common Patterns

### Dark Surface Card
```dart
Container(
  decoration: BoxDecoration(
    color: kDarkSurfaceAlt,
    borderRadius: BorderRadius.circular(AppRadius.lg),
    border: Border.all(color: const Color(0xFF2D3748)),
  ),
  child: // content
)
```

### Gradient Accent
```dart
Container(
  decoration: BoxDecoration(
    gradient: kGradientDarkTeal,
    borderRadius: BorderRadius.circular(AppRadius.xl),
    boxShadow: [
      BoxShadow(
        color: kTurquoise.withValues(alpha: 0.2),
        blurRadius: 24,
        spreadRadius: -6,
      ),
    ],
  ),
  child: // content
)
```

### Icon Badge
```dart
Container(
  width: 38,
  height: 38,
  decoration: BoxDecoration(
    color: kMint.withValues(alpha: 0.15),
    borderRadius: BorderRadius.circular(AppRadius.sm),
  ),
  child: Icon(Icons.water_drop_rounded, color: kMint, size: 20),
)
```

## Data Flow

### Client Login
1. User enters credentials on LoginScreen
2. POST to `/api/v1/login`
3. Receive token and client data
4. Save to SharedPreferences
5. Navigate to ClientPortalScreen

### Home Screen Data
1. HomeScreen initializes
2. Fetch `/clients/me` for profile
3. Fetch `/clients/me/history` for visits
4. Display data with loading states
5. Poll every 10 seconds for updates

### Profile Update
1. User edits profile in modal
2. PATCH to `/clients/me`
3. Update local state
4. Save to SharedPreferences
5. Show success message

## Debugging Tips

### Check Dark Theme Colors
```dart
// In theme.dart, verify:
brightness: Brightness.dark,
scaffoldBackgroundColor: kDarkBg,
```

### Verify API Connectivity
```dart
// Check backend URL in theme.dart:
const String kLanIp = '10.164.75.4';
String get kBackendUrl => 'http://$kLanIp:5000/api/v1';
```

### Test Data Loading
```dart
// HomeScreen has loading indicators:
if (_historyLoading)
  const Center(child: CircularProgressIndicator())
```

### Check Responsive Layout
- Test on different screen sizes
- Verify text doesn't overflow
- Check touch target sizes (min 44x44)
- Test landscape orientation

## Performance Optimization

1. **Image Optimization** - Use compressed assets
2. **Lazy Loading** - Load data on demand
3. **Caching** - Use SharedPreferences for session
4. **Polling** - Silent background updates every 10s
5. **Animation** - Use TweenAnimationBuilder for smooth transitions

## Accessibility Checklist

- [x] High contrast text (WCAG AA)
- [x] Touch targets ≥ 44x44 dp
- [x] Semantic icons with labels
- [x] Loading indicators
- [x] Error messages
- [x] Color not sole indicator
- [x] Readable font sizes
- [x] Proper spacing

## Common Issues & Solutions

### Issue: Dark theme not applying
**Solution:** Ensure `heiwaTheme()` is set in `ThemeData` in main.dart

### Issue: Colors look wrong
**Solution:** Check color constants in theme.dart, verify hex values

### Issue: API calls failing
**Solution:** Check backend URL, verify network connectivity, check token validity

### Issue: Images not loading
**Solution:** Verify assets in pubspec.yaml, check file paths

### Issue: Navigation not working
**Solution:** Check _switchTab() method, verify tab indices match

## Useful Commands

```bash
# Get dependencies
flutter pub get

# Run app
flutter run

# Build APK
flutter build apk

# Build iOS
flutter build ios

# Run tests
flutter test

# Analyze code
flutter analyze

# Format code
flutter format lib/
```

## Resources

- Flutter Documentation: https://flutter.dev/docs
- Material Design 3: https://m3.material.io/
- Dart Documentation: https://dart.dev/guides
- HTTP Package: https://pub.dev/packages/http
- SharedPreferences: https://pub.dev/packages/shared_preferences

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** Production Ready
