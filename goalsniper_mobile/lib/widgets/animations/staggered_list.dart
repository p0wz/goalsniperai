import 'package:flutter/material.dart';

class StaggeredList extends StatelessWidget {
  final List<Widget> children;
  final ScrollController? controller;
  final EdgeInsetsGeometry? padding;

  const StaggeredList({
    super.key,
    required this.children,
    this.controller,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: controller,
      padding: padding ?? const EdgeInsets.all(16),
      itemCount: children.length,
      itemBuilder: (context, index) {
        return TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeOut,
          builder: (context, value, child) {
            // Stagger delay based on index
            // We simulate stagger by starting the animation with a delay, 
            // but TweenAnimationBuilder starts immediately. 
            // A better approach for simple stagger without packages:
            
            return AnimatedOpacity(
              duration: const Duration(milliseconds: 500),
              opacity: 1.0, // This approach is tricky without state management for delay.
              // Let's use a FutureBuilder per item or just a simple AnimatedBuilder with delay? 
              // No, let's use a standard list but wrap items in a widget that handles its own entry animation.
              child: _SlideFadeTile(index: index, child: children[index]),
            );
          },
        );
      },
    );
  }
}

class _SlideFadeTile extends StatefulWidget {
  final int index;
  final Widget child;

  const _SlideFadeTile({required this.index, required this.child});

  @override
  State<_SlideFadeTile> createState() => _SlideFadeTileState();
}

class _SlideFadeTileState extends State<_SlideFadeTile> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offset;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _offset = Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
        
    _opacity = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    // Stagger delay
    Future.delayed(Duration(milliseconds: widget.index * 100), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(
        position: _offset,
        child: widget.child,
      ),
    );
  }
}
