// Works around Android 15+ text clipping on OEM devices (react-native#53666,
// #1905): apps targeting SDK 35+ get bounds-based TextView width
// (`useBoundsForWidth`), but React Native still measures text with glyph
// advances, so on fonts whose glyph bounds overhang their advances
// (Samsung/OnePlus/Oppo system fonts) rendered text needs more width than the
// measured box and trailing glyphs clip. These theme items opt the render side
// back into the pre-SDK-35 advance-based behavior so it matches RN's
// measurement.
//
// Do not reach for RN's measure-side `fixTextClippingAndroid15useBoundsForWidth`
// feature flag instead: it does not fix affected devices and upstream deleted
// it as bug-implicated (react-native PR #56282). `elegantTextHeight` is
// ignored on Android 16 for target-36 apps but still applies on Android 15
// devices.
import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidStyles,
} from 'expo/config-plugins';

const TEXT_MEASUREMENT_OPT_OUTS = [
  { name: 'android:useBoundsForWidth', value: 'false', targetApi: '35' },
  {
    name: 'android:shiftDrawingOffsetForStartOverhang',
    value: 'false',
    targetApi: '35',
  },
  { name: 'android:elegantTextHeight', value: 'false' },
  {
    name: 'android:useLocalePreferredLineHeightForMinimum',
    value: 'false',
    targetApi: '33',
  },
];

export function addTextMeasurementOptOuts(
  styles: AndroidConfig.Resources.ResourceXML,
): AndroidConfig.Resources.ResourceXML {
  for (const { name, value, targetApi } of TEXT_MEASUREMENT_OPT_OUTS) {
    styles = AndroidConfig.Styles.assignStylesValue(styles, {
      add: true,
      name,
      value,
      targetApi,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
    });
  }
  return styles;
}

const withAndroidTextClippingFix: ConfigPlugin = (config) =>
  withAndroidStyles(config, (config) => {
    config.modResults = addTextMeasurementOptOuts(config.modResults);
    return config;
  });

export default withAndroidTextClippingFix;
