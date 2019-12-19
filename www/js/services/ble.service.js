'use strict';

(function () {
  'use strict';

  pulse.services.factory('BLE', function ($rootScope, $q, $timeout) {

    var connected;
    var num_connects_failed = 0;
    return {

      devices: [],

      /**
       * write - writes to a pulse
       * @param  {string} deviceId  - the id of the pulse to write to
       * @param  {string} serviceUuid - the service id to right to
       * @param  {string} characteristicUuid
       * @param  {array} dataArray  array of data to wright
       * @return {promise} - when the writing is completed
       */
      write: function write(deviceId, serviceUuid, characteristicUuid, dataArray, success, failure) {
        console.log('Inside BLE write');
        console.log('deviceId : ' + deviceId);
        console.log('serviceUuid : ' + serviceUuid);
        console.log('characteristicUuid : ' + characteristicUuid);
        console.log('dataArray : ' + JSON.stringify(dataArray));

        if (!window.cordova) {
          return this.noCordova();
        }
        var deferred = $q.defer();

        ble.write(deviceId, serviceUuid, characteristicUuid, dataArray, function(response) {
           console.log('BLE writeSuccess  : ' + response);
          if (success) {
            success(response);
          }
          deferred.resolve(response);
        }, function(error) {
           console.log('BLE writeError  : ' + error);
          if (success) {
            success(error);
          }
          deferred.resolve(response);
        });

        // var writeSuccess = function writeSuccess(response) {
        //    console.log('BLE writeSuccess  : ' + response);
        //   if (success) {
        //     success(response);
        //   }
        //   deferred.resolve(response);
        // };

        // var writeFailure = function writeFailure(error) {
        //   console.log('BLE writeFailure  : ' + error);
        //   if (failure) {
        //     failure(error);
        //   }
        //   deferred.reject(error);
        // };

        return deferred.promise;
      },

      /**
       * disconnect - wrapper around ble.disconnect, always resolves the promise whether it fails or errors out
       */
      disconnect: function disconnect(device, deferred) {
        console.log('Inside BLE disconnect');
        var _this = this;

        if (!window.cordova) {
          return this.noCordova();
        }
        if (!deferred) {
          deferred = $q.defer();
        }
        ble.disconnect(device.id, function (event) {
          ble.isConnected(device.id, function () {
            ///ughhhhh still connected, try again
            _this.disconnect(device, deferred);
          }, function () {
            //yay we aren't connected
            deferred.resolve();
          });
        }, function (error) {
          //just resolve it and see what happens :)
          deferred.resolve();
        });

        return deferred.promise;
      },

      /**
       * scan - scans network for all BLE enabled devices and pushed the devices to a device array
       * @param {string} serviceCharacteristic - the serviceCharacteristic of pulse
       * @param (int) timeout - controls whether or not to stop the scan, and after how many ms to stop it
       * @return {promise} - the array of devices
       */
      scan: function scan(serviceCharacteristics, timeout) {
        console.log('Inside BLE scan');
        if (!window.cordova) {
          return this.noCordova();
        }

        var that = this;
        var deferred = $q.defer();
        var timer;
        //reset the devices
        that.devices.length = 0;

        var deviceArray = serviceCharacteristics;

        console.log('scanning for Pulse devices');
        ble.startScan(deviceArray, /* scan for all services */
        function (peripheral) {
          console.log('Inside startScan :' , peripheral);
          //add any found devices to our  pulse candidate array
          if (peripheral && peripheral.name) {
            console.log("Found device details : " + peripheral);
            console.log("Found device: " + peripheral.name);
          }

          if (peripheral) {
            if (deviceArray.length < 1) {
              console.log('Inside deviceArray.length < 1');
              //we aren't checking by service characteristic so make sure it's named pulse
              if (peripheral.name) {
                var deviceName = peripheral.name.toLowerCase();
                console.log('device name toLowerCase : ' + deviceName);
                if (deviceName.indexOf('pulse') > -1) {
                  console.log('inside deviceName.indexOf');
                  if (deviceName != 'pulse bootloader' || deviceName != 'pulse lite') {
                    console.log('inside not pulse bootloader and pulse lite');
                    that.devices.push(peripheral);
                  }
                  if (deviceName == 'pulse lite') {
                    return;
                  }
                  $timeout.cancel(timer);
                  ble.stopScan();
                  deferred.resolve(peripheral);
                }
              }
            } else {
              console.log('else of deviceArray.length < 1');
              //we are checking by service characteristic, just append it to the device since we know it's a pulse

              if (peripheral.name != 'Pulse Bootloader' || peripheral.name != 'Pulse Lite') {
                that.devices.push(peripheral);
              }
              if (peripheral.name == 'Pulse Lite') {
                return;
              }
              $timeout.cancel(timer);
              console.log("Resolving scan promise");
              ble.stopScan();
              deferred.resolve(peripheral);
            }
          }
        }, function (error) {
          console.log('Failed to scan. Error: ',  error);
          deferred.reject(error);
        });
        if (timeout) {
          timer = $timeout(ble.stopScan, timeout, function () {
            deferred.resolve();
          }, function () {
            console.log("stopScan failed");
            deferred.reject("Error stopping scan");
          });
        }

        return deferred.promise;
      },

      /**
       * stopScan - wrapper function to stop BLE scanning
       * @return {promise} whether the scan was stopped
       */
      stopScan: function stopScan(tries, deferred) {
        console.log('Inside BLE stopScan');
        var _this2 = this;

        if (!tries) {
          tries = 0;
        }
        if (!deferred) {
          deferred = $q.defer();
        }
        ble.stopScan(function () {
          console.log('stopped the scan');
          deferred.resolve();
        }, function (error) {
          tries++;
          if (tries < 5) {
            _this2.stopScan(tries, deferred);
          } else {
            deferred.resolve(error);
          }
        });
        return deferred.promise;
      },

      /**
       * connect - connects to a given BLE device
       * @param  {object} device-- the to connect to
       * @return {promise} -- the details object for the connected device
       */
      connect: function connect(device) {
        console.log('Inside BLE connect');
        var deferred = $q.defer();
        var succeeded = false;

        if (!window.cordova) {
          deferred.resolve(this.noCordova());
        }
        console.log('attempting to connect to device: ' + device.id);
        ble.connect(device.id, function (peripheral) {
          succeeded = true;
          console.log('device: ' + device.id + ' is connected');
          connected = peripheral;
          num_connects_failed = 0;
          //store the device
          deferred.resolve(peripheral);
        }, function (error) {
          console.log('failed to connect, disconnected from: ' + device.id);
          num_connects_failed++; //increment the number of failed connections
          if (device.callbacks && device.callbacks.disconnectCallback) {
            device.callbacks.disconnectCallback();
          } else {
            // This is a bootloader device, start scanning again
            console.log("This was a bootloader device. Triggering scanAndConnect");
            $rootScope.$broadcast('scanBLE');
          }

          deferred.reject('failed to connect to device');
        });

        return deferred.promise;
      },

      stuckInLoop: function stuckInLoop() {
        console.log('Inside BLE stuckInLoop');
        if (num_connects_failed > 3) {
          console.log("we're stuck in loop");
          return true;
        }
        return false;
      },

      /**
       * noCordova - handles the response when the requesting device does not have bluetooth
       * @return {promise} a rejection error message
       */
      noCordova: function noCordova() {
        console.log('Inside BLE noCordova');
        var deferred = $q.defer();
        deferred.reject('cordova is not active');
        return deferred.promise;
      }
    };
  });
})();