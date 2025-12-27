import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final Dio _dio = Dio();
  final _storage = const FlutterSecureStorage();
  final String _baseUrl = 'https://goalsniperai.onrender.com';

  ApiService() {
    _dio.options.baseUrl = _baseUrl;
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  Future<String?> _getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<List<dynamic>> getSignals() async {
    try {
      final token = await _getToken();
      final response = await _dio.get(
        '/api/signals',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        if (response.data['signals'] != null) {
          return response.data['signals'];
        } else if (response.data is List) {
          return response.data;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getApprovedBets() async {
    try {
      final token = await _getToken();
      final response = await _dio.get(
        '/api/mobile/picks',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['picks'] ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> getStats() async {
    try {
      final token = await _getToken();
      final response = await _dio.get(
        '/api/mobile/stats',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['stats'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final token = await _getToken();
      final response = await _dio.get(
        '/api/mobile/profile',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['user'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
