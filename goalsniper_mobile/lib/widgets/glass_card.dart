import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool hasGradientBorder;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.hasGradientBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: margin,
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              padding: const EdgeInsets.all(1), // Space for gradient border
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: hasGradientBorder
                    ? const LinearGradient(
                        colors: [
                          Color(0xFF34D399), // Primary light
                          Color(0xFF22C55E), // Primary
                          Colors.transparent,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: hasGradientBorder ? null : AppColors.card.withOpacity(0.7),
                border: hasGradientBorder
                    ? null
                    : Border.all(
                        color: AppColors.border.withOpacity(0.5),
                        width: 1,
                      ),
              ),
              child: Container(
                padding: padding ?? const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card.withOpacity(0.9), // Inner card color
                  borderRadius: BorderRadius.circular(15), // Slightly smaller to fit inside border
                ),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
