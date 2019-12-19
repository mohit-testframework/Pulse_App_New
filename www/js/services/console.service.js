'use strict';

(function () {
  'use strict';

  pulse.services.factory('$console', function ($fileLogger, $views) {

    return {
      log: function log(text) {
        if ($views.bugReportMode) {
          $fileLogger.log('info', text);
        } else {
          console.log(text);
        }
      }

    };
  });
})();