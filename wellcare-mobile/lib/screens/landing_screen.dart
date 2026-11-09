import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme.dart';
import 'login_screen.dart';

class LandingScreen extends StatefulWidget {
  final String? logoutMessage;
  const LandingScreen({super.key, this.logoutMessage});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.logoutMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: kAmber.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_rounded, color: kAmber, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.logoutMessage!,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: kCream,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ],
            ),
            backgroundColor: kDarkSurface,
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              side: BorderSide(color: kAmber.withOpacity(0.35), width: 1.2),
            ),
            elevation: 8,
            duration: const Duration(seconds: 4),
          ),
        );
      });
    }
  }

  void _navigateToLogin() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  Future<void> _openFacebook() async {
    final url =
        Uri.parse('https://web.facebook.com/profile.php?id=61586535096801');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication) &&
        mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open Facebook.')),
      );
    }
  }

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
          
          // Modern branding
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Wellcare',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: kTextPrimary,
                        height: 1.1,
                        letterSpacing: -0.5)),
                Text('Wellness Center System',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: kEmeraldLight,
                        letterSpacing: 0.3)),
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
                child: const Text('Login',
                    style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: Colors.white,
                        letterSpacing: 0.5)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Modern feature pill with gradient and shadow
  Widget _trustPill(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: kDarkSurface,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: Color(0xFF1B5E5B), width: 1.2),
        boxShadow: AppShadows.card,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: kEmeraldLight.withOpacity(0.2),
              borderRadius: BorderRadius.circular(AppRadius.xs),
            ),
            child: Icon(icon, size: 14, color: kEmeraldLight),
          ),
          const SizedBox(width: 8),
          Text(label,
              style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, color: kTextPrimary)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kDarkBg,
      body: Stack(
        children: [
          // Dark green background
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                color: kDarkBg,
              ),
            ),
          ),
          
          // Decorative elements
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kEmeraldLight.withOpacity(0.08),
                    kEmeraldLight.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ),
          
          Positioned(
            bottom: -120,
            left: -120,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kEmerald.withOpacity(0.06),
                    kEmerald.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 500),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
                          decoration: BoxDecoration(
                            color: kDarkSurface,
                            borderRadius: BorderRadius.circular(AppRadius.xxxl),
                            border: Border.all(color: const Color(0xFF1B5E5B), width: 1),
                            boxShadow: [
                              BoxShadow(
                                color: kEmerald.withOpacity(0.08),
                                blurRadius: 40,
                                offset: const Offset(0, 16),
                                spreadRadius: -8,
                              ),
                              BoxShadow(
                                color: kEmerald.withOpacity(0.04),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                                spreadRadius: -4,
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Modern logo container
                              Container(
                                width: 96,
                                height: 96,
                                decoration: BoxDecoration(
                                  gradient: AppColors.gradientEmerald,
                                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                                  boxShadow: AppShadows.glow,
                                  border: Border.all(color: Colors.white, width: 3),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(AppRadius.xxl - 3),
                                  child: Image.asset('assets/heiwa_logo.jpg',
                                      fit: BoxFit.cover),
                                ),
                              ),
                              
                              const SizedBox(height: 28),
                              
                              // Modern badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  gradient: AppColors.gradientTeal,
                                  borderRadius: BorderRadius.circular(AppRadius.pill),
                                  boxShadow: AppShadows.medium,
                                ),
                                child: const Text('YOUR WELLNESS WORKSPACE',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 1.2,
                                        color: Colors.white)),
                              ),
                              
                              const SizedBox(height: 28),
                              
                              // Modern typography with gradient
                              ShaderMask(
                                shaderCallback: (bounds) => AppColors.gradientEmerald.createShader(bounds),
                                child: const Text(
                                  'A little care,\nevery day.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      fontSize: 44,
                                      height: 1.05,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: -1.2,
                                      color: Colors.white),
                                ),
                              ),
                              
                              const SizedBox(height: 20),
                              
                              const Text(
                                'Track your alkaline therapy, check-ins and\nwellness visits — all in one place.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 16,
                                    height: 1.5,
                                    color: kTextSecondary,
                                    fontWeight: FontWeight.w500),
                              ),
                              
                              const SizedBox(height: 32),
                              
                              // Modern feature pills
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 10,
                                runSpacing: 10,
                                children: [
                                  _trustPill(Icons.water_drop_rounded, 'Alkaline therapy'),
                                  _trustPill(Icons.how_to_reg_rounded, 'Check-ins'),
                                  _trustPill(Icons.insights_rounded, 'Reports'),
                                  _trustPill(Icons.health_and_safety_rounded, 'Wellness'),
                                ],
                              ),
                              
                              const SizedBox(height: 36),
                              
                              // Modern primary button
                              SizedBox(
                                width: double.infinity,
                                child: Material(
                                  borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                  child: InkWell(
                                    onTap: _navigateToLogin,
                                    borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                    child: Ink(
                                      decoration: appButtonDecoration(
                                        gradient: AppColors.gradientEmerald,
                                        radius: AppRadius.buttonLargeR,
                                      ),
                                      padding: const EdgeInsets.symmetric(vertical: 18),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.arrow_forward_rounded,
                                              size: 22, color: Colors.white),
                                          const SizedBox(width: 10),
                                          const Text('Sign in to your portal',
                                              style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w800,
                                                  color: Colors.white)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Modern secondary button
                              SizedBox(
                                width: double.infinity,
                                child: Material(
                                  borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                  child: InkWell(
                                    onTap: _openFacebook,
                                    borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                    child: Ink(
                                      decoration: BoxDecoration(
                                        color: kDarkSurfaceAlt,
                                        borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                        border: Border.all(color: Color(0xFF1B5E5B), width: 1.5),
                                        boxShadow: AppShadows.card,
                                      ),
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.chat_bubble_outline_rounded,
                                              size: 20, color: kEmeraldLight),
                                          const SizedBox(width: 10),
                                          Text('Contact us on Facebook',
                                              style: TextStyle(
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w700,
                                                  color: kEmeraldLight)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Modern footer
                Padding(
                  padding: const EdgeInsets.only(bottom: 24, top: 16),
                  child: Column(
                    children: [
                      Text('WELLCARE WELLNESS CENTER · HEALTH & LIFE',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.4,
                              color: kTextTertiary.withOpacity(0.9))),
                      const SizedBox(height: 6),
                      Text('Your journey to better health starts here',
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: kEmeraldLight.withOpacity(0.8))),
                    ],
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
