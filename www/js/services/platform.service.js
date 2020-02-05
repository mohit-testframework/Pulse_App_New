'use strict';

(function () {
  'use strict';

  pulse.services.factory('$platform', function () {

    return {
      isAndroid: function isAndroid() {
        if (device.platform == 'Android') {
          return true;
        } else {
          return false;
        }
      },

      getDeviceId: function getDeviceId() {
        if (device) {
          return device.uuid;
        } else {
          return 'No connected device';
        }
      },

      getDevicePlatform: function getDevicePlatform() {
        if (device) {
          return device.platform;
        } else {
          return 'No connected device';
        }
      },

      getDeviceVersion: function getDeviceVersion() {
        if (device) {
          return device.version;
        } else {
          return 'No connected device';
        }
      },

      getDeviceModel: function getDeviceModel() {
        if (device) {
          return device.model;
        } else {
          return 'No connected device';
        }
      }

    };
  });
})();