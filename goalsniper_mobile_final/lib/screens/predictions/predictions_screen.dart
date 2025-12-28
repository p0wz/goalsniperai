import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/api_service.dart';
import '../../widgets/glass_card.dart';

class PredictionsScreen extends StatefulWidget {
  const PredictionsScreen({super.key});

  @override
  State<PredictionsScreen> createState() => _PredictionsScreenState();
}

class _PredictionsScreenState extends State<PredictionsScreen> {
  final ApiService _api = ApiService();
  String _filter = 'Tümü';
  List<Map<String, dynamic>> _predictions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPredictions();
  }

  Future<void> _loadPredictions() async {
    setState(() => _isLoading = true);
    final picks = await _api.getPredictions();
    if (mounted) {
      setState(() {
        _predictions = picks;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    
    final filtered = _predictions.where((p) {
      if (_filter == 'Tümü') return true;
      if (_filter == 'Kazandı') return p['status'] == 'WON';
      if (_filter == 'Kaybetti') return p['status'] == 'LOST';
      return p['status'] == 'PENDING';
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _loadPredictions,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Tahminler', style: Theme.of(context).textTheme.headlineMedium),
                    if (!auth.isPro)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(gradient: AppColors.accentGradient, borderRadius: BorderRadius.circular(20)),
                        child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.lock, color: Colors.white, size: 14), SizedBox(width: 4), Text('PRO', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))]),
                      ),
                  ],
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(children: ['Tümü', 'Kazandı', 'Kaybetti', 'Bekliyor'].map((l) => Padding(padding: const EdgeInsets.only(right: 8), child: _chip(l))).toList()),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.sports_soccer, size: 64, color: AppColors.textSecondary.withOpacity(0.3)),
                                const SizedBox(height: 16),
                                Text('Henüz tahmin yok', style: Theme.of(context).textTheme.titleMedium),
                                const SizedBox(height: 4),
                                Text('Admin panelden tahmin eklendiğinde burada görünecek', style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: filtered.length,
                            itemBuilder: (ctx, i) => _card(filtered[i], auth),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String label) {
    final sel = _filter == label;
    return GestureDetector(
      onTap: () => setState(() => _filter = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(gradient: sel ? AppColors.primaryGradient : null, color: sel ? null : AppColors.surface, borderRadius: BorderRadius.circular(12), border: sel ? null : Border.all(color: AppColors.border)),
        child: Text(label, style: TextStyle(color: sel ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _card(Map<String, dynamic> p, AuthProvider auth) {
    final locked = p['isLocked'] == true;
    final color = p['status'] == 'WON' ? AppColors.win : p['status'] == 'LOST' ? AppColors.lose : AppColors.draw;
    final homeTeam = p['homeTeam'] ?? p['match']?.split(' vs ').first ?? 'Takım A';
    final awayTeam = p['awayTeam'] ?? p['match']?.split(' vs ').last ?? 'Takım B';
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: locked ? () => _showLocked() : null,
        child: GlassCard(
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(p['league'] ?? 'League', style: Theme.of(context).textTheme.bodySmall),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)), child: Text('${p['odds'] ?? 1.5}x', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12))),
                  ]),
                  const SizedBox(height: 12),
                  Text('$homeTeam vs $awayTeam', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 12),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Row(children: [const Icon(Icons.bolt, color: AppColors.accent, size: 16), const SizedBox(width: 4), Text(p['market'] ?? p['prediction'] ?? 'Tahmin', style: const TextStyle(fontWeight: FontWeight.w600))]),
                    if (p['confidence'] != null) Text('%${p['confidence']}', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ]),
                ]),
              ),
              if (locked)
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                      child: Container(color: AppColors.surface.withOpacity(0.7), child: Center(child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), decoration: BoxDecoration(gradient: AppColors.accentGradient, borderRadius: BorderRadius.circular(20)), child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.lock, color: Colors.white, size: 16), SizedBox(width: 6), Text('PRO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))])))),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLocked() {
    showDialog(context: context, builder: (c) => AlertDialog(title: const Text('PRO Üyelik'), content: const Text('Bu tahmini görmek için PRO üye olmalısınız.'), actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('Kapat')), ElevatedButton(onPressed: () => Navigator.pop(c), child: const Text('Abone Ol'))]));
  }
}
