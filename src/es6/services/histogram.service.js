(function() {
  'use strict';
  pulse.services.factory('$histogram', function($device) {

    return {
      /**
       * prepareHistogram takes data from an image and renders a histogram chart
       * @param  {object} the decoded image pixel data
       * @return {null}
       */
      prepareHistogram: function(data) {
        var stepCount = 25;
        var histogramData = [];
        var labels = [];

        var histogramItems = {};

        //build array of the rbb values

        var histArray = [data.blue, data.green, data.red];

        _.forEach(histArray, (color) => {

          //subtract 2560 black pixels from each color to account for thumb borders
          //  color[0] = color[0] - 2560;

          //loop through 255 times for each and build the compisite array
          _.forEach(color, (rgbVal, $index) => {

            var oldVal = histogramData[$index] || 0;

            //add to the existing value
            histogramData[$index] = oldVal + rgbVal;

          });
        });
        //get the max value in the histogram array so we can set a chart Y axis
        var maxValue = Math.max.apply(null, histogramData);

        histogramItems.data = [histogramData];

        //rendering options
        var colours = [{
          fillColor: '#1E1E1E',
          strokeColor: '#1E1E1E',
          highlightFill: '#1E1E1E',
          highlightStroke: '#1E1E1E'
        }];

        //rendering options
        histogramItems.options = {
          showTooltips: false,
          scaleShowLabels: false,
          scaleShowGridLines: false,
          scaleGridLineWidth: 0,
          barStrokeWidth: 0,
          barValueSpacing: 0,
          barDatasetSpacing: 0,
          colours: colours,
          showScale: false,
          scaleOverride: true,
          scaleSteps: 25,
          scaleStepWidth: maxValue / 25,
          scaleStartValue: 0
        };

        //hack to not show any labels, set any empty string for each number in the histogram array
        _.forEach(histogramData, (item) => {
          labels.push('');
          histogramItems.labels = labels;

          //rendering options
          histogramItems.colours = colours;
        });
        return histogramItems;

      },

      isBtClassicConnected: function() {
        var device = $device.getSelectedDevice();
        if (device && device.btClassic.enabled && device.btClassic.connected) {
          return true;
        } else {
          return false;
        }
      }
    };

  });
})();
