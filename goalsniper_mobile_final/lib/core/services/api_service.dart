import 'dart:convert';
import 'package:http/http.dart' as http;

/// API Service for communicating with GoalSniper backend
class ApiService {
  // Base URL for the backend API
  // Change this to your production URL when deploying
  static const String baseUrl = 'https://goalgpt-pro.onrender.com';
  // static const String baseUrl = 'http://localhost:3000'; // For local testing
  
  String? _authToken;

  /// Set authentication token for authorized requests
  void setAuthToken(String? token) {
    _authToken = token;
  }

  /// Get common headers including auth if available
  Map<String, String> get _headers {
    final headers = {'Content-Type': 'application/json'};
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 📊 STATS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get overall statistics
  Future<Map<String, dynamic>?> getStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/stats'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['stats'];
        }
      }
      return null;
    } catch (e) {
      print('[ApiService] Stats error: $e');
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 📱 PREDICTIONS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get mobile predictions (picks marked for mobile in admin panel)
  Future<List<Map<String, dynamic>>> getPredictions() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/picks'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['picks'] != null) {
          return List<Map<String, dynamic>>.from(data['picks']);
        }
      }
      return [];
    } catch (e) {
      print('[ApiService] Predictions error: $e');
      return [];
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 🔐 AUTH
  // ════════════════════════════════════════════════════════════════════════════

  /// Login with email and password
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
          _authToken = data['token'];
          return data;
        }
      }
      return null;
    } catch (e) {
      print('[ApiService] Login error: $e');
      return null;
    }
  }

  /// Register new account
  Future<Map<String, dynamic>?> register(String name, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'email': email, 'password': password}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
          _authToken = data['token'];
          return data;
        }
      }
      return null;
    } catch (e) {
      print('[ApiService] Register error: $e');
      return null;
    }
  }

  /// Get user profile
  Future<Map<String, dynamic>?> getProfile() async {
    if (_authToken == null) return null;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/profile'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['user'];
        }
      }
      return null;
    } catch (e) {
      print('[ApiService] Profile error: $e');
      return null;
    }
  }
}
