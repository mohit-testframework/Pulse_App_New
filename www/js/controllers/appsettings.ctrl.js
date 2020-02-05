'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('AppSettingsCtrl', function ($device, $firmware, $views, $transmit, $cordovaNativeStorage, $fileLogger, $timeout) {
    var vm = this;
    var checkedLed = false;

    init();

    function init() {
      var device = $device.getSelectedDevice();
      vm.views = $views;
      vm.appVersion = appVersion;
      vm.btnText = 'Search';
      if (device) {
        vm.firmwareVersion = device.firmwareVersion;
      }
      $firmware.getMostRecentFirmwareVersion().then(function (version) {
        if (device) {
          if (parseFloat(device.firmwareVersion) < parseFloat(version.ble)) {
            vm.showFirmwareWarning = false;
          }
        }
      });
    };

    vm.showPermissableOption = function () {
      var device = $device.getSelectedDevice();
      if (device && parseFloat(device.firmwareVersion) >= 1.1) {
        return true;
      } else {
        return false;
      }
    };

    vm.isDeviceConnected = function () {
      var device = $device.getSelectedDevice();
      if (device) {
        if (!checkedLed) {
          vm.ledLevel = device.ledLevel;
          checkedLed = true;
        }
        return true;
      } else {
        return false;
      }
    };

    vm.updatePermissableMode = function () {
      var device = $device.getSelectedDevice();
      if ($views.permissableMode) {
        $cordovaNativeStorage.setItem('permissableMode', true);
      } else {
        $cordovaNativeStorage.setItem('permissableMode', false);
      }
    };

    vm.setLEDLevel = function () {
      console.log('LED Brightness changed. Propogating to device...');
      var device = $device.getSelectedDevice();
      device.ledLevel = vm.ledLevel;
      $transmit.setLedBrightness(device, device.ledLevel);
      $timeout(function () {
        $transmit.blinkLED(device, 2);
      }, 100);
    };
  });
})();