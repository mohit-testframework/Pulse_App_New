'use strict';

(function () {
  'use strict';

  pulse.services.factory('$fileLogger', function ($rootScope, $q, $cordovaFile, $filter, $window, $timeout) {

    var queue = [];
    var ongoing = false;
    var levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

    var storageFilename = 'messages.log';

    var dateFormat;
    var dateTimezone;

    function isBrowser() {
      return !$window.cordova && !$window.PhoneGap && !$window.phonegap;
    }

    function getStorageLoc() {
      if (device.platform == 'Android') {
        return cordova.file.externalApplicationStorageDirectory;
      } else {
        //ios
        return cordova.file.dataDirectory;
      }
    }

    function ensureStorage() {
      if (device.platform == 'Android') {
        return $window.cordova.file.externalApplicationStorageDirectory;
      } else {
        //ios
        return $window.cordova.file.dataDirectory;
      }
    }

    function log(level) {
      if (angular.isString(level)) {
        level = level.toUpperCase();

        if (levels.indexOf(level) === -1) {
          level = 'INFO';
        }
      } else {
        level = 'INFO';
      }

      var now = new Date();
      var timestamp = dateFormat ? $filter('date')(now, dateFormat, dateTimezone) : now.toJSON();

      var messages = Array.prototype.slice.call(arguments, 1);
      var message = [timestamp, level];
      var text;

      for (var i = 0; i < messages.length; i++) {
        if (angular.isArray(messages[i])) {
          text = '[Array]';
          try {
            // avoid "TypeError: Converting circular structure to JSON"
            text = JSON.stringify(messages[i]);
          } catch (e) {
            // do nothing
          }
          message.push(text);
        } else if (angular.isObject(messages[i])) {
          text = '[Object]';
          try {
            // avoid "TypeError: Converting circular structure to JSON"
            text = JSON.stringify(messages[i]);
          } catch (e) {
            // do nothing
          }
          message.push(text);
        } else {
          message.push(messages[i]);
        }
      }

      queue.push({
        message: message.join(' ') + '\n'
      });

      if (!ongoing) {
        process();
      }
    }

    function process() {

      if (!queue.length) {
        ongoing = false;
        return;
      }

      ongoing = true;
      var m = queue.shift();

      writeLog(m.message).then(function () {
        $timeout(function () {
          process();
        });
      }, function () {
        $timeout(function () {
          process();
        });
      });
    }

    function writeLog(message) {
      var q = $q.defer();

      if (isBrowser()) {
        // running in browser with 'ionic serve'

        if (!$window.localStorage[storageFilename]) {
          $window.localStorage[storageFilename] = '';
        }

        $window.localStorage[storageFilename] += message;
        q.resolve();
      } else {

        if (!$window.cordova || !$window.cordova.file || !ensureStorage()) {
          q.reject('cordova.file.dataDirectory is not available');
          return q.promise;
        }
        var logLoc = getStorageLoc();
        $cordovaFile.checkFile(logLoc, storageFilename).then(function () {
          // writeExistingFile(path, fileName, text)
          $cordovaFile.writeExistingFile(logLoc, storageFilename, message).then(function () {
            q.resolve();
          }, function (error) {
            q.reject(error);
          });
        }, function () {
          // writeFile(path, fileName, text, replaceBool)
          $cordovaFile.writeFile(logLoc, storageFilename, message, true).then(function () {
            q.resolve();
          }, function (error) {
            q.reject(error);
          });
        });
      }

      return q.promise;
    }

    function getLogfile() {
      var q = $q.defer();

      if (isBrowser()) {
        q.resolve($window.localStorage[storageFilename]);
      } else {
        if (!$window.cordova || !$window.cordova.file || !ensureStorage()) {
          q.reject('cordova.file.dataDirectory is not available');
          return q.promise;
        }
        var logLoc = getStorageLoc();
        $cordovaFile.readAsText(logLoc, storageFilename).then(function (result) {
          q.resolve(result);
        }, function (error) {
          q.reject(error);
        });
      }

      return q.promise;
    }

    function deleteLogfile() {
      var q = $q.defer();

      if (isBrowser()) {
        $window.localStorage.removeItem(storageFilename);
        q.resolve();
      } else {

        if (!$window.cordova || !$window.cordova.file || !$window.cordova.file.dataDirectory) {
          q.reject('cordova.file.dataDirectory is not available');
          return q.promise;
        }

        $cordovaFile.removeFile(cordova.file.dataDirectory, storageFilename).then(function (result) {
          q.resolve(result);
        }, function (error) {
          q.reject(error);
        });
      }

      return q.promise;
    }

    function setStorageFilename(filename) {
      if (angular.isString(filename) && filename.length > 0) {
        storageFilename = filename;
        return true;
      } else {
        return false;
      }
    }

    function setTimestampFormat(format, timezone) {
      if (!(angular.isUndefined(format) || angular.isString(format))) {
        throw new TypeError('format parameter must be a string or undefined');
      }
      if (!(angular.isUndefined(timezone) || angular.isString(timezone))) {
        throw new TypeError('timezone parameter must be a string or undefined');
      }

      dateFormat = format;
      dateTimezone = timezone;
    }

    function checkFile() {
      var q = $q.defer();

      if (isBrowser()) {

        q.resolve({
          'name': storageFilename,
          'localURL': 'localStorage://localhost/' + storageFilename,
          'type': 'text/plain',
          'size': $window.localStorage[storageFilename] ? $window.localStorage[storageFilename].length : 0
        });
      } else {
        if (!$window.cordova || !$window.cordova.file || !ensureStorage()) {
          q.reject('cordova.file.dataDirectory is not available');
          return q.promise;
        }

        var logLoc = getStorageLoc();

        $cordovaFile.checkFile(logLoc, storageFilename).then(function (fileEntry) {
          fileEntry.file(q.resolve, q.reject);
        }, q.reject);
      }

      return q.promise;
    }

    function debug() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift('DEBUG');
      log.apply(undefined, args);
    }

    function info() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift('INFO');
      log.apply(undefined, args);
    }

    function warn() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift('WARN');
      log.apply(undefined, args);
    }

    function error() {
      var args = Array.prototype.slice.call(arguments, 0);
      args.unshift('ERROR');
      log.apply(undefined, args);
    }

    return {
      log: log,
      getLogfile: getLogfile,
      deleteLogfile: deleteLogfile,
      setStorageFilename: setStorageFilename,
      setTimestampFormat: setTimestampFormat,
      checkFile: checkFile,
      debug: debug,
      info: info,
      warn: warn,
      error: error
    };
  });
})();