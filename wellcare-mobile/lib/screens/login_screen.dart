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
  // Tech-Forward & Natural Palette (60% Warm Cream · 30% Deep Forest Green · 10% Warm Amber)
  static const Color _bgCream = Color(0xFFF8F6F1);
  static const Color _forestGreen = Color(0xFF12372A);
  static const Color _mutedGreen = Color(0xFF2F4F42);
  static const Color _sageBorder = Color(0xFF839B8B);
  static const Color _warmAmber = Color(0xFFD58C22);
  static const Color _pillAmber = Color(0xFFD99228);

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

      if (res.statusCode == 200 && data['success'] == true) {
        if (data['role'] == 'client') {
          final clientData = Map<String, dynamic>.from(data['client']);
          clientData['token'] = data['token'];

          // Detect if logging in with the default birthdate password (YYYYMMDD)
          final rawBdate = (clientData['birthdate'] ?? '').toString().split('T').first.replaceAll('-', '').trim();
          final isUsingDefaultPassword = rawBdate.isNotEmpty && password == rawBdate;
          if (isUsingDefaultPassword || clientData['must_change_password'] == true) {
            clientData['must_change_password'] = true;
            clientData['mustChangePassword'] = true;
          }

          final client = ClientModel.fromJson(clientData);

          final prefs = await SharedPreferences.getInstance();
          if (client.mustChangePassword) {
            await prefs.remove('heiwa_pwd_prompt_changed_${client.id}');
          }
          await prefs.setString('heiwa_session_client', jsonEncode(client.toJson()));

          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => ClientPortalScreen(client: client)),
          );
        } else {
          setState(() => _error = 'This mobile app is for clients only. Staff and Admins please use the Web Portal.');
        }
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
            // 60% Warm Cream soft natural background
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

            // Delicate top-right soft sage glow
            Positioned(
              top: -80,
              right: -80,
              child: IgnorePointer(
                child: Container(
                  width: 240,
                  height: 240,
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

            // Delicate bottom-left warm amber glow
            Positioned(
              bottom: -90,
              left: -90,
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

            SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: IntrinsicHeight(
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 460),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Header row with Back button & WELLCARE branding
                                Row(
                                  children: [
                                    if (Navigator.canPop(context)) ...[
                                      Material(
                                        color: Colors.white.withValues(alpha: 0.85),
                                        shape: CircleBorder(
                                          side: BorderSide(
                                            color: _sageBorder.withValues(alpha: 0.4),
                                            width: 1.2,
                                          ),
                                        ),
                                        child: InkWell(
                                          onTap: () => Navigator.pop(context),
                                          customBorder: const CircleBorder(),
                                          child: const Padding(
                                            padding: EdgeInsets.all(9),
                                            child: Icon(
                                              Icons.arrow_back_rounded,
                                              size: 19,
                                              color: _forestGreen,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    Container(
                                      width: 46,
                                      height: 46,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: _forestGreen.withValues(alpha: 0.2),
                                          width: 1.5,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: _forestGreen.withValues(alpha: 0.1),
                                            blurRadius: 10,
                                            offset: const Offset(0, 3),
                                          ),
                                        ],
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(12.5),
                                        child: Image.asset('assets/heiwa_logo.jpg', fit: BoxFit.cover),
                                      ),
                                    ),
                                    const SizedBox(width: 11),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text(
                                          'WELLCARE',
                                          style: TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w900,
                                            color: _forestGreen,
                                            letterSpacing: 0.8,
                                            height: 1.05,
                                          ),
                                        ),
                                        const SizedBox(height: 3.5),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: _pillAmber,
                                            borderRadius: BorderRadius.circular(999),
                                          ),
                                          child: const Text(
                                            'SMART WELLNESS SYSTEM',
                                            style: TextStyle(
                                              fontSize: 8.8,
                                              fontWeight: FontWeight.w800,
                                              color: _forestGreen,
                                              letterSpacing: 0.6,
                                              height: 1.05,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 34),

                                // Welcome back typography (30% Forest Green + 10% Amber accent)
                                const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Welcome back',
                                      style: TextStyle(
                                        fontSize: 33,
                                        fontWeight: FontWeight.w900,
                                        color: _forestGreen,
                                        letterSpacing: -0.7,
                                      ),
                                    ),
                                    SizedBox(height: 6),
                                    SizedBox(
                                      width: 42,
                                      height: 3.5,
                                      child: DecoratedBox(
                                        decoration: BoxDecoration(
                                          color: _warmAmber,
                                          borderRadius: BorderRadius.all(Radius.circular(99)),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 12),

                                Text(
                                  'Sign in to access your WellCare mobile portal',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    height: 1.48,
                                    color: _mutedGreen.withValues(alpha: 0.88),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),

                                const SizedBox(height: 28),

                                // Clean Cream/White Login Card
                                Container(
                                  padding: const EdgeInsets.all(24),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.88),
                                    borderRadius: BorderRadius.circular(26),
                                    border: Border.all(
                                      color: _sageBorder.withValues(alpha: 0.35),
                                      width: 1.2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: _forestGreen.withValues(alpha: 0.08),
                                        blurRadius: 28,
                                        offset: const Offset(0, 12),
                                        spreadRadius: -6,
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      _fieldLabel('USERNAME'),
                                      const SizedBox(height: 8),
                                      _inputField(
                                        controller: _usernameCtrl,
                                        hint: 'Enter your username',
                                        icon: Icons.person_outline_rounded,
                                        textInputAction: TextInputAction.next,
                                        onSubmitted: (_) => _passwordFocus.requestFocus(),
                                      ),
                                      const SizedBox(height: 18),
                                      _fieldLabel('PASSWORD'),
                                      const SizedBox(height: 8),
                                      _inputField(
                                        controller: _passwordCtrl,
                                        hint: 'Enter your password',
                                        icon: Icons.lock_outline_rounded,
                                        obscure: _obscure,
                                        focusNode: _passwordFocus,
                                        textInputAction: TextInputAction.done,
                                        onSubmitted: (_) => _login(),
                                        suffix: IconButton(
                                          icon: Icon(
                                            _obscure
                                                ? Icons.visibility_off_outlined
                                                : Icons.visibility_outlined,
                                            size: 20,
                                            color: _mutedGreen.withValues(alpha: 0.7),
                                          ),
                                          onPressed: () => setState(() => _obscure = !_obscure),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Align(
                                        alignment: Alignment.centerRight,
                                        child: Material(
                                          borderRadius: BorderRadius.circular(AppRadius.pill),
                                          color: Colors.transparent,
                                          child: InkWell(
                                            onTap: _showPasswordHelp,
                                            borderRadius: BorderRadius.circular(AppRadius.pill),
                                            child: const Padding(
                                              padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                              child: Text(
                                                'Forgot password?',
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: _warmAmber,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      if (_error != null) ...[
                                        const SizedBox(height: 14),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                          decoration: BoxDecoration(
                                            color: AppColors.dangerTint,
                                            borderRadius: BorderRadius.circular(AppRadius.sm),
                                            border: Border.all(
                                              color: AppColors.danger.withValues(alpha: 0.3),
                                              width: 1.3,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 26,
                                                height: 26,
                                                decoration: BoxDecoration(
                                                  color: AppColors.danger.withValues(alpha: 0.12),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Icon(
                                                  Icons.error_outline_rounded,
                                                  size: 16,
                                                  color: AppColors.danger,
                                                ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Text(
                                                  _error!,
                                                  style: const TextStyle(
                                                    fontSize: 12.8,
                                                    color: AppColors.danger,
                                                    fontWeight: FontWeight.w600,
                                                    height: 1.38,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 22),
                                      // Primary Forest Green Pill Button with Amber Circle Arrow (matches LandingScreen)
                                      SizedBox(
                                        width: double.infinity,
                                        child: Material(
                                          color: _forestGreen,
                                          borderRadius: BorderRadius.circular(999),
                                          elevation: 4,
                                          shadowColor: _forestGreen.withValues(alpha: 0.28),
                                          child: InkWell(
                                            onTap: _loading ? null : _login,
                                            borderRadius: BorderRadius.circular(999),
                                            child: Container(
                                              height: 54,
                                              padding: const EdgeInsets.only(left: 22, right: 8),
                                              child: _loading
                                                  ? const Center(
                                                      child: SizedBox(
                                                        width: 22,
                                                        height: 22,
                                                        child: CircularProgressIndicator(
                                                          color: _bgCream,
                                                          strokeWidth: 2.5,
                                                        ),
                                                      ),
                                                    )
                                                  : Row(
                                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                      children: [
                                                        const SizedBox(width: 38),
                                                        const Text(
                                                          'Sign In to Portal',
                                                          style: TextStyle(
                                                            fontSize: 15.5,
                                                            fontWeight: FontWeight.w800,
                                                            color: _bgCream,
                                                            letterSpacing: 0.2,
                                                          ),
                                                        ),
                                                        Container(
                                                          width: 38,
                                                          height: 38,
                                                          decoration: const BoxDecoration(
                                                            color: _warmAmber,
                                                            shape: BoxShape.circle,
                                                          ),
                                                          child: const Icon(
                                                            Icons.arrow_forward_rounded,
                                                            size: 20,
                                                            color: Colors.white,
                                                          ),
                                                        ),
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

                                // Footer
                                Center(
                                  child: Column(
                                    children: [
                                      Text(
                                        'WELLCARE WELLNESS CENTER · HEALTH & LIFE',
                                        style: TextStyle(
                                          fontSize: 10,
                                          letterSpacing: 1.2,
                                          color: _mutedGreen.withValues(alpha: 0.65),
                                          fontWeight: FontWeight.w800,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        'Secure access to your wellness journey',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          color: _forestGreen.withValues(alpha: 0.78),
                                          fontWeight: FontWeight.w600,
                                        ),
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
              ),
            ),
          ],
        ),
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
              backgroundColor: _forestGreen,
            ),
          );
        },
      ),
    );
  }

  Widget _fieldLabel(String label) => Text(
        label,
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          color: _forestGreen,
          letterSpacing: 1.2,
        ),
      );

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
      cursorColor: _forestGreen,
      style: const TextStyle(
        fontSize: 15.5,
        color: _forestGreen,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(
          color: _mutedGreen.withValues(alpha: 0.5),
          fontSize: 14.5,
          fontWeight: FontWeight.w500,
        ),
        prefixIcon: Icon(icon, size: 20, color: _warmAmber),
        suffixIcon: suffix,
        filled: true,
        fillColor: _bgCream,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
            color: _sageBorder.withValues(alpha: 0.45),
            width: 1.2,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _warmAmber, width: 1.8),
        ),
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

  // Admin Assisted controllers
  final _adminIdCtrl = TextEditingController();
  final _adminContactCtrl = TextEditingController();
  final _adminNewPassCtrl = TextEditingController();
  final _adminConfirmPassCtrl = TextEditingController();

  int _selectedTab = 0; // 0 = Email OTP, 1 = Admin Assistance
  String _resetKey = '';
  bool _busy = false;
  String? _message;
  bool _isSuccess = false;
  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;
  bool _obscureAdminNewPass = true;
  bool _obscureAdminConfirmPass = true;

  // Admin recovery flow steps: 0 = Request, 1 = Waiting for Admin, 2 = Create New Password
  int _adminStep = 0;
  int? _adminRequestId;
  String? _adminResetToken;
  String? _adminVerifiedName;

  @override
  void initState() {
    super.initState();
    if (widget.username.isNotEmpty) {
      _adminIdCtrl.text = widget.username;
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    _otpCtrl.dispose();
    _adminIdCtrl.dispose();
    _adminContactCtrl.dispose();
    _adminNewPassCtrl.dispose();
    _adminConfirmPassCtrl.dispose();
    super.dispose();
  }

  void _setMessage(String message, {bool success = false}) {
    setState(() {
      _message = message;
      _isSuccess = success;
    });
  }

  // ── Step 1: Submit Admin Reset Request ──
  Future<void> _submitAdminRequest() async {
    final identifier = _adminIdCtrl.text.trim();
    if (identifier.isEmpty) {
      _setMessage('Please enter your username or Client ID.');
      return;
    }

    setState(() {
      _busy = true;
      _message = null;
    });

    try {
      final response = await postApi(
        '/password-reset/admin-request',
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier,
          'contact_number': _adminContactCtrl.text.trim(),
        }),
        timeout: const Duration(seconds: 25),
      );

      final result = jsonDecode(response.body);
      if (response.statusCode != 200) {
        throw Exception(result['message'] ?? 'Failed to submit reset request.');
      }

      if (!mounted) return;
      setState(() {
        _adminRequestId = result['requestId'];
        _adminResetToken = result['resetToken'];
        _adminVerifiedName = result['full_name'] ?? result['username'];
        _adminStep = 1; // Transition to: Please wait for admin to verify
      });
      _setMessage('Request submitted! Please ask admin to verify your identity.', success: true);
    } catch (error) {
      if (!mounted) return;
      _setMessage(_errorText(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ── Step 2: Check Status / Poll if Admin Verified ──
  Future<void> _checkAdminStatus({bool showMessage = true}) async {
    if (_adminRequestId == null) return;

    setState(() {
      _busy = true;
      if (showMessage) _message = null;
    });

    try {
      final response = await getApi(
        '/password-reset/admin-request/status/$_adminRequestId?token=${_adminResetToken ?? ''}',
        timeout: const Duration(seconds: 15),
      );

      final result = jsonDecode(response.body);
      if (response.statusCode != 200) {
        throw Exception(result['message'] ?? 'Error checking status.');
      }

      if (!mounted) return;
      if (result['approved'] == true || result['status'] == 'approved') {
        setState(() {
          _adminStep = 2; // Transition to: Create New Password!
        });
        _setMessage('Identity verified by Admin! Please enter your new password.', success: true);
      } else if (result['status'] == 'cancelled') {
        setState(() {
          _adminStep = 0;
        });
        _setMessage('Request was declined or cancelled. Please try again.');
      } else {
        if (showMessage) {
          _setMessage('Still waiting for admin verification. Please check with center staff.');
        }
      }
    } catch (error) {
      if (!mounted) return;
      if (showMessage) _setMessage(_errorText(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ── Step 3: Complete Password Reset with New Password ──
  Future<void> _completeAdminPasswordReset() async {
    final newPass = _adminNewPassCtrl.text;
    final confirmPass = _adminConfirmPassCtrl.text;

    if (newPass.length < 6) {
      _setMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPass != confirmPass) {
      _setMessage('Passwords do not match.');
      return;
    }

    setState(() {
      _busy = true;
      _message = null;
    });

    try {
      final response = await postApi(
        '/password-reset/admin-request/complete',
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requestId': _adminRequestId,
          'resetToken': _adminResetToken,
          'newPassword': newPass,
          'confirmPassword': confirmPass,
        }),
        timeout: const Duration(seconds: 25),
      );

      final result = jsonDecode(response.body);
      if (response.statusCode != 200) {
        throw Exception(result['message'] ?? 'Failed to update password.');
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

  Future<void> _submit() async {
    if (_busy) return;

    if (_resetKey.isEmpty) {
      final email = _emailCtrl.text.trim();
      if (email.isEmpty) {
        _setMessage('Please enter your account recovery email.');
        return;
      }
      if (_passwordCtrl.text.length < 8) {
        _setMessage('Password must be at least 8 characters.');
        return;
      }
      if (_passwordCtrl.text != _confirmCtrl.text) {
        _setMessage('Passwords do not match.');
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
            'email': email,
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
            // ── Tab Switcher: Email OTP vs Admin Assistance ──
            if (_resetKey.isEmpty) ...[
              Container(
                decoration: BoxDecoration(
                  color: kDarkSurfaceAlt,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                padding: const EdgeInsets.all(3),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          if (_selectedTab != 0) {
                            setState(() {
                              _selectedTab = 0;
                              _message = null;
                            });
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedTab == 0 ? kAmber : Colors.transparent,
                            borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.email_outlined,
                                size: 15,
                                color: _selectedTab == 0 ? const Color(0xFF0B1F1A) : kTextSecondary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Email OTP',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: _selectedTab == 0 ? FontWeight.w800 : FontWeight.w600,
                                  color: _selectedTab == 0 ? const Color(0xFF0B1F1A) : kTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          if (_selectedTab != 1) {
                            setState(() {
                              _selectedTab = 1;
                              _message = null;
                            });
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedTab == 1 ? kAmber : Colors.transparent,
                            borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.support_agent_rounded,
                                size: 16,
                                color: _selectedTab == 1 ? const Color(0xFF0B1F1A) : kTextSecondary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Admin Assisted',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: _selectedTab == 1 ? FontWeight.w800 : FontWeight.w600,
                                  color: _selectedTab == 1 ? const Color(0xFF0B1F1A) : kTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (_resetKey.isEmpty && _selectedTab == 1) ...[
              // ── Admin-Assisted Recovery 3-Step Flow ──
              if (_adminStep == 0) ...[
                // STEP 1: Request Password Reset Form
                const Text(
                  'Submit your username or Client ID to request a password reset. Center staff or admin will verify your identity.',
                  style: TextStyle(fontSize: 12.5, height: 1.45, color: kTextSecondary),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _adminIdCtrl,
                  style: const TextStyle(color: kTextPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Username or Client ID',
                    labelStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                    hintText: 'e.g. maria or 104829',
                    hintStyle: TextStyle(color: kTextTertiary.withOpacity(0.55), fontSize: 12),
                    filled: true,
                    fillColor: kDarkSurfaceAlt,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                    prefixIcon: const Icon(Icons.person_outline_rounded, size: 19, color: kAmber),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kAmber, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _adminContactCtrl,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: kTextPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Registered Contact Number (Optional)',
                    labelStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                    hintText: '09XX XXX XXXX',
                    hintStyle: TextStyle(color: kTextTertiary.withOpacity(0.55), fontSize: 12),
                    filled: true,
                    fillColor: kDarkSurfaceAlt,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                    prefixIcon: const Icon(Icons.phone_outlined, size: 18, color: kAmber),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kAmber, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _submitAdminRequest,
                    style: FilledButton.styleFrom(
                      backgroundColor: kAmber,
                      foregroundColor: const Color(0xFF0B1F1A),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                    ),
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: Text(
                      _busy ? 'Submitting...' : 'Request Password Reset',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ),
                ),
              ] else if (_adminStep == 1) ...[
                // STEP 2: Please wait for admin to verify your identity
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: kDarkBg,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: kAmber.withOpacity(0.4), width: 1.2),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: kAmber.withOpacity(0.18),
                          shape: BoxShape.circle,
                          border: Border.all(color: kAmber.withOpacity(0.4), width: 1.5),
                        ),
                        child: const Icon(Icons.hourglass_top_rounded, color: kAmber, size: 26),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Please wait for admin to verify your identity',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: kCream,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Account: ${_adminVerifiedName ?? _adminIdCtrl.text.trim()}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: kAmber,
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Inform the center receptionist or admin that you requested a password reset. Once verified, this screen will let you create a new password.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: kTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _busy ? null : () => setState(() => _adminStep = 0),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: kTextTertiary,
                                side: BorderSide(color: Colors.white.withOpacity(0.15)),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.arrow_back, size: 14),
                              label: const Text('Back', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: FilledButton.icon(
                              onPressed: _busy ? null : () => _checkAdminStatus(showMessage: true),
                              style: FilledButton.styleFrom(
                                backgroundColor: kAmber,
                                foregroundColor: const Color(0xFF0B1F1A),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.refresh_rounded, size: 15),
                              label: Text(
                                _busy ? 'Checking...' : 'Check Status',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ] else if (_adminStep == 2) ...[
                // STEP 3: Create New Password
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.success.withOpacity(0.35)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Identity Verified! Create New Password for ${_adminVerifiedName ?? ''}:',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kCream),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _adminNewPassCtrl,
                  obscureText: _obscureAdminNewPass,
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
                        _obscureAdminNewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: kTextTertiary,
                      ),
                      onPressed: () => setState(() => _obscureAdminNewPass = !_obscureAdminNewPass),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kAmber, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _adminConfirmPassCtrl,
                  obscureText: _obscureAdminConfirmPass,
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
                        _obscureAdminConfirmPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: kTextTertiary,
                      ),
                      onPressed: () => setState(() => _obscureAdminConfirmPass = !_obscureAdminConfirmPass),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.white.withOpacity(0.08))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kAmber, width: 1.5)),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _completeAdminPasswordReset,
                    style: FilledButton.styleFrom(
                      backgroundColor: kAmber,
                      foregroundColor: const Color(0xFF0B1F1A),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                    ),
                    icon: const Icon(Icons.lock_reset_rounded, size: 16),
                    label: Text(
                      _busy ? 'Saving...' : 'Save and Create New Password',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ] else if (_resetKey.isEmpty && _selectedTab == 0) ...{
              const Text(
                'Enter your registered email address to receive a one-time verification code (OTP).',
                style: TextStyle(
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
          child: Text(_resetKey.isEmpty && _selectedTab == 1 ? 'Close' : 'Cancel'),
        ),
        if (_resetKey.isNotEmpty || _selectedTab == 0)
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

  static Widget _buildAdminStep({required String number, required String text}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 18,
          height: 18,
          margin: const EdgeInsets.only(top: 1.5, right: 8),
          decoration: BoxDecoration(
            color: kAmber.withOpacity(0.2),
            shape: BoxShape.circle,
            border: Border.all(color: kAmber.withOpacity(0.4), width: 1),
          ),
          alignment: Alignment.center,
          child: Text(
            number,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: kAmber,
            ),
          ),
        ),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 12,
              height: 1.35,
              color: kTextPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
