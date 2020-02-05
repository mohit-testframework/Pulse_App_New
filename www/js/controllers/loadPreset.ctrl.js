'use strict';

(function () {
  'use strict';

  pulse.controllers.controller('LoadPresetCtrl', function ($preset, $cordovaNativeStorage, $rootScope, $ionicHistory, $timeout, $ionicNativeTransitions) {

    var vm = this;

    initView();

    function initView() {
      vm.buttonText = 'Load';
      vm.swiper = {};
      $preset.fetchPresets().then(function (presets) {
        vm.presets = presets;
      });
    }

    vm.loadPreset = function () {
      $preset.fetchPresets().then(function (presets) {

        var currentSlideIndexString = $('.load-preset-container .swiper-slide-active').data('index');
        var presetToLoad = presets[currentSlideIndexString];

        if (presetToLoad) {
          $preset.settings.presetName = currentSlideIndexString;
          $preset.loadPreset(presetToLoad);
          broadCastUi(presetToLoad);
        }
        vm.buttonText = 'Loaded';
        $timeout(function () {
          $ionicNativeTransitions.locationUrl($ionicHistory.backView().url, {
            "type": "slide",
            "direction": "right",
            "duration": 400
          });
          vm.buttonText = 'Load';
        }, 1000);
      });
    };

    /**
     * calculateTotalPhotos - takes the duration & interval and determines how many photos will be taken for UI display
     * @param  {object} duration - composed of minutes and hours
     * @param  {int/string} interval - how often photo will be taken
     * @return {int}   total # of photos
     */
    vm.calculateTotalPhotos = function (duration, interval) {
      var minutes = parseInt(duration.minutes),
          hours = parseInt(duration.hours),
          totalSeconds = (hours * 60 + minutes) * 60,
          totalPhotos = Math.floor(totalSeconds / parseInt(interval));
      return totalPhotos;
    };

    vm.deletePreset = function () {
      $preset.fetchPresets().then(function (presets) {
        var currentSlideIndexString = $('.load-preset-container .swiper-slide-active').data('index');
        var currentSlideNum = $('.load-preset-container .swiper-slide-active').data('num');

        delete presets[currentSlideIndexString];
        vm.swiper.removeSlide(currentSlideNum);
        if (_.isEmpty(presets)) {
          presets = null;
        }
        vm.presets = presets;
        $cordovaNativeStorage.setItem('presets', presets).then(function (response) {
          console.log('preset deleted');
        });
      });
    };

    function broadCastUi(presetToLoad) {
      $rootScope.$broadcast('autoIncrement', {
        value: presetToLoad.interval,
        incrementerName: 'timelapse'
      });
      $rootScope.$broadcast('autoIncrementTime', {
        value: presetToLoad.duration,
        timeIncrementerName: 'timelapse'
      });
      if (presetToLoad.activeExposure) {
        $rootScope.$broadcast('autoIncrementTime', {
          value: presetToLoad.exposure.duration,
          timeIncrementerName: 'exposure-duration'
        });
        $rootScope.$broadcast('autoIncrementTime', {
          value: presetToLoad.exposure.delay,
          timeIncrementerName: 'exposure-delay'
        });
      }

      if (presetToLoad.activeDelay) {
        $rootScope.$broadcast('autoIncrementTime', {
          value: presetToLoad.delay,
          timeIncrementerName: 'delay'
        });
      }
    }
  });
})();