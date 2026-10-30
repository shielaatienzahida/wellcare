import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../models/client_model.dart';
import 'landing_screen.dart';
import 'home_screen.dart';
import 'wellness_screen.dart';

class ClientPortalScreen extends StatefulWidget {
  final ClientModel client;
  const ClientPortalScreen({super.key, required this.client});

  @override
  State<ClientPortalScreen> createState() => _ClientPortalScreenState();
}

class _ClientPortalScreenState extends State<ClientPortalScreen>
    with TickerProviderStateMixin {
  late ClientModel _client;
  int _navIndex = 0;
  Uint8List? _profilePhotoBytes;
  List<Map<String, dynamic>> _visitHistory = [];
  bool _historyLoading = true;
  bool _historyUnavailable = false;

  // Auto-refresh: polls every 15 s so staff-logged events appear automatically
  Timer? _pollTimer;

  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _client = widget.client;
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 260));
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
    _refreshData();
    _refreshVisitHistory();
    _loadProfilePhoto();
    // Start background polling — silently syncs every 10 seconds
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _silentPoll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _fadeCtrl.dispose();
    super.dispose();
  }

  /// Silently refreshes client data + visit history in the background.
  /// Does NOT show loading spinners so the UI stays smooth.
  Future<void> _silentPoll() async {
    try {
      // --- client data (alkaline sessions, check-ins, last seen, etc.) ---
      final res = await getApi(
        '/clients/me',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && mounted) {
          final updated = Map<String, dynamic>.from(data['client']);
          updated['token'] = _client.token;
          final updatedClient = ClientModel.fromJson(updated);
          // Always apply latest server data so nothing is missed
          setState(() => _client = updatedClient);
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('heiwa_session_client', jsonEncode(updatedClient.toJson()));
        }
      }
    } catch (_) { /* stay quiet on network errors */ }

    try {
      // --- visit history ---
      final response = await getApi(
        '/clients/me/history',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true && mounted) {
        final history = (data['history'] as List<dynamic>? ?? [])
            .map((r) => Map<String, dynamic>.from(r as Map))
            .toList();
        // Always apply latest history from server
        setState(() {
          _visitHistory = history;
          _historyUnavailable = false;
        });
      }
    } catch (_) { /* stay quiet on network errors */ }
  }

  Future<void> _refreshData() async {
    try {
      final res = await getApi(
        '/clients/me',
        headers: {'Authorization': 'Bearer ${_client.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final updated = Map<String, dynamic>.from(data['client']);
          updated['token'] = _client.token;
          if (mounted) setState(() => _client = ClientModel.fromJson(updated));
          // Persist updated session
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('heiwa_session_client', jsonEncode(ClientModel.fromJson(updated).toJson()));
        }
      }
    } catch (_) {
      // Keep showing cached data if offline
    }
  }

  Future<void> _logout(BuildContext context) async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: kDarkSurface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: BorderSide(color: kAmber.withOpacity(0.35), width: 1.2),
        ),
        titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 8),
        contentPadding: const EdgeInsets.fromLTRB(22, 10, 22, 8),
        title: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626).withOpacity(0.18),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: const Color(0xFFF87171).withOpacity(0.35), width: 1.2),
              ),
              child: const Icon(Icons.logout_rounded, color: Color(0xFFF87171), size: 22),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Log out?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kCream),
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of your WellCare account on this device?',
          style: TextStyle(fontSize: 13.5, height: 1.5, color: kTextSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            style: TextButton.styleFrom(
              foregroundColor: kTextTertiary,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
            ),
            icon: const Icon(Icons.logout_rounded, size: 16),
            label: const Text('Log out', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
    if (shouldLogout != true || !context.mounted) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('heiwa_session_client');
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (_) => const LandingScreen(
          logoutMessage: 'You have been successfully logged out.',
        ),
      ),
      (_) => false,
    );
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

  Future<void> _refreshPortal() async {
    await Future.wait([_refreshData(), _refreshVisitHistory()]);
  }

  String get _profilePhotoKey => 'wellcare_profile_photo_${_client.id}';

  Future<void> _loadProfilePhoto() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final base64Str = prefs.getString(_profilePhotoKey);
      if (base64Str != null && base64Str.isNotEmpty) {
        final bytes = base64Decode(base64Str);
        if (mounted) setState(() => _profilePhotoBytes = bytes);
        return;
      }
      final path = prefs.getString('${_profilePhotoKey}_path');
      if (path != null) {
        final photo = File(path);
        if (await photo.exists()) {
          final bytes = await photo.readAsBytes();
          if (mounted) setState(() => _profilePhotoBytes = bytes);
        }
      }
    } catch (_) {}
  }

  Future<void> _pickProfilePhoto() async {
    try {
      final source = await showModalBottomSheet<ImageSource>(
        context: context,
        backgroundColor: Colors.transparent,
        builder: (ctx) => Container(
          decoration: const BoxDecoration(
            color: kDarkSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1B5E5B),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const Text(
                  'Select Profile Photo',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: kTextPrimary,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: kTurquoise.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: const Icon(Icons.photo_library_rounded, color: kTurquoise, size: 22),
                  ),
                  title: const Text(
                    'Choose from Gallery',
                    style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w700),
                  ),
                  onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: kMint.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: const Icon(Icons.camera_alt_rounded, color: kMint, size: 22),
                  ),
                  title: const Text(
                    'Take a Photo',
                    style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w700),
                  ),
                  onTap: () => Navigator.pop(ctx, ImageSource.camera),
                ),
              ],
            ),
          ),
        ),
      );

      if (source == null) return;

      final picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 800,
        maxHeight: 800,
      );

      if (image == null || !mounted) return;

      final bytes = await image.readAsBytes();
      final base64String = base64Encode(bytes);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_profilePhotoKey, base64String);

      if (mounted) {
        setState(() => _profilePhotoBytes = bytes);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile photo updated successfully!'),
            backgroundColor: kEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not update profile photo: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  String get _initials {
    final f = _client.firstName.isNotEmpty ? _client.firstName[0] : '';
    final l = _client.lastName.isNotEmpty ? _client.lastName[0] : '';
    return (f + l).toUpperCase();
  }

  void _switchTab(int index) {
    if (index == _navIndex) return;
    _fadeCtrl.forward(from: 0);
    setState(() => _navIndex = index);
  }

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: kDarkBg,
      drawer: _buildEndDrawer(context),
      // No bottomNavigationBar — floating nav is overlaid in Stack
      body: GestureDetector(
        onHorizontalDragEnd: (details) {
          if (details.primaryVelocity != null && details.primaryVelocity! > 250) {
            _scaffoldKey.currentState?.openDrawer();
          }
        },
        child: Stack(
          children: [
            Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refreshPortal,
                    color: kTurquoise,
                    child: FadeTransition(
                      opacity: _fadeAnim,
                      child: _buildCurrentTab(),
                    ),
                  ),
                ),
              ],
            ),
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 22,
              child: GestureDetector(
                onHorizontalDragEnd: (details) {
                  if (details.primaryVelocity != null && details.primaryVelocity! > 80) {
                    _scaffoldKey.currentState?.openDrawer();
                  }
                },
                behavior: HitTestBehavior.translucent,
              ),
            ),
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              width: 22,
              child: GestureDetector(
                onHorizontalDragEnd: (details) {
                  if (details.primaryVelocity != null && details.primaryVelocity! < -80) {
                    _scaffoldKey.currentState?.openDrawer();
                  }
                },
                behavior: HitTestBehavior.translucent,
              ),
            ),
            // ── Floating bottom navigation bar (adaptive positioning) ─────────
            Positioned(
              left: MediaQuery.sizeOf(context).width < 360 ? 10 : 16,
              right: MediaQuery.sizeOf(context).width < 360 ? 10 : 16,
              bottom: (MediaQuery.paddingOf(context).bottom > 0)
                  ? MediaQuery.paddingOf(context).bottom + 4
                  : 14,
              child: _buildFloatingNav(),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────────────────────────── SLIM HEADER ────────────────────────────
  Widget _buildHeader() {
    return Container(
      decoration: BoxDecoration(
        color: kDarkSurface,
        border: const Border(bottom: BorderSide(color: Color(0xFF1A5C40), width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 3),
            spreadRadius: -3,
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 8),
          child: Row(
            children: [
              // Logo
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  gradient: kGradientDarkTeal,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: kCyan.withValues(alpha: 0.25), width: 1.2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset('assets/heiwa_logo.jpg', fit: BoxFit.cover),
                ),
              ),

              const SizedBox(width: 10),

              // Branding
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Wellcare',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: kTextPrimary,
                          letterSpacing: -0.4),
                    ),
                    Text(
                      'Client Portal',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: kTurquoise,
                          letterSpacing: 0.2),
                    ),
                  ],
                ),
              ),

              // Boxed action icons — green tint
              _headerIcon(Icons.search_rounded, 'Search', () => _showWellnessSearch(context)),
              const SizedBox(width: 4),
              _headerIcon(Icons.chat_bubble_outline_rounded, 'Messages', () => _showMessagesModal(context)),
              const SizedBox(width: 4),
              _headerIcon(Icons.notifications_none_rounded, 'Notifications', () => _showNotificationsModal(context)),
              const SizedBox(width: 6),

              // Profile avatar — far right, tapping => Profile tab (index 4)
              GestureDetector(
                onTap: () => _switchTab(4),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: _profilePhotoBytes == null ? kGradientDarkMint : null,
                    color: _profilePhotoBytes == null ? null : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(color: kCyan.withValues(alpha: 0.35), width: 1.5),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _profilePhotoBytes == null
                      ? Center(
                          child: Text(
                            _initials,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        )
                      : Image.memory(_profilePhotoBytes!, fit: BoxFit.cover, width: 36, height: 36),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerIcon(IconData icon, String tooltip, VoidCallback onTap, {int badge = 0}) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF0D3B2F),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF1A5C40), width: 1),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                Icon(icon, color: kEmeraldLight, size: 18),
                if (badge > 0)
                  Positioned(
                    right: -4,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 3.5, vertical: 1),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      decoration: BoxDecoration(
                        color: kRose,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: kDarkSurface, width: 1.2),
                      ),
                      child: Center(
                        child: Text(
                          badge > 9 ? '9+' : '$badge',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            height: 1,
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
    );
  }

  // ── Floating pill-style bottom navigation — green theme ──────────────────
  Widget _buildFloatingNav() {
    // New order: Home, Wellness, Reports, Alkaline, Profile (profile last)
    const items = [
      (label: 'Home',     icon: Icons.home_outlined,         active: Icons.home_rounded,         color: kEmerald),
      (label: 'Wellness', icon: Icons.favorite_outline_rounded, active: Icons.favorite_rounded,  color: kMint),
      (label: 'Reports',  icon: Icons.query_stats_outlined,   active: Icons.query_stats_rounded,  color: kEmeraldLight),
      (label: 'Alkaline', icon: Icons.water_drop_outlined,    active: Icons.water_drop_rounded,   color: kTurquoise),
      (label: 'Profile',  icon: Icons.person_outline_rounded, active: Icons.person_rounded,       color: kKelly),
    ];

    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: kDarkBg,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFF1A5C40), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 28,
            offset: const Offset(0, 10),
            spreadRadius: -4,
          ),
          BoxShadow(
            color: kEmerald.withValues(alpha: 0.12),
            blurRadius: 20,
            spreadRadius: -2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: Row(
          children: [
            for (var i = 0; i < items.length; i++)
              Expanded(
                child: _FloatingNavItem(
                  label: items[i].label,
                  icon: items[i].icon,
                  activeIcon: items[i].active,
                  color: items[i].color,
                  isActive: _navIndex == i,
                  onTap: () => _switchTab(i),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showWellnessSearch(BuildContext context) {
    showSearch<void>(
      context: context,
      delegate: _WellnessSearchDelegate(
        onSelect: (index) {
          Navigator.pop(context);
          _switchTab(index);
        },
      ),
    );
  }

  // ──────────────────────────────────────── SIDE DRAWER (BURGER MENU) ───────
  Widget _buildEndDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      width: MediaQuery.of(context).size.width * 0.78,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(AppRadius.xxl)),
      ),
      child: Column(
        children: [
          // Drawer Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 50, 16, 24),
            decoration: const BoxDecoration(
              gradient: kBrandGradient,
              borderRadius:
                  BorderRadius.only(bottomRight: Radius.circular(AppRadius.xxl)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 52, height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        shape: BoxShape.circle,
                        border: Border.all(color: kKelly.withValues(alpha: 0.7), width: 2),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: _profilePhotoBytes == null
                          ? Center(
                              child: Text(_initials,
                                  style: const TextStyle(
                                      fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                            )
                          : Image.memory(_profilePhotoBytes!, fit: BoxFit.cover, width: 52, height: 52),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 22),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(_client.fullName,
                    style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Colors.white),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 3),
                Text('@${_client.username}',
                    style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7)),
                    overflow: TextOverflow.ellipsis),
                if (_client.clientIdNumber.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 7),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                      ),
                      child: Text('ID: ${_client.clientIdNumber}',
                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: kKelly)),
                    ),
                  ),
              ],
            ),
          ),

          // Menu items list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
              children: [
                _drawerSectionLabel('MAIN NAVIGATION'),
                const SizedBox(height: 6),
                _drawerTile(
                  icon: Icons.home_rounded,
                  label: 'Home',
                  active: _navIndex == 0,
                  onTap: () {
                    Navigator.pop(context);
                    _switchTab(0);
                  },
                ),
                _drawerTile(
                  icon: Icons.favorite_rounded,
                  label: 'Wellness',
                  active: _navIndex == 1,
                  onTap: () {
                    Navigator.pop(context);
                    _switchTab(1);
                  },
                ),
                _drawerTile(
                  icon: Icons.query_stats_rounded,
                  label: 'Reports',
                  active: _navIndex == 2,
                  onTap: () {
                    Navigator.pop(context);
                    _switchTab(2);
                  },
                ),
                _drawerTile(
                  icon: Icons.water_drop_rounded,
                  label: 'Alkaline use',
                  active: _navIndex == 3,
                  onTap: () {
                    Navigator.pop(context);
                    _switchTab(3);
                  },
                ),
                _drawerTile(
                  icon: Icons.person_rounded,
                  label: 'Profile',
                  active: _navIndex == 4,
                  onTap: () {
                    Navigator.pop(context);
                    _switchTab(4);
                  },
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1),
                ),

                _drawerSectionLabel('COMMUNICATION'),
                const SizedBox(height: 6),
                _drawerTile(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Messages',
                  badge: '2',
                  onTap: () {
                    Navigator.pop(context);
                    _showMessagesModal(context);
                  },
                ),
                _drawerTile(
                  icon: Icons.notifications_none_rounded,
                  label: 'Notifications',
                  badge: '3',
                  badgeColor: AppColors.warning,
                  onTap: () {
                    Navigator.pop(context);
                    _showNotificationsModal(context);
                  },
                ),
              ],
            ),
          ),

          // Logout action at bottom of drawer
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.dangerTint,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.danger.withValues(alpha: 0.18)),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                leading: Container(
                  width: 34, height: 34,
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                  ),
                  child: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
                ),
                title: const Text('Log out',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.danger)),
                onTap: () {
                  Navigator.pop(context);
                  _logout(context);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerSectionLabel(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 6, 8, 4),
      child: Text(label,
          style: const TextStyle(
              fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.inkFaint, letterSpacing: 1.2)),
    );
  }

  Widget _drawerTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool active = false,
    String? badge,
    Color badgeColor = kEmerald,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: active ? kMint : Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
        leading: Icon(icon, color: active ? kEmerald : AppColors.inkFaint, size: 21),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: active ? FontWeight.w800 : FontWeight.w600,
            color: active ? kEmerald : kEmeraldDark,
          ),
        ),
        trailing: badge != null
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(badge,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
              )
            : (active ? const Icon(Icons.chevron_right_rounded, color: kEmerald, size: 18) : null),
        onTap: onTap,
      ),
    );
  }

  // ──────────────────────────────────────── MESSAGES MODAL ──────────────────
  void _showMessagesModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MessagesModalContent(client: _client),
    );
  }

  // ──────────────────────────────────────── EDIT PROFILE MODAL ───────────────
  void _showEditProfileModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditProfileModalContent(
        client: _client,
        onUpdated: (updated) {
          if (mounted) setState(() => _client = updated);
        },
      ),
    );
  }

  // ──────────────────────────────────────── NOTIFICATIONS MODAL ─────────────
  void _showNotificationsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(ctx).size.height * 0.68,
        decoration: const BoxDecoration(
          color: kDarkSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 38, height: 4,
              decoration: BoxDecoration(color: const Color(0xFF1B5E5B), borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: AppColors.warningTint,
                        borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                      ),
                      child: const Icon(Icons.notifications_rounded, color: AppColors.warning, size: 19),
                    ),
                    const SizedBox(width: 11),
                    const Text('Notifications', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kTextPrimary)),
                  ]),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20, color: kTextTertiary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFF1B5E5B)),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _notifTile(
                    context,
                    icon: Icons.check_circle_rounded,
                    iconColor: kTurquoise,
                    title: 'Attendance Confirmed',
                    time: '2 hours ago',
                    body: 'You checked in for therapy session on Sep 24, 2026.',
                    fullDetail: 'Your session check-in was recorded by the WellCare reception desk. Keep up your regular therapy attendance for optimal health results!',
                  ),
                  _notifTile(
                    context,
                    icon: Icons.water_drop_rounded,
                    iconColor: kTurquoise,
                    title: 'Alkaline Therapy Logged',
                    time: '2 days ago',
                    body: '1 Alkaline Water session unit recorded.',
                    fullDetail: 'Your alkaline therapy session has been logged in your account history. Stay hydrated and follow your wellness routine.',
                  ),
                  _notifTile(
                    context,
                    icon: Icons.star_rounded,
                    iconColor: Colors.orange,
                    title: 'Wellness Goal Reached!',
                    time: '5 days ago',
                    body: 'You have completed 10 total wellness therapy sessions.',
                    fullDetail: 'Congratulations on completing 10 therapy sessions! You are building healthy wellness habits with WellCare System.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

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
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: kTextPrimary)),
                      ),
                      const SizedBox(width: 8),
                      Text(time,
                          style: const TextStyle(
                              fontSize: 10.5, color: kTextTertiary)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(body,
                      style: const TextStyle(
                          fontSize: 12,
                          color: kTextTertiary,
                          height: 1.35)),
                ],
              ),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded,
                color: kTurquoise, size: 18),
          ],
        ),
      ),
    );
  }

  void _showNotificationDetailModal(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String time,
    required String body,
    required String fullDetail,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(22),
        decoration: const BoxDecoration(
          color: kDarkSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38, height: 4,
                decoration: BoxDecoration(color: const Color(0xFF1B5E5B), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.sm + 2),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: kTextPrimary)),
                    const SizedBox(height: 3),
                    Text(time, style: const TextStyle(fontSize: 11, color: kTextTertiary)),
                  ],
                ),
              ),
            ]),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: kDarkSurfaceAlt,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: const Color(0xFF1B5E5B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(body, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: kTextPrimary)),
                  const SizedBox(height: 8),
                  Text(
                    fullDetail,
                    style: const TextStyle(fontSize: 12.5, color: kTextTertiary, height: 1.45),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: kTurquoise,
                  foregroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(borderRadius: AppRadius.buttonBR),
                ),
                child: const Text('Close notification'),
              ),
            ),
          ],
        ),
      ),
    );
  }
  Widget _buildCurrentTab() {
    switch (_navIndex) {
      case 0: return HomeScreen(client: _client);
      case 1: return WellnessScreen(client: _client);
      case 2: return _buildReportTab();          // Reports at index 2
      case 3: return _buildAlkalineUseTab();     // Alkaline at index 3
      case 4: return _buildProfileTab();         // Profile last
      default: return _buildMoreTab();
    }
  }



  // ══════════════════════════════════════ PROFILE TAB ══════════════════════
  Widget _buildProfileTab() {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Compact Hero Card — sized down so Personal Information is clearly visible
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              gradient: kGradientDarkTeal,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(
                color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.28),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                  spreadRadius: -3,
                ),
                BoxShadow(
                  color: const Color(0xFF14B8A6).withValues(alpha: 0.10),
                  blurRadius: 16,
                  offset: const Offset(0, 2),
                  spreadRadius: -2,
                ),
              ],
            ),
            child: Row(
              children: [
                // Avatar with camera tap badge
                GestureDetector(
                  onTap: _pickProfilePhoto,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: kTurquoise.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: kTurquoise.withValues(alpha: 0.65),
                            width: 2,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: _profilePhotoBytes == null
                            ? Center(
                                child: Text(
                                  _initials,
                                  style: const TextStyle(
                                    fontSize: 19,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              )
                            : Image.memory(
                                _profilePhotoBytes!,
                                fit: BoxFit.cover,
                                width: 52,
                                height: 52,
                              ),
                      ),
                      Positioned(
                        right: -2,
                        bottom: -2,
                        child: Container(
                          width: 19,
                          height: 19,
                          decoration: BoxDecoration(
                            color: kEmeraldLight,
                            shape: BoxShape.circle,
                            border: Border.all(color: kDarkSurface, width: 1.5),
                          ),
                          child: const Icon(Icons.camera_alt, size: 10.5, color: Colors.black),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 13),

                // Name, username, Client ID, and compact photo chip
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _client.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          Text(
                            '@${_client.username}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: kTurquoiseLight.withValues(alpha: 0.85),
                            ),
                          ),
                          if (_client.clientIdNumber.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF14B8A6).withValues(alpha: 0.16),
                                borderRadius: BorderRadius.circular(AppRadius.pill),
                                border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.35)),
                              ),
                              child: Text(
                                'ID: ${_client.clientIdNumber}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: kTurquoiseLight,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Compact change photo chip button
                      GestureDetector(
                        onTap: _pickProfilePhoto,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.photo_camera_outlined, size: 12, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(
                                _profilePhotoBytes == null ? 'Upload photo' : 'Change photo',
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _sectionLabel('PERSONAL INFORMATION'),
              GestureDetector(
                onTap: () => _showEditProfileModal(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: kTurquoise.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    border: Border.all(color: kTurquoise.withValues(alpha: 0.4)),
                  ),
                  child: const Row(children: [
                    Icon(Icons.edit_rounded, size: 12, color: kTurquoiseLight),
                    SizedBox(width: 4),
                    Text('Edit profile', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kTurquoiseLight)),
                  ]),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          _infoCard([
            if (_client.clientIdNumber.isNotEmpty)
              _infoRowIcon(Icons.badge_rounded, 'Client ID', _client.clientIdNumber, highlight: true),
            _infoRowIcon(Icons.person_rounded, 'Full Name', _client.fullName),
            _infoRowIcon(Icons.cake_rounded, 'Birthdate',
                _client.birthdate.isNotEmpty ? _client.birthdate : '—'),
            _infoRowIcon(Icons.phone_rounded, 'Phone',
                _client.phone.isNotEmpty ? _client.phone : '—'),
            _infoRowIcon(Icons.email_outlined, 'Email',
                _client.email.isNotEmpty ? _client.email : '—'),
            _infoRowIcon(Icons.location_on_rounded, 'Address',
                _client.address.isNotEmpty ? _client.address : '—', last: true),
          ]),

          const SizedBox(height: 12),

          _fingerprintStatusCard(),

          const SizedBox(height: 16),

          // ── Logout container inside Profile tab ───────────────────────────
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: kDarkSurface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(
                color: const Color(0xFFF87171).withValues(alpha: 0.28),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFF87171).withValues(alpha: 0.25),
                          width: 1,
                        ),
                      ),
                      child: const Icon(
                        Icons.logout_rounded,
                        color: Color(0xFFF87171),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Account Session',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: kCream,
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Sign out of your account on this device',
                            style: TextStyle(
                              fontSize: 12,
                              color: kCreamMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _logout(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                    icon: const Icon(Icons.logout_rounded, size: 17),
                    label: const Text(
                      'Log Out',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Enrolled / not-enrolled indicator, reused on Profile and Reports tabs.
  Widget _fingerprintStatusCard() {
    final enrolled = _client.fingerprintEnrolled;
    final accent = enrolled ? kEmerald : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      decoration: appCardDecoration(
        borderColor: accent.withValues(alpha: enrolled ? 0.22 : 0.28),
      ),
      child: Row(children: [
        Container(
          width: 38, height: 38,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          child: Icon(Icons.fingerprint_rounded, color: accent, size: 20),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Fingerprint status',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.inkFaint)),
            const SizedBox(height: 2),
            Text(
              enrolled ? 'Enrolled · Identity verified' : 'Not enrolled',
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: accent),
            ),
          ]),
        ),
        Icon(
          enrolled ? Icons.verified_rounded : Icons.warning_amber_rounded,
          color: enrolled ? kKelly : AppColors.warning,
          size: 19,
        ),
      ]),
    );
  }

  Widget _buildAlkalineUseTab() {
    final sessions = _client.alkalineSessions;
    final remainder = sessions % 10;
    final progress = remainder == 0 && sessions > 0 ? 1.0 : remainder / 10;
    final toNext = sessions == 0 ? 10 : (10 - remainder) % 10;
    final totalMl = sessions * 500;
    final totalLiters = (sessions * 0.5).toStringAsFixed(1);

    // ── Daily hydration tracker ──────────────────────────────────────────────
    // Goal: 8 glasses per day, each glass = 250 mL → 2,000 mL / day
    // Each alkaline session bottle = 500 mL = 2 glasses
    // We use today's alkaline sessions from visitHistory (type = 'Alkaline Session', today's date)
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final todayAlkalineSessions = _visitHistory
        .where((v) {
          final raw = (v['date'] ?? '').toString();
          return raw.contains(todayStr) && (v['type'] ?? '').toString().toLowerCase().contains('alkaline');
        })
        .length;
    // mL consumed today via sessions
    final todayMl = todayAlkalineSessions * 500;
    // daily goal in mL
    const int dailyGoalMl = 2000; // 8 × 250 mL
    const int glassVolumeMl = 250;
    const int totalGlasses = 8;
    // glasses fulfilled by today's alkaline sessions
    final glassesFromSessions = (todayMl / glassVolumeMl).floor().clamp(0, totalGlasses);
    final glassesRemaining = (totalGlasses - glassesFromSessions).clamp(0, totalGlasses);
    final mlRemaining = (dailyGoalMl - todayMl).clamp(0, dailyGoalMl);
    final dailyHydrationProgress = (todayMl / dailyGoalMl).clamp(0.0, 1.0);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Alkaline use', style: AppText.h1),
          const SizedBox(height: 6),
          const Text('Your recorded alkaline hydration and sessions.',
              style: TextStyle(fontSize: 13, color: kTextTertiary)),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: kGradientDarkTeal,
              borderRadius: BorderRadius.circular(AppRadius.xl),
              border: Border.all(
                color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                  spreadRadius: -4,
                ),
                BoxShadow(
                  color: const Color(0xFF14B8A6).withValues(alpha: 0.12),
                  blurRadius: 24,
                  offset: const Offset(0, 4),
                  spreadRadius: -2,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF14B8A6).withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: const Color(0xFF14B8A6).withValues(alpha: 0.35),
                          width: 1,
                        ),
                      ),
                      child: const Icon(Icons.water_drop_rounded,
                          color: kTurquoiseLight, size: 26),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        border: Border.all(
                          color: const Color(0xFF10B981).withValues(alpha: 0.45),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            margin: const EdgeInsets.only(right: 6),
                            decoration: const BoxDecoration(
                              color: Color(0xFF34D399),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const Text('LIVE TOTAL',
                              style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                  color: Color(0xFF6EE7B7))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('$sessions',
                        style: const TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            color: kTextPrimary,
                            height: 1,
                            letterSpacing: -1.5)),
                    const SizedBox(width: 8),
                    const Text('sessions',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: kTurquoiseLight)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('Recorded alkaline therapy sessions',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: kTextTertiary)),
                const SizedBox(height: 18),
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                    valueColor: const AlwaysStoppedAnimation<Color>(kTurquoiseLight),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      toNext == 0
                          ? '10-session milestone reached! 🌟'
                          : '$toNext more session${toNext == 1 ? '' : 's'} to next milestone',
                      style: const TextStyle(fontSize: 11, color: kTextTertiary),
                    ),
                    Text(
                      '${(progress * 100).round()}%',
                      style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: kTurquoiseLight),
                    ),
                  ],
                ),

                // ─────────────────────────────────────────────────────────────
                // BOTTOM OF CARD: MEASUREMENT OF ALKALINE THEY DRINK
                // ─────────────────────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  child: Container(
                    height: 1,
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),

                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF14B8A6).withValues(alpha: 0.18),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.local_drink_rounded,
                          size: 15, color: kTurquoiseLight),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'ALKALINE INTAKE MEASUREMENT',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: kTurquoiseLight,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.15),
                          width: 1,
                        ),
                      ),
                      child: const Text(
                        '500 mL / bottle',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: kTextTertiary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Intake measurement breakdown chips
                Row(
                  children: [
                    // Total Volume
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Volume',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: kTextTertiary)),
                            const SizedBox(height: 4),
                            Text(
                              '$totalLiters L',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: kTextPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${totalMl.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} mL intake',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF6EE7B7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Bottles Consumed
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Bottles Consumed',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: kTextTertiary)),
                            const SizedBox(height: 4),
                            Text(
                              '$sessions ${sessions == 1 ? 'Bottle' : 'Bottles'}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: kTextPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Standard 500 mL units',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: kTurquoiseLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Daily Hydration Tracker ────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: kDarkSurfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: const Color(0xFF1B5E5B), width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: const Icon(Icons.local_drink_rounded,
                          size: 18, color: Color(0xFF38BDF8)),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Today\'s Hydration',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: kTextPrimary)),
                          Text('Daily goal: 8 glasses · 250 mL each = 2,000 mL',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: kTextTertiary)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        border: Border.all(
                          color: const Color(0xFF38BDF8).withValues(alpha: 0.4),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        todayAlkalineSessions == 0
                            ? 'Today'
                            : '$todayAlkalineSessions session${todayAlkalineSessions == 1 ? '' : 's'} today',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF38BDF8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Glass icons row (8 glasses visual)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(totalGlasses, (i) {
                    final filled = i < glassesFromSessions;
                    return Column(
                      children: [
                        Icon(
                          filled ? Icons.water_drop_rounded : Icons.water_drop_outlined,
                          size: 26,
                          color: filled
                              ? const Color(0xFF38BDF8)
                              : const Color(0xFF38BDF8).withValues(alpha: 0.2),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${(i + 1) * 250}',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w600,
                            color: filled
                                ? kTextTertiary
                                : kTextTertiary.withValues(alpha: 0.4),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
                const SizedBox(height: 14),

                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  child: LinearProgressIndicator(
                    value: dailyHydrationProgress,
                    minHeight: 8,
                    backgroundColor: const Color(0xFF38BDF8).withValues(alpha: 0.12),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                  ),
                ),
                const SizedBox(height: 10),

                // Remaining / complete message
                Row(
                  children: [
                    if (glassesRemaining > 0) ...[
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: const TextStyle(
                                fontSize: 12.5, color: kTextTertiary, height: 1.4),
                            children: [
                              TextSpan(
                                text: '$glassesRemaining glass${glassesRemaining == 1 ? '' : 'es'} remaining  ',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF38BDF8)),
                              ),
                              TextSpan(
                                text: '($mlRemaining mL still needed today)',
                              ),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      const Icon(Icons.check_circle_rounded,
                          color: Color(0xFF34D399), size: 18),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Daily hydration goal reached! Great job! 🎉',
                          style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF34D399)),
                        ),
                      ),
                    ],
                    Text(
                      '${todayMl.clamp(0, dailyGoalMl)} / $dailyGoalMl mL',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF38BDF8),
                      ),
                    ),
                  ],
                ),

                if (todayAlkalineSessions > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(
                            fontSize: 12, color: kTextTertiary, height: 1.45),
                        children: [
                          const TextSpan(text: '💧  Today you drank '),
                          TextSpan(
                            text: '$todayAlkalineSessions bottle${todayAlkalineSessions == 1 ? '' : 's'} ($todayMl mL)',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF38BDF8)),
                          ),
                          const TextSpan(text: ' of alkaline water — that\'s '),
                          TextSpan(
                            text: '$glassesFromSessions of 8 glasses',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: kTextPrimary),
                          ),
                          TextSpan(
                            text: glassesRemaining > 0
                                ? '. You need $glassesRemaining more glass${glassesRemaining == 1 ? '' : 'es'} ($mlRemaining mL) to complete your daily goal.'
                                : '. Your daily goal is complete!',
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 12),
                  const Text(
                    '💡  No alkaline session recorded today yet. Drink 8 glasses (2,000 mL) to meet your daily hydration goal.',
                    style: TextStyle(fontSize: 12, color: kTextTertiary, height: 1.4),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── 7-Day Alkaline History Chart ─────────────────────────────────
          Builder(builder: (_) {
            // Build per-day alkaline counts for the last 7 days
            final now = DateTime.now();
            final days = List.generate(7, (i) {
              final d = now.subtract(Duration(days: 6 - i));
              return '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
            });
            final dayCounts = <String, int>{};
            for (final day in days) {
              dayCounts[day] = _visitHistory.where((v) {
                final raw = (v['date'] ?? '').toString();
                return raw.contains(day) &&
                    (v['type'] ?? '').toString().toLowerCase().contains('alkaline');
              }).length;
            }
            final maxCount = dayCounts.values.fold(0, (a, b) => a > b ? a : b);
            final safeMax = maxCount == 0 ? 1 : maxCount;
            final dayLabels = ['6d', '5d', '4d', '3d', '2d', 'Yst', 'Today'];

            return Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: kDarkSurfaceAlt,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: const Color(0xFF1B5E5B), width: 1.2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Daily Alkaline History',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: kTextPrimary)),
                            SizedBox(height: 2),
                            Text('Bottles consumed per day — last 7 days',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, color: kTextTertiary)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF38BDF8).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          border: Border.all(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.35),
                            width: 1,
                          ),
                        ),
                        child: const Text(
                          '500 mL/bottle',
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF38BDF8)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Bar chart
                  SizedBox(
                    height: 110,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: List.generate(7, (i) {
                        final day = days[i];
                        final count = dayCounts[day] ?? 0;
                        final fraction = count / safeMax;
                        final isToday = i == 6;
                        final barColor = isToday
                            ? const Color(0xFF38BDF8)
                            : const Color(0xFF38BDF8).withValues(alpha: 0.45);

                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                // Count label above bar
                                if (count > 0)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 3),
                                    child: Text(
                                      '$count',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: isToday
                                            ? const Color(0xFF38BDF8)
                                            : kTextTertiary,
                                      ),
                                    ),
                                  ),
                                // The bar
                                AnimatedContainer(
                                  duration: const Duration(milliseconds: 600),
                                  curve: Curves.easeOutCubic,
                                  width: double.infinity,
                                  height: count == 0
                                      ? 4
                                      : (fraction * 80).clamp(8, 80),
                                  decoration: BoxDecoration(
                                    color: count == 0
                                        ? const Color(0xFF38BDF8).withValues(alpha: 0.08)
                                        : barColor,
                                    borderRadius: BorderRadius.circular(5),
                                    boxShadow: isToday && count > 0
                                        ? [
                                            BoxShadow(
                                              color: const Color(0xFF38BDF8)
                                                  .withValues(alpha: 0.35),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            )
                                          ]
                                        : null,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                // mL label
                                if (count > 0)
                                  Text(
                                    '${count * 500}mL',
                                    style: TextStyle(
                                      fontSize: 8,
                                      fontWeight: FontWeight.w600,
                                      color: isToday
                                          ? const Color(0xFF38BDF8)
                                          : kTextTertiary.withValues(alpha: 0.7),
                                    ),
                                  )
                                else
                                  Text(
                                    '0',
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: kTextTertiary.withValues(alpha: 0.3),
                                    ),
                                  ),
                                const SizedBox(height: 2),
                                // Day label
                                Text(
                                  dayLabels[i],
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: isToday
                                        ? FontWeight.w800
                                        : FontWeight.w600,
                                    color: isToday
                                        ? const Color(0xFF38BDF8)
                                        : kTextTertiary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ),
                  ),

                  if (maxCount > 0) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.trending_up_rounded,
                            color: Color(0xFF34D399), size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Peak: $maxCount bottle${maxCount == 1 ? '' : 's'} (${maxCount * 500} mL) in a day',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF34D399),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 10),
                    const Text(
                      'No alkaline sessions in the past 7 days.',
                      style: TextStyle(fontSize: 12, color: kTextTertiary),
                    ),
                  ],
                ],
              ),
            );
          }),

          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: kDarkSurfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: const Color(0xFF1B5E5B)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: kEmeraldLight.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                  ),
                  child: const Icon(Icons.info_outline_rounded,
                      color: kEmeraldLight, size: 18),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Session and bottle intake totals are recorded automatically by wellness staff during each therapy session.',
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.45,
                      color: kTextTertiary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportTab() {
    // Derive visit-based totals from history for visualization
    final totalVisits = _visitHistory.length;
    final checkins = _client.checkins;
    final absences = _client.absences;
    final alkaline = _client.alkalineSessions;

    // Compute the max value across all metrics to scale mini bars
    final metricMax = [checkins, absences, totalVisits, alkaline]
        .reduce((a, b) => a > b ? a : b);
    final safeMax = metricMax == 0 ? 1 : metricMax;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My reports', style: AppText.h1),
          const SizedBox(height: 6),
          const Text('A summary of your Wellcare activity.',
              style: TextStyle(fontSize: 13, color: kTextTertiary)),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.88,
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
          ),

          // Attendance breakdown bar chart
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: kDarkSurfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: const Color(0xFF1B5E5B), width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Attendance Breakdown',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: kTextPrimary)),
                const SizedBox(height: 4),
                const Text('Check-ins vs absences — all time',
                    style: TextStyle(fontSize: 11, color: kTextTertiary)),
                const SizedBox(height: 16),
                // Stacked attendance bar
                () {
                  final total = checkins + absences;
                  final safeTotal = total == 0 ? 1 : total;
                  final checkinFraction = checkins / safeTotal;
                  return Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                        child: LayoutBuilder(
                          builder: (ctx, bc) {
                            return SizedBox(
                              height: 12,
                              width: bc.maxWidth,
                              child: Stack(
                                children: [
                                  Container(
                                      width: bc.maxWidth,
                                      color: kRose.withValues(alpha: 0.25)),
                                  FractionallySizedBox(
                                    widthFactor: checkinFraction,
                                    child: Container(
                                      decoration: const BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [kEmeraldLight, kTurquoiseLight],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(children: [
                            Container(width: 10, height: 10,
                                decoration: const BoxDecoration(
                                    color: kEmeraldLight,
                                    shape: BoxShape.circle)),
                            const SizedBox(width: 6),
                            Text('Check-ins: $checkins',
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: kTextPrimary)),
                          ]),
                          Row(children: [
                            Container(width: 10, height: 10,
                                decoration: BoxDecoration(
                                    color: kRose.withValues(alpha: 0.7),
                                    shape: BoxShape.circle)),
                            const SizedBox(width: 6),
                            Text('Absences: $absences',
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: kTextPrimary)),
                          ]),
                        ],
                      ),
                      if (total > 0) ...[
                        const SizedBox(height: 10),
                        Text(
                          'Attendance rate: ${(checkinFraction * 100).round()}%',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: kEmeraldLight),
                        ),
                      ],
                    ],
                  );
                }(),
              ],
            ),
          ),

          const SizedBox(height: 14),
          _fingerprintStatusCard(),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: kDarkSurfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: const Color(0xFF1B5E5B), width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: kEmeraldLight.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(Icons.schedule_rounded, color: kEmeraldLight, size: 20),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Last visit',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kTextTertiary)),
                      const SizedBox(height: 3),
                      Text(
                        _client.lastSeen.isEmpty ? 'No visit recorded yet' : _client.lastSeen,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: kTextPrimary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (_historyUnavailable) ...[
            const SizedBox(height: 12),
            const Text('Visit totals may be incomplete while history is unavailable.',
                style: TextStyle(fontSize: 12, color: kTextTertiary)),
          ],
        ],
      ),
    );
  }

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
                  Text(
                    value,
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
                      if (subLabel.isNotEmpty) ...[
                        const SizedBox(height: 3),
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
                      ],
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

  // ══════════════════════════════════════ MORE TAB ═══════════════════════════
  Widget _buildMoreTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 14, 16, 96 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('MORE OPTIONS'),
          const SizedBox(height: 12),
          _moreItem(Icons.refresh_rounded, 'Refresh Data', kEmerald, () {
            _refreshData();
            _switchTab(0);
          }),
          const SizedBox(height: 8),
          _moreItem(Icons.water_drop_rounded, 'Alkaline Use', kEmerald, () => _switchTab(3)),
          const SizedBox(height: 8),
          _moreItem(Icons.query_stats_rounded, 'My Reports', kEmerald, () => _switchTab(4)),
          const SizedBox(height: 8),
          _moreItem(Icons.info_outline_rounded, 'About WellCare', kEmerald, () {}),
          const SizedBox(height: 8),
          _moreItem(Icons.logout_rounded, 'Log Out', Colors.red, () => _logout(context), danger: true),
        ],
      ),
    );
  }

  // ──────────────────────────────────────── SHARED WIDGETS ──────────────────

  Widget _sectionLabel(String label) => Text(label,
      style: const TextStyle(
          fontSize: 10.5, fontWeight: FontWeight.w800,
          color: kTextTertiary, letterSpacing: 1.3));

  Widget _infoCard(List<Widget> rows) {
    return Container(
      decoration: BoxDecoration(
        color: kDarkSurfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: const Color(0xFF1B5E5B)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: rows),
    );
  }

  Widget _infoRowIcon(IconData icon, String label, String value,
      {bool highlight = false, bool last = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.transparent,
        border: last ? null : const Border(bottom: BorderSide(color: Color(0xFF1B5E5B))),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Icon(icon, size: 18, color: kTurquoise),
        const SizedBox(width: 12),
        SizedBox(
          width: 90,
          child: Text(label,
              style: const TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w600, color: kTextTertiary)),
        ),
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
                    child: Text(value,
                        style: const TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800,
                            color: kTurquoiseLight, letterSpacing: 0.8)),
                  ),
                )
              : Text(value,
                  style: const TextStyle(
                      fontSize: 13.5, fontWeight: FontWeight.w700, color: kTextPrimary),
                  textAlign: TextAlign.right),
        ),
      ]),
    );
  }

  Widget _moreItem(IconData icon, String label, Color color, VoidCallback onTap,
      {bool danger = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: danger ? Colors.red.withValues(alpha: 0.15) : kEmerald.withValues(alpha: 0.1)),
        ),
        child: Row(children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w700,
                    color: danger ? Colors.red : kEmeraldDark)),
          ),
          Icon(Icons.chevron_right_rounded, color: color.withValues(alpha: 0.4), size: 20),
        ]),
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  final String title;
  final String detail;
  final IconData icon;
  final List<Color> colors;
  final String imagePath;
  final VoidCallback onTap;

  const _ProgramCard({
    required this.title,
    required this.detail,
    required this.icon,
    required this.colors,
    required this.imagePath,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.hairline),
            boxShadow: AppShadows.card,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: Stack(
              children: [
                // Faint green wash in the corner, for depth without noise.
                Positioned(
                  right: -30,
                  top: -30,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: kMint.withValues(alpha: 0.75),
                    ),
                  ),
                ),
                // Decorative illustration — right-aligned, bottom half
                Positioned(
                  right: -10,
                  bottom: -10,
                  width: 96,
                  height: 96,
                  child: Opacity(
                    opacity: 0.16,
                    child: Image.asset(imagePath, fit: BoxFit.contain),
                  ),
                ),
                // Foreground content
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Icon badge
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: kMint,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Icon(icon, color: kEmerald, size: 21),
                      ),
                      const Spacer(),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w800, color: kEmeraldDark),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        detail,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 10.5, height: 1.3, color: AppColors.inkFaint),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text('Open',
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: kEmerald.withValues(alpha: 0.9))),
                          const SizedBox(width: 3),
                          const Icon(Icons.arrow_forward_rounded,
                              size: 13, color: kEmerald),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WellnessSearchDelegate extends SearchDelegate<void> {
  final ValueChanged<int> onSelect;

  _WellnessSearchDelegate({required this.onSelect});

  static const _items = [
    (title: 'Quick log', subtitle: 'Create a session record', tab: 0),
    (title: 'Reminders', subtitle: 'View notifications', tab: 0),
    (title: 'Alkaline use', subtitle: 'View your recorded sessions', tab: 3),
    (title: 'Health check', subtitle: 'Check-ins and wellness visits', tab: 0),
    (title: 'Patient records', subtitle: 'Client profile only', tab: 2),
    (title: 'Analytics and reports', subtitle: 'User data', tab: 4),
    (title: 'Attendance history', subtitle: 'Review check-ins', tab: 1),
    (title: 'Patient profile', subtitle: 'View your records', tab: 2),
    (title: 'Alkaline use', subtitle: 'View recorded sessions', tab: 3),
    (title: 'My reports', subtitle: 'Summary of your Wellcare activity', tab: 4),
  ];

  @override
  List<Widget> buildActions(BuildContext context) => [
        IconButton(onPressed: () => query = '', icon: const Icon(Icons.close_rounded), tooltip: 'Clear search'),
      ];

  @override
  Widget buildLeading(BuildContext context) => IconButton(
        onPressed: () => close(context, null),
        icon: const Icon(Icons.arrow_back_rounded),
        tooltip: 'Back',
      );

  @override
  Widget buildResults(BuildContext context) => _buildMatches();

  @override
  Widget buildSuggestions(BuildContext context) => _buildMatches();

  Widget _buildMatches() {
    final matches = _items.where((item) =>
        '${item.title} ${item.subtitle}'.toLowerCase().contains(query.trim().toLowerCase()));
    if (matches.isEmpty) {
      return const Center(child: Text('No matching sections found.'));
    }
    return ListView(
      children: [
        for (final item in matches)
          ListTile(
            leading: const CircleAvatar(backgroundColor: kMint, child: Icon(Icons.search_rounded, color: kEmerald)),
            title: Text(item.title),
            subtitle: Text(item.subtitle),
            onTap: () => onSelect(item.tab),
          ),
      ],
    );
  }
}

// ─── Real-time Messaging Modal Content ─────────────────────────────────────────
class _MessagesModalContent extends StatefulWidget {
  final ClientModel client;
  const _MessagesModalContent({required this.client});

  @override
  State<_MessagesModalContent> createState() => _MessagesModalContentState();
}

class _MessagesModalContentState extends State<_MessagesModalContent> {
  String _recipient = 'admin'; // 'admin' | 'staff'
  final TextEditingController _msgCtrl = TextEditingController();
  List<dynamic> _messages = [];
  bool _loading = true;
  bool _sending = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _fetchMessages());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages() async {
    try {
      final res = await getApi('/messages', headers: {
        'Authorization': 'Bearer ${widget.client.token}',
      });
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && mounted) {
          setState(() {
            _messages = data['messages'] ?? [];
            _loading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      final res = await postApi(
        '/messages',
        headers: {
          'Authorization': 'Bearer ${widget.client.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'text': text,
          'recipient': _recipient,
        }),
      );
      if (res.statusCode == 200) {
        _msgCtrl.clear();
        await _fetchMessages();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _messages.where((m) {
      final r = m['recipient'] ?? '';
      final s = m['sender'] ?? '';
      return r == _recipient || s == _recipient;
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      decoration: const BoxDecoration(
        color: kDarkSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 38, height: 4,
            decoration: BoxDecoration(color: const Color(0xFF1B5E5B), borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(children: [
                  Icon(Icons.forum_rounded, color: kTurquoise, size: 20),
                  SizedBox(width: 9),
                  Text('Messages & Support',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kTextPrimary)),
                ]),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20, color: kTextTertiary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: kDarkSurfaceAlt,
                borderRadius: BorderRadius.circular(AppRadius.sm + 2),
                border: Border.all(color: const Color(0xFF1B5E5B)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _recipient = 'admin'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        decoration: BoxDecoration(
                          color: _recipient == 'admin' ? kTurquoise : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                        ),
                        child: Center(
                          child: Text(
                            'Admin Support',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: _recipient == 'admin' ? Colors.white : kTextTertiary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _recipient = 'staff'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        decoration: BoxDecoration(
                          color: _recipient == 'staff' ? kTurquoise : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                        ),
                        child: Center(
                          child: Text(
                            'Staff',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: _recipient == 'staff' ? Colors.white : kTextTertiary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFF1B5E5B)),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 60, height: 60,
                              decoration: BoxDecoration(
                                  color: kTurquoise.withValues(alpha: 0.15), shape: BoxShape.circle),
                              child: const Icon(Icons.chat_bubble_outline_rounded,
                                  color: kTurquoise, size: 26),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'No messages with ${_recipient == 'admin' ? 'Admin' : 'Staff'} yet',
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: kTextPrimary),
                            ),
                            const SizedBox(height: 4),
                            const Text('Type below to start the conversation.',
                                style: TextStyle(fontSize: 12, color: kTextTertiary)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        itemBuilder: (ctx, i) {
                          final msg = filtered[i];
                          final isMe = msg['sender'] == 'client';
                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
                              decoration: BoxDecoration(
                                color: isMe ? kTurquoise : kDarkSurfaceAlt,
                                border: isMe ? null : Border.all(color: const Color(0xFF1B5E5B)),
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(AppRadius.md),
                                  topRight: const Radius.circular(AppRadius.md),
                                  bottomLeft: Radius.circular(isMe ? AppRadius.md : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : AppRadius.md),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    msg['text'] ?? '',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      height: 1.35,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Text(
                                    msg['time'] ?? '',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      color: isMe
                                          ? Colors.white.withValues(alpha: 0.75)
                                          : kTextTertiary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            decoration: const BoxDecoration(
              color: kDarkSurface,
              border: Border(top: BorderSide(color: Color(0xFF1B5E5B))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                    style: const TextStyle(color: Colors.white, fontSize: 13.5),
                    decoration: InputDecoration(
                      hintText: 'Message ${_recipient == 'admin' ? 'Admin' : 'Staff'}...',
                      hintStyle: const TextStyle(color: kTextTertiary, fontSize: 13),
                      filled: true,
                      fillColor: kDarkSurfaceAlt,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          borderSide: const BorderSide(color: Color(0xFF1B5E5B))),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          borderSide: const BorderSide(color: Color(0xFF1B5E5B))),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          borderSide: const BorderSide(color: kTurquoise, width: 1.5)),
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 44, height: 44,
                    decoration: const BoxDecoration(
                      color: kTurquoise,
                      shape: BoxShape.circle,
                    ),
                    child: _sending
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded, color: Colors.white, size: 19),
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

// ─── CALABARZON Places Data ────────────────────────────────────────────────────
const Map<String, List<String>> kCalabarzonPlaces = {
  'Batangas': ['Agoncillo','Alitagtag','Balayan','Balete','Batangas City','Bauan','Calaca','Calatagan','Cuenca','Ibaan','Laurel','Lemery','Lian','Lipa City','Lobo','Mabini','Malvar','Mataasnakahoy','Nasugbu','Padre Garcia','Rosario','San Jose','San Juan','San Luis','San Nicolas','San Pascual','Santa Teresita','Santo Tomas City','Taal','Talisay','Tanauan City','Taysan','Tingloy','Tuy'],
  'Cavite': ['Alfonso','Amadeo','Bacoor City','Carmona','Cavite City','Dasmariñas City','General Emilio Aguinaldo','General Mariano Alvarez','General Trias City','Imus City','Indang','Kawit','Magallanes','Maragondon','Mendez','Naic','Noveleta','Rosario','Silang','Tagaytay City','Tanza','Ternate','Trece Martires City'],
  'Laguna': ['Alaminos','Bay','Biñan City','Cabuyao City','Calamba City','Calauan','Cavinti','Famy','Kalayaan','Liliw','Los Baños','Luisiana','Lumban','Mabitac','Magdalena','Majayjay','Nagcarlan','Paete','Pagsanjan','Pakil','Pangil','Pila','Rizal','San Pablo City','San Pedro City','Santa Cruz','Santa Maria','Santa Rosa City','Siniloan','Victoria'],
  'Quezon': ['Agdangan','Alabat','Atimonan','Buenavista','Burdeos','Calauag','Candelaria','Catanauan','Dolores','General Luna','General Nakar','Guinayangan','Gumaca','Infanta','Jomalig','Lopez','Lucban','Lucena City','Macalelon','Mauban','Mulanay','Padre Burgos','Pagbilao','Panukulan','Patnanungan','Perez','Pitogo','Plaridel','Polillo','Quezon','Real','Sampaloc','San Andres','San Antonio','San Francisco','San Narciso','Sariaya','Tagkawayan','Tayabas City','Tiaong','Unisan'],
  'Rizal': ['Angono','Antipolo City','Baras','Binangonan','Cainta','Cardona','Jalajala','Morong','Pililla','Rodriguez','San Mateo','Tanay','Taytay','Teresa'],
};

// ─── Edit Profile Modal Content ───────────────────────────────────────────────
class _EditProfileModalContent extends StatefulWidget {
  final ClientModel client;
  final ValueChanged<ClientModel> onUpdated;
  const _EditProfileModalContent({required this.client, required this.onUpdated});

  @override
  State<_EditProfileModalContent> createState() => _EditProfileModalContentState();
}

class _EditProfileModalContentState extends State<_EditProfileModalContent> {
  static String _cleanPhone(String? val) {
    if (val == null) return '';
    var p = val.trim().replaceAll(RegExp(r'[\s-]'), '');
    if (p.startsWith('+63')) {
      p = '0${p.substring(3)}';
    } else if (p.startsWith('63') && p.length == 12) {
      p = '0${p.substring(2)}';
    }
    return p;
  }

  late final TextEditingController _firstNameCtrl = TextEditingController(text: widget.client.firstName);
  late final TextEditingController _middleNameCtrl = TextEditingController(text: widget.client.middleName);
  late final TextEditingController _lastNameCtrl = TextEditingController(text: widget.client.lastName);
  late final TextEditingController _usernameCtrl = TextEditingController(text: widget.client.username);
  late final TextEditingController _passwordCtrl = TextEditingController();
  late final TextEditingController _birthdateCtrl = TextEditingController(text: widget.client.birthdate);
  late final TextEditingController _phoneCtrl = TextEditingController(text: _cleanPhone(widget.client.phone));
  late final TextEditingController _emailCtrl = TextEditingController(text: widget.client.email);
  late final TextEditingController _emergencyContactCtrl = TextEditingController(text: widget.client.emergencyContact);
  late final TextEditingController _emergencyNumberCtrl = TextEditingController(text: _cleanPhone(widget.client.emergencyNumber));

  // Address fields
  String? _selectedProvince;
  String? _selectedCity;
  late final TextEditingController _barangayCtrl = TextEditingController();
  late final TextEditingController _streetCtrl = TextEditingController();

  bool _saving = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _parseAddress(widget.client.address);
  }

  /// Parse an existing address string like:
  /// "123 Ilaya St, Brgy. Poblacion, Lipa City, Batangas, CALABARZON"
  void _parseAddress(String raw) {
    if (raw.isEmpty) return;
    // Split by comma
    final parts = raw.split(',').map((s) => s.trim()).toList();
    // Try to find province from the end of the string
    String? province;
    String? city;
    String? barangay;
    String? street;

    for (final prov in kCalabarzonPlaces.keys) {
      if (raw.contains(prov)) {
        province = prov;
        final cities = kCalabarzonPlaces[prov]!;
        for (final c in cities) {
          if (raw.contains(c)) {
            city = c;
            break;
          }
        }
        break;
      }
    }

    // Remaining parts become barangay and street
    if (parts.length >= 2) {
      // Find city index in parts
      int cityIdx = -1;
      if (city != null) {
        for (int i = 0; i < parts.length; i++) {
          if (parts[i].contains(city)) { cityIdx = i; break; }
        }
      }
      if (cityIdx >= 2) {
        barangay = parts[cityIdx - 1];
        street = parts.sublist(0, cityIdx - 1).join(', ');
      } else if (cityIdx == 1) {
        barangay = '';
        street = parts[0];
      } else if (cityIdx == -1 && parts.isNotEmpty) {
        street = parts[0];
      }
    }

    _selectedProvince = province;
    _selectedCity = city;
    _barangayCtrl.text = barangay ?? '';
    _streetCtrl.text = street ?? '';
  }

  String _buildFullAddress() {
    final parts = <String>[];
    final st = _streetCtrl.text.trim();
    final brgy = _barangayCtrl.text.trim();
    if (st.isNotEmpty) parts.add(st);
    if (brgy.isNotEmpty) parts.add(brgy);
    if (_selectedCity != null && _selectedCity!.isNotEmpty) parts.add(_selectedCity!);
    if (_selectedProvince != null && _selectedProvince!.isNotEmpty) parts.add(_selectedProvince!);
    parts.add('CALABARZON');
    return parts.join(', ');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _birthdateCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _barangayCtrl.dispose();
    _streetCtrl.dispose();
    _emergencyContactCtrl.dispose();
    _emergencyNumberCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    final fn = _firstNameCtrl.text.trim();
    final ln = _lastNameCtrl.text.trim();
    final un = _usernameCtrl.text.trim();

    if (fn.isEmpty || ln.isEmpty || un.isEmpty) {
      setState(() => _errorMsg = 'First name, last name, and username are required.');
      return;
    }

    final phone = _cleanPhone(_phoneCtrl.text);
    final emergencyPhone = _cleanPhone(_emergencyNumberCtrl.text);

    if (phone.isNotEmpty && !RegExp(r'^09\d{9}$').hasMatch(phone)) {
      setState(() => _errorMsg = 'Phone number must be 11 digits starting with 09 (e.g. 09123456789).');
      return;
    }

    if (emergencyPhone.isNotEmpty && !RegExp(r'^09\d{9}$').hasMatch(emergencyPhone)) {
      setState(() => _errorMsg = 'Emergency phone number must be 11 digits starting with 09.');
      return;
    }

    setState(() {
      _saving = true;
      _errorMsg = null;
    });

    try {
      final body = {
        'first_name': fn,
        'middle_name': _middleNameCtrl.text.trim(),
        'last_name': ln,
        'username': un,
        'password': _passwordCtrl.text.trim(),
        'birthdate': _birthdateCtrl.text.trim(),
        'contact_number': phone,
        'email': _emailCtrl.text.trim(),
        'address': _buildFullAddress(),
        'region': 'CALABARZON',
        'province': _selectedProvince ?? '',
        'city_municipality': _selectedCity ?? '',
        'barangay': _barangayCtrl.text.trim(),
        'street': _streetCtrl.text.trim(),
        'emergency_contact': _emergencyContactCtrl.text.trim(),
        'emergency_number': emergencyPhone,
      };

      final res = await patchApi(
        '/clients/me',
        headers: {
          'Authorization': 'Bearer ${widget.client.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );

      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        final updatedData = Map<String, dynamic>.from(data['client']);
        updatedData['token'] = widget.client.token;
        final updatedClient = ClientModel.fromJson(updatedData);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('heiwa_session_client', jsonEncode(updatedClient.toJson()));

        widget.onUpdated(updatedClient);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile updated successfully! Changes reflected on admin system.'),
              backgroundColor: kEmerald,
            ),
          );
        }
      } else {
        setState(() => _errorMsg = data['message'] ?? 'Failed to update profile');
      }
    } catch (e) {
      setState(() => _errorMsg = 'Network error: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: kDarkSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 38, height: 4,
            decoration: BoxDecoration(color: const Color(0xFF1B5E5B), borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(children: [
                  Container(
                    width: 34, height: 34,
                    decoration: BoxDecoration(
                      color: kTurquoise.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(AppRadius.xs + 2),
                    ),
                    child: const Icon(Icons.edit_rounded, color: kTurquoiseLight, size: 19),
                  ),
                  const SizedBox(width: 11),
                  const Text('Edit profile information',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kTextPrimary)),
                ]),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20, color: kTextTertiary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFF1B5E5B)),
          if (_errorMsg != null)
            Container(
              width: double.infinity,
              color: AppColors.dangerTint,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 17, color: AppColors.danger),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(_errorMsg!,
                        style: const TextStyle(
                            color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _fieldLabel('PERSONAL DETAILS'),
                  _inputTile(controller: _firstNameCtrl, label: 'First Name', icon: Icons.person_rounded),
                  _inputTile(controller: _middleNameCtrl, label: 'Middle Name (Optional)', icon: Icons.person_outline_rounded),
                  _inputTile(controller: _lastNameCtrl, label: 'Last Name', icon: Icons.person_rounded),
                  _inputTile(controller: _birthdateCtrl, label: 'Birthdate (YYYY-MM-DD)', icon: Icons.cake_rounded),

                  const SizedBox(height: 10),
                  _fieldLabel('CONTACT INFORMATION'),
                  _inputTile(controller: _phoneCtrl, label: 'Phone Number', icon: Icons.phone_rounded),
                  _inputTile(controller: _emailCtrl, label: 'Recovery Email', icon: Icons.email_outlined),

                  const SizedBox(height: 10),
                  _fieldLabel('ADDRESS — CALABARZON'),

                  // Region (locked)
                  _addressLabel('Region'),
                  _lockedTile('Region IV-A (CALABARZON)', Icons.map_outlined),

                  // Province dropdown
                  _addressLabel('Province'),
                  _dropdownTile(
                    value: _selectedProvince,
                    hint: 'Select province',
                    items: kCalabarzonPlaces.keys.toList(),
                    onChanged: (val) => setState(() {
                      _selectedProvince = val;
                      _selectedCity = null;
                    }),
                  ),

                  const SizedBox(height: 14),
                  // City / Municipality dropdown
                  _addressLabel('City / Municipality'),
                  _dropdownTile(
                    value: _selectedCity,
                    hint: _selectedProvince == null ? 'Select province first' : 'Select city / municipality',
                    items: _selectedProvince != null ? kCalabarzonPlaces[_selectedProvince!]! : [],
                    onChanged: _selectedProvince == null ? null : (val) => setState(() => _selectedCity = val),
                    enabled: _selectedProvince != null,
                  ),

                  const SizedBox(height: 14),
                  // Barangay text field
                  _inputTile(
                    controller: _barangayCtrl,
                    label: 'Barangay',
                    icon: Icons.holiday_village_outlined,
                  ),

                  // Street / House No.
                  _inputTile(
                    controller: _streetCtrl,
                    label: 'Street / House No.',
                    icon: Icons.signpost_outlined,
                  ),

                  const SizedBox(height: 10),
                  _fieldLabel('EMERGENCY CONTACT'),
                  _inputTile(controller: _emergencyContactCtrl, label: 'Emergency Contact Name', icon: Icons.contact_phone_rounded),
                  _inputTile(controller: _emergencyNumberCtrl, label: 'Emergency Phone Number', icon: Icons.phone_callback_rounded),

                  const SizedBox(height: 10),
                  _fieldLabel('ACCOUNT CREDENTIALS'),
                  _inputTile(controller: _usernameCtrl, label: 'Username', icon: Icons.alternate_email_rounded),
                  _inputTile(controller: _passwordCtrl, label: 'New Password (optional)', icon: Icons.lock_outline_rounded, isPassword: true),

                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kTurquoise,
                        foregroundColor: Colors.white,
                        shape: const RoundedRectangleBorder(borderRadius: AppRadius.buttonBR),
                        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save profile changes'),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _addressLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: kTextSecondary),
      ),
    );
  }

  Widget _lockedTile(String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: kDarkSurfaceAlt.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: const Color(0xFF1B5E5B)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 19, color: kTurquoise.withValues(alpha: 0.5)),
            const SizedBox(width: 10),
            Text(value,
                style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: kTextTertiary,
                )),
            const Spacer(),
            const Icon(Icons.lock_outline_rounded, size: 15, color: kTextTertiary),
          ],
        ),
      ),
    );
  }

  Widget _dropdownTile({
    required String? value,
    required String hint,
    required List<String> items,
    required ValueChanged<String?>? onChanged,
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 0),
      child: Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: enabled ? kDarkSurfaceAlt : kDarkSurfaceAlt.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: const Color(0xFF1B5E5B)),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: value,
            hint: Text(hint,
                style: TextStyle(
                  fontSize: 12.5,
                  color: enabled ? kTextTertiary : kTextTertiary.withValues(alpha: 0.5),
                )),
            icon: Icon(Icons.keyboard_arrow_down_rounded,
                color: enabled ? kTurquoise : kTurquoise.withValues(alpha: 0.4)),
            isExpanded: true,
            dropdownColor: kDarkSurface,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: kTextPrimary),
            onChanged: enabled ? onChanged : null,
            items: items.map((item) => DropdownMenuItem(
              value: item,
              child: Text(item, style: const TextStyle(fontSize: 13, color: kTextPrimary)),
            )).toList(),
          ),
        ),
      ),
    );
  }

  Widget _fieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 12),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: kTurquoise,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _inputTile({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: kTextSecondary,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controller,
            obscureText: isPassword,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: kTextPrimary,
            ),
            decoration: InputDecoration(
              hintText: isPassword ? 'Leave blank to keep current password' : 'Enter $label',
              hintStyle: const TextStyle(
                fontSize: 12.5,
                color: kTextTertiary,
              ),
              prefixIcon: Icon(icon, size: 19, color: kTurquoise),
              filled: true,
              fillColor: kDarkSurfaceAlt,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                borderSide: const BorderSide(color: Color(0xFF1B5E5B)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                borderSide: const BorderSide(color: Color(0xFF1B5E5B)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                borderSide: const BorderSide(color: kTurquoise, width: 1.8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}


// ── Floating navigation item widget ──────────────────────────────────────────
class _FloatingNavItem extends StatelessWidget {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  const _FloatingNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.color,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          border: isActive
              ? Border.all(color: color.withValues(alpha: 0.35), width: 1)
              : null,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isActive ? activeIcon : icon,
                size: 20,
                color: isActive ? color : const Color(0xFF4A6070),
              ),
              const SizedBox(height: 2),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                  color: isActive ? color : const Color(0xFF4A6070),
                  letterSpacing: isActive ? 0.2 : 0,
                ),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    label,
                    maxLines: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini arc / donut painter for report metric cards
// ─────────────────────────────────────────────────────────────────────────────
class _ArcPainter extends CustomPainter {
  final double progress;
  final Color color;

  const _ArcPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 3.5;
    final rect = Rect.fromLTWH(
        strokeWidth / 2, strokeWidth / 2,
        size.width - strokeWidth, size.height - strokeWidth);

    // Track (background arc)
    canvas.drawArc(
      rect,
      3.14 * 0.7,   // start at ~7 o'clock
      3.14 * 1.6,   // 288 degrees sweep
      false,
      Paint()
        ..color = color.withValues(alpha: 0.15)
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round,
    );

    // Filled arc
    if (progress > 0) {
      canvas.drawArc(
        rect,
        3.14 * 0.7,
        3.14 * 1.6 * progress,
        false,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(_ArcPainter old) =>
      old.progress != progress || old.color != color;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline / wave painter for report card illustration strips
// ─────────────────────────────────────────────────────────────────────────────
class _SparklinePainter extends CustomPainter {
  final List<double> data;
  final Color color;

  const _SparklinePainter({required this.data, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;
    final maxVal = data.reduce((a, b) => a > b ? a : b);
    final safeMax = maxVal == 0 ? 1.0 : maxVal;

    final step = size.width / (data.length - 1).clamp(1, data.length);
    final points = List.generate(data.length, (i) {
      final x = i * step;
      final y = size.height - (data[i] / safeMax) * (size.height * 0.72) - 4;
      return Offset(x, y);
    });

    // Filled area below the line
    final fillPath = Path()..moveTo(0, size.height);
    for (final p in points) { fillPath.lineTo(p.dx, p.dy); }
    fillPath.lineTo(size.width, size.height);
    fillPath.close();
    canvas.drawPath(
      fillPath,
      Paint()
        ..shader = LinearGradient(
            colors: [color.withValues(alpha: 0.25), color.withValues(alpha: 0.0)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
        ..style = PaintingStyle.fill,
    );

    // Stroke line
    final linePath = Path()..moveTo(points[0].dx, points[0].dy);
    for (int i = 1; i < points.length; i++) {
      final cp = Offset(
        (points[i - 1].dx + points[i].dx) / 2,
        (points[i - 1].dy + points[i].dy) / 2,
      );
      linePath.quadraticBezierTo(
          points[i - 1].dx, points[i - 1].dy, cp.dx, cp.dy);
    }
    linePath.lineTo(points.last.dx, points.last.dy);
    canvas.drawPath(
      linePath,
      Paint()
        ..color = color.withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round,
    );

    // Dot at last point
    canvas.drawCircle(
      points.last,
      3,
      Paint()..color = color,
    );
  }

  @override
  bool shouldRepaint(_SparklinePainter old) =>
      old.data != data || old.color != color;
}