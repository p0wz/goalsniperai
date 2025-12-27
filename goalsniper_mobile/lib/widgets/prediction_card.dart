import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'glass_card.dart';

class PredictionCard extends StatelessWidget {
  final Map<String, dynamic> prediction;

  const PredictionCard({super.key, required this.prediction});

  @override
  Widget build(BuildContext context) {
    final status = (prediction['status'] ?? 'PENDING').toString().toUpperCase();
    final confidence = prediction['confidence'] ?? 0;
    
    Color statusColor;
    IconData statusIcon;
    
    switch (status) {
      case 'WON':
        statusColor = AppColors.success;
        statusIcon = Icons.check_circle;
        break;
      case 'LOST':
        statusColor = AppColors.error;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = AppColors.accent;
        statusIcon = Icons.access_time_filled;
    }

    return Container( // Wrapper for border
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            border: Border(
              left: BorderSide(color: statusColor, width: 4),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: Match & Time
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            prediction['match'] ?? 'Match',
                            style: const TextStyle(
                              color: AppColors.text,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.bgSecondary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  prediction['league'] ?? 'League',
                                  style: const TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                prediction['matchTime'] ?? '',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Icon(statusIcon, color: statusColor, size: 20),
                  ],
                ),
                
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: AppColors.border, height: 1),
                ),

                // Footer: Prediction & Stats
                Row(
                  children: [
                    // Prediction Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        prediction['market'] ?? 'Pick', // or 'prediction' field? Mobile API puts exact pick in 'market' sometimes or needs separate 'prediction' field? 
                        // Checked mobile.js: it maps `market: bet.market` and `prediction` is implicit? 
                        // Actually formatBetRow in approvedBets.js has `prediction: row.prediction`. mobile.js might miss it?
                        // mobile.js lines 42-55 DO NOT include `prediction` field explicitly mapped! 
                        // WAIT. mobile.js line 49 maps `market: bet.market`. It misses `prediction`. 
                        // However, often `market` IS the prediction text like "2.5 OVER". 
                        // Let's rely on 'market' for now, or 'prediction' if available (it might be passed through if I missed something).
                        // I will use 'market' as primary display.
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Odds
                    Text(
                      prediction['odds']?.toString() ?? '-',
                      style: const TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    // Confidence Bar
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '$confidence%',
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 60,
                          height: 4,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: LinearProgressIndicator(
                              value: (confidence is num ? confidence : 0) / 100,
                              backgroundColor: AppColors.bgSecondary,
                              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
