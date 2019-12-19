'use strict';

(function () {
  'use strict';

  pulse.services.factory('$preset', function ($cordovaNativeStorage, $device, $timelapse, $q) {

    // default
    var settings = {
      presetName: ''
    };

    return {

      settings: settings,

      fetchPresets: function fetchPresets() {
        var deferred = $q.defer();
        $cordovaNativeStorage.getItem('presets').then(function (presets) {
          deferred.resolve(presets);
        }, function () {
          deferred.resolve(null);
          //no presets found
        });

        return deferred.promise;
      },

      savePreset: function savePreset() {
        var defer = $q.defer();
        this.fetchPresets().then(function (presets) {
          var device = $device.getSelectedDevice();
          if (!device) {
            defer.resolve({});
          } else {
            var presetData = {
              duration: {
                hours: $timelapse.timelapses[device.id].settings.duration.hours,
                minutes: $timelapse.timelapses[device.id].settings.duration.minutes
              },
              interval: $timelapse.timelapses[device.id].settings.interval,
              exposure: $timelapse.timelapses[device.id].settings.exposure,
              activeExposure: $timelapse.timelapses[device.id].settings.activeExposure,
              activeDelay: $timelapse.timelapses[device.id].settings.activeDelay,
              delay: $timelapse.timelapses[device.id].settings.delay
            };
            if (!presets) {
              presets = {};
            }
            presets[settings.presetName] = presetData;
            $cordovaNativeStorage.setItem('presets', presets).then(function (response) {});
            defer.resolve(presets);
          }
        });

        return defer.promise;
      },

      loadPreset: function loadPreset(preset) {
        var device = $device.getSelectedDevice();
        $timelapse.timelapses[device.id].settings.exposure = preset.exposure;
        $timelapse.timelapses[device.id].settings.duration = preset.duration;
        $timelapse.timelapses[device.id].settings.delay = preset.delay;
        $timelapse.timelapses[device.id].settings.interval = preset.interval;
        $timelapse.timelapses[device.id].settings.activeDelay = preset.activeDelay;
        $timelapse.timelapses[device.id].settings.activeExposure = preset.activeExposure;
      }

    };
  });
})();