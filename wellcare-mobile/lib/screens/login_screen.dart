import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../models/client_model.dart';
import 'client_portal_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _passwordFocus = FocusNode();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final res = await postApi(
        '/login',
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['success'] == true && data['role'] == 'client') {
        final clientData = Map<String, dynamic>.from(data['client']);
        clientData['token'] = data['token'];
        final client = ClientModel.fromJson(clientData);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('heiwa_session_client', jsonEncode(client.toJson()));

        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => ClientPortalScreen(client: client)),
        );
      } else {
        setState(() => _error = data['message'] ?? 'Invalid username or password.');
      }
    } catch (_) {
      setState(() => _error = 'Cannot connect to server. Check your network connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
              width: 280,
              height: 280,
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
              width: 260,
              height: 260,
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
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: IntrinsicHeight(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Modern header
                          Row(
                            children: [
                              Container(
                                width: 54,
                                height: 54,
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
                              const SizedBox(width: 14),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('WELLCARE', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: kTextPrimary, letterSpacing: 1.5)),
                                  Text('Wellness Center System', style: TextStyle(fontSize: 12, color: kEmeraldLight, fontWeight: FontWeight.w600, letterSpacing: 0.3)),
                                ],
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 36),
                          
                          // Modern welcome text
                          ShaderMask(
                            shaderCallback: (bounds) => AppColors.gradientEmerald.createShader(bounds),
                            child: const Text('Welcome back', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.8)),
                          ),
                          
                          const SizedBox(height: 8),
                          
                          const Text('Sign in to access your WellCare mobile portal', style: TextStyle(fontSize: 15, height: 1.5, color: kTextSecondary, fontWeight: FontWeight.w500)),
                          
                          const SizedBox(height: 32),
                          
                          // Modern login card
                          Container(
                            padding: const EdgeInsets.all(28),
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
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _fieldLabel('USERNAME'),
                                const SizedBox(height: 10),
                                _inputField(
                                  controller: _usernameCtrl,
                                  hint: 'Enter your username',
                                  icon: Icons.person_outline_rounded,
                                  textInputAction: TextInputAction.next,
                                  onSubmitted: (_) => _passwordFocus.requestFocus(),
                                ),
                                const SizedBox(height: 20),
                                _fieldLabel('PASSWORD'),
                                const SizedBox(height: 10),
                                _inputField(
                                  controller: _passwordCtrl,
                                  hint: 'Enter your password',
                                  icon: Icons.lock_outline_rounded,
                                  obscure: _obscure,
                                  focusNode: _passwordFocus,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) => _login(),
                                  suffix: IconButton(
                                    icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: kTextTertiary),
                                    onPressed: () => setState(() => _obscure = !_obscure),
                                  ),
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: Material(
                                    borderRadius: BorderRadius.circular(AppRadius.pill),
                                    child: InkWell(
                                      onTap: _showPasswordHelp,
                                      borderRadius: BorderRadius.circular(AppRadius.pill),
                                      child: Ink(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        child: Text('Forgot password?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kEmeraldLight)),
                                      ),
                                    ),
                                  ),
                                ),
                                if (_error != null) ...{
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                    decoration: BoxDecoration(
                                      color: AppColors.dangerTint,
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                      border: Border.all(color: AppColors.danger.withOpacity(0.3), width: 1.5),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 28,
                                          height: 28,
                                          decoration: BoxDecoration(
                                            color: AppColors.danger.withOpacity(0.1),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.error_outline_rounded, size: 16, color: AppColors.danger),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(child: Text(_error!, style: const TextStyle(fontSize: 13, color: AppColors.danger, fontWeight: FontWeight.w600, height: 1.4))),
                                      ],
                                    ),
                                  ),
                                },
                                const SizedBox(height: 24),
                                SizedBox(
                                  width: double.infinity,
                                  child: Material(
                                    borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                    child: InkWell(
                                      onTap: _loading ? null : _login,
                                      borderRadius: BorderRadius.circular(AppRadius.buttonLargeR),
                                      child: Ink(
                                        decoration: appButtonDecoration(
                                          gradient: AppColors.gradientEmerald,
                                          radius: AppRadius.buttonLargeR,
                                          elevated: !_loading,
                                        ),
                                        padding: const EdgeInsets.symmetric(vertical: 18),
                                        child: _loading
                                          ? const SizedBox(
                                              width: 24,
                                              height: 24,
                                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                          : const Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                Icon(Icons.login_rounded, size: 20, color: Colors.white),
                                                SizedBox(width: 10),
                                                Text('Sign In to Portal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                                              ],
                                            ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const Spacer(),
                          
                          const SizedBox(height: 28),
                          
                          // Modern footer
                          Center(
                            child: Column(
                              children: [
                                Text('WELLCARE WELLNESS CENTER · HEALTH & LIFE',
                                  style: TextStyle(fontSize: 10, letterSpacing: 1.2, color: kTextTertiary, fontWeight: FontWeight.w800),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 6),
                                Text('Secure access to your wellness journey',
                                  style: TextStyle(fontSize: 11, color: kEmeraldLight, fontWeight: FontWeight.w600),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showPasswordHelp() async {
    await showDialog<void>(
      context: context,
      builder: (_) => _PasswordResetDialog(
        username: _usernameCtrl.text.trim(),
        onPasswordUpdated: () {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password updated. You can now sign in.'),
              backgroundColor: kEmerald,
            ),
          );
        },
      ),
    );
  }

  Widget _fieldLabel(String label) => Text(label,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: kTextPrimary, letterSpacing: 1.3));

  Widget _inputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    FocusNode? focusNode,
    TextInputAction? textInputAction,
    ValueChanged<String>? onSubmitted,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      focusNode: focusNode,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      style: const TextStyle(fontSize: 16, color: kTextPrimary, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: kTextTertiary, fontSize: 15, fontWeight: FontWeight.w500),
        prefixIcon: Icon(icon, size: 20, color: kEmeraldLight),
        suffixIcon: suffix,
        filled: true,
        fillColor: kDarkSurfaceAlt,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }
}

/// Owns its controllers for the full lifetime of the dialog route's subtree.
class _PasswordResetDialog extends StatefulWidget {
  const _PasswordResetDialog({
    required this.username,
    required this.onPasswordUpdated,
  });

  final String username;
  final VoidCallback onPasswordUpdated;

  @override
  State<_PasswordResetDialog> createState() => _PasswordResetDialogState();
}

class _PasswordResetDialogState extends State<_PasswordResetDialog> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  String _resetKey = '';
  bool _busy = false;
  String? _message;
  bool _isSuccess = false;
  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  void _setMessage(String message, {bool success = false}) {
    setState(() {
      _message = message;
      _isSuccess = success;
    });
  }

  Future<void> _submit() async {
    if (_busy) return;

    if (_resetKey.isEmpty) {
      if (widget.username.isEmpty) {
        _setMessage('Enter your username on the login screen first.');
        return;
      }
      if (_passwordCtrl.text.length < 6 ||
          _passwordCtrl.text != _confirmCtrl.text) {
        _setMessage(_passwordCtrl.text.length < 6
            ? 'Password must be at least 6 characters.'
            : 'Passwords do not match.');
        return;
      }

      setState(() {
        _busy = true;
        _message = null;
      });
      try {
        final response = await postApi(
          '/password-reset/request',
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'username': widget.username,
            'email': _emailCtrl.text.trim(),
            'newPassword': _passwordCtrl.text,
            'confirmPassword': _confirmCtrl.text,
          }),
          timeout: const Duration(seconds: 25),
        );
        final result = jsonDecode(response.body);
        if (response.statusCode != 200) {
          throw Exception(result['message'] ?? 'Could not send OTP.');
        }
        if (!mounted) return;
        setState(() {
          _resetKey = result['resetKey'];
        });
        _setMessage('OTP sent. It expires in 3 minutes.', success: true);
      } catch (error) {
        if (!mounted) return;
        _setMessage(_errorText(error));
      } finally {
        if (mounted) setState(() => _busy = false);
      }
      return;
    }

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final response = await postApi(
        '/password-reset/verify',
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'resetKey': _resetKey,
          'otp': _otpCtrl.text.trim(),
        }),
      );
      final result = jsonDecode(response.body);
      if (response.statusCode != 200) {
        throw Exception(result['message'] ?? 'Could not verify OTP.');
      }
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onPasswordUpdated();
    } catch (error) {
      if (!mounted) return;
      _setMessage(_errorText(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _errorText(Object error) =>
      error.toString().replaceFirst('Exception: ', '');

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 6),
      contentPadding: const EdgeInsets.fromLTRB(22, 12, 22, 10),
      backgroundColor: kDarkSurface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: BorderSide(color: kAmber.withOpacity(0.3), width: 1.2),
      ),
      title: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: kAmber.withOpacity(0.18),
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: kAmber.withOpacity(0.35), width: 1.2),
            ),
            child: const Icon(Icons.lock_reset_rounded, color: kAmber, size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Reset your password',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kCream),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_resetKey.isEmpty) ...{
              Text(
                'We will send an OTP to the email saved for '
                '${widget.username.isEmpty ? 'your account' : widget.username}.',
                style: const TextStyle(
                    fontSize: 13, height: 1.45, color: kTextSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: kTextPrimary, fontSize: 14),
                decoration: InputDecoration(
                  labelText: 'Account Recovery Email',
                  labelStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                  hintText: 'Enter your registered email',
                  hintStyle: TextStyle(color: kTextTertiary.withOpacity(0.6), fontSize: 12),
                  filled: true,
                  fillColor: kDarkSurfaceAlt,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  prefixIcon: const Icon(Icons.email_outlined, size: 19, color: kAmber),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: kAmber, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              // ── Dedicated New Password & Confirm Password Container ──────────
              Container(
                decoration: BoxDecoration(
                  color: kDarkBg,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: kAmber.withOpacity(0.35),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.25),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: kAmber.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(Icons.vpn_key_rounded, size: 14, color: kAmber),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'NEW CREDENTIALS',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                            color: kAmber,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passwordCtrl,
                      obscureText: _obscureNewPass,
                      style: const TextStyle(color: kTextPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'New password',
                        labelStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                        hintText: '6+ characters',
                        hintStyle: TextStyle(color: kTextTertiary.withOpacity(0.55), fontSize: 12),
                        filled: true,
                        fillColor: kDarkSurfaceAlt,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 18, color: kAmber),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureNewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 18,
                            color: kTextTertiary,
                          ),
                          onPressed: () => setState(() => _obscureNewPass = !_obscureNewPass),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: kAmber, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _confirmCtrl,
                      obscureText: _obscureConfirmPass,
                      style: const TextStyle(color: kTextPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Confirm new password',
                        labelStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                        hintText: 'Re-enter new password',
                        hintStyle: TextStyle(color: kTextTertiary.withOpacity(0.55), fontSize: 12),
                        filled: true,
                        fillColor: kDarkSurfaceAlt,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        prefixIcon: const Icon(Icons.check_circle_outline_rounded, size: 18, color: kAmber),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirmPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 18,
                            color: kTextTertiary,
                          ),
                          onPressed: () => setState(() => _obscureConfirmPass = !_obscureConfirmPass),
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: kAmber, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            } else ...{
              const Text('Enter the OTP sent to your email. It expires in 3 minutes.',
                  style: TextStyle(fontSize: 13, height: 1.45, color: kTextSecondary)),
              const SizedBox(height: 16),
              TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 8, color: kCream),
                decoration: InputDecoration(
                  labelText: 'Email OTP Code',
                  labelStyle: const TextStyle(color: kTextTertiary),
                  counterText: '',
                  filled: true,
                  fillColor: kDarkSurfaceAlt,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: kAmber.withOpacity(0.3)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: kAmber, width: 1.5),
                  ),
                ),
              ),
            },
            if (_message != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 14),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: _isSuccess ? kAmber.withOpacity(0.15) : AppColors.dangerTint,
                  borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                  border: Border.all(
                      color: (_isSuccess ? kAmber : AppColors.danger)
                          .withOpacity(0.35)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _isSuccess ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded,
                      size: 17,
                      color: _isSuccess ? kAmber : AppColors.danger,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _message!,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.35,
                          fontWeight: FontWeight.w600,
                          color: _isSuccess ? kCream : AppColors.danger,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(foregroundColor: kTextTertiary),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _busy ? null : _submit,
          style: FilledButton.styleFrom(
            backgroundColor: kAmber,
            foregroundColor: const Color(0xFF0B1F1A),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.sm)),
          ),
          child: Text(
            _busy
                ? 'Please wait...'
                : _resetKey.isEmpty
                    ? 'Save and send OTP'
                    : 'Verify and save',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
