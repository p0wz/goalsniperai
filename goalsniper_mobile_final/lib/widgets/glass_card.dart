import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Gradient? gradient;
  final double borderRadius;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.gradient,
    this.borderRadius = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient,
        color: gradient == null ? AppColors.surface : null,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: AppColors.border.withOpacity(0.5), width: 1),
        boxShadow: AppColors.shadowSm,
      ),
      child: padding != null ? Padding(padding: padding!, child: child) : child,
    );
  }
}
