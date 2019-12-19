(function() {
  'use strict';

  pulse.app.constant('$config', {

    maxPacketValue : 252,
    LED_STEADY: 0,
    LED_BLINK: 1,
    MIN_ANDROID_FOTA: 5,
    localStorageStatus:{
      "NO_DEVICES": 1,
      "DEVICE_NOT_FOUND": 2,
      "DEVICE_FOUND": 3
    },
    statusMode: {
      "CAPTURE": 0x10,
      "FAST_CAPTURE": 0x11,
      "BULB": 0x12,
      "VIDEO": 0x13,
      "TIMELAPSE": 0x14,
      "CHARGING": 0x15
    },
    cameraMode: {
      "NIKON": {
        0x1: "MANUAL",
        0x2: "PROGRAM",
        0x3: "APERTURE PRIORITY",
        0x4: "SHUTTER PRIORITY",
        0x8018: "SCENE",
        0x8016: "FLASHLESS",
        0x8010: "AUTO",
        0x8011: "PORTRAIT",
        0x8012: "LANDSCAPE",
        0x8013: "MACRO",
        0x8014: "ACTION",
        0x8017: "ACTION",
        0x8019: "EFFECTS"
      },
      "CANON":{
        0x0: "PROGRAM",
        0x1: "SHUTTER PRIORITY",
        0x2: "APERTURE PRIORITY",
        0x3: "MANUAL",
        0x4: "BULB",
        0x5: "AUTO DEPTH",
        0x9: "AUTO",
        0x0A: "PORTRAIT",
        0x0B: "ACTION",
        0x0C: "SCENE",
        0x0D: "LANDSCAPE",
        0x0E: "MACRO",
        0x0F: "FLASHLESS",
        0x13: "CREATIVE AUTO",
        0x14: "VIDEO",
        0x16: "SCENE INTELLIGENT AUTO"
      }
    },
    statusState: {
      "START": 0x0,
      "COMPLETE": 0XFFFF
    },
    services: {
      "GATT_SERVICE_UUID_PULSE_SETTINGS_SERVICE": "1900",
      "GATT_SERVICE_UUID_PULSE_COMMS_SERVICE": "1901",
      "GATT_SERVICE_UUID_DEV_INFO_SERVICE": "1902",
      "GATT_SERVICE_UUID_BATT_SERVICE": "1903",
      "GATT_SERVICE_UUID_STATUS_SERVICE": "1904"
    },

    characteristics: {
      "GATT_CHAR_UUID_APERTURE": "3000",
      "GATT_CHAR_UUID_SHUTTER": "3001",
      "GATT_CHAR_UUID_CAM_MODE": "3002",
      "GATT_CHAR_UUID_ISO": "3003",
      "GATT_CHAR_UUID_CAPACITY": "3004",
      "GATT_CHAR_UUID_UART_RX": "3005",
      "GATT_CHAR_UUID_UART_TX": "3006",
      "GATT_CHAR_UUID_UART_RXACK": "3007",
      "GATT_CHAR_UUID_UART_TXACK": "3008",
      "GATT_CHAR_UUID_NICKNAME": "300B",
      "GATT_CHAR_UUID_STATUS_MODE": "300D",
      "GATT_CHAR_UUID_STATUS_STATE": "300E",
      "GATT_CHAR_UUID_BATTERY_STATUS": '300C'
    },

    communication: {
      "SET_SHUTTER": 0x01,
      "SET_APERTURE": 0x02,
      "SET_ISO": 0x03,
      "SET_WB": 0x04,
      "SET_MODE": 0x10,
      "MODE_PHOTO": 0x10,
      "MODE_BULB": 0x20,
      "MODE_VIDEO": 0x30,
      "MODE_TIMELAPSE": 0x40,
      "SET_ACTION": 0x11,
      "ACTION_PHOTO_CAPTURE": 0x11,
      "ACTION_PHOTO_BURST": 0x12,
      "ACTION_PHOTO_FAST": 0x13,
      "ACTION_BULB_OPEN": 0x21,
      "ACTION_BULB_CLOSE": 0x22,
      "ACTION_VIDEO_START": 0x31,
      "ACTION_VIDEO_STOP": 0x32,
      "ACTION_TL_START": 0x41,
      "ACTION_TL_STOP": 0x42,
      "ACTION_TL_PAUSE": 0x43,
      "GET_META": 0x20,
      "SET_TL_DATA": 0x30,
      "SET_TL_ALL": 0x00,
      "SET_TL_INTERVAL": 0x01,
      "SET_TL_CYCLES": 0x02,
      "SET_TL_BRAMP": 0x03,
      "GET_CAM_STATUS": 0x40,
      "GET_THUMB_READY": 0x50,
      "CANCEL_THUMB": 0x51,
      "GET_TL_START": 0x60,
      "GET_FW_VERSION": 0x70,
      "GET_FW_TYPE": 0x77,
      "GET_CLASSIC_MAC": 0x71,
      "GET_DEVICE_ANALYTICS": 0x72,
      "SET_DEVICE_ANALYTICS": 0x73,
      "GET_PULSE_UUID": 0x74,
      "GET_PERSISTENT_DATA": 0x75,
      "SET_PERSISTENT_DATA": 0x76,
      "SYSTEM_RESET": 0x80,
      "FLASH_LED": 0x90,
      "SET_LED_DUTY": 0x91,
      "ENABLE_MENUS": 0x92,
      "REFRESH_USB_SESSION": 0xA0,
      "REQUEST_BTC_CONNECT": 0xB1,
      "RESET_BTC": 0xB0,
      "SET_HOST_UUID": 0xB2
    },

    analyticTypes: {
      "PHOTOS": 0x1,
      "VIDEOS": 0x2,
      "TIMELAPSES": 0x3,
      "THUMBNAILS": 0x4,
      "SESSIONS": 0x5,
      "UPTIME": 0x6,
      "TL_COMPLETE": 0x7,
      "LONG_EXPOSURE": 0x8
    },

    offsets: {
      "MODE": 0,
      "BATT": 4,
      "CAP": 5,
      "WB": 7
    },

    firmwareTypes: {
      "DUAL": 0x1,
      "IOS": 0x2,
      "DROID": 0x3
    },

    classicPickerResponses: {
      "MANUALLY_CLOSED": 2,
      "CONNECTION_FAILURE": 3
    },

    parseTags: {
      "SHUTTER_ARRAY": 0xFF,
      "ISO_ARRAY": 0xFE,
      "APERTURE_ARRAY": 0xFD,
      "MAC_ADDRESS": 0xFC,
      "CAM_MODEL": 0xFB,
      "CAM_TYPE": 0xFA,
    },

    cameraSettings: {
      make:{
        'CANON': 0,
        'NIKON': 1
      },
      canonAperture: {
        0x8: "1",
        0xB: "1.1",
        0xC: "1.2",
        0xD: "1.2",
        0x10: "1.4",
        0x14: "1.8",
        0x15: "1.8",
        0x18: "2.0",
        0x1B: "2.2",
        0x1C: "2.5",
        0x1D: "2.5",
        0x20: "2.8",
        0x23: "3.2",
        0x24: "3.5",
        0x25: "3.5",
        0x28: "4.0",
        0x2B: "4.5",
        0x2C: "4.5",
        0x2D: "5.0",
        0x30: "5.6",
        0x33: "6.3",
        0x34: "6.7",
        0x35: "7.1",
        0x38: "8.0",
        0x3B: "9.0",
        0x3C: "9.5",
        0x3D: "10",
        0x40: "11",
        0x43: "13",
        0x44: "13",
        0x45: "14",
        0x48: "16",
        0x4B: "18",
        0x4C: "19",
        0x4D: "20",
        0x50: "22",
        0x53: "25",
        0x54: "27",
        0x55: "29",
        0x58: "32",
        0x5B: "36",
        0x5C: "38",
        0x5D: "40",
        0x60: "45",
        0x63: "51",
        0x64: "54",
        0x65: "57",
        0x68: "64",
        0x6B: "72",
        0x6C: "76",
        0x6D: "80",
        0x70: "91",
      },

      canonShutter: {
        0xC: "BULB",
        0x10: "30\"",
        0x13: "25\"",
        0x14: "20\"",
        0x15: "20\"",
        0x18: "15\"",
        0x1B: "13\"",
        0x1C: "10\"",
        0x1D: "10\"",
        0x20: "8\"",
        0x23: "6\"",
        0x24: "6\"",
        0x25: "5\"",
        0x28: "4\"",
        0x2B: "3\"2",
        0x2C: "3\"",
        0x2D: "2\"5",
        0x30: "2\"",
        0x33: "1\"6",
        0x34: "1\"5",
        0x35: "1\"3",
        0x38: "1\"",
        0x3B: "0\"8",
        0x3C: "0\"7",
        0x3D: "0\"6",
        0x40: "0\"5",
        0x43: "0\"4",
        0x44: "0\"3",
        0x45: "0\"3",
        0x48: "1/4",
        0x4B: "1/5",
        0x4C: "1/6",
        0x4D: "1/6",
        0x50: "1/8",
        0x53: "1/10",
        0x54: "1/10",
        0x55: "1/13",
        0x58: "1/15",
        0x5B: "1/20",
        0x5C: "1/20",
        0x5D: "1/25",
        0x60: "1/30",
        0x63: "1/40",
        0x64: "1/45",
        0x65: "1/50",
        0x68: "1/60",
        0x6B: "1/80",
        0x6C: "1/90",
        0x6D: "1/100",
        0x70: "1/125",
        0x73: "1/160",
        0x74: "1/180",
        0x75: "1/200",
        0x78: "1/250",
        0x7B: "1/320",
        0x7C: "1/350",
        0x7D: "1/400",
        0x80: "1/500",
        0x83: "1/640",
        0x84: "1/750",
        0x85: "1/800",
        0x88: "1/1000",
        0x8B: "1/1250",
        0x8C: "1/1500",
        0x8D: "1/1600",
        0x90: "1/2000",
        0x93: "1/2500",
        0x94: "1/3000",
        0x95: "1/3200",
        0x98: "1/4000",
        0x9B: "1/5000",
        0x9C: "1/6000",
        0x9D: "1/6400",
        0xA0: "1/8000"
      },

      canonIso: {
        0x00: "AUTO",
        0x28: "6",
        0x30: "12",
        0x38: "25",
        0x40: "50",
        0x48: "100",
        0x4B: "125",
        0x4D: "160",
        0x50: "200",
        0x53: "250",
        0x55: "320",
        0x58: "400",
        0x5B: "500",
        0x5D: "640",
        0x60: "800",
        0x63: "1000",
        0x65: "1250",
        0x68: "1600",
        0x70: "3200",
        0x78: "6400",
        0x7B: "8000",
        0x7D: "10,000",
        0x80: "12,800",
        0x83: "16,000", //131
        0x85: "20,000",
        0x88: "25,600", //136 @6D
        0x8b: "33,000",//139  @1dxmk2
        0x8D: "40,000",//141  @1dxmk2
        0x90: "51,200", //  144 @6D
        0x98: "102,400" //  152 @gD

      },

      nikonAperture: {
        100 : "1.0",
        120 : "1.2", //they don'y have to be in hex, they are just in f * 0.10 units
        0x8C: "1.4",
        0xA0: "1.6",
        0xA2: "1.4", //not sure if this is correct...
        0xB4: "1.8",
        0xC8: "2",
        0xDC: "2.2",
        0xFA: "2.5",
        0x118: "2.8",
        0x140: "3.2",
        0x15E: "3.5",
        0x190: "4.0",
        0x1C2: "4.5",
        0x1E0: "4.8",
        0x1F4: "5",
        0x230: "5.6",
        0x276: "6.3",
        0x2C6: "7.1",
        0x320: "8",
        0x384: "9",
        0x3E8: "10",
        0x44C: "11",
        0x514: "13",
        0x578: "14",
        0x640: "16",
        0x708: "18",
        0x7D0: "20",
        0x898: "22",
        0x9C4: "25",
        0xB54: "29",
        0xC80: "32",
        0xE10: "36"
      },

      nikonIso: {
        0x01: "1",
        0x20: "32",
        0x28: "40",
        0x32: "50",
        0x40: "64",
        0x50: "80",
        0x64: "100",
        0x7D: "125",
        0xA0: "160",
        0xC8: "200",
        0xFA: "250",
        0x140: "320",
        0x190: "400",
        0x1F4: "500",
        0x280: "640",
        0x320: "800",
        0x3E8: "1000",
        0x4E2: "1250",
        0x640: "1600",
        0x7D0: "2000",
        0x9C4: "2500",
        0xC80: "3200",
        0xFA0: "4000",
        0x1388: "5000",
        0x1900: "6400",
        0x1F40: "Hi 0.3",
        0x2710: "Hi 0.7",
        0x3200: "Hi 1",
        0x6400: "Hi 2"
      },

      nikonShutter: {
        0x1: "1/8000",
        0x2: "1/4000",
        0x3: "1/3200",
        0x4: "1/2500",
        0x5: "1/2000",
        0x6: "1/1600",
        0x8: "1/1250",
        0xA: "1/1000",
        0xC: "1/800",
        0xF: "1/640",
        0x14: "1/500",
        0x19: "1/400",
        0x1F: "1/320",
        0x28: "1/250",
        0x32: "1/200",
        0x3E: "1/160",
        0x50: "1/125",
        0x64: "1/100",
        0x7D: "1/80",
        0xA6: "1/60",
        0xC8: "1/50",
        0xFA: "1/40",
        0x14D: "1/30",
        0x190: "1/25",
        0x1F4: "1/20",
        0x29A: "1/15",
        0x301: "1/13",
        0x3E8: "1/10",
        0x4E2: "1/8",
        0x682: "1/6",
        0x7D0: "1/5",
        0x9C4: "1/4",
        0xD05: "1/3",
        0xFA0: "1/2.5",
        0x1388: "1/2",
        0x186A: "1/1.6",
        0x1E0C: "1/1.3",
        0x2710: "1\"",
        0x32C8: "1.3\"",
        0x3E80: "1.6\"",
        0x4E20: "2\"",
        0x61A8: "2.5\"",
        0x7530: "3\"",
        0x9C40: "4\"",
        0xC350: "5\"",
        0xEA60: "6\"",
        0x13880: "8\"",
        0x186A0: "10\"",
        0x1FBD0: "13\"",
        0x249F0: "15\"",
        0x30D40: "20\"",
        0x3D090: "25\"",
        0x493E0: "30\"",
        0xDFFFFFFF: "TIME",
        0xFFFFFFFF: "BULB"
      }
    },

    bootloader: {
        "IDLE": 0x0,
        "OP_ERASE_FLASH": 0x2c,
        "ERASE_FLASH": 0xFFFF,
        "HANDSHAKE": 0xFFF0,
        "UPDATE_CONFIRMED": 0xFFF1,
        "BL_PING": 0xFFF2,
        "START_TRANSFER": 0xFFFF,
        "FINISH_TRANSFER": 0xFFFD,
        "INVALID1": 0xFFF5,
        "INVALID2": 0xFFF3,
        "INVALID3": 0xFFFA,
        "BL_SERVICE": '1903',
        "CMD_CHANNEL": '3021',
        "DATA_CHANNEL": '3020'
    }

  });
})();