'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('BulbRampingCtrl', function ($scope, $rootScope, $device, $timelapse, $views, $stateParams, $ionicSideMenuDelegate) {
    var vm = this;
    var dId = $stateParams.deviceId;
    vm.dId = dId;

    init();

    function init() {
      vm.selectedDevice = $device.getSelectedDevice();
      $timelapse.initModel(dId);
      vm.timelapseModel = $timelapse;

      $ionicSideMenuDelegate.canDragContent(false);

      if (vm.selectedDevice && vm.selectedDevice.metaData.camSettings) {
        vm.shutterOptions = filterOptions(vm.selectedDevice.metaData.camSettings.shutterOptions, 'shutter');
        $timelapse.timelapses[dId].settings.exposure.shutterArray = vm.shutterOptions.valueArray;

        vm.isoOptions = filterOptions(vm.selectedDevice.metaData.camSettings.isoOptions, 'iso');
        $timelapse.timelapses[dId].settings.exposure.isoArray = vm.isoOptions.valueArray;
      }
    }

    vm.changeBulbRamping = function() {
      console.log('activeExposure : ' + vm.timelapseModel.timelapses[vm.dId].settings.activeExposure);
      console.log('activeBulbExposure : ' + vm.timelapseModel.timelapses[vm.dId].settings.activeBulbExposure);
      console.log('activeISOExposure : ' + vm.timelapseModel.timelapses[vm.dId].settings.activeISOExposure);
      if(!vm.timelapseModel.timelapses[vm.dId].settings.activeExposure &&  !vm.timelapseModel.timelapses[vm.dId].settings.activeISOExposure){
        if(!vm.timelapseModel.timelapses[vm.dId].settings.activeBulbExposure){
           console.log('inside activeBulbExposure if : ' + vm.timelapseModel.timelapses[vm.dId].settings.activeBulbExposure);
           $timelapse.timelapses[vm.dId].settings.activeBulbExposure = false;
        }else {
           console.log('inside activeBulbExposure else : ' + vm.timelapseModel.timelapses[vm.dId].settings.activeBulbExposure);
          $timelapse.timelapses[vm.dId].settings.activeBulbExposure = true;
        }
        
      }else {
        $timelapse.timelapses[vm.dId].settings.activeBulbExposure = false;
         var modalData = {
            text: "Only one Advanced Time Lapse feature can be turned on!",
            onButtonClick: function onButtonClick() {
              console.log('Inside successfully alert');
            },
            animation: "fade-in-scale"
          };
          $rootScope.$broadcast("openModal", modalData);
      }
    }
    vm.onReadySwiper = function (swiper, parentClass, settingType) {
      var parent = $('.' + parentClass);
      var header = parent.find('.setting-header');
      var slide = parent.find('.swiper-slide.clear');

      swiper.on('onTransitionEnd', function () {

        //the plugin does a really bad job of returning the correct index. Use jquery to fetch it from the data attribute
        var currentSlideElement = parent.find('.swiper-slide-active'),
            currentSlideIndexString = currentSlideElement.data('index'),
            currentSlide = parseInt(currentSlideIndexString, 10);
        var selectedDevice = $device.getSelectedDevice();
        $timelapse.updateExposureValues(settingType, currentSlide, dId);
      });
    };

    vm.getTotalPhotos = function () {
      return $timelapse.getTotalPhotos(dId);
    };

    vm.getEV = function () {
      if (!vm.shutterOptions.valueArray || !vm.isoOptions.valueArray) {
        return;
      } else {
        // we have values, so let's compute the EV!
        var startShutterVal = vm.shutterOptions.valueArray[$timelapse.timelapses[dId].settings.exposure.startShutterIndex].value,
            startIsoVal = vm.isoOptions.valueArray[$timelapse.timelapses[dId].settings.exposure.startIsoIndex].value,
            endShutterVal = vm.shutterOptions.valueArray[$timelapse.timelapses[dId].settings.exposure.endShutterIndex].value,
            endIsoVal = vm.isoOptions.valueArray[$timelapse.timelapses[dId].settings.exposure.endIsoIndex].value;
        var evs = $timelapse.getExposureDeltaEV(startShutterVal, startIsoVal, endShutterVal, endIsoVal, dId);
        return evs.deltaEv;
      }
    };

    function getTimeDifference() {
      var tlHours = parseInt($timelapse.timelapses[dId].settings.duration.hours),
          tlMinutes = parseInt($timelapse.timelapses[dId].settings.duration.minutes),
          delayHours = parseInt($timelapse.timelapses[dId].settings.exposure.delay.hours),
          delayMinutes = parseInt($timelapse.timelapses[dId].settings.exposure.delay.minutes);

      var totalTime = tlHours * 60 + tlMinutes;
      var delayTime = delayHours * 60 + delayMinutes;
      var maxTime = totalTime - delayTime;
      return maxTime;
    }

    /**
     * Removes the bad options (ie bulb, Hi, etc..)
     */
    function filterOptions(options, type) {
      var device = $device.getSelectedDevice();
      var changeIndex = false;
      var newIndex = 0;
      var removals = 0;
      var currentValues;
      var arrayOptions = {
        valueArray: [],
        activeIndex: 0
      };
      var badValues = ['??', 'BULB', 'Hi', 'AUTO'];
      if (type == 'shutter') {
        currentValues = device.metaData.camSettings.shutterOptions[device.metaData.camSettings.activeShutterIndex];
      } else {
        currentValues = device.metaData.camSettings.isoOptions[device.metaData.camSettings.activeIsoIndex];
      }

      _.forEach(options, function (option, $index) {
        var shouldAdd = false;
        var omitValue;
        _.forEach(badValues, function (badValue) {
          if (!omitValue) {
            omitValue = option.value.includes(badValue);
          }
        });
        if (!omitValue) {
          if (currentValues.value == option.value) {
            //handle dealing with the filtered out options, make sure we select the correct index
            newIndex = $index - removals;
          }
          arrayOptions.valueArray.push(option);
        } else {
          //keep track of the count of removed items
          removals++;
        }
      });

      arrayOptions.activeIndex = newIndex || 0;

      updateExposureValues(arrayOptions.activeIndex, type);
      return arrayOptions;
    }

    function updateExposureValues(index, type) {
      if (!$timelapse.timelapses[dId].settings.exposure) {
        $timelapse.timelapses[dId].settings.exposure = {};
        $timelapse.timelapses[dId].settings.exposure.delay = { hours: 0, minutes: 0 };
        $timelapse.timelapses[dId].settings.exposure.duration = { hours: 0, minutes: 0 };
      }
      //only update them if they havent been set
      if (type == 'shutter') {
        if (!$timelapse.timelapses[dId].settings.exposure.startShutterIndex) {
          $timelapse.timelapses[dId].settings.exposure.startShutterIndex = index;
        }
        if (!$timelapse.timelapses[dId].settings.exposure.endShutterIndex) {
          $timelapse.timelapses[dId].settings.exposure.endShutterIndex = index;
        }
      } else {
        //iso
        if (!$timelapse.timelapses[dId].settings.exposure.startIsoIndex) {
          $timelapse.timelapses[dId].settings.exposure.startIsoIndex = index;
        }
        if (!$timelapse.timelapses[dId].settings.exposure.endIsoIndex) {
          $timelapse.timelapses[dId].settings.exposure.endIsoIndex = index;
        }
      }
    }
  });
})();