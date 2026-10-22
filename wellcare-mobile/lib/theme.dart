import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// ─────────────────────────────────────────────────────────────────────────────
// WellCare Premium Dark Teal & Turquoise Wellness Aesthetic
// ─────────────────────────────────────────────────────────────────────────────

// Dark green base
const kDarkBg = Color(0xFF0D3B2F);
const kDarkSurface = Color(0xFF0F4A38);
const kDarkSurfaceAlt = Color(0xFF125A42);

// Turquoise and teal accents
const kTurquoise = Color(0xFF14B8A6);
const kTurquoiseDark = Color(0xFF0D9488);
const kTurquoiseLight = Color(0xFF5EEAD4);
const kCyan = Color(0xFF06B6D4);
const kCyanLight = Color(0xFF22D3EE);
const kMint = Color(0xFF10B981);
const kMintLight = Color(0xFF6EE7B7);

// Accent colors
const kLavender = Color(0xFF8B5CF6);
const kRose = Color(0xFFF43F5E);
const kAmber = Color(0xFFF59E0B);
const kWhite = Color(0xFFFFFFFF);
const kBlack = Color(0xFF000000);

// Text colors for dark theme
const kTextPrimary = Color(0xFFFFFFFF);           // White - Main text on dark backgrounds
const kTextSecondary = Color(0xFF5EEAD4);        // Soft teal - Secondary text
const kTextTertiary = Color(0xFFB0BEC5);         // Light gray - Tertiary/subtle text

// Light background text colors (for info cards, modals, etc.)
const kLightBgText = Color(0xFF0F172A);          // Dark text on light backgrounds
const kLightBgTextSecondary = Color(0xFF475569); // Muted text on light backgrounds
const kLightBgTextTertiary = Color(0xFF64748B);  // Subtle text on light backgrounds

// Legacy emerald (for backward compatibility)
const kEmerald = Color(0xFF00897B);
const kEmeraldDark = Color(0xFF004D40);
const kEmeraldLight = Color(0xFF14B8A6);
const kKelly = Color(0xFF26A69A);
const kSand = Color(0xFF0D3B2F);
const kSandDark = Color(0xFF0F4A38);
const kDarkText = Color(0xFFFFFFFF);

// Gradient colors
const kGradientEmeraldStart = Color(0xFF046A38);
const kGradientEmeraldEnd = Color(0xFF10B981);
const kGradientTealStart = Color(0xFF0D9488);
const kGradientTealEnd = Color(0xFF06B6D4);
const kGradientSkyStart = Color(0xFF0EA5E9);
const kGradientSkyEnd = Color(0xFF8B5CF6);

// Premium dark theme gradients
const kGradientDarkTeal = LinearGradient(
  colors: [
    Color(0xFF135345),
    Color(0xFF0E4337),
    Color(0xFF0A2E25),
  ],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const kGradientDarkMint = LinearGradient(
  colors: [kMint, kTurquoise],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

const kGradientDarkPurple = LinearGradient(
  colors: [kLavender, kCyan],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced WellCare Design Tokens with modern visual elements
//
// A comprehensive design system that maintains brand consistency while adding
// visual interest through gradients, shadows, and complementary colors.
// ─────────────────────────────────────────────────────────────────────────────
class AppColors {
  AppColors._();

  // Dark theme surfaces
  static const darkBg = kDarkBg;
  static const darkSurface = kDarkSurface;
  static const darkSurfaceAlt = kDarkSurfaceAlt;

  // Turquoise & teal accents
  static const turquoise = kTurquoise;
  static const turquoiseDark = kTurquoiseDark;
  static const turquoiseLight = kTurquoiseLight;
  static const cyan = kCyan;
  static const cyanLight = kCyanLight;
  static const mint = kMint;
  static const mintLight = kMintLight;

  // Text colors
  static const textPrimary = kTextPrimary;
  static const textSecondary = kTextSecondary;
  static const textTertiary = kTextTertiary;
  
  // Light background text colors
  static const lightBgText = kLightBgText;
  static const lightBgTextSecondary = kLightBgTextSecondary;
  static const lightBgTextTertiary = kLightBgTextTertiary;

  // Brand greens
  static const green = kEmerald;
  static const greenDark = kEmeraldDark;
  static const greenMid = kEmeraldLight;
  static const greenBright = kKelly;
  static const greenTint = kMint;
  static const greenFaint = Color(0xFFF0FAF5);

  // New accent colors
  static const teal = kTurquoiseDark;
  static const sky = Color(0xFF0EA5E9);
  static const lavender = kLavender;
  static const rose = kRose;
  static const amber = kAmber;

  // Neutrals / surfaces
  static const surface = kDarkSurface;
  static const surfaceMuted = kSand;
  static const surfaceSunken = kSandDark;
  static const ink = kTextPrimary;
  static const inkSoft = Color(0xFFFFFFFF);
  static const inkFaint = Color(0xFFE0F2F1);
  static const hairline = Color(0xFF1B5E5B);
  static const hairlineDark = Color(0xFF0F4A38);

  // Status
  static const danger = Color(0xFFDC2A2A);
  static const dangerTint = Color(0xFFFEF2F2);
  static const warning = Color(0xFFE8871E);
  static const warningTint = Color(0xFFFFF6EA);
  static const success = Color(0xFF10B981);
  static const successTint = Color(0xFFECFDF5);
  static const info = Color(0xFF0EA5E9);
  static const infoTint = Color(0xFFF0F9FF);

  // Gradients
  static const gradientEmerald = LinearGradient(
    colors: [kGradientEmeraldStart, kGradientEmeraldEnd],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const gradientTeal = LinearGradient(
    colors: [kGradientTealStart, kGradientTealEnd],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const gradientSky = LinearGradient(
    colors: [kGradientSkyStart, kGradientSkyEnd],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Dark theme gradients
  static const gradientDarkTeal = kGradientDarkTeal;
  static const gradientDarkMint = kGradientDarkMint;
  static const gradientDarkPurple = kGradientDarkPurple;
}

/// A 4pt spacing scale. Use these instead of ad-hoc magic numbers so vertical
/// rhythm stays identical across every screen.
class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double huge = 40;
  static const EdgeInsets page = EdgeInsets.fromLTRB(18, 8, 18, 32);
  static const EdgeInsets pageCompact = EdgeInsets.fromLTRB(16, 16, 16, 28);
}

class AppRadius {
  AppRadius._();
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
  static const double xxl = 28;
  static const double xxxl = 32;
  static const double pill = 999;

  static BorderRadius all(double r) => BorderRadius.circular(r);
  static const BorderRadius card = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius cardLarge = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius buttonBR = BorderRadius.all(Radius.circular(md));
  static const BorderRadius buttonLargeBR = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius inputBR = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius avatar = BorderRadius.all(Radius.circular(xxl));

  // Double values for use where a double radius is required
  static const double buttonR = md;
  static const double buttonLargeR = lg;
  static const double inputR = sm;
}

class AppShadows {
  AppShadows._();
  static const List<BoxShadow> none = [];

  /// Very soft ambient lift for cards sitting on the muted background.
  static final List<BoxShadow> card = [
    BoxShadow(
      color: kEmeraldDark.withOpacity(0.05),
      blurRadius: 18,
      offset: const Offset(0, 6),
      spreadRadius: -2,
    ),
  ];

  /// Medium shadow for elevated elements
  static final List<BoxShadow> medium = [
    BoxShadow(
      color: kEmeraldDark.withOpacity(0.08),
      blurRadius: 24,
      offset: const Offset(0, 8),
      spreadRadius: -4,
    ),
  ];

  /// Stronger, brand-tinted lift for floating / hero surfaces.
  static final List<BoxShadow> floating = [
    BoxShadow(
      color: kEmeraldDark.withOpacity(0.12),
      blurRadius: 32,
      offset: const Offset(0, 12),
      spreadRadius: -6,
    ),
  ];

  /// Diffuse green glow used under primary buttons.
  static final List<BoxShadow> button = [
    BoxShadow(
      color: kEmerald.withOpacity(0.32),
      blurRadius: 20,
      offset: const Offset(0, 8),
      spreadRadius: -4,
    ),
  ];

  /// Subtle shadow for inset/sunken elements
  static final List<BoxShadow> inner = [
    BoxShadow(
      color: kEmeraldDark.withOpacity(0.06),
      blurRadius: 4,
      offset: const Offset(0, 2),
      spreadRadius: -2,
    ),
  ];

  /// Glow effect for premium elements
  static final List<BoxShadow> glow = [
    BoxShadow(
      color: kKelly.withOpacity(0.25),
      blurRadius: 24,
      offset: const Offset(0, 0),
      spreadRadius: 0,
    ),
  ];
}

class AppText {
  AppText._();
  static const displayLarge = TextStyle(
      fontSize: 36, height: 1.1, fontWeight: FontWeight.w900, color: kTextPrimary, letterSpacing: -0.8);
  static const display = TextStyle(
      fontSize: 30, height: 1.12, fontWeight: FontWeight.w800, color: kTextPrimary, letterSpacing: -0.6);
  static const h1 = TextStyle(
      fontSize: 25, height: 1.15, fontWeight: FontWeight.w800, color: kTextPrimary, letterSpacing: -0.4);
  static const h2 = TextStyle(
      fontSize: 20, fontWeight: FontWeight.w800, color: kTextPrimary, letterSpacing: -0.2);
  static const h3 = TextStyle(
      fontSize: 17, fontWeight: FontWeight.w800, color: kTextPrimary);
  static const title = TextStyle(
      fontSize: 15, fontWeight: FontWeight.w700, color: kTextPrimary);
  static const subtitle = TextStyle(
      fontSize: 13, fontWeight: FontWeight.w600, color: kTextPrimary, letterSpacing: 0.2);
  static const body = TextStyle(fontSize: 14, height: 1.5, color: kTextPrimary);
  static const bodySmall = TextStyle(fontSize: 13, height: 1.45, color: kTextPrimary);
  static const caption = TextStyle(
      fontSize: 12, fontWeight: FontWeight.w600, color: kTextTertiary);
  static const label = TextStyle(
      fontSize: 11, fontWeight: FontWeight.w800, color: kEmeraldLight, letterSpacing: 1.15);
  static const metric = TextStyle(
      fontSize: 28, fontWeight: FontWeight.w900, color: kTextPrimary, letterSpacing: -0.8, height: 1.05);
  static const metricLarge = TextStyle(
      fontSize: 40, fontWeight: FontWeight.w900, color: kTextPrimary, letterSpacing: -1.2, height: 1);
  static const button = TextStyle(
      fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 0.3);
  static const buttonSmall = TextStyle(
      fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0.2);
}

/// Enhanced card decoration with modern styling options
BoxDecoration appCardDecoration({
  Color color = AppColors.surface,
  double radius = AppRadius.lg,
  Color? borderColor,
  List<BoxShadow>? shadow,
  Gradient? gradient,
  bool elevated = true,
  bool inset = false,
}) {
  return BoxDecoration(
    color: color,
    gradient: gradient,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: borderColor ?? AppColors.hairline, width: 1.2),
    boxShadow: elevated 
      ? (shadow ?? (inset ? AppShadows.inner : AppShadows.card))
      : AppShadows.none,
  );
}

/// Premium card decoration with gradient and glow
BoxDecoration appPremiumCardDecoration({
  double radius = AppRadius.xl,
}) {
  return BoxDecoration(
    gradient: AppColors.gradientEmerald,
    borderRadius: BorderRadius.circular(radius),
    boxShadow: AppShadows.glow,
  );
}

/// Modern button decoration
BoxDecoration appButtonDecoration({
  Color color = AppColors.green,
  double radius = AppRadius.buttonR,
  bool elevated = true,
  Gradient? gradient,
}) {
  return BoxDecoration(
    color: color,
    gradient: gradient ?? AppColors.gradientEmerald,
    borderRadius: BorderRadius.circular(radius),
    boxShadow: elevated ? AppShadows.button : AppShadows.none,
  );
}

/// Modern input field decoration
BoxDecoration appInputDecoration({
  Color color = AppColors.surfaceMuted,
  double radius = AppRadius.inputR,
  bool focused = false,
}) {
  return BoxDecoration(
    color: color,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(
      color: focused ? AppColors.greenBright : AppColors.hairline,
      width: focused ? 1.8 : 1.2,
    ),
    boxShadow: focused ? AppShadows.medium : AppShadows.none,
  );
}

/// The signature WellCare gradient — deep green → brand green.
const LinearGradient kBrandGradient = LinearGradient(
  colors: [kEmerald, kEmeraldLight],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

/// A softer, brighter green gradient for accents and metric tiles.
const LinearGradient kFreshGradient = LinearGradient(
  colors: [kEmeraldLight, kKelly],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// Local Network PC IP (update if your PC Wi-Fi IP changes):
const String kLanIp = '172.24.41.67';

String? _activeBackendUrl;

String get kBackendUrl {
  if (_activeBackendUrl != null) return _activeBackendUrl!;
  if (kIsWeb) return 'http://localhost:5000/api/v1';
  return 'http://$kLanIp:5000/api/v1';
}

List<String> get candidateBackendUrls {
  if (kIsWeb) {
    return [
      'http://localhost:5000/api/v1',
      'http://localhost:5001/api/v1',
    ];
  }
  return [
    'http://localhost:5000/api/v1', // USB adb reverse (port 5000)
    'http://localhost:5001/api/v1', // USB adb reverse (port 5001)
    'http://$kLanIp:5000/api/v1',   // Wi-Fi Phone (port 5000)
    'http://$kLanIp:5001/api/v1',   // Wi-Fi Phone (port 5001)
    'http://10.0.2.2:5000/api/v1',  // Android Emulator (port 5000)
    'http://10.0.2.2:5001/api/v1',  // Android Emulator (port 5001)
  ];
}

Future<http.Response> postApi(String endpoint, {Map<String, String>? headers, Object? body, Duration timeout = const Duration(seconds: 3)}) async {
  final urls = [
    if (_activeBackendUrl != null) _activeBackendUrl!,
    ...candidateBackendUrls.where((u) => u != _activeBackendUrl),
  ];

  dynamic lastError;
  for (final base in urls) {
    try {
      final res = await http.post(
        Uri.parse('$base$endpoint'),
        headers: headers,
        body: body,
      ).timeout(timeout);
      _activeBackendUrl = base;
      return res;
    } catch (e) {
      if (e is TimeoutException) rethrow;
      lastError = e;
    }
  }
  throw lastError ?? Exception('Cannot connect to server');
}

Future<http.Response> getApi(String endpoint, {Map<String, String>? headers}) async {
  final urls = [
    if (_activeBackendUrl != null) _activeBackendUrl!,
    ...candidateBackendUrls.where((u) => u != _activeBackendUrl),
  ];

  dynamic lastError;
  for (final base in urls) {
    try {
      final res = await http.get(
        Uri.parse('$base$endpoint'),
        headers: headers,
      ).timeout(const Duration(seconds: 3));
      _activeBackendUrl = base;
      return res;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? Exception('Cannot connect to server');
}

Future<http.Response> patchApi(String endpoint, {Map<String, String>? headers, Object? body}) async {
  final urls = [
    if (_activeBackendUrl != null) _activeBackendUrl!,
    ...candidateBackendUrls.where((u) => u != _activeBackendUrl),
  ];

  dynamic lastError;
  for (final base in urls) {
    try {
      final res = await http.patch(
        Uri.parse('$base$endpoint'),
        headers: headers,
        body: body,
      ).timeout(const Duration(seconds: 3));
      _activeBackendUrl = base;
      return res;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? Exception('Cannot connect to server');
}

ThemeData heiwaTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: kEmeraldLight,
    primary: kEmeraldLight,
    onPrimary: Colors.white,
    secondary: kEmerald,
    onSecondary: Colors.white,
    surface: kDarkSurface,
    onSurface: kTextPrimary,
    error: AppColors.danger,
    brightness: Brightness.dark,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: kDarkBg,
    fontFamily: 'sans-serif',
    splashFactory: InkSparkle.splashFactory,
    visualDensity: VisualDensity.standard,

    appBarTheme: const AppBarTheme(
      backgroundColor: kDarkSurface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: kEmeraldLight),
      titleTextStyle: TextStyle(
          fontSize: 19, fontWeight: FontWeight.w800, color: kTextPrimary),
    ),

    cardTheme: CardThemeData(
      color: kDarkSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: const BorderSide(color: Color(0xFF1B5E5B)),
      ),
    ),

    dividerTheme: const DividerThemeData(
      color: Color(0xFF1B5E5B),
      thickness: 1,
      space: 1,
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kEmeraldLight,
        foregroundColor: Colors.white,
        disabledBackgroundColor: kEmeraldLight.withOpacity(0.4),
        disabledForegroundColor: Colors.white70,
        elevation: 0,
        shadowColor: Colors.transparent,
        minimumSize: const Size.fromHeight(52),
        padding: const EdgeInsets.symmetric(horizontal: 22),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.buttonBR),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kEmeraldLight,
        backgroundColor: kDarkSurfaceAlt,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: Color(0xFF1B5E5B)),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.buttonBR),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: kEmeraldLight,
        textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kDarkSurfaceAlt,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      hintStyle: const TextStyle(
          fontSize: 14, fontWeight: FontWeight.w500, color: kTextSecondary),
      labelStyle: const TextStyle(fontSize: 12.5, color: kTextSecondary),
      prefixIconColor: kEmeraldLight,
      suffixIconColor: kEmeraldLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm + 2),
        borderSide: const BorderSide(color: Color(0xFF1B5E5B)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm + 2),
        borderSide: const BorderSide(color: Color(0xFF1B5E5B)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm + 2),
        borderSide: const BorderSide(color: kEmeraldLight, width: 1.8),
      ),
    ),

    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kDarkSurface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: kEmeraldLight.withOpacity(0.15),
      elevation: 0,
      height: 70,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
            size: 23,
            color: states.contains(WidgetState.selected)
                ? kEmeraldLight
                : kTextTertiary,
          )),
      labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
            fontSize: 10.5,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w800
                : FontWeight.w600,
            color: states.contains(WidgetState.selected)
                ? kEmeraldLight
                : kTextTertiary,
          )),
    ),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: kDarkSurfaceAlt,
      contentTextStyle:
          const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600),
      behavior: SnackBarBehavior.floating,
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: kDarkSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.xl)),
      titleTextStyle: const TextStyle(
          fontSize: 18, fontWeight: FontWeight.w800, color: kTextPrimary),
    ),

    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: kDarkSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
    ),

    progressIndicatorTheme:
        const ProgressIndicatorThemeData(color: kEmeraldLight, strokeWidth: 2.6),
  );
}
