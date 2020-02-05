(function() {
  'use strict';
  pulse.controllers.controller('TimelapseMenuCtrl', function($device, $timelapse, $stateParams) {
    var vm = this;
    var dId = $stateParams.deviceId;
    vm.dId = dId;


    init();

    function init() {
      var device = $device.getSelectedDevice();
      $timelapse.initModel(dId);
      vm.timelapseModel = $timelapse;
    }

  });
})();
