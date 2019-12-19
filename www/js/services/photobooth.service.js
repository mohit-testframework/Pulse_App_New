'use strict';

(function () {
  'use strict';

  pulse.services.factory('$photobooth', function () {

    //default
    var settings = {
      interval: 5,
      inProgress: false,
      numPhotos: 0,
      currentPhotoIteration: 0,
      finished: false
    };

    return {

      settings: settings,

      start: function start(device) {
        if (device) {
          device.isPhotoBoothing = true;
        }
        settings.finished = false;
        settings.inProgress = true;
      },

      stop: function stop(device) {
        if (device) {
          device.isPhotoBoothing = false;
        }
        settings.inProgress = false;
        settings.finished = true;
        settings.currentPhotoIteration = 0;
      },

      reset: function reset(device) {
        if (device) {
          device.isPhotoBoothing = false;
        }
        settings.inProgress = false;
        settings.finished = false;
        settings.currentPhotoIteration = 0;
      }

    };
  });
})();