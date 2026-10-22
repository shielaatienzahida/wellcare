{{flutter_js}}
{{flutter_build_config}}

_flutter.loader.load({
  config: {
    // Keep Flutter web startup independent of the external gstatic CDN.
    canvasKitBaseUrl: 'canvaskit/',
  },
});
