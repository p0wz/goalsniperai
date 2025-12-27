import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/animations/scale_button.dart';
import '../../widgets/animations/staggered_list.dart';
import '../../widgets/loaders/skeleton_card.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
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
    if (_isLoading) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: const [
            SkeletonCard(height: 200, borderRadius: BorderRadius.all(Radius.circular(24))),
            SizedBox(height: 24),
            SkeletonCard(height: 100),
            SkeletonCard(height: 100),
          ],
        ),
      );
    }

    final winRate = _stats?['winRate'] ?? 0;
    final totalBets = _stats?['totalBets'] ?? 0;
    final won = _stats?['won'] ?? 0;
    final lost = _stats?['lost'] ?? 0;
    final profit = _stats?['profit'] ?? 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadStats,
        child: StaggeredList(
          padding: const EdgeInsets.all(16),
          children: [
            // Hero Card
            ScaleButton(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: AppColors.primaryGradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.4),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Text(
                      'Win Rate',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$winRate%',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Last 30 Days',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Overview',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 16),
            
            // Stats Grid (Row by Row)
            Row(
              children: [
                Expanded(
                  child: ScaleButton(
                    child: _buildStatCard(
                      'Total Bets',
                      totalBets.toString(),
                      Icons.sports_soccer,
                      Colors.blue,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ScaleButton(
                    child: _buildStatCard(
                      'Profit',
                      '${profit > 0 ? '+' : ''}$profit u',
                      Icons.trending_up,
                      AppColors.success,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ScaleButton(
                    child: _buildStatCard(
                      'Won',
                      won.toString(),
                      Icons.check_circle,
                      AppColors.success,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ScaleButton(
                    child: _buildStatCard(
                      'Lost',
                      lost.toString(),
                      Icons.cancel,
                      AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      hasGradientBorder: true, // Premium border for stats
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 24),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.text,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
