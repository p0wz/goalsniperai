import 'package:flutter/material.dart';

/// AppColors - Light Theme based on betting-buddy-ai design system
/// HSL values converted to Hex for Flutter compatibility
class AppColors {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASE COLORS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /// Background: hsl(220, 30%, 98%) - Ice blue/grey
  static const Color background = Color(0xFFF8FAFC);
  
  /// Surface/Card: Pure white
  static const Color surface = Color(0xFFFFFFFF);
  
  /// Primary: hsl(262, 83%, 58%) - Vibrant Violet
  static const Color primary = Color(0xFF8B5CF6);
  
  /// Secondary: hsl(220, 20%, 94%) - Light grey
  static const Color secondary = Color(0xFFE2E8F0);
  
  /// Accent: hsl(24, 95%, 53%) - Bright Orange
  static const Color accent = Color(0xFFF97316);
  
  /// Border: hsl(220, 15%, 88%)
  static const Color border = Color(0xFFDDE4EC);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT COLORS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /// Primary text: hsl(220, 25%, 12%) - Dark slate
  static const Color textPrimary = Color(0xFF1E293B);
  
  /// Secondary/Muted text: hsl(220, 10%, 45%)
  static const Color textSecondary = Color(0xFF64748B);
  
  /// Inverse text (on dark backgrounds)
  static const Color textInverse = Color(0xFFFFFFFF);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS COLORS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /// Win: hsl(152, 69%, 45%) - Emerald Green
  static const Color win = Color(0xFF10B981);
  
  /// Lose: hsl(0, 84%, 60%) - Red
  static const Color lose = Color(0xFFEF4444);
  
  /// Draw/Pending: hsl(38, 92%, 50%) - Amber
  static const Color draw = Color(0xFFF59E0B);
  
  /// Live indicator (same as lose for urgency)
  static const Color live = Color(0xFFEF4444);

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADIENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /// Primary gradient: Violet to Purple
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFFA855F7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Accent gradient: Orange to Light Orange
  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFFF97316), Color(0xFFFB923C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Success gradient: Emerald shades
  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF34D399)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Premium gradient: Violet -> Purple -> Orange
  static const LinearGradient premiumGradient = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFFF97316)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SHADOWS
  // ═══════════════════════════════════════════════════════════════════════════
  
  static List<BoxShadow> get shadowSm => [
    BoxShadow(
      color: Colors.black.withOpacity(0.04),
      blurRadius: 4,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get shadowMd => [
    BoxShadow(
      color: Colors.black.withOpacity(0.06),
      blurRadius: 6,
      offset: const Offset(0, 2),
    ),
    BoxShadow(
      color: Colors.black.withOpacity(0.04),
      blurRadius: 2,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get shadowLg => [
    BoxShadow(
      color: Colors.black.withOpacity(0.08),
      blurRadius: 12,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get glowPrimary => [
    BoxShadow(
      color: primary.withOpacity(0.25),
      blurRadius: 20,
      spreadRadius: 0,
    ),
  ];

  static List<BoxShadow> get glowWin => [
    BoxShadow(
      color: win.withOpacity(0.25),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];

  static List<BoxShadow> get glowAccent => [
    BoxShadow(
      color: accent.withOpacity(0.25),
      blurRadius: 16,
      spreadRadius: 0,
    ),
  ];
}
