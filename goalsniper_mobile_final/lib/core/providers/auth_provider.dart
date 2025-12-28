import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User Tiers:
/// - guest: Not logged in, limited access
/// - free: Registered but not subscribed, partial access
/// - pro: Subscribed, full access
enum UserTier { guest, free, pro }

/// AuthProvider manages authentication state and user tier
class AuthProvider extends ChangeNotifier {
  UserTier _tier = UserTier.guest;
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  UserTier get tier => _tier;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  
  bool get isGuest => _tier == UserTier.guest;
  bool get isFree => _tier == UserTier.free;
  bool get isPro => _tier == UserTier.pro;
  
  /// Check if user can access locked content
  bool get canAccessPremium => _tier == UserTier.pro;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();
    
    final prefs = await SharedPreferences.getInstance();
    final savedTier = prefs.getString('user_tier');
    final savedName = prefs.getString('user_name');
    final savedEmail = prefs.getString('user_email');

    if (savedTier != null) {
      _tier = UserTier.values.firstWhere(
        (t) => t.name == savedTier,
        orElse: () => UserTier.guest,
      );
      if (savedName != null || savedEmail != null) {
        _user = {
          'name': savedName ?? 'Kullanıcı',
          'email': savedEmail ?? '',
        };
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Continue as guest (skip login)
  void continueAsGuest() {
    _tier = UserTier.guest;
    _user = null;
    _saveState();
    notifyListeners();
  }

  /// Register a new user (becomes free tier)
  Future<bool> register(String name, String email, String password) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    _tier = UserTier.free;
    _user = {'name': name, 'email': email};
    await _saveState();
    notifyListeners();
    return true;
  }

  /// Login existing user
  Future<bool> login(String email, String password) async {
    // Simulate API call
    await Future.delayed(const Duration(seconds: 1));
    
    // Mock: check if this is a "pro" user (for demo, any email with "pro" becomes pro)
    final isPro = email.toLowerCase().contains('pro');
    
    _tier = isPro ? UserTier.pro : UserTier.free;
    _user = {'name': email.split('@').first, 'email': email};
    await _saveState();
    notifyListeners();
    return true;
  }

  /// Upgrade to Pro tier (after subscription)
  Future<void> upgradeToPro() async {
    if (_tier == UserTier.guest) return; // Must be logged in first
    
    _tier = UserTier.pro;
    await _saveState();
    notifyListeners();
  }

  /// Logout and return to guest
  Future<void> logout() async {
    _tier = UserTier.guest;
    _user = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_tier');
    await prefs.remove('user_name');
    await prefs.remove('user_email');
    
    notifyListeners();
  }

  Future<void> _saveState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_tier', _tier.name);
    if (_user != null) {
      await prefs.setString('user_name', _user!['name'] ?? '');
      await prefs.setString('user_email', _user!['email'] ?? '');
    }
  }
}
