import 'package:flutter/material.dart';

class AppColors {
  // Converted from HSL in betting-buddy-ai
  
  // --background: 220 20% 6%
  static const Color bg = Color(0xFF0C0E12); // #0C0E12
  
  // --secondary: 220 14% 16% (Used for inputs/backgrounds)
  static const Color bgSecondary = Color(0xFF23262D); // Adjusted for better visibility
  
  // --card: 220 18% 10%
  static const Color card = Color(0xFF15181E); // #15181E
  
  // Darker card for contrast
  static const Color cardDark = Color(0xFF101216);

  // --primary: 142 70% 45%
  static const Color primary = Color(0xFF22C55E); // #22C55E
  static const Color primaryDark = Color(0xFF16A34A);
  static const Color primaryLight = Color(0xFF4ADE80);

  // --accent: 38 92% 50%
  static const Color accent = Color(0xFFF59E0B); // #F59E0B
  static const Color accentLight = Color(0xFFFBBF24);

  // Text
  static const Color text = Color(0xFFFAFAFA);
  static const Color textMuted = Color(0xFF9CA3AF); // slate-400

  // --border: 220 14% 18%
  static const Color border = Color(0xFF2E333D); // #2E333D

  // Status
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  
  // Custom
  static const Color live = Color(0xFFEF4444);
  
  // Gradients
  static const List<Color> primaryGradient = [
    Color(0xFF22C55E),
    Color(0xFF16A34A),
  ];
  
  static const List<Color> cardGradient = [
    Color(0xCC15181E), // 80% opacity
    Color(0xCC101216),
  ];
}
