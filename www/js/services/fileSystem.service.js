'use strict';

(function () {
  'use strict';

  pulse.services.factory('$fileSystem', function ($q, $cordovaFile) {

    return {

      write: function write(path, fileName, blob) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          $cordovaFile.createFile(path, fileName, true).then(function (response) {
            $cordovaFile.writeFile(path, fileName, blob, true).then(function (response) {
              deferred.resolve(response);
            }, function (error) {
              deferred.reject(error);
            });
          }, function (error) {
            deferred.reject(error);
          });
        }
        return deferred.promise;
      },

      removeFiles: function removeFiles(path, directory) {},

      createDir: function createDir(path, directory) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          $cordovaFile.createDir(path, directory, false).then(function (success) {
            deferred.resolve();
          }, function (error) {
            deferred.resolve();
          });
        }
        return deferred.promise;
      },

      saveThumb: function saveThumb(path, fileName, blob) {
        var _this = this;

        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          this.createDir(path, 'thumbnails').then(function (success) {
            _this.write(path, 'thumbnails/' + fileName, blob).then(function (success) {
              deferred.resolve(success.target.localURL);
            }, function (error) {
              deferred.reject();
            });
          });
        }
        return deferred.promise;
      },

      clearDirectory: function clearDirectory(path, directory) {
        var deferred = $q.defer();
        if (!window.cordova) {
          return deferred.resolve();
        } else {
          $cordovaFile.removeRecursively(path, 'thumbnails').then(function (sucess) {
            deferred.resolve();
          }, function (error) {
            deferred.resolve();
          });
        }
        return deferred.promise;
      }

    };
  });
})();