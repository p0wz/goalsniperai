import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../widgets/prediction_card.dart';
import '../../widgets/animations/staggered_list.dart';
import '../../widgets/animations/scale_button.dart';
import '../../widgets/loaders/skeleton_card.dart';

class PredictionsScreen extends StatefulWidget {
  const PredictionsScreen({super.key});

  @override
  State<PredictionsScreen> createState() => _PredictionsScreenState();
}

class _PredictionsScreenState extends State<PredictionsScreen> with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  final List<String> _filters = ['All', 'Pending', 'Won', 'Lost'];
  String _currentFilter = 'All';
  List<dynamic> _predictions = [];
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final predictions = await _api.getApprovedBets();
      final stats = await _api.getStats();

      if (mounted) {
        setState(() {
          _predictions = predictions;
          _stats = stats ?? {};
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredPredictions {
    if (_currentFilter == 'All') return _predictions;
    return _predictions.where((p) => p['status']?.toString().toUpperCase() == _currentFilter.toUpperCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Stats Skeleton
              Row(
                children: List.generate(4, (index) => Expanded(
                  child: Container(
                    height: 60,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                )),
              ),
              const SizedBox(height: 24),
              // List Skeleton
              const StaggeredList(
                padding: EdgeInsets.zero,
                children: [
                   SkeletonCard(height: 160),
                   SkeletonCard(height: 160),
                   SkeletonCard(height: 160),
                ],
              ),
            ],
          ),
        ),
      );
    }

    final total = _stats['total'] ?? 0;
    final won = _stats['won'] ?? 0;
    final lost = _stats['lost'] ?? 0;
    final pending = _stats['pending'] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.track_changes, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Predictions'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: Column(
          children: [
            // Stats Header
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  _buildStatBox('Total', total.toString(), AppColors.text),
                  const SizedBox(width: 8),
                  _buildStatBox('Won', won.toString(), AppColors.success),
                  const SizedBox(width: 8),
                  _buildStatBox('Lost', lost.toString(), AppColors.error),
                  const SizedBox(width: 8),
                  _buildStatBox('Pending', pending.toString(), AppColors.warning),
                ],
              ),
            ),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _filters.map((filter) {
                  final isSelected = _currentFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ScaleButton(
                      child: FilterChip(
                        label: Text(filter),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() => _currentFilter = filter);
                        },
                        backgroundColor: AppColors.card,
                        selectedColor: AppColors.primary.withOpacity(0.2),
                        checkmarkColor: AppColors.primary,
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : AppColors.textMuted,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected ? AppColors.primary : AppColors.border,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            
            const SizedBox(height: 16),

            // List
            Expanded(
              child: _filteredPredictions.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 64, color: AppColors.textMuted.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          const Text('No predictions found', style: TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    )
                  : StaggeredList(
                      padding: const EdgeInsets.all(16),
                      children: _filteredPredictions.map((prediction) {
                        return ScaleButton(
                          child: PredictionCard(prediction: prediction),
                        );
                      }).toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBox(String label, String value, Color color) {
    return Expanded(
      child: ScaleButton(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border(
              left: BorderSide(color: color, width: 3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Text(
                value,
                style: TextStyle(
                  color: color, // Value takes the color
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
