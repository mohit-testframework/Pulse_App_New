'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('UpdateFirmwareCtrl', function ($firmware, $timeout, $rootScope, $scope, $ionicHistory, $device, $ionicLoading, $cordovaNativeStorage) {
    var vm = this;
    vm.model = $firmware.settings;
    var display = {
      sendIndex: 0,
      completionPercentage: 0,
      finalPacketIndex: 100
    };
    var completionPercentage = 0;

    init();

    $rootScope.$on('sendIndex change', function (event, data) {
      if (data.sendIndex > data.finalPacketIndex) {
        display.sendIndex = 0;
      } else {
        display.sendIndex = data.sendIndex;
      }
      display.finalPacketIndex = data.finalPacketIndex;
      completionPercentage = Math.round(display.sendIndex / display.finalPacketIndex * 100);
      if (completionPercentage != display.completionPercentage) {
        display.completionPercentage = completionPercentage;
        vm.completionPercentage = display.completionPercentage;
        $scope.$digest();
      }
      if (data.sendIndex + 1 == data.finalPacketIndex) {
        //firmware upload completed
        $timeout.cancel($firmware.FWInsuranceTimer);
        updatingFirmware = false;
        console.log('firmware update succeeded');
        window.plugins.insomnia.allowSleepAgain();
        $ionicLoading.show({
          templateUrl: 'templates/partials/firmware-restore.html'
        });
        $timeout(function () {
          var loadingModal = $('.fw-loading.restore');
          if (loadingModal.length) {
            $ionicLoading.hide();
            var modalData = {
              text: 'Update Complete! Toggle your pulse off and on to reconnect.',
              animation: 'fade-in-scale'
            };
            $rootScope.$broadcast('openModal', modalData);
          }
        }, 60000);
        $device.scanAndConnectDevices();
      }
    });

    function init() {
      setPD = true; // Need to set persistent data on next connect
      vm.completionPercentage = 0;
      $cordovaNativeStorage.setItem('setPD', setPD);
      $firmware.update(new Uint8Array($firmware.settings.firmwareBinary), $firmware.settings.bootloaderDevice);
    }
  });
})();