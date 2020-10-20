'use strict';

(function () {
  'use strict';

  pulse.services.factory('$camSettings', function ($config, $transmit, $device, $views) {

    //default

    return {

      /**
       * updateSetting updates the camsetting model to the currently active one
       * @param  {string} key    the key name of the setting to update
       * @param  {int} newIndex the index of the value to update
       * @return {null}
       */
      updateSetting: function updateSetting(device, key, newIndex) {
        console.log('inside updateSetting : ');
        var updateActiveIndex = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

        var newVal;
        var byteArray;
        if (key == 'shutter') {
          console.log('inside updateSetting shutter');
          newVal = device.metaData.camSettings.shutterOptions[newIndex];
          console.log('inside updateSetting shutter newVal : '+ JSON.stringify(newVal));
          if (updateActiveIndex) {
            device.metaData.camSettings.activeShutterIndex = newIndex;
          }
          if (newVal && newVal.byte !== false) {
            byteArray = integerToByteArray(newVal.byte);
            $transmit.setShutter(device, byteArray);
          }
        } else if (key == 'aperture') {
          console.log('inside updateSetting aperture');
          newVal = device.metaData.camSettings.apertureOptions[newIndex];
          console.log('inside updateSetting aperture newVal : '+ JSON.stringify(newVal));
          if (updateActiveIndex) {
            device.metaData.camSettings.activeApertureIndex = newIndex;
          }
          if (newVal && newVal.byte !== false) {
            byteArray = integerToByteArray(newVal.byte);
            $transmit.setAperture(device, byteArray);
          }
        } else {
          //iso
          console.log('inside updateSetting ISO');
          newVal = device.metaData.camSettings.isoOptions[newIndex];
           console.log('inside updateSetting ISO newVal : '+ JSON.stringify(newVal));
          if (updateActiveIndex) {
            device.metaData.camSettings.activeIsoIndex = newIndex;
          }
          if (newVal && newVal.byte !== false) {
            byteArray = integerToByteArray(newVal.byte);
            $transmit.setIso(device, byteArray);
          }
        }
        $device.setDevice(device);
      },

      findIndexForSettingValue: function findIndexForSettingValue(value, valueArray) {
        var index;
        if (!valueArray.length) {
          return;
        }
        _.forEach(valueArray, function (arrayItem, $index) {
          if (arrayItem.value == value) {
            index = $index;

            //jump outta the loop
            return false;
          }
        });
        return index;
      },

      getCameraType: function getCameraType(metaData) {
        var camType;
        if (angular.isUndefined(metaData.cameraType)) {
          //camType was never updated
          return camType;
        }
        //we need to check for 0 first
        if (metaData.cameraType == $config.cameraSettings.make.CANON) {
          camType = 'Canon';
        } else {
          camType = 'Nikon';
        }
        return camType;
      },

      getActiveSettings: function getActiveSettings() {
        var settings = {
          aperture: null,
          iso: null,
          shutter: null
        };
        var device = $device.getSelectedDevice();
        if (device) {
          settings.aperture = device.metaData.camSettings.apertureOptions[device.metaData.camSettings.activeApertureIndex];
          settings.iso = device.metaData.camSettings.isoOptions[device.metaData.camSettings.activeIsoIndex];
          settings.shutter = device.metaData.camSettings.shutterOptions[device.metaData.camSettings.activeShutterIndex];
        }

        return settings;
      },

      getCameraModel: function getCameraModel(metaData) {
        var prefix = ' ';
        var camType = this.getCameraType(metaData);
        if (camType) {
          var camModel = spliceCameraModel(metaData.cameraModel);
          if (camType.toLowerCase() == 'nikon') {
            prefix = ' D';
          }
          return camType + prefix + camModel;
        } else {
          return '';
        }
      },

      getShutterFromIndex: function getShutterFromIndex(index) {
        var device = $device.getSelectedDevice();
        if (!device) {
          return;
        }
        return device.metaData.camSettings.shutterOptions[index].value;
      },

      hasGoodShutterSetting: function hasGoodShutterSetting(device, interval) {
        if (!device || !device.metaData.camSettings.shutterOptions.length) {

          //we dont have the shutter settings for some reason. Just hope they are good :)
          return true;
        }
        var currentShutter = device.metaData.camSettings.shutterOptions[device.metaData.camSettings.activeShutterIndex].value;

        if (!currentShutter) {
          //we couldnt find a shutter match. Hope things work out :)
          return true;
        }
        var shutterMilliseconds = $views.getMillisecondsFromShutter(currentShutter);
        if (!angular.isNumber(shutterMilliseconds) || isNaN(shutterMilliseconds)) {
          //something weird happened in the shutter speed conversion. Hope things work out :)
          return true;
        }
        if (shutterMilliseconds < parseInt(interval) * 1000) {
          return true;
        } else {
          return false;
        }
      }

    };

    function spliceCameraModel(camModel) {
      var splicedWords = ['nikon', 'ikon', 'canon', 'anon', 'eos'];
      var camModelArray = _.clone(camModel).split(' ');

      _.forEach(splicedWords, function (word) {
        _.forEach(camModelArray, function (modelString, $index) {
          if (modelString && modelString.toLowerCase() == word.toLowerCase()) {
            camModelArray.splice($index, 1);
          }
        });
      });
      return camModelArray.join(' ');
    }

    function integerToByteArray(number) {
      var mask = 0x000000FF;
      var byte0 = number & mask;
      var byte1 = (number & mask << 8) >> 8;
      var byte2 = (number & mask << 16) >> 16;
      var byte3 = (number & mask << 24) >> 25;
      var array = new Uint8Array([byte0, byte1, byte2, byte3]);
      return array;
    }
  });
})();