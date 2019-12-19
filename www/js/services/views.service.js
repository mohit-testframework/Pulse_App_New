'use strict';

(function () {
  'use strict';

  pulse.services.factory('$views', function ($config, $menuItems, $platform) {

    var invalidCameraList = ['90', '80', '60', '70', '7200', '7100', '3200', '500'];

    var bugReportMode,
        permissableMode = false,
        canDragSideMenu = true,
        startUp = true,
        abortModes = false,
        isScanning = false,
        savedNickname,
        firstTime = false,
        logBackup = console.log;

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

    return {

      invalidCameraList: invalidCameraList,

      viewMode: '',

      firstTime: firstTime,

      abortModes: abortModes,

      canDragSideMenu: canDragSideMenu,

      isScanning: isScanning,

      bugReportMode: bugReportMode,

      permissableMode: permissableMode,

      savedNickname: savedNickname,

      computeDeltaEV: function computeDeltaEV(startShutter, startIso, finalShutter, finalIso) {
        var data;
        var deltaShutter, deltaIso, sign;

        if (finalShutter > startShutter) {
          deltaShutter = finalShutter / startShutter;
          sign = 1;
        } else {
          deltaShutter = startShutter / finalShutter;
          sign = -1;
        }
        deltaShutter = Math.log(deltaShutter) / Math.log(2) * sign;

        if (finalIso > startIso) {
          deltaIso = finalIso / startIso;
          sign = 1;
        } else {
          deltaIso = startIso / finalIso;
          sign = -1;
        }
        deltaIso = Math.log(deltaIso) / Math.log(2) * sign;

        data = {
          deltaEv: (deltaShutter + deltaIso).toFixed(2),
          deltaShutter: deltaShutter
        };

        return data;
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

      checkForAppUpdate: function checkForAppUpdate(configObj) {
        var recentApp;
        if ($platform.isAndroid()) {
          recentApp = configObj.latestAndroidApp;
        } else {
          recentApp = configObj.latestIosApp;
        }
        //remove the decimals
        recentApp = recentApp.replace(/\./g, '');
        var condensedAppVerion = appVersion.replace(/\./g, '');
        if (parseInt(condensedAppVerion) < parseInt(recentApp)) {

          //app is out of date
          return true;
        } else {
          return false;
        }
      },

      doesModelSupport: function doesModelSupport(device, mode) {
        var isSupported = true;
        var cameraModel = this.getCameraModel(device.metaData);
        var cameraModelMappings = $menuItems.cameraModelMappings;
        var listedModels = $menuItems.getListedModels();
        var matchedItem = _.find(listedModels, function (listedModel) {
          if (cameraModel.toLowerCase().indexOf(listedModel) > -1) {
            return listedModel;
          }
        });

        if (matchedItem) {
          if (typeof cameraModelMappings[matchedItem][mode] != 'undefined') {
            isSupported = cameraModelMappings[matchedItem][mode];
          }
        }

        return isSupported;
      },

      parseS3FirmwareFile: function parseS3FirmwareFile(firmwareFile) {

        if (firmwareFile.minor < 10) {
          firmwareFile.minor = '0' + firmwareFile.minor;
        }
        var s3firmware = parseFloat('' + firmwareFile.major + '.' + firmwareFile.minor);

        return s3firmware;
      },

      computeDeltaEVShutter: function computeDeltaEVShutter(startShutter, finalShutter) {
        if (!startShutter || !finalShutter) {
          //values not set. Assume no ramping present
          return 0;
        }
        var deltaShutter;
        var sign;

        if (finalShutter > startShutter) {
          deltaShutter = finalShutter / startShutter;
          sign = 1;
        } else {
          deltaShutter = startShutter / finalShutter;
          sign = -1;
        }
        deltaShutter = Math.log(deltaShutter) / Math.log(2) * sign;
        return deltaShutter;
      },

      computeDeltaEVIso: function computeDeltaEVIso(startIso, finalIso) {
        if (!startIso || !finalIso) {
          //values not set. Assume no ramping present
          return 0;
        }
        var deltaIso;
        var sign;

        if (finalIso > startIso) {
          deltaIso = finalIso / startIso;
          sign = 1;
        } else {
          deltaIso = startIso / finalIso;
          sign = -1;
        }
        deltaIso = Math.log(deltaIso) / Math.log(2) * sign;

        return deltaIso;
      },

      computeShutterEv: function computeShutterEv(shutterArray) {
        var _this = this;

        //get 4 values in the middle-ish
        //find the value '1'
        var oneIndex = _.findIndex(shutterArray, function (item) {
          return _this.str2Num(item.value) == 1;
        });

        var twoIndex = _.findIndex(shutterArray, function (item) {
          return _this.str2Num(item.value) == 2;
        });

        return Math.abs(oneIndex - twoIndex);
      },

      str2Num: function str2Num(strElement) {
        if (!strElement) {
          return 0;
        }
        if (strElement.indexOf('"') != -1) {
          return parseFloat(strElement.replace('"', '.'));
        }
        if (strElement.indexOf('/') != -1) {
          var arr = strElement.split('/');
          return parseFloat(arr[0] / arr[1]);
        }
        if (strElement.indexOf('BULB') != -1) {
          return 0;
        }
        if (strElement.indexOf('AUTO') != -1) {
          return 0;
        }
        //Nikon Iso Settings
        if (strElement.indexOf('Hi') != -1) {
          return strElement;
        }
        return parseFloat(strElement);
      },

      getMillisecondsFromShutter: function getMillisecondsFromShutter(shutterValue) {
        var shutterNumber = this.str2Num(shutterValue);
        //check to make sure our computed value is valid! 
        if (typeof shutterNumber != "number" || !(shutterNumber > 0 && shutterNumber < 30)) {
          console.log("getMillisecondsFromShutter gave a bad response: " + shutterValue);
          shutterNumber = 0.1;
        }
        return shutterNumber * 1000;
      },

      renderPhotoBoothUI: function renderPhotoBoothUI() {
        var header = $('.pulse-header');
        header.addClass('orange-bg');
        $('.menu-pane').addClass('orange-bg');
        $('.pb-header').addClass('orange-bg');
        $('.bar-footer').addClass('orange-bg');
      },

      removePhotoboothUI: function removePhotoboothUI() {
        var header = $('.pulse-header');
        header.removeClass('orange-bg');
        $('.pb-header').removeClass('orange-bg');
        $('.menu-pane').removeClass('orange-bg');
        $('.bar-footer').removeClass('orange-bg');
      },

      isNumber: function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      },

      numToArray2: function numToArray2(input) {
        // Converts to 2 Byte Array
        var mask = 0x00FF;
        var LSB = input & mask;
        var MSB = (input & mask << 8) >> 8;
        var array = new Uint8Array([LSB, MSB]);
        return array.buffer;
      },

      numToArray4: function numToArray4(input) {
        var mask = 0x000000FF;
        var LSB = input & mask;
        var MSB = (input & mask << 8) >> 8;
        var MMSB = (input & mask << 16) >> 16;
        var MMMSB = (input & mask << 24) >> 24;
        var array = new Uint8Array([LSB, MSB, MMSB, MMMSB]);
        //alert(LSB + ' ' + MSB + ' ' + MMSB + ' ' + MMMSB);
        return array.buffer;
      },

      decToHex32: function decToHex32(input) {
        var hexPrepend = "0x";
        var hexNum = input.toString(16);
        hexNum = hexNum.toUpperCase(); //need upper case for lookup tables
        var numZeros = 8 - hexNum.length;
        for (var i = 0; i < numZeros; i++) {
          hexPrepend = hexPrepend.concat("0");
        }
        return hexPrepend.concat(hexNum);
      },

      canDoAndroidFota: function canDoAndroidFota() {
        var isGood = true;
        if ($platform.isAndroid()) {
          var version = $platform.getDeviceVersion();
          if (Math.floor(parseFloat(version)) < $config.MIN_ANDROID_FOTA) {

            //their android sucks too much and they cant do FOTA now
            isGood = false;
          }
        }
        return isGood;
      },

      stringtoBuffer: function stringtoBuffer(str) {
        var len = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 17;

        var buf = new ArrayBuffer(len); // 1 byte for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0; i < len; i++) {
          if (i < str.length) {
            bufView[i] = str.charCodeAt(i);
          } else {
            bufView[i] = 0;
          }
        }
        return bufView;
      },

      decToHex: function decToHex(input) {
        var hexPrepend = "0x";
        var hexNum = input.toString(16);
        hexNum = hexNum.toUpperCase(); //need upper case for lookup tables
        return hexPrepend.concat(hexNum);
      },

      integerToByteArray: function integerToByteArray(number) {
        var mask = 0x000000FF;
        var byte0 = number & mask;
        var byte1 = (number & mask << 8) >> 8;
        var byte2 = (number & mask << 16) >> 16;
        var byte3 = (number & mask << 24) >> 25;
        var array = new Uint8Array([byte0, byte1, byte2, byte3]);
        return array;
      },

      hexstringToByteArray: function hexstringToByteArray(hexstr, retArray) {
        var lookupHex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        for (var i = 0; i < hexstr.length; i++) {
          if (lookupHex.indexOf(hexstr[i]) > 0) {
            retArray.push(lookupHex.indexOf(hexstr[i]));
          }
        }
      },

      byteArrayToHexString: function byteArrayToHexString(uint8arr) {
        if (!uint8arr) {
          return '';
        }

        var hexStr = '';
        for (var i = 0; i < uint8arr.length; i++) {
          var hex = (uint8arr[i] & 0xff).toString(16);
          hex = hex.length === 1 ? '0' + hex : hex;
          hexStr += hex;
        }

        return hexStr.toUpperCase();
      },

      isCameraConnected: function isCameraConnected(device) {
        if (device && typeof device.metaData.cameraType != 'undefined' && device.metaData.cameraConnected) {
          return true;
        } else {
          return false;
        }
      },

      isBtClassicConnected: function isBtClassicConnected(device) {
        var checkForEnabledToo = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var result = false;
        if (!device || !device.btClassic) {
          return result;
        }
        if (!checkForEnabledToo) {
          if (device.btClassic.connected) {
            result = true;
          }
        } else {
          if (device.btClassic.enabled && device.btClassic.connected) {
            result = true;
          }
        }

        return result;
      },

      detectVersion: function detectVersion(versionString) {
        var versionArray = versionString.split('.');
        var parentVersion = _.first(versionArray);
        return parentVersion;
      },

      /**
       * getMinutes - calculates the number of minutes from seconds
       * @param  {int}  - totalSeconds - the number of seconds
       * @return {int}  - the calculated number of minutes
       */
      getMinutes: function getMinutes(totalSeconds) {
        var minuteDivisor = totalSeconds % (60 * 60);
        var minutes = Math.floor(minuteDivisor / 60).toString();
        if (minutes.length < 2) minutes = '0' + minutes;
        return minutes;
      },

      /**
       * getSeconds - calculates the number of seconds from seconds with a clock format
       * @param  {int}  - totalSeconds - the number of seconds
       * @return {int}  - the calculated number of seconds
       */
      getSeconds: function getSeconds(totalSeconds) {
        var seconds = totalSeconds % 60;
        if (seconds.toString().length == 1) seconds = '0' + seconds;
        return seconds;
      }

    };
  });
})();