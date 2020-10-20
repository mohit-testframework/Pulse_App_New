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
      activeSeconds: 0,
      newActiveSeconds: 0,
      newInterval:0,
      totalPhotoSeconds:0,
      currentTimer : 0
    };

    var duration = {
      timed: {
        'hours': 0, //this should really be minutes -- need to do this for the incrementer plugin to work
        'minutes': 30 //this should really be seconds -- need to do this for the increment plugin to work
      },
      manual: {
        'minutes': '0',
        'seconds': '00'
      },
      animationValues: {
        'current': 0,
        'max': 0,
        'maxTimelapse':0,
        'currentTimelapse': 0
      }
    };

    var timer;
    var time = 0;
    var seconds = '00';
    var minutes = '0';
    var timelapseSeconds ;
    var timelapseTotalSeconds;

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

       resetUITimelapse: function resetUITimelapse() {
        this.duration.animationValues.current = 0;
        this.duration.animationValues.maxTimelapse = 0;
        this.time = 0;
        $rootScope.$broadcast('bulbDoneTimelapse');
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
          duration.manual.minutes = "0";
          timer = $interval(function () {
            _this.time++;
            // Update GUI based on the time (seconds)
            duration.manual.seconds = $views.getSeconds(_this.time);
            duration.manual.minutes = $views.getMinutes(_this.time);
          }, 1000);
          console.log('Transmitting long exposure data if');

          var tempDevice = device;
          var previousDevices = [];
          while (tempDevice) {
            console.log('tempDevice : ' + tempDevice);
            $transmit.startBulb(tempDevice);
            previousDevices.push(tempDevice);
            tempDevice = $device.getSelectedDevice(previousDevices);
          }
        } else {
          //timed mode
          // Note hours are minutes and minutes are seconds (HACK)
          //note that I'm adding on 2 seconds so that we don't cut ourselves off!
          settings.activeSeconds = parseInt(duration.timed.hours) * 60 + parseInt(duration.timed.minutes);
          console.log('Transmitting long exposure data else');
          var tempDevice2 = device;
          var previousDevices2 = [];
          while (tempDevice2) {
            // console.log('tempDevice2 : ' + tempDevice2);
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
        console.log('startInterval : ' + seconds);
        var active = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        if (settings.interval) {
          console.log('Interval cancel startInterval: ' + settings.interval);
          $interval.cancel(settings.interval);
        }
        if (active !== false) {
          console.log('active !== false : ' + active);
          settings.activeSeconds = active;
        }
        settings.activeSeconds = settings.activeSeconds - seconds;

        settings.interval = $interval(function () {
          console.log('inside Interval : ');
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
      },

      /**
       * startBulb - starts exposure timer
       * @return {null}
       */
      startBulbTimelapse: function startBulbTimelapse(newDuration, interval) {
        var _this = this;
        console.log('startBulbTimelapse newDuration : ' + JSON.stringify(newDuration));
        console.log('startBulbTimelapse interval : ' + JSON.stringify(interval));

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
          duration.manual.minutes = "0";
          timer = $interval(function () {
            _this.time++;
            // Update GUI based on the time (seconds)
            duration.manual.seconds = $views.getSeconds(_this.time);
            duration.manual.minutes = $views.getMinutes(_this.time);
          }, 1000);
          console.log('Transmitting long exposure data if');

          var tempDevice = device;
          var previousDevices = [];
          while (tempDevice) {
            console.log('tempDevice : ' + tempDevice);
            $transmit.startBulb(tempDevice);
            previousDevices.push(tempDevice);
            tempDevice = $device.getSelectedDevice(previousDevices);
          }
        } else {
          //timed mode
          // Note hours are minutes and minutes are seconds (HACK)
          //note that I'm adding on 2 seconds so that we don't cut ourselves off!
          settings.newActiveSeconds = ((parseInt(newDuration.hours) * 60) * 60 ) + (parseInt(newDuration.minutes) * 60);
          settings.totalPhotoSeconds = ((parseInt(newDuration.hours) * 60) * 60 ) + (parseInt(newDuration.minutes) * 60);
          settings.activeSeconds = parseInt(duration.timed.hours) * 60 + parseInt(duration.timed.minutes);
          settings.newInterval = parseInt(interval);

          // let timelapseMinutes = parseInt(newDuration.hours) * 60 + parseInt(newDuration.minutes);
          
          //   timelapseSeconds = ((timelapseMinutes * 60) - interval); //since we take a photo at the start of the TL, we need to initally subtract the interval
          //   timelapseTotalSeconds = timelapseSeconds;
          


          console.log('Transmitting long exposure data else : ' + settings.newActiveSeconds);
          var tempDevice2 = device;
          var previousDevices2 = [];
          while (tempDevice2) {
            // console.log('tempDevice2 : ' + tempDevice2);
            //Note that I'm adding a 1 seconds since the bulb exposures seem to run slow
            $transmit.startBulb(tempDevice2, settings.activeSeconds);
            previousDevices2.push(tempDevice2);
            tempDevice2 = $device.getSelectedDevice(previousDevices2);
          }

          duration.animationValues.max = settings.activeSeconds;
          duration.animationValues.maxTimelapse = settings.newActiveSeconds;
          this.startIntervalTimelapse(0);
        }
      },

      startIntervalTimelapse: function startIntervalTimelapse(seconds) {
        console.log('startIntervalTimelapse : ' + seconds);
        var active = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        if (settings.interval) {
          console.log('Interval cancel  startIntervalTimelapse: ' + settings.interval);
          $interval.cancel(settings.interval);
        }
        if (active !== false) {
          console.log('active !== false : ' + active);
          settings.newActiveSeconds = active;
        }
        settings.newActiveSeconds = settings.newActiveSeconds - seconds;

        settings.interval = $interval(function () {
          // console.log('inside Interval startIntervalTimelapse : ');

       // let devideSeconds = parseInt(timelapseSeconds) / parseInt(timelapseTotalSeconds);
       //  timelapseSeconds = parseInt(timelapseSeconds) - 1;

       //  console.log('seconds value *********&&&&& : ' + timelapseSeconds);
       //     console.log('totalSeconds value *********&&&&& : ' + timelapseTotalSeconds);

          duration.animationValues.currentTimelapse = Math.round(duration.animationValues.current / duration.animationValues.maxTimelapse * 100);
          // console.log('duration.animationValues.currentTimelapse 1 : ' + duration.animationValues.currentTimelapse);

          duration.animationValues.current++
          // duration.animationValues.current++;
          settings.newActiveSeconds--;
          settings.currentTimer ++;
          if (settings.newActiveSeconds <= 0) {
            console.log('complete : ' + duration.animationValues.currentTimelapse);
            duration.animationValues.currentTimelapse = 0;
            settings.currentTimer = 0;
            $interval.cancel(settings.interval);
            //Call stopBulb in a few seconds to make sure FW has time
            this.stopBulbTimelapse(1500);
          }
        }.bind(this), 1000);
      },

      cancelIntervalTimlapse : function cancelIntervalTimlapse() {
        console.log('cancelIntervalTimlapse');
         duration.animationValues.currentTimelapse = 0;
         settings.currentTimer = 0;

         settings.newActiveSeconds = 0;
         settings.totalPhotoSeconds = 0;
         settings.activeSeconds = 0;
         settings.newInterval= 0;
         duration.animationValues.current = 0;
         duration.animationValues.currentTimelapse = 0;
        $interval.cancel(this.settings.interval);

         this.settings.interval = null
      },


      /**
       * stopBulb - stops exposure timer, takes pic
       * @return {null}
       */
      stopBulbTimelapse: function stopBulbTimelapse() {
        console.log('stopBulbTimelapse');
        var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        // Stop if currently active
        settings.isActive = false;
        if (settings.interval) {
          $interval.cancel(settings.interval);
        }
        if (timer) {
          $interval.cancel(timer);
        }
        duration.animationValues.currentTimelapse = 0;
        settings.currentTimer = 0;
        
         settings.newActiveSeconds = 0;
         settings.totalPhotoSeconds = 0;
         settings.activeSeconds = 0;
         settings.newInterval= 0;
         duration.animationValues.current = 0;
         duration.animationValues.currentTimelapse = 0;

         settings.interval = null;

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
        // this.resetUITimelapse();
      },


    getTotalPhotosLongExposure: function getTotalPhotosLongExposure() {
        // console.log('inside getTotalPhotos');
        // var s = this.calculateTotalMinutes(deviceId) * 60;
        var totalPhotos;
        // if (deviceId) {
           totalPhotos = Math.floor(settings.totalPhotoSeconds / settings.newInterval);
           // console.log('inside getTotalPhotos : ' +  totalPhotos);
          // totalPhotos = timelapses[deviceId].settings.totalPhotos;
        // }
        return totalPhotos;
      }

    };
  });
})();