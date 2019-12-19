'use strict';

(function () {
  'use strict';

  pulse.services.factory('$menuItems', function () {
    var menuItems = [{
      'label': 'Photo',
      'icon': 'ion-image',
      'page': 'app.main',
      'name': 'main',
      'greyOut': 'true'
    }, {
      'label': 'Video',
      'icon': 'ion-ios-videocam',
      'page': 'app.video',
      'name': 'video',
      'greyOut': 'true'
    }, {
      'label': 'Time Lapse',
      'icon': 'ion-android-time',
      'name': 'timelapse',
      'showPercentage': true,
      'page': 'app.timelapse'
    }, {
      'label': 'Long Exposure',
      'icon': 'pulsicons-bulb',
      'page': 'app.bulb',
      'name': 'bulb',
      'greyOut': 'true'
    }, {
      'label': 'HDR',
      'icon': 'pulsicons-hdr-2',
      'page': 'app.hdr',
      'name': 'hdr',
      'greyOut': 'true'
    }, {
      'label': 'Photo Booth',
      'icon': 'ion-film-marker',
      'page': 'app.photobooth',
      'name': 'booth',
      'greyOut': 'true'
    }, {
      'label': 'Devices',
      'icon': 'pulsicons-devices',
      'page': 'app.devices',
      'name': 'devices',
      'noDevice': 'true'
    }, {
      'label': 'Settings',
      'icon': 'ion-ios-gear',
      'page': 'app.appsettings',
      'name': 'appsettings'
    }];

    var cameraModelMappings = {
      //PLEASE NOTE: the order of the camera models is important here. If the model string is potentially a subset of the
      //of another model string, then that string MUST be last in the list. Example: "d4s" needs to be BEFORE "d4"
      "sl1": {
        "video": true,
        "bulb": true
      },
      "xsi": {
        "video": false,
        "bulb": true
      },
      "xs": {
        "video": false,
        "bulb": true
      },
      "t1i": {
        "video": false,
        "bulb": true
      },
      "t1": {
        "video": false,
        "bulb": true
      },
      "t2i": {
        "video": true,
        "bulb": true
      },
      "t2": {
        "video": true,
        "bulb": true
      },
      "t3i": {
        "video": true,
        "bulb": true
      },
      "t3": {
        "video": true,
        "bulb": true
      },
      "t4i": {
        "video": true,
        "bulb": true
      },
      "t4": {
        "video": true,
        "bulb": true
      },
      "t5i": {
        "video": true,
        "bulb": true
      },
      "t5": {
        "video": true,
        "bulb": true
      },
      "t6i": {
        "video": true,
        "bulb": true
      },
      "t6s": {
        "video": true,
        "bulb": true
      },
      "t6": {
        "video": true,
        "bulb": true
      },
      "100d": {
        "video": true,
        "bulb": true
      },
      "450d": {
        "video": false,
        "bulb": true
      },
      "500d": {
        "video": false,
        "bulb": true
      },
      "550d": {
        "video": true,
        "bulb": true
      },
      "600d": {
        "video": true,
        "bulb": true
      },
      "650d": {
        "video": true,
        "bulb": true
      },
      "700d": {
        "video": true,
        "bulb": true
      },
      "750d": {
        "video": true,
        "bulb": true
      },
      "760d": {
        "video": true,
        "bulb": true
      },
      "40d": {
        "video": false,
        "bulb": true
      },
      "50d": {
        "video": false,
        "bulb": true
      },
      "60d": {
        "video": true,
        "bulb": true
      },
      "70d": {
        "video": true,
        "bulb": true
      },
      "80d": {
        "video": true,
        "bulb": true
      },
      "7d ii": {
        "video": true,
        "bulb": true
      },
      "7d": {
        "video": true,
        "bulb": true
      },
      "6d": {
        "video": true,
        "bulb": true
      },
      "5d iii": {
        "video": true,
        "bulb": true
      },
      "5d ii": {
        "video": true,
        "bulb": true
      },
      "5dsr": {
        "video": true,
        "bulb": true
      },
      "5ds": {
        "video": true,
        "bulb": true
      },
      "1ds iii": {
        "video": false,
        "bulb": true
      },
      "1d iii": {
        "video": false,
        "bulb": true
      },
      "1d iv": {
        "video": true,
        "bulb": true
      },
      "1dx ii": {
        "video": true,
        "bulb": true
      },
      "1dx": {
        "video": true,
        "bulb": true
      },
      "1dc": {
        "video": true,
        "bulb": true
      },
      "d5000": {
        "video": false,
        "bulb": false
      },
      "d5100": {
        "video": false,
        "bulb": false
      },
      "d5200": {
        "video": true,
        "bulb": true
      },
      "d5300": {
        "video": true,
        "bulb": true
      },
      "d5500": {
        "video": true,
        "bulb": true
      },
      "d90": {
        "video": false,
        "bulb": false
      },
      "d7000": {
        "video": true,
        "bulb": false
      },
      "d7100": {
        "video": true,
        "bulb": true
      },
      "d7200": {
        "video": true,
        "bulb": true
      },
      "d3000": {
        "video": false,
        "bulb": false
      },
      "d300s": {
        "video": false,
        "bulb": false
      },
      "d300": {
        "video": false,
        "bulb": false
      },
      "d500": {
        "video": true,
        "bulb": true
      },
      "d50": {
        "video": true,
        "bulb": false
      },
      "d600": {
        "video": true,
        "bulb": true
      },
      "d610": {
        "video": true,
        "bulb": true
      },
      "d700": {
        "video": false,
        "bulb": false
      },
      "d70s": {
        "video": true,
        "bulb": false
      },
      "d70": {
        "video": true,
        "bulb": false
      },
      "d750": {
        "video": true,
        "bulb": true
      },
      "d800e": {
        "video": true,
        "bulb": true
      },
      "d800": {
        "video": true,
        "bulb": true
      },
      "d810": {
        "video": true,
        "bulb": true
      },
      "d80": {
        "video": false,
        "bulb": false
      },
      "d60": {
        "video": false,
        "bulb": false
      },
      "d3s": {
        "video": false,
        "bulb": false
      },
      "d3x": {
        "video": true,
        "bulb": false
      },
      "d3": {
        "video": false,
        "bulb": true
      },
      "d4s": {
        "video": true,
        "bulb": true
      },
      "d40x": {
        "video": true,
        "bulb": false
      },
      "d40": {
        "video": true,
        "bulb": false
      },
      "d4": {
        "video": true,
        "bulb": true
      },
      "d5": {
        "video": true,
        "bulb": true
      },
      "df": {
        "video": false,
        "bulb": true
      },
      "d3100": {
        "video": false,
        "bulb": false
      },
      "d3200": {
        "video": false,
        "bulb": false
      },
      "d3300": {
        "video": false,
        "bulb": false
      },
      "d3400": {
        "video": false,
        "bulb": false
      },
      "d1x": {
        "video": true,
        "bulb": false
      },
      "d2hs": {
        "video": true,
        "bulb": false
      },
      "d2h": {
        "video": true,
        "bulb": false
      },
      "d100": {
        "video": true,
        "bulb": false
      },
      "d200": {
        "video": true,
        "bulb": false
      }
    };

    return {
      get: function get() {
        return menuItems;
      },

      cameraModelMappings: cameraModelMappings,

      getListedModels: function getListedModels() {
        return _.keys(cameraModelMappings);
      }

    };
  });
})();