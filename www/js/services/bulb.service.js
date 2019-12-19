'use strict';

(function () {
  'use strict';

  pulse.services.factory('$bulb', function ($timeout, $interval, $q, $transmit, $device, $camSettings, $rootScope, $views) {

    // default
    var settings = {
      isActive: false,
      isTimed: true,
      oldShutterIndex: false,
      thumbsEnabled: false,
      backgroundMode: false,
      backgroundTime: false,
      interval: false,
      activeSeconds: 0
    };

    var duration = {
      timed: {
        'hours': 0, //this should really be minutes -- need to do this for the incrementer plugin to work
        'minutes': 30 //this should really be seconds -- need to do this for the increment plugin to work
      },
      manual: {
        'minutes': '00',
        'seconds': '00'
      },
      animationValues: {
        'current': 0,
        'max': 0
      }
    };

    var timer;
    var time = 0;
    var seconds = '00';
    var minutes = '00';

    return {
      settings: settings,
      duration: duration,
      time: time,

      resetUI: function resetUI() {
        this.duration.animationValues.current = 1;
        this.duration.animationValues.max = 0;
        this.time = 0;
        $rootScope.$broadcast('bulbDone');
      },

      /**
       * startBulb - starts exposure timer
       * @return {null}
       */
      startBulb: function startBulb() {
        var _this = this;

        var device = $device.getSelectedDevice();
        var data = $device.findShutterIndex(device, 'BULB', device.metaData.camSettings.shutterOptions);
        if (data) {
          console.log('Setting camera setting to bulb mode');
          if (device && device.metaData.camSettings.activeShutterIndex != data.shutterIndex) {
            $camSettings.updateSetting(device, 'shutter', data.shutterIndex);
          }
        }

        // Stop if currently active
        settings.isActive = true;
        if (!settings.isTimed) {
          //start again at 0
          duration.manual.seconds = "00";
          duration.manual.minutes = "00";
          timer = $interval(function () {
            _this.time++;
            // Update GUI based on the time (seconds)
            duration.manual.seconds = $views.getSeconds(_this.time);
            duration.manual.minutes = $views.getMinutes(_this.time);
          }, 1000);
          console.log('Transmitting long exposure data');

          var tempDevice = device;
          var previousDevices = [];
          while (tempDevice) {
            $transmit.startBulb(tempDevice);
            previousDevices.push(tempDevice);
            tempDevice = $device.getSelectedDevice(previousDevices);
          }
        } else {
          //timed mode
          // Note hours are minutes and minutes are seconds (HACK)
          //note that I'm adding on 2 seconds so that we don't cut ourselves off!
          settings.activeSeconds = parseInt(duration.timed.hours) * 60 + parseInt(duration.timed.minutes);
          console.log('Transmitting long exposure data');
          var tempDevice2 = device;
          var previousDevices2 = [];
          while (tempDevice2) {
            //Note that I'm adding a 1 seconds since the bulb exposures seem to run slow
            $transmit.startBulb(tempDevice2, settings.activeSeconds + 1);
            previousDevices2.push(tempDevice2);
            tempDevice2 = $device.getSelectedDevice(previousDevices2);
          }

          duration.animationValues.max = settings.activeSeconds;
          this.startInterval(0);
        }
      },

      startInterval: function startInterval(seconds) {
        var active = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        if (settings.interval) {
          $interval.cancel(settings.interval);
        }
        if (active !== false) {
          settings.activeSeconds = active;
        }
        settings.activeSeconds = settings.activeSeconds - seconds;

        settings.interval = $interval(function () {
          duration.animationValues.current++;
          settings.activeSeconds--;
          if (settings.activeSeconds <= 0) {
            $interval.cancel(settings.interval);
            //Call stopBulb in a few seconds to make sure FW has time
            this.stopBulb(1500);
          }
        }.bind(this), 1000);
      },

      cancelInterval: function cancelInterval() {
        $interval.cancel(this.settings.interval);
      },

      /**
       * stopBulb - stops exposure timer, takes pic
       * @return {null}
       */
      stopBulb: function stopBulb() {
        var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        // Stop if currently active
        settings.isActive = false;
        if (settings.interval) {
          $interval.cancel(settings.interval);
        }
        if (timer) {
          $interval.cancel(timer);
        }
        var device = $device.getSelectedDevice();
        var tempDevice = device;
        var previousDevices = [];
        while (tempDevice) {
          if (delay === 0) {
            $transmit.endBulb(tempDevice);
          } else {
            $timeout(function () {
              $transmit.endBulb(tempDevice);
            }, delay);
          }
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices);
        }
        this.resetUI();
      }

    };
  });
})();