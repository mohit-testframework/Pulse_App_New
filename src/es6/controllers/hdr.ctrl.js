(function() {
  'use strict';
  pulse.controllers.controller('HdrCtrl', function($hdr, $device, $cordovaVibration, $ionicSideMenuDelegate, $timeout, $views, $rootScope) {
    var vm = this;

    init();

    $rootScope.$on('pictureFinished', (event) => {
      console.log('hdr capture event');
      if ($hdr.settings.isActive && $hdr.settings.isWaiting){
        var device = $device.getSelectedDevice();
        $hdr.hdrCapture(device);
      }
    });

    function init() {
      vm.model = $hdr;
      vm.errorClass = 'hidden';
      $ionicSideMenuDelegate.canDragContent(false);
    }


    vm.stopHdr = function(){
      $hdr.settings.forceStop = true;
  };

    vm.startHdr = function(){
      var device = $device.getSelectedDevice();
      var hasError;
      if (device){
        var cameraModeFail = device.metaData.cameraMode != 'MANUAL' && !$views.permissableMode && !$views.abortModes;
        if (device.metaData.cameraMode && cameraModeFail) {
          hasError = true;
          vm.errorClass = 'animated fadeIn';
          vm.errorMessage = 'Change your camera mode to Manual to enable HDR';
        }
        else if (!device.metaData.shutterArray.length){
          hasError = true;
          vm.errorClass = 'animated fadeIn';
          vm.errorMessage = 'We could not find any shutter settings. Unabled to perform HDR';
        }
        else{
          $hdr.settings.inProgress = true;
          //everything checks out, let's have an HDR party
          $cordovaVibration.vibrate(50);
          $hdr.hdr(device);
        }
        if (hasError){
          hasError = false;
          $timeout(()=>{
            vm.errorClass = 'animated fadeOut';
            $timeout(()=>{
              vm.errorClass = 'hidden';
          }, 1000);
        }, 5000);
        }
      }
    };

  });
})();
