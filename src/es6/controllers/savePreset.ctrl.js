(function() {
  'use strict';
  pulse.controllers.controller('SavePresetCtrl', function($preset, $timeout, $ionicHistory, $ionicNativeTransitions) {
    var vm = this;

    initView();


    function initView() {
      vm.model = $preset;
      vm.errorClass = 'hidden';
      vm.buttonText = 'Save';
    }

    vm.checkForEnter = function(key){
      if (key == 13){
        //they've pressed the enter key on the keyboard - hide it
        cordova.plugins.Keyboard.close();
      }
    };

    vm.savePreset = function(){
      if (!$preset.settings.presetName.length){
        vm.errorClass = 'animated fadeIn';
        $timeout(() => {
            vm.errorClass = 'animated fadeOut';
            $timeout(() => {
              vm.errorClass = 'hidden';
            }, 1000);
          }, 5000);
      }
      else{
        vm.buttonText = 'Saved';
        $timeout(() => {
        $ionicNativeTransitions.locationUrl($ionicHistory.backView().url, {
          "type": "slide",
          "direction": "right",
          "duration": 400
        });
        vm.buttonText = 'Save';

      }, 1000);
        $preset.savePreset().then((response)=>{
        })
      }
    }

  });
})();
