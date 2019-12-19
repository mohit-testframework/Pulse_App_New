'use strict';

(function () {
  'use strict';

  pulse.services.factory('$hdr', function ($transmit, $device, $views, $camSettings, $q, $timeout, $interval) {

    // default
    var settings = {
      isActive: false,
      numPhotos: 3,
      evSteps: 1,
      photoCount: 0,
      iterator: 0,
      hdrData: undefined,
      originalShutterIndex: 0,
      hdrPromise: false,
      hdrInterval: false,
      isWaiting: false,
      shutterValue: false,
      forceStop: false
    };

    return {
      settings: settings,

      hdr: function hdr(device) {
        settings.isActive = true;
        settings.hdrData = this.prepareHdrData(device);
        settings.originalShutterIndex = device.metaData.camSettings.activeShutterIndex;
        this.hdrCapture(device);
      },

      reset: function reset() {
        settings.iterator = 0;
        var device = $device.getSelectedDevice();
        //hdr mode is all done. Go back to the original shutter setting
        $camSettings.updateSetting(device, 'shutter', settings.originalShutterIndex);
        settings.photoCount = 0;
        settings.isActive = false;
        settings.forceStop = false;
        settings.shutterValue = false;
      },

      hdrCapture: function hdrCapture(device) {
        var _this = this;

        var deferred = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : $q.defer();

        settings.isWaiting = false;
        if (settings.iterator < settings.numPhotos && !settings.forceStop) {
          if (settings.hdrData.movingIndex < 0) {
            settings.hdrData.movingIndex = 0;
          } else if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }
          settings.iterator++;
          //change the shutter and wait a bit

          $timeout.cancel(settings.hdrPromise);
          var delay = $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) ? $views.getMillisecondsFromShutter(device.metaData.camSettings.shutterOptions[settings.hdrData.movingIndex].value) + 4000 : 4000;
          this.capture(device);
          //setup a delay to force a picture if we don't hear back from pulse
          settings.hdrPromise = $timeout(function () {
            _this.forceCapture(device);
          }, delay);
        } else {
          if (settings.forceStop) {
            console.log('hdr was manually cancelled');
          }
          console.log('hdr Finished');
          $timeout.cancel(settings.hdrPromise);
          $timeout(function () {
            _this.reset();
          }, 500);
          this.reset();
          deferred.resolve();
        }
        return deferred.promise;
      },

      forceCapture: function forceCapture(device) {
        console.log('forcing capture');
        this.hdrCapture(device);
      },

      capture: function capture(device) {
        $camSettings.updateSetting(device, 'shutter', settings.hdrData.movingIndex, false);
        settings.shutterValue = $camSettings.getShutterFromIndex(settings.hdrData.movingIndex);
        $timeout(function () {
          console.log('hdr capture time');
          $transmit.capture(device, false);
          settings.hdrData.movingIndex = settings.hdrData.movingIndex + settings.hdrData.incrementer;
          if (settings.hdrData.movingIndex > settings.hdrData.maxIndex) {
            settings.hdrData.movingIndex = settings.hdrData.maxIndex;
          }
          settings.isWaiting = true;
          settings.photoCount++;
        }, 200);
      },

      prepareHdrData: function prepareHdrData(device) {
        //calculates the variables that we will need to jump in hdr mode

        var jumpStops = $views.computeShutterEv(device.metaData.camSettings.shutterOptions);

        //figure out how much to increment based on what they entered in UI
        var incrementer = settings.evSteps * jumpStops;
        var indexJump = (settings.numPhotos - 1) / 2 * incrementer;
        var movingIndex = device.metaData.camSettings.activeShutterIndex - indexJump;
        var maxIndex = device.metaData.camSettings.shutterOptions.length - 1;
        var data = {
          movingIndex: movingIndex,
          maxIndex: maxIndex,
          incrementer: incrementer
        };

        return data;
      }

    };
  });
})();