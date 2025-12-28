import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../widgets/glass_card.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final isGuest = auth.isGuest;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 20),
              // Profile Header
              GlassCard(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        shape: BoxShape.circle,
                        boxShadow: AppColors.glowPrimary,
                      ),
                      child: Icon(isGuest ? Icons.person_outline : Icons.person, size: 40, color: Colors.white),
                    ),
                    const SizedBox(height: 16),
                    Text(isGuest ? 'Misafir Kullanıcı' : (user?['name'] ?? 'Kullanıcı'), style: Theme.of(context).textTheme.headlineMedium),
                    if (!isGuest && user?['email'] != null) ...[
                      const SizedBox(height: 4),
                      Text(user!['email'], style: Theme.of(context).textTheme.bodyMedium),
                    ],
                    const SizedBox(height: 16),
                    if (isGuest)
                      ElevatedButton(onPressed: () {}, child: const Text('Giriş Yap / Kayıt Ol'))
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: auth.isPro ? AppColors.accent.withOpacity(0.1) : AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: auth.isPro ? AppColors.accent : AppColors.primary, width: 1),
                        ),
                        child: Text(
                          auth.isPro ? '⭐ PRO Üye' : 'Ücretsiz Plan',
                          style: TextStyle(color: auth.isPro ? AppColors.accent : AppColors.primary, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Menu Items
              if (!isGuest) ...[
                _menuItem(context, Icons.credit_card, 'Abonelik', 'Planını yönet'),
                const SizedBox(height: 12),
                _menuItem(context, Icons.history, 'Geçmiş', 'Son aktiviteler'),
                const SizedBox(height: 12),
              ],
              _menuItem(context, Icons.settings_outlined, 'Ayarlar', 'Uygulama tercihleri'),
              const SizedBox(height: 12),
              _menuItem(context, Icons.help_outline, 'Destek', 'Bize ulaşın'),
              const SizedBox(height: 24),
              // Logout
              if (!isGuest)
                GestureDetector(
                  onTap: () => auth.logout(),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: AppColors.lose.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.lose.withOpacity(0.3)),
                    ),
                    child: const Center(child: Text('Çıkış Yap', style: TextStyle(color: AppColors.lose, fontWeight: FontWeight.bold))),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _menuItem(BuildContext context, IconData icon, String title, String subtitle) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.secondary, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: AppColors.textSecondary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                Text(subtitle, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: AppColors.textSecondary, size: 20),
        ],
      ),
    );
  }
}
