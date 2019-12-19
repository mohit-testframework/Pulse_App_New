(function() {
  'use strict';
  pulse.app.directive('pulseBattery', function($config, $device) {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/battery.html',
      controllerAs: 'vm',
      link: function() {},
      scope: {
        device: '=',
        layout: '@'
      },
      controller: function($scope) {

        var vm = this;

        vm.layout = $scope.layout;

        vm.getBattery = function() {
          var connectedPulses = $device.getConnectedDevices();
          if (!connectedPulses.length) {
            return '';
          }
          var device;
          if ($scope.device){
            device = _.find(connectedPulses, (pulse) => {
              return pulse.id == $scope.device.id;
            });
          }
          else {
            device = $device.getSelectedDevice();
          }

          if (device && device.metaData && typeof(device.metaData.battery) != 'undefined') {
            if (device.metaData.battery === 0) {
              return 'img/battery-0-red.svg';
            } else if (device.metaData.battery >= 1 && device.metaData.battery <= 25) {
              return 'img/battery-25-red.svg';
            } else if (device.metaData.battery >= 26 && device.metaData.battery <= 50) {
              return 'img/battery-50.svg';
            } else if (device.metaData.battery >= 51 && device.metaData.battery <= 75) {
              return 'img/battery-75.svg';
            } else if (device.metaData.battery >= 76 && device.metaData.battery <= 100) {
              return 'img/battery-100.svg';
            }
          } else {
            return false;
          }

        };


        vm.getChargeStatus = function() {
          var connectedPulses = $device.getConnectedDevices();
          if (!connectedPulses.length) {
            return '';
          }
          var device = $device.getSelectedDevice();

          if (device && device.metaData && typeof(device.metaData.battery) != 'undefined') {

            if (device.metaData.statusMode == $config.statusMode.CHARGING && device.metaData.statusState == $config.statusState.START) {
              return 'img/charge.svg';
            }
          } else {
            return false;
          }
        };
      }

    };

  });

})();
