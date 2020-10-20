"use strict";

(function() {
  "use strict";

  pulse.controllers.controller("PhotoCtrl", function(
    $timeout,
    $interval,
    BLE,
    $device,
    $camSettings,
    $rootScope,
    $q,
    $photo,
    $histogram,
    $cordovaVibration,
    $cordovaFile,
    $transmit,
    $config,
    $scope,
    btClassic,
    $views,
    $ionicSideMenuDelegate,
    $platform
  ) {
    var vm = this;
    var hasSeenHistText = false;
    var hasReceivedThumb = false;
    var animationTimer = false;
    var currentThumb;
    var consecutivebadThumbs = 0;
    var maxConsecutiveBadthumbs = 2;

    init();

    $rootScope.$on("thumbnailUploadPhotoPage", function(event, data) {
      console.log("data.thumbPath Photo Page : " + data.thumbPath);
      // console.log('thumbnailUpload called successfully 7777');

      // let element = document.getElementById("photo-ring-div");
      // element.style.opacity = "1";
      // element.style.filter  = 'alpha(opacity=100)';     
      // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');

      let photoThumb = window.Ionic.WebView.convertFileSrc(data.thumbPath);
      $timeout.cancel(animationTimer);
      var device = $device.getSelectedDevice();
      if (device.metaData.cameraType == $config.cameraSettings.make.CANON) {
        $timeout(function() {
          $transmit.refreshUSB(device);
        }, 40);
      }
      if (data.hasThumb) {
        vm.showSpinner = false;
        vm.backgroundGradient = 0.0;
        vm.thumb = photoThumb;
        vm.defaultThumb = false;
        histogram(photoThumb, function(err, histData) {
          if (histData) {
            vm.histogramItems = $histogram.prepareHistogram(histData);
            hasReceivedThumb = true;
            //make sure the histogram redraws
            $scope.$apply();
            consecutivebadThumbs = 0;
          }
        });
      } else {
        //thumbnail failed
        vm.showSpinner = false;
        vm.backgroundGradient = 0.0;
        if (consecutivebadThumbs++ >= maxConsecutiveBadthumbs) {
          // console.log(
          //   "We've had too many bad thumbs round here, disconnecting BTC"
          // );
          device.btClassic.disconnect(device.metaData.macAddress);
          device.btClassic.enabled = false;
          device.btClassic.connected = false;
        }
      }
    });

    $rootScope.$on("thumbnailUploadFailed", function(event) {
      //thumbnail failed stop spinning
      vm.showSpinner = false;
      vm.backgroundGradient = 0.0;
      console.log('inside thumbnailUploadFailed');
    });

    vm.burst = function() {
      var device = $device.getSelectedDevice();
      if (
        device &&
        device.metaData.cameraConnected &&
        !$photo.settings.inProgress
      ) {
        $cordovaVibration.vibrate(75);
        vm.fill = "#b2b2b2";
        $photo.burst(device);
      }
    };

    vm.endBurst = function() {
      var device = $device.getSelectedDevice();
      if (
        device &&
        device.metaData.cameraConnected &&
        !$photo.settings.inProgress
      ) {
        vm.fill = "#fff";
        $photo.endBurst(device);
      }
    };

    vm.takePhoto = function() {
      // console.log("inside takePhoto 77777778888");
      // document.getElementsByClassName("photo-ring");
      
      // let element = document.getElementById("photo-ring-div");
      //       element.style.opacity = "0.5";
      //      element.style.filter  = 'alpha(opacity=50)';

      // // let svgElement = document.getElementById("photo-ring-svg");
      // // svgElement.style.pointer-events = 'none';
      // document.getElementById('photo-ring-svg').setAttribute('pointer-events','none');

      var device = $device.getSelectedDevice();
      var shutterWait = 0;
      var hasErrored = false;
      vm.changeopacity = "make-disabled";

      if (
        device &&
        device.metaData.cameraConnected &&
        !$photo.settings.inProgress
      ) {
        $photo.settings.inProgress = true;
        vm.camSettings = $photo.getPhotoSettings();
        $cordovaVibration.vibrate(50);
        var settings = $camSettings.getActiveSettings();
        if (settings && settings.shutter) {
          if (settings.shutter.value == "BULB") {

               // let element = document.getElementById("photo-ring-div");
               //  element.style.opacity = "1";
               //  element.style.filter  = 'alpha(opacity=100)';
               //  document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');
                
            vm.bulbClass = "animated fadeIn";
            vm.errorText =
              "Please change shutter from Bulb to enable photo capture";
            $timeout(function() {
              vm.bulbClass = "animated fadeOut";
              $photo.settings.inProgress = false;
              $timeout(function() {
                vm.bulbClass = "hidden";
              }, 1000);
            }, 5000);
            //user is in bulb mode, they arent allowed to take a picture
            return;
          }
          shutterWait = $views.getMillisecondsFromShutter(
            settings.shutter.value
          );
        }

        if (shutterWait > 1000) {
          var animationSettings = {
            maxShutter: shutterWait / 100,
            shutterCounter: 0
          };
          vm.animationSettings = animationSettings;
          var timer = $interval(function() {
            animationSettings.shutterCounter++;
            if (
              animationSettings.shutterCounter > animationSettings.maxShutter
            ) {
              //timer's done, go for it
              vm.animationSettings = {};
              $interval.cancel(timer);
            }
          }, 100);
        }

        $timeout(function() {
          if (device.btClassic.connected && device.btClassic.enabled) {
            if (!hasErrored) {
              vm.showSpinner = true;
              vm.backgroundGradient = 0.6;
            }
          }
          // we dont allow another photo to be taken until the shutter is closed. Also wait 300 ms before allowing press again
          $photo.settings.inProgress = false;
        }, shutterWait + 300);

        //timer to stop animating the thumbnail items if we havent gotten a response in a while
        animationTimer = $timeout(function() {
          vm.thumb = "img/pulse-scene.jpg";
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;
          vm.fill = "#fff";
        }, shutterWait + 6000);

        var tempDevice = device;
        var previousDevices = [];
        while (tempDevice) {
          $photo.takePhoto(tempDevice, true, shutterWait).then(
            function(response) {

                 // console.log('takePhoto called successfully 7777');
                 
                // let element = document.getElementById("photo-ring-div");
                // element.style.opacity = "1";
                // element.style.filter  = 'alpha(opacity=100)';
                // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');

              $timeout.cancel(animationTimer);
              if (response && response.thumbCancel) {
                //thumbnail failed for some reason
                vm.thumb = "img/pulse-scene.jpg";
                vm.showSpinner = false;
                vm.backgroundGradient = 0.0;
                vm.fill = "#fff";
              }
              return;
            },
            function(error) {
                // console.log('takePhoto called successfully 7777');
                
                // let element = document.getElementById("photo-ring-div");
                // element.style.opacity = "1";
                // element.style.filter  = 'alpha(opacity=100)';
                // document.getElementById('photo-ring-svg').setAttribute('pointer-events','auto');

              $timeout.cancel(animationTimer);
              //user is in video mode
              hasErrored = true;
              vm.thumb = "img/pulse-scene.jpg";
              vm.showSpinner = false;
              vm.backgroundGradient = 0.0;
              vm.fill = "#fff";
              vm.bulbClass = "animated fadeIn";
              vm.errorText = "Switch out of video mode in order to view images";
              $timeout(function() {
                vm.bulbClass = "animated fadeOut";
                $photo.settings.inProgress = false;
                $timeout(function() {
                  vm.bulbClass = "hidden";
                }, 1000);
              }, 5000);
            }
          );
          previousDevices.push(tempDevice);
          tempDevice = $device.getSelectedDevice(previousDevices);
        }
      }
    };

    function init() {
      vm.thumb = "img/pulse-scene.jpg";
      vm.showSpinner = false;
      vm.backgroundGradient = 0.0;
      vm.btClassic = btClassic;
      vm.histogram = false;
      vm.shutterCounter = 0;
      vm.maxShutter = 0;
      vm.fill = "#fff";
      vm.bulbClass = "hidden";
      vm.selectedDevice = $device.getSelectedDevice();
    }

    vm.isBtClassicConnected = function(checkForEnabled) {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      return $views.isBtClassicConnected(device, checkForEnabled);
    };

    vm.handleToggle = function(enabled) {
      console.log('inside handleToggle');
      var device = $device.getSelectedDevice();
      //check if we have iOS 11.2.5, if so we need to present the "can't do it" modal
      var os = $platform.getDeviceVersion();
      if (os === "11.2.5") {
        // console.log("Using OS 11.2.5, fuuuuuck");
        var modalData = {
          text:
            "Unfortunately Apple’s iOS 11.2.5 release had significant bluetooth bugs and has disabled the Image Review feature. This feature will be disabled until Apple releases fixes to iOS. All other Pulse features are functioning correctly. Thank you for your patience! ",

          onButtonClick: function onButtonClick() {},
          onYesButtonClick: function onYesButtonClick() {},
          animation: "fade-in-scale",
          twoButton: false
        };
        $rootScope.$broadcast("openModal-long", modalData);

        device.btClassic.enabled = false;
        device.btClassic.connected = false;
        return;
      }

      if (enabled) {
        // console.log(`device: ${JSON.stringify(device)}`);
        //try to turn the toggle on
        console.log('inside handleToggle enabled');
        btClassic.isConnected(device.metaData.macAddress).then(
          function(result) {
            //we are already connected, update the device already
            device.btClassic.connected = true;
            device.btClassic.enabled = true;
          },
          function(error) {
            //we aren't connected. Note that and try to connect
            device.btClassic.connected = false;
            device.btClassic.enabled = false;
            btClassic
              .connect(device.metaData.macAddress, device, false, true)
              .then(
                function(result) {
                  device.btClassic.connected = true;
                  device.btClassic.enabled = true;
                  vm.selectedDevice = device;
                },
                function(error) {
                  device.btClassic.enabled = false;
                  device.btClassic.connected = false;
                  vm.selectedDevice = device;
                }
              );
          }
        );
      }
    };

    vm.showHistText = function() {
      var device = $device.getSelectedDevice();
      if (
        $histogram.isBtClassicConnected() &&
        !vm.histogram &&
        !hasSeenHistText &&
        hasReceivedThumb
      ) {
        return true;
      } else {
        return false;
      }
    };

    vm.toggleHistogram = function() {
      hasSeenHistText = true;
      if (!vm.histogramItems || !vm.histogramItems.data) {
        vm.histogram = false;
      } else if (vm.histogram) {
        vm.histogram = false;
      } else {
        vm.histogram = true;
      }
    };

    vm.showThumbToggle = function() {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      if (device) {
        return true;
      } else {
        return false;
      }
    };

    vm.checkToggle = function() {
      var device = $device.getSelectedDevice();
      if (device.btClassic.enabled && device.btClassic.connected) {
        return true;
      } else {
        return false;
      }
    };

    // Enable drag-to-open menu
    $scope.$on("$ionicView.enter", function() {
      $ionicSideMenuDelegate.canDragContent(true);
    });
  });
})();
