"use strict";

(function() {
  "use strict";

  pulse.controllers.controller("TimelapseCtrl", function(
    $scope,
    $ionicSlideBoxDelegate,
    $ionicLoading,
    $rootScope,
    $ionicPlatform,
    $platform,
    $ionicSideMenuDelegate,
    $interval,
    $timeout,
    $timelapse,
    $transmit,
    $preset,
    $views,
    $device,
    $histogram,
    $camSettings,
    $config,
    $photo,
    $stateParams,
    $window,
    btClassic
  ) {
    var vm = this;
    vm.processing = false;
    var buttonInterval;
    var waitingForResponse = false;
    var requestingThumb = false;
    var countdown;
    var isRendering = false;
    var dId = $stateParams.deviceId;
    var hasSeenHistText = false;
    vm.dId = dId;
    var hasReceivedThumb = false;

    //initialize view variables
    initView();

    vm.disableSwipe = function(boolean) {
      $ionicSlideBoxDelegate.enableSlide(false);
    };

    $rootScope.$on("startTimelapseUi", function(event, device) {
      if (device.id == $stateParams.deviceId) {
        waitingForResponse = false;
        console.log("got response from pulse. initializing timelapse");
        initializeTimelapse();
      }
    });

    $rootScope.$on("timelapseFinished", function(event, data) {
      var connectedPulses = $device.getConnectedDevices();
      if (connectedPulses.length < 2) {
        if (
          data.deviceId == $stateParams.deviceId &&
          $timelapse.timelapses[dId].settings.isActive
        ) {
          var modalData = {
            text: "Your time lapse completed successfully!",
            onButtonClick: function onButtonClick() {
              $ionicSlideBoxDelegate.slide(0);
              $timelapse.timelapses[dId].settings.isActive = false;
            },
            animation: "fade-in-scale"
          };
          $rootScope.$broadcast("openModal", modalData);
        }
      }
    });

    $rootScope.$on("timelapseReconnect", function(event, data) {
      //app was closed and reopened and we have an active timelapse. We need to re-render the ui
      console.log("reconnecting timelapse");
      $timelapse.restartTimelapseFromAppClose(data);

      //go to the active timelapse slide

      $ionicSlideBoxDelegate._instances[0].slide(1);
    });

    $scope.$on("$ionicView.enter", function() {
      var device = $device.getSelectedDevice();
      if (!$timelapse.timelapses[dId].settings.isActive) {
        //if the user gets in some weird state, slide back to the original slide if the tl is not active
        $ionicSlideBoxDelegate.slide(0);
      }
    });

    vm.startTl = function() {
      var device;
      if (vm.processing) {
        //they must want to stop the TL

        //Do some UI stuff
        vm.processing = false;
        $interval.cancel(buttonInterval);
        vm.opacity = 1;
        vm.tlDelay = 0;
        vm.countDown = 0;
        $interval.cancel(countdown);

        //kill the TL
        device = $device.getSelectedDevice();
        $timelapse.kill(device);
        return;
      }
      vm.timelapseAttempt = true;
      device = $device.getSelectedDevice();
      var timerIncrement;
      var modalData;
      waitingForResponse = true;
      if (device && device.metaData && device.metaData.cameraConnected) {
        //add rendering variables for the progress counter around the button
        if (
          !$camSettings.hasGoodShutterSetting(
            device,
            $timelapse.timelapses[dId].settings.interval
          )
        ) {
          modalData = {
            text:
              "We found a problem! Your shutter speed of " +
              device.metaData.camSettings.shutterOptions[
                device.metaData.camSettings.activeShutterIndex
              ].value +
              " cannot be slower than your timelapse interval!",
            onButtonClick: function onButtonClick() {
              console.log("Shutter speed was too slow for lapsing");
            },
            animation: "fade-in-scale"
          };
          $rootScope.$broadcast("openModal", modalData);
          return;
        } else if (
          parseInt($timelapse.timelapses[dId].settings.interval) >
          parseInt($timelapse.timelapses[dId].settings.duration.hours) *
            60 *
            60 +
            parseInt($timelapse.timelapses[dId].settings.duration.minutes) * 60
        ) {
          modalData = {
            text:
              "We found a problem! Your interval cannot be longer than the length of your timelapse.",
            onButtonClick: function onButtonClick() {
              console.log("Interval longer than length of timelapse");
            },
            animation: "fade-in-scale"
          };
          $rootScope.$broadcast("openModal", modalData);
          return;
        }
        vm.processing = true;
        vm.timelapseAttempt = false;
        vm.tlDelay = 1;
        vm.tlMax = 5;
        vm.opacity = 0;
        //send the TL data to pulse
        $timelapse.sendTlData(device);

        if ($timelapse.timelapses[dId].settings.activeDelay) {
          vm.tlMax =
            (parseInt($timelapse.timelapses[dId].settings.delay.hours) * 60 +
              parseInt($timelapse.timelapses[dId].settings.delay.minutes)) *
            60;
          countdown = $interval(
            function() {
              vm.countDown++;
            },
            1000,
            vm.tlMax
          );
          timerIncrement = 1000;
        } else {
          timerIncrement = 300;
        }
        //animate the progress bar around the button
        buttonInterval = $interval(
          function() {
            vm.tlDelay++;
          },
          timerIncrement,
          vm.tlMax - 1
        );

        //if we never get a response back from the device, wait a bit and reset the button
        $timeout(function() {
          if (waitingForResponse) {
            vm.processing = false;
            $interval.cancel(buttonInterval);
            vm.opacity = 1;
            vm.tlDelay = 0;
          }
        }, vm.tlMax * timerIncrement + 3000);
      }
    };

    vm.isNumber = function(n) {
      return $views.isNumber(n);
    };

    vm.endTl = function() {
      var device = $device.getSelectedDevice();
      if (device == undefined) {
        device = { id: $stateParams.deviceId };
      }
      vm.pauseOrResumeText = "Pause";
      $timelapse.kill(device);
      vm.countDown = 0;

      //go back to the intial timelapse page

      $ionicSlideBoxDelegate.slide(0);
    };

    vm.isBtClassicConnected = function() {
      var device = $device.getSelectedDevice();
      if (device && device.btClassic.enabled && device.btClassic.connected) {
        return true;
      } else {
        return false;
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

    vm.showThumbToggle = function() {
      var device = $device.getSelectedDevice();
      vm.selectedDevice = device;
      if (device) {
        return true;
      } else {
        return false;
      }
    };

    vm.pauseTl = function() {
      var device = $device.getSelectedDevice();
      if (device == undefined) {
        device = { id: $stateParams.deviceId };
      }
      if (!$timelapse.timelapses[dId].settings.isPaused) {
        vm.pauseOrResumeText = "Resume";
        $timelapse.pause(device);
      } else {
        //they are resuming a TL
        vm.pauseOrResumeText = "Pause";
        $timelapse.start(device, true);
      }
    };

    vm.getTotalPhotos = function() {
      return $timelapse.getTotalPhotos(dId);
    };

    vm.getFinalTLLength = function() {
      var totalPhotos = $timelapse.getTotalPhotos(dId);
      var fps = 24;
      return Math.round(totalPhotos / fps);
    };

    function initializeTimelapse() {
      var device = $device.getSelectedDevice();
      if (!device) {
        return;
      }
      var deviceId = device.id;

      //reset the rendering for the progress bar around the button
      //blink three times
      $transmit.blinkLED(device, 3, $config.LED_BLINK);
      vm.processing = false;
      $interval.cancel(buttonInterval);
      vm.opacity = 1;
      vm.tlDelay = 0;

      //cue up the slides
      var slideIndex = $timelapse.timelapses[deviceId].settings.slideIndex;
      if ($views.firstTime) {
        slideIndex++;
      }
      $ionicSlideBoxDelegate._instances[slideIndex].slide(1);
      //build our TL data object
      $timelapse.prepareCountDownObject(device.id);
      if (!$timelapse.timelapses[deviceId].settings.duration.isInfinite) {
        vm.minuteString = $timelapse.renderMinutes(deviceId);
      }
      $timelapse.start(device);
    }

    vm.getCurrentShutter = function() {
      var settings = $camSettings.getActiveSettings();
      return settings.shutter.value;
    };

    vm.getCurrentIso = function() {
      var settings = $camSettings.getActiveSettings();
      return settings.iso.value;
    };

    function initView() {
      //modal content
      vm.control = {};
      vm.btClassic = btClassic;
      vm.thumb = "img/pulse-scene.jpg";
      vm.showSpinner = false;
      vm.backgroundGradient = 0.0;
      vm.histogram = false;
      vm.shutterCounter = 0;
      vm.maxShutter = 0;
      vm.countDown = 0;
      vm.minMinute = 0;
      vm.hasSwiped = false;
      vm.presetModel = $preset;
      vm.pauseOrResumeText = "Pause";
      vm.deviceModel = $device.getSelectedDevice();
      vm.model = $timelapse;
      dId = $stateParams.deviceId;
      vm.dId = dId;
      $timelapse.initModel(dId);
      vm.timelapseModel = $timelapse;
      $scope.tlSettings = $timelapse.timelapses[dId].settings;

      //hacky stuff to make sure the timelapse slider goes to the actual right slide since there are now multiple slide instances
      if (!$timelapse.timelapses[dId].settings.slideIndex) {
        $timelapse.timelapses[dId].settings.slideIndex = $timelapse.slideIndex;
        $timelapse.slideIndex = $timelapse.slideIndex + 2;
      }

      setBackgroundMode();
    }

    //handles rendering the final minute display in the TL second slide
    vm.renderMinutes = function() {
      var minutes = $timelapse.renderMinutes(dId);
      return minutes;
    };

    function setBackgroundMode() {
      $ionicPlatform.on("pause", function(event) {
        console.log("entering background mode");
        if ($timelapse.timelapses[dId].settings.isActive) {
          $timelapse.pauseUI(dId);
          $timelapse.timelapses[dId].settings.backgroundMode = true;
          $timelapse.timelapses[dId].settings.backgroundTime = Date.now();
        }
      });

      $ionicPlatform.on("resume", function(event) {
        console.log("app is opened, leaving background mode");
        var device = $device.getSelectedDevice();
        if (device) {
          if ($timelapse.timelapses[device.id].settings.isActive) {
            $timelapse.start(device, false, true).then(function() {
              vm.control.openModal("newspaper");
            });
          }
        }
      });
    }

    // Disable drag-to-open menu
    $scope.$on("$ionicView.enter", function() {
      $ionicSideMenuDelegate.canDragContent(false);
    });

    $rootScope.$on("thumbnailUpload", function(event, data) {
      isRendering = false;
      console.log("data.thumbPath Timelapse Page : " + data.thumbPath);
      let photoThumb = window.Ionic.WebView.convertFileSrc(data.thumbPath);
      if (requestingThumb) {
        if (data.hasThumb) {
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;
          vm.thumb = photoThumb;
          vm.defaultThumb = false;
          hasReceivedThumb = true;
          requestingThumb = false;
          histogram(photoThumb, function(err, histData) {
            if (histData) {
              vm.histogramItems = $histogram.prepareHistogram(histData);
              //make sure the histogram redraws
              $scope.$apply();
            }
          });
        } else {
          //thumbnail failed
          vm.showSpinner = false;
          vm.backgroundGradient = 0.0;
        }
      }
    });

    vm.changeSlide = function($index) {
      if ($index == 1) {
        vm.hasSwiped = true;
        handleImageRender();
      }
    };

    vm.refreshImage = function() {
      handleImageRender();
    };

    vm.getDelaySeconds = function() {
      return (
        (parseInt($timelapse.timelapses[dId].settings.delay.hours) * 60 +
          parseInt($timelapse.timelapses[dId].settings.delay.minutes)) *
        60
      );
    };

    function handleImageRender() {
      var currentPhoto =
        $timelapse.timelapses[dId].settings.enumeratingTl.photos;
      vm.currentPhoto = currentPhoto;
      vm.time = new Date().getTime();
      var shutterWait;
      var device = $device.getSelectedDevice();
      var camSettings = $camSettings.getActiveSettings();
      if (camSettings && camSettings.shutter) {
        shutterWait = $views.getMillisecondsFromShutter(
          camSettings.shutter.value
        );
      } else {
        shutterWait = 50;
      }
      var minInterval;
      if (device.firmwareType == "BAD_TIME") {
        minInterval = 1000;
      } else {
        minInterval = 4000;
      }
      if (
        $timelapse.timelapses[dId].settings.interval * 1000 - shutterWait <
        minInterval
      ) {
        vm.tooMuchInterval = true;
        return;
      } else {
        vm.tooMuchInterval = false;
      }
      if (isRendering) {
        $timeout(function() {
          //kill the isRendering flag if we get no response back;
          isRendering = false;
        }, 4000);
        return;
      }
      isRendering = true;
      vm.showSpinner = true;
      vm.backgroundGradient = 0.6;
      requestingThumb = true;

      $timeout(function() {
        vm.camSettings = $photo.getPhotoSettings();
        $photo.getThumb(device).then(
          function(result) {},
          function(error) {
            vm.showSpinner = false;
            vm.backgroundGradient = 0.0;
          }
        );
        var currentPhoto =
          $timelapse.timelapses[dId].settings.enumeratingTl.photos;
        vm.currentPhoto = currentPhoto;
      }, parseInt($timelapse.timelapses[dId].settings.enumeratingTl.interval) *
        1000 +
        1000);
    }

    vm.toggleHistogram = function() {
      hasSeenHistText = true;
      if (
        !vm.histogramItems ||
        !vm.histogramItems.data ||
        !vm.isBtClassicConnected()
      ) {
        vm.histogram = false;
      } else if (vm.histogram) {
        vm.histogram = false;
      } else {
        vm.histogram = true;
      }
    };

    vm.handleToggle = function(enabled) {
      var device = $device.getSelectedDevice();

      //check if we have iOS 11.2.5, if so we need to present the "can't do it" modal
      var os = $platform.getDeviceVersion();
      if (os === "11.2.5") {
        console.log("Using OS 11.2.5, fuuuuuck");
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
        console.log(`device: ${device}`);
        //try to turn the toggle on
        btClassic.isConnected(device.metaData.macAddress).then(
          function(result) {
            //we are already connected, update the device already
            device.btClassic.connected = true;
            device.btClassic.enabled = true;
          },
          function(error) {
            //we aren't connected. Try to connect
            btClassic
              .connect(device.metaData.macAddress, device, false, true)
              .then(
                function(result) {
                  device.btClassic.connected = true;
                  device.btClassic.enabled = true;
                },
                function(error) {
                  device.btClassic.enabled = false;
                  device.btClassic.connected = false;
                }
              );
          }
        );
      }
    };

    vm.isThumbButtonDisabled = function() {
      var device = $device.getSelectedDevice();
      vm.deviceModel = device;
      var disabled = true;
      if (vm.isBtClassicConnected()) {
        //interval is long enough and they have a classic connection
        disabled = false;
      }
      return disabled;
    };
  });
})();
