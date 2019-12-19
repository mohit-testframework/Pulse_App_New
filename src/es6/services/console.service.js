(function() {
  'use strict';
  pulse.services.factory('$console', function($fileLogger, $views) {


    return {
      log: function(text) {
        if ($views.bugReportMode) {
          $fileLogger.log('info', text);

        } else {
          console.log(text);
        }
      }

    };
  });
})();
