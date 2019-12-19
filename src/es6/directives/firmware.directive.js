(function() {
  'use strict';
  pulse.app.directive('firmware', function($location, $q, $firmware, $timeout, $device, $rootScope, $transmit, $ionicLoading) {
    return {
      restrict: 'E',
      templateUrl: 'templates/partials/firmware-button.html',
      controllerAs: 'vm',
      link: function() {},
      scope: {
        'modal': '=',
        'noUpdateText': '='
      },
      controller: function($scope) {

        var vm = this;
        var proceed = true;
        $rootScope.$on('cancelUpdate', ()=>{
    			proceed = false;
          updatingFirmware = false;
          $location.path('app/main');
          $ionicLoading.hide();
          $timeout(()=>{
            //they can try another FW update after 20s
            proceed = true;
          }, 20000);
    		});

        $scope.cancelUpdate = ()=>{
          $rootScope.$broadcast('cancelUpdate');
          $scope.firmwareError = false;
          console.log("Cancelling update");
        };

        var bootLoaderConnect = function(selectedDevice){
          $firmware.connectToBL(selectedDevice).then(
            (bootloaderDevice) =>
            {
                console.log("Connected to BL: ");
                $firmware.settings.bootloaderDevice = bootloaderDevice;
                $location.path('app/updateFirmware');
                $ionicLoading.hide();
            }, (error) => {
              bootLoaderConnect(selectedDevice);
            });
        };

        vm.goToFirmwarePage = function(){
          $ionicLoading.show({
            templateUrl: 'templates/partials/loading-firmware.html',
            scope: $scope
          });
          $q.all([
            $firmware.readUpdateFirmware(),
          ]).then((responses)=>{
            window.plugins.insomnia.keepAwake();
            $scope.allgood = true;
            $firmware.settings.firmwareBinary = responses[0];
            var selectedDevice = $device.getSelectedDevice();


            updatingFirmware = true;
            $timeout( () => {
              $transmit.getPersistentData(selectedDevice);
            }, 1000);

            $rootScope.$on('gotPersistentData', function(event) {
              console.log('updating firmware is: '+ updatingFirmware);
              if(updatingFirmware){
                console.log('Attempting to connect to bootloader');
                if(proceed){
                  selectedDevice.firmwareType = null;
                  $device.setDevice(selectedDevice);
                  $timeout(()=>{
                    bootLoaderConnect(selectedDevice);
                  }, 500);
                }else{
                  proceed = true;
                  updatingFirmware = false;
                  window.plugins.insomnia.allowSleepAgain();
                }
              }
            });
          }, (error)=>{
            //failed to download new firmware
            console.log('failed to download firmware update files');
            $scope.firmwareError = true;
          });
        };
      }

    };

  });

})();
