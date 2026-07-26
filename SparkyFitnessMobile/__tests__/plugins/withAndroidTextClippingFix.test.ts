import { addTextClippingFlagOverride } from '../../plugins/withAndroidTextClippingFix';

const MAIN_APPLICATION = `package com.apedleydev.SparkyFitnessMobile.dev

import android.app.Application
import android.content.res.Configuration
import com.sparkyapps.sparkyfitness.exactalarm.ExactAlarmPackage
import com.sparkyapps.sparkyfitness.widget.CalorieWidgetPackage

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}
`;

describe('addTextClippingFlagOverride', () => {
  it('inserts the flag override immediately after loadReactNative(this)', () => {
    const result = addTextClippingFlagOverride(MAIN_APPLICATION);

    const loadIndex = result.indexOf('loadReactNative(this)\n');
    const overrideIndex = result.indexOf('dangerouslyForceOverride');
    const lifecycleIndex = result.indexOf(
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)',
    );
    expect(loadIndex).toBeGreaterThan(-1);
    expect(overrideIndex).toBeGreaterThan(loadIndex);
    expect(lifecycleIndex).toBeGreaterThan(overrideIndex);

    expect(result).toContain(
      'override fun fixTextClippingAndroid15useBoundsForWidth(): Boolean = true',
    );
    expect(result).toContain(
      'object : ReactNativeNewArchitectureFeatureFlagsDefaults()',
    );
    expect(result).toContain('override fun useFabricInterop(): Boolean = true');
    expect(result).toContain(
      'DefaultNewArchitectureEntryPoint.releaseLevel == ReleaseLevel.STABLE',
    );
  });

  it('adds the required imports without duplicating existing ones', () => {
    const result = addTextClippingFlagOverride(MAIN_APPLICATION);

    for (const line of [
      'import android.util.Log',
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags',
      'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults',
    ]) {
      expect(result.split(`${line}\n`).length - 1).toBe(1);
    }

    expect(
      result.split('import com.facebook.react.common.ReleaseLevel\n').length - 1,
    ).toBe(1);
    expect(
      result.split('import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint\n')
        .length - 1,
    ).toBe(1);
  });

  it('is idempotent', () => {
    const once = addTextClippingFlagOverride(MAIN_APPLICATION);
    expect(addTextClippingFlagOverride(once)).toBe(once);
  });

  it('throws when loadReactNative(this) is missing', () => {
    const withoutLoad = MAIN_APPLICATION.replace('loadReactNative(this)\n', '');
    expect(() => addTextClippingFlagOverride(withoutLoad)).toThrow(
      /Could not locate loadReactNative/,
    );
  });
});
