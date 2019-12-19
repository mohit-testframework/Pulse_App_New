(function() {
  'use strict';
  pulse.services.factory('$video', function($timeout, $interval, $q, $transmit, $device, $cordovaNativeStorage, $views) {

    // default
    var settings =  {
      isActive: false,
    };

    var timer;
    var time = 0;
    var seconds = '00';
    var minutes = '00';

    return {
      settings: settings,

      time: time,
      seconds: seconds,
      minutes: minutes,

      /**
       * takeVideo - toggles video recording
       * @return {null}
       */
      takeVideo: function() {
        // Stop if currently active
        var device = $device.getSelectedDevice();

        var tempDevice = device;
        var previousDevices = [];

          if (settings.isActive) {
            settings.isActive = false;
            $interval.cancel(timer);
            this.time = 0;
            this.seconds = $views.getSeconds(0);
            this.minutes = $views.getMinutes(0);
            while(tempDevice){
              $transmit.blinkLED(tempDevice, 2);
              $transmit.stopVideo(tempDevice);
              previousDevices.push(tempDevice);
              tempDevice = $device.getSelectedDevice(previousDevices);
            }
            $cordovaNativeStorage.remove('video');

          // Start if inactive
          } else if (!settings.isActive) {
            settings.isActive = true;
            while(tempDevice){
              $transmit.blinkLED(tempDevice);
              $transmit.startVideo(tempDevice);
              previousDevices.push(tempDevice);
              tempDevice = $device.getSelectedDevice(previousDevices);
            }
            $cordovaNativeStorage.setItem('video', {startTime: Date.now()});

            timer = $interval(() => {
              this.time++;
              // Update GUI based on the time (seconds)
              this.seconds = $views.getSeconds(this.time);
              this.minutes = $views.getMinutes(this.time);
            }, 1000);
          }
      },

    };

  });
})();
