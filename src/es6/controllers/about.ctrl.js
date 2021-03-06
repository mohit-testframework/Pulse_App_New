(function() {
  'use strict';
  pulse.controllers.controller('AboutCtrl', function($device, $firmware, $q, $location, $config, $views) {
    var vm = this;
    vm.model = $firmware;
    var s3firmware;
    init();

    function init() {
      var device = $device.getSelectedDevice();
      vm.appVersion = appVersion;
      $firmware.getMostRecentFirmwareVersion().then((version) => {
        s3firmware = $views.parseS3FirmwareFile(version);
      });

    }

    vm.getFirmwareVersion = function(){
      vm.showFirmwareWarning = false;
      vm.showOutOfDateAndroid = false;
      vm.hasDevice = false;
      var device = $device.getSelectedDevice();
      if (device){
        vm.hasDevice = true;
        if (parseFloat(device.firmwareVersion) < s3firmware) {
          if ($views.canDoAndroidFota()){
            vm.showFirmwareWarning = true;
          }
          else{
            vm.showOutOfDateAndroid = true;
          }
        }
        return device.firmwareVersion;
      }
      else {
        return false;
      }
    };

  });
})();
