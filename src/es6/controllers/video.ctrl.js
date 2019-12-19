(function() {
  'use strict';
  pulse.controllers.controller('VideoCtrl', function($device, $scope, $timelapse, $video, $views, $ionicSideMenuDelegate, $camSettings, $cordovaVibration, $rootScope, $interval, $ionicLoading) {
    var vm = this;
    var timer;

    $rootScope.$on('videoReconnect', (event, data) => {

      //app was closed and reopened and we have an active video. We need to re-render the ui
      console.log('reconnecting video');
      $video.settings.isActive = true;
      $video.seconds = $views.getSeconds(data.ellapsedSeconds);
      $video.minutes = $views.getMinutes(data.ellapsedSeconds);

      $scope.$apply();
      timer = $interval(() => {
        data.ellapsedSeconds++;

        // Update GUI based on the time (seconds)
        $video.seconds = $views.getSeconds(data.ellapsedSeconds);
        $video.minutes = $views.getMinutes(data.ellapsedSeconds);
      }, 1000);
    });



    initView();

    vm.startOrPauseVideo = function() {
      $interval.cancel(timer);
      var device = $device.getSelectedDevice();
      if (device.metaData.cameraConnected) {
        if (!$views.doesModelSupport(device, 'video')){
          //camera isnt supported; return and show overlay
          return;
          // vm.modelNotSupported = true;
        }
        $cordovaVibration.vibrate(25);
        // Pulse is not connected, don't do anything
        $video.takeVideo();
        return;
      }
    };

    function initView() {
      vm.model = $video;
      vm.showVideoText = true;
      var device = $device.getSelectedDevice();
      if (device) {
        var cameraType = $camSettings.getCameraType(device.metaData);
        if (cameraType && cameraType.toLowerCase() == 'nikon') {
          vm.showVideoText = false;
        }
        if (!$views.doesModelSupport(device, 'video')){
          vm.modelNotSupported = true;
        }
      }
    }

    // Enable drag-to-open menu
    $scope.$on('$ionicView.enter', function() {
      $ionicSideMenuDelegate.canDragContent(true);
    });
  });
})();
