import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  // Tech-Forward & Natural Palette
  static const Color _bgCream = Color(0xFFF8F6F1);
  static const Color _forestGreen = Color(0xFF12372A);
  static const Color _mutedGreen = Color(0xFF2F4F42);
  static const Color _sageBorder = Color(0xFF839B8B);
  static const Color _warmAmber = Color(0xFFD58C22);
  static const Color _pillAmber = Color(0xFFD99228);

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
                    color: _warmAmber.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: _warmAmber,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.logoutMessage!,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _bgCream,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ],
            ),
            backgroundColor: _forestGreen,
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              side: BorderSide(
                color: _warmAmber.withValues(alpha: 0.45),
                width: 1.2,
              ),
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

  void _showFeaturesSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: _bgCream,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: EdgeInsets.fromLTRB(
          24,
          14,
          24,
          MediaQuery.of(ctx).padding.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4.5,
                decoration: BoxDecoration(
                  color: _sageBorder.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                const _WellCareLeafLogo(size: 32),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WELLCARE FEATURES',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: _forestGreen,
                          letterSpacing: 0.6,
                        ),
                      ),
                      Text(
                        'Smart biometric & natural wellness tools',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _mutedGreen,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close_rounded, color: _forestGreen),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _featureRow(
              Icons.fingerprint_rounded,
              'Biometric Attendance',
              'Fast, accurate fingerprint check-ins and automated absence tracking.',
            ),
            const SizedBox(height: 12),
            _featureRow(
              Icons.water_drop_rounded,
              'Alkaline Water Therapy',
              'Track every 1L alkaline bottle dispensed and view your hydration progress.',
            ),
            const SizedBox(height: 12),
            _featureRow(
              Icons.calendar_month_rounded,
              'Wellness Logs & Filters',
              'Search your check-ins, alkaline sessions, and absences by date.',
            ),
            const SizedBox(height: 12),
            _featureRow(
              Icons.forum_rounded,
              'Direct Wellness Messaging',
              'Chat with clinic staff anytime with quick FAQ suggestions.',
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _openFacebook();
                    },
                    icon: const Icon(Icons.chat_bubble_outline_rounded,
                        size: 17, color: _forestGreen),
                    label: const Text(
                      'Facebook',
                      style: TextStyle(
                        color: _forestGreen,
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      side: const BorderSide(color: _sageBorder, width: 1.4),
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 48),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _navigateToLogin();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _forestGreen,
                      foregroundColor: _bgCream,
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 48),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Get Started',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: _bgCream,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded,
                            size: 17, color: _warmAmber),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _featureRow(IconData icon, String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _sageBorder.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _forestGreen.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: _warmAmber, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: _forestGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    color: _mutedGreen.withValues(alpha: 0.85),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const _WellCareLeafLogo(size: 46),
        const SizedBox(width: 11),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'WELLCARE',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: _forestGreen,
                letterSpacing: 0.8,
                height: 1.05,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3.5),
              decoration: BoxDecoration(
                color: _pillAmber,
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'SMART WELLNESS SYSTEM',
                style: TextStyle(
                  fontSize: 9.2,
                  fontWeight: FontWeight.w800,
                  color: _forestGreen,
                  letterSpacing: 0.65,
                  height: 1.05,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeroVisualCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _forestGreen.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 12),
            spreadRadius: -6,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: AspectRatio(
          aspectRatio: 1.24,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/onboarding_biometric.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Image.asset(
                  'assets/card_records.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: _forestGreen,
                    child: const Center(
                      child: Icon(
                        Icons.fingerprint_rounded,
                        size: 72,
                        color: _warmAmber,
                      ),
                    ),
                  ),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      _forestGreen.withValues(alpha: 0.10),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        // Left: Pill-shaped forest green button with amber circle + white arrow
        Expanded(
          child: Material(
            color: _forestGreen,
            borderRadius: BorderRadius.circular(999),
            elevation: 4,
            shadowColor: _forestGreen.withValues(alpha: 0.28),
            child: InkWell(
              onTap: _navigateToLogin,
              borderRadius: BorderRadius.circular(999),
              child: Container(
                height: 52,
                padding: const EdgeInsets.only(left: 18, right: 7),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        'Get Started',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: _bgCream,
                          letterSpacing: 0.1,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        color: _warmAmber,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 19,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Right: Transparent outlined button with sage green border
        Expanded(
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(999),
            child: InkWell(
              onTap: _showFeaturesSheet,
              borderRadius: BorderRadius.circular(999),
              child: Container(
                height: 52,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: _sageBorder, width: 1.5),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'Explore Features',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: _forestGreen,
                    letterSpacing: 0.1,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
        systemNavigationBarColor: _bgCream,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: _bgCream,
        body: Stack(
          children: [
            // Soft natural warm cream backdrop with delicate organic shadows
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFFFAF8F3),
                      Color(0xFFF6F3EB),
                      Color(0xFFF3EFE5),
                    ],
                  ),
                ),
              ),
            ),
            // Delicate top-right soft leaf-shadow glow
            Positioned(
              top: -70,
              right: -70,
              child: IgnorePointer(
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _sageBorder.withValues(alpha: 0.14),
                        _sageBorder.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // Delicate bottom-left warm amber/leaf shadow glow
            Positioned(
              bottom: -80,
              left: -80,
              child: IgnorePointer(
                child: Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _warmAmber.withValues(alpha: 0.08),
                        _warmAmber.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Main onboarding content
            SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 22, 24, 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. Brand & Header
                        _buildBrandHeader(),
                        const SizedBox(height: 28),

                        // 2. Hero Typography
                        const Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: 'BIOMETRIC\nPRECISION.\n',
                                style: TextStyle(
                                  fontSize: 33,
                                  height: 1.06,
                                  fontWeight: FontWeight.w900,
                                  color: _forestGreen,
                                  letterSpacing: -0.6,
                                ),
                              ),
                              TextSpan(
                                text: 'NATURAL CARE.',
                                style: TextStyle(
                                  fontSize: 33,
                                  height: 1.08,
                                  fontWeight: FontWeight.w900,
                                  color: _warmAmber,
                                  letterSpacing: -0.6,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Seamless biometric attendance and client record management, beautifully integrated into your daily wellness workflow.',
                          style: TextStyle(
                            fontSize: 13.8,
                            height: 1.48,
                            color: _mutedGreen.withValues(alpha: 0.92),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // 3. Hero Visual Card
                        _buildHeroVisualCard(),
                        const SizedBox(height: 28),

                        // 4. Action Buttons
                        _buildActionButtons(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom stylized dual-tone leaf emblem (warm amber + sage green with deep forest veins)
class _WellCareLeafLogo extends StatelessWidget {
  final double size;
  const _WellCareLeafLogo({this.size = 44});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _WellCareLeafPainter(),
      ),
    );
  }
}

class _WellCareLeafPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;

    // Left half of leaf (warm amber)
    final leftPath = Path()
      ..moveTo(cx, h * 0.06)
      ..cubicTo(w * 0.14, h * 0.28, w * 0.10, h * 0.68, cx, h * 0.94)
      ..close();

    // Right half of leaf (sage / forest green)
    final rightPath = Path()
      ..moveTo(cx, h * 0.06)
      ..cubicTo(w * 0.86, h * 0.28, w * 0.90, h * 0.68, cx, h * 0.94)
      ..close();

    // Full leaf outline path
    final fullLeaf = Path()
      ..moveTo(cx, h * 0.06)
      ..cubicTo(w * 0.14, h * 0.28, w * 0.10, h * 0.68, cx, h * 0.94)
      ..cubicTo(w * 0.90, h * 0.68, w * 0.86, h * 0.28, cx, h * 0.06)
      ..close();

    final leftPaint = Paint()
      ..color = const Color(0xFFD89228)
      ..style = PaintingStyle.fill;

    final rightPaint = Paint()
      ..color = const Color(0xFF4B7A5E)
      ..style = PaintingStyle.fill;

    canvas.drawPath(leftPath, leftPaint);
    canvas.drawPath(rightPath, rightPaint);

    // Veins + outline in deep forest green
    final strokePaint = Paint()
      ..color = const Color(0xFF12372A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.052
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(fullLeaf, strokePaint);

    // Center stem vein
    canvas.drawLine(
      Offset(cx, h * 0.10),
      Offset(cx, h * 0.93),
      strokePaint,
    );

    // Side veins (3 pairs)
    final veinPaint = Paint()
      ..color = const Color(0xFF12372A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.042
      ..strokeCap = StrokeCap.round;

    // Upper pair
    canvas.drawLine(Offset(cx, h * 0.36), Offset(w * 0.30, h * 0.26), veinPaint);
    canvas.drawLine(Offset(cx, h * 0.36), Offset(w * 0.70, h * 0.26), veinPaint);
    // Middle pair
    canvas.drawLine(Offset(cx, h * 0.56), Offset(w * 0.22, h * 0.44), veinPaint);
    canvas.drawLine(Offset(cx, h * 0.56), Offset(w * 0.78, h * 0.44), veinPaint);
    // Lower pair
    canvas.drawLine(Offset(cx, h * 0.75), Offset(w * 0.28, h * 0.64), veinPaint);
    canvas.drawLine(Offset(cx, h * 0.75), Offset(w * 0.72, h * 0.64), veinPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
