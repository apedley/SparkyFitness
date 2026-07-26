import { AndroidConfig } from 'expo/config-plugins';

import { addTextMeasurementOptOuts } from '../../plugins/withAndroidTextClippingFix';

type ResourceXML = AndroidConfig.Resources.ResourceXML;

function makeStylesXml(): ResourceXML {
  return {
    resources: {
      style: [
        {
          $: { name: 'AppTheme', parent: 'Theme.AppCompat.DayNight.NoActionBar' },
          item: [
            {
              $: { name: 'android:enforceNavigationBarContrast' },
              _: 'false',
            },
            { $: { name: 'colorPrimary' }, _: '@color/colorPrimary' },
          ],
        },
        {
          $: { name: 'Theme.App.SplashScreen', parent: 'Theme.SplashScreen' },
          item: [
            {
              $: { name: 'postSplashScreenTheme' },
              _: '@style/AppTheme',
            },
          ],
        },
      ],
    },
  };
}

const OPT_OUT_NAMES = [
  'android:useBoundsForWidth',
  'android:shiftDrawingOffsetForStartOverhang',
  'android:elegantTextHeight',
  'android:useLocalePreferredLineHeightForMinimum',
];

function appThemeItems(xml: ResourceXML): Record<string, string> {
  return (
    AndroidConfig.Styles.getStylesGroupAsObject(xml, { name: 'AppTheme' }) ?? {}
  );
}

describe('addTextMeasurementOptOuts', () => {
  it('adds every text-measurement opt-out to AppTheme with value false', () => {
    const result = addTextMeasurementOptOuts(makeStylesXml());
    const items = appThemeItems(result);

    for (const name of OPT_OUT_NAMES) {
      expect(items[name]).toBe('false');
    }
  });

  it('preserves existing AppTheme items', () => {
    const result = addTextMeasurementOptOuts(makeStylesXml());
    const items = appThemeItems(result);

    expect(items['android:enforceNavigationBarContrast']).toBe('false');
    expect(items['colorPrimary']).toBe('@color/colorPrimary');
  });

  it('does not touch other styles', () => {
    const result = addTextMeasurementOptOuts(makeStylesXml());
    const splash = AndroidConfig.Styles.getStylesGroupAsObject(result, {
      name: 'Theme.App.SplashScreen',
    });

    expect(splash).toEqual({ postSplashScreenTheme: '@style/AppTheme' });
  });

  it('is idempotent', () => {
    const once = addTextMeasurementOptOuts(makeStylesXml());
    const twice = addTextMeasurementOptOuts(once);

    expect(twice).toEqual(once);
    const appTheme = AndroidConfig.Styles.getStyleParent(twice, {
      name: 'AppTheme',
    });
    const names = (appTheme?.item ?? []).map((item) => item.$.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
