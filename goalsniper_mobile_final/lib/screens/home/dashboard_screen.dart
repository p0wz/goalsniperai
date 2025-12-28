import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/api_service.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stat_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    final stats = await _api.getStats();
    if (mounted) {
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final userName = auth.user?['name'] ?? 'Misafir';

    final winRate = _stats?['winRate'] ?? 78;
    final won = _stats?['won'] ?? 0;
    final lost = _stats?['lost'] ?? 0;
    final pending = _stats?['pending'] ?? 0;
    final total = _stats?['total'] ?? 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _loadStats,
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Merhaba, $userName 👋', style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 4),
                        Text('Güncel istatistikler', style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                    GestureDetector(
                      onTap: () {},
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border.withOpacity(0.5)),
                          boxShadow: AppColors.shadowSm,
                        ),
                        child: const Icon(Icons.notifications_outlined, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Win Rate Hero Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: AppColors.glowPrimary,
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Kazanma Oranı', style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w500)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                            child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.trending_up, color: Colors.white, size: 16), SizedBox(width: 4), Text('+5%', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text('$winRate%', style: const TextStyle(color: Colors.white, fontSize: 56, fontWeight: FontWeight.w800, letterSpacing: -2)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                        child: const Text('Son 30 Gün', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Stats Grid
                Text('İstatistikler', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                
                if (_isLoading)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  Row(
                    children: [
                      Expanded(child: StatCard(title: 'Kazandı', value: won.toString(), icon: Icons.check_circle_rounded, color: AppColors.win)),
                      const SizedBox(width: 12),
                      Expanded(child: StatCard(title: 'Kaybetti', value: lost.toString(), icon: Icons.cancel_rounded, color: AppColors.lose)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: StatCard(title: 'Bekliyor', value: pending.toString(), icon: Icons.access_time_rounded, color: AppColors.draw)),
                      const SizedBox(width: 12),
                      Expanded(child: StatCard(title: 'Toplam', value: total.toString(), icon: Icons.sports_soccer_rounded, color: AppColors.primary)),
                    ],
                  ),
                ],

                const SizedBox(height: 24),

                // Upgrade Banner (for non-pro users)
                if (!auth.isPro)
                  GestureDetector(
                    onTap: () {
                      // Navigate to subscription
                    },
                    child: GlassCard(
                      gradient: AppColors.premiumGradient,
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                              child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("Pro'ya Yükselt", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text('Tüm tahminlere erişim sağla', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 18),
                          ],
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
}
