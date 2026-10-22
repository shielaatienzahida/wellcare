import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme.dart';
import 'models/client_model.dart';
import 'screens/landing_screen.dart';
import 'screens/client_portal_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HeiwaApp());
}

class HeiwaApp extends StatelessWidget {
  const HeiwaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HEIWA · Health & Life',
      theme: heiwaTheme(),
      debugShowCheckedModeBanner: false,
      // SplashRouter checks for a saved session before deciding which screen to show
      home: const _SplashRouter(),
    );
  }
}

/// Shown briefly while we check SharedPreferences for a saved session.
/// If a session exists → go to ClientPortalScreen directly.
/// If not → go to LandingScreen (normal login flow).
class _SplashRouter extends StatefulWidget {
  const _SplashRouter();

  @override
  State<_SplashRouter> createState() => _SplashRouterState();
}

class _SplashRouterState extends State<_SplashRouter> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    // Small delay so the splash renders at least once
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('heiwa_session_client');
      if (raw != null && raw.isNotEmpty) {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        final client = ClientModel.fromJson(json);
        // Make sure we actually have a token before restoring
        if (client.token.isNotEmpty && mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => ClientPortalScreen(client: client)),
          );
          return;
        }
      }
    } catch (_) {
      // Corrupted session — fall through to landing
    }

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LandingScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Modern splash screen with animated gradients and visual depth
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Animated gradient background
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFFF0FAF5),
                    Color(0xFFE6F7F0),
                    Colors.white,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  stops: [0.0, 0.5, 1.0],
                ),
              ),
            ),
          ),
          
          // Animated floating circles
          Positioned(
            top: -80,
            left: -80,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kKelly.withValues(alpha: 0.15),
                    kKelly.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
          ),
          
          Positioned(
            bottom: -100,
            right: -100,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kTurquoiseDark.withOpacity(0.12),
                    kTurquoiseDark.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ),
          
          // Main content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Animated logo container
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientEmerald,
                    borderRadius: BorderRadius.circular(AppRadius.xxl),
                    boxShadow: AppShadows.glow,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.xxl - 3),
                    child: Image.asset('assets/heiwa_logo.jpg', fit: BoxFit.cover),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Modern typography
                ShaderMask(
                  shaderCallback: (bounds) => AppColors.gradientEmerald.createShader(bounds),
                  child: const Text(
                    'WELLCARE',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.5,
                      color: Colors.white,
                    ),
                  ),
                ),
                
                const SizedBox(height: 6),
                
                Text(
                  'Health & Life',
                  style: TextStyle(
                    fontSize: 14,
                    color: kEmeraldLight,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                  ),
                ),
                
                const SizedBox(height: 36),
                
                // Modern progress indicator
                Container(
                  width: 160,
                  height: 4,
                  decoration: BoxDecoration(
                    color: kMint,
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    boxShadow: AppShadows.inner,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.0, end: 0.7),
                      duration: const Duration(milliseconds: 1200),
                      curve: Curves.easeInOut,
                      builder: (context, value, child) => LinearProgressIndicator(
                        value: value,
                        minHeight: 4,
                        backgroundColor: Colors.transparent,
                        valueColor: const AlwaysStoppedAnimation<Color>(kKelly),
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 12),
                
                Text(
                  'Loading your wellness journey...',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.inkFaint,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          
          // Bottom branding
          Positioned(
            left: 0,
            right: 0,
            bottom: 40,
            child: Column(
              children: [
                Text(
                  'WELLNESS CENTER SYSTEM',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.8,
                    color: AppColors.inkFaint.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'A little care, every day.',
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: kEmeraldLight.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
