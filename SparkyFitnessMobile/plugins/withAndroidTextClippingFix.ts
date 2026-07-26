// Works around Android 15+ text clipping (react-native#53666, #1905):
// Android 15 renders text with bounds-based widths (`useBoundsForWidth`)
// while React Native still measures with glyph advances, so measure and
// render disagree and trailing glyphs get clipped on devices whose fonts
// diverge (Samsung/OnePlus/Oppo). RN ships the fix behind the
// `fixTextClippingAndroid15useBoundsForWidth` feature flag, default off;
// this plugin enables it in MainApplication. Delete the plugin once React
// Native flips the flag's default.
import { ConfigPlugin, withMainApplication } from 'expo/config-plugins';

const FLAG_NAME = 'fixTextClippingAndroid15useBoundsForWidth';

const FLAG_OVERRIDE_IMPORTS = [
  'import android.util.Log',
  'import com.facebook.react.common.ReleaseLevel',
  'import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint',
  'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags',
  'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults',
];

// `loadReactNative()` installs the release-level flag overrides itself, and a
// plain `ReactNativeFeatureFlags.override()` before it is clobbered by that
// install while one after it throws ("cannot be overridden more than once").
// `dangerouslyForceOverride` is RN's public API for replacing the installed
// provider. The provider must keep every flag `load()` just set:
// `ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android` is final, so it is
// mirrored here (NewArchitectureDefaults + `useFabricInterop`) — keep in sync
// with that class when upgrading RN. Skipped on non-stable release levels so
// a canary/experimental experiment is not silently downgraded to
// stable-plus-one-flag.
const FLAG_OVERRIDE_BLOCK = `    if (DefaultNewArchitectureEntryPoint.releaseLevel == ReleaseLevel.STABLE) {
      val accessedBeforeOverride = ReactNativeFeatureFlags.dangerouslyForceOverride(
        // Mirrors ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android, which is final.
        object : ReactNativeNewArchitectureFeatureFlagsDefaults() {
          override fun useFabricInterop(): Boolean = true
          override fun ${FLAG_NAME}(): Boolean = true
        }
      )
      if (accessedBeforeOverride != null) {
        Log.w("SparkyFitness", "Feature flags accessed before text-clipping override: " + accessedBeforeOverride)
      }
    }
`;

export function addTextClippingFlagOverride(src: string): string {
  if (src.includes(FLAG_NAME)) {
    return src;
  }

  const importBlockMatch = src.match(/((?:^import [^\n]+\n)+)/m);
  if (!importBlockMatch) {
    throw new Error(
      '[withAndroidTextClippingFix] Could not locate the import block in MainApplication.',
    );
  }
  const block = importBlockMatch[1];
  const missingImports = FLAG_OVERRIDE_IMPORTS.filter(
    (line) => !src.includes(line),
  );
  src = src.replace(block, `${block}${missingImports.map((line) => `${line}\n`).join('')}`);

  const loadCallMatch = src.match(/^[ \t]*loadReactNative\(this\)\n/m);
  if (!loadCallMatch || loadCallMatch.index === undefined) {
    throw new Error(
      '[withAndroidTextClippingFix] Could not locate loadReactNative(this) in MainApplication.',
    );
  }
  const insertAt = loadCallMatch.index + loadCallMatch[0].length;
  return src.slice(0, insertAt) + FLAG_OVERRIDE_BLOCK + src.slice(insertAt);
}

const withAndroidTextClippingFix: ConfigPlugin = (config) =>
  withMainApplication(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error(
        '[withAndroidTextClippingFix] MainApplication is not Kotlin; update the plugin for the new template.',
      );
    }
    config.modResults.contents = addTextClippingFlagOverride(
      config.modResults.contents,
    );
    return config;
  });

export default withAndroidTextClippingFix;
