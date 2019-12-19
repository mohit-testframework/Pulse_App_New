(function() {
  'use strict';
  pulse.controllers.controller('TimelapseDelayCtrl', function($device, $timelapse, $stateParams) {
    var vm = this;
    var dId = $stateParams.deviceId;
    vm.dId = dId;

    init();

    function init() {
      var device = $device.getSelectedDevice();
      vm.deviceModel = device;
      $timelapse.initModel(dId);
      vm.timelapseModel = $timelapse;

    }

  });
})();
