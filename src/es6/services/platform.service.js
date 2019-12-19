(function() {
  'use strict';
  pulse.services.factory('$platform', function() {


    return {
      isAndroid: function(){
        if (device.platform == 'Android'){
          return true;
        }
        else{
          return false;
        }
      },

      getDeviceId: function(){
        if (device){
          return device.uuid;
        }
        else{
          return 'No connected device';
        }
      },

      getDevicePlatform: function(){
        if (device){
          return device.platform;
        }
        else{
          return 'No connected device';
        }
      },

      getDeviceVersion: function(){
        if (device){
          return device.version;
        }
        else{
          return 'No connected device';
        }
      },

      getDeviceModel: function(){
        if (device){
          return device.model;
        }else{
          return 'No connected device';
        }
      }

    };
  });
})();
