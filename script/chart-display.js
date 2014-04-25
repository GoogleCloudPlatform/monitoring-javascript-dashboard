/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @fileoverview Controls the display of the charts on the page.
 */

/**
 * The ChartDisplay controls the display of the charts.
 * @constructor
 * @param {Object} api The Monitoring API object.
 */
var ChartDisplay = function(api) {
  /**
   * Values for the range selector.
   * @type {Array.<string>}
   */
  this.timespanValues = ['5m', '10m', '20m', '30m', '40m', '50m', '1h', '2h',
                         '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', '11h',
                         '12h', '1d', '2d', '3d', '4d', '5d', '6d', '1w',
                         '2w', '3w', '30d'];

  /**
   * The default timespan to select on page load.
   * @type {number}
   */
  this.defaultTimespanIndex = 6;

  /**
   * The Monitoring API object.
   * @type {Object}
   * @private
   */
  this.api_ = api;

  /**
   * A list of objects representing the visible charts, their data, and
   * their queries.
   * @type {Array.<Object>}
   * @private
   */
  this.charts_ = [];

  /**
   * List of default charts to display.
   * @type {Array.<string>}
   * @private
   */
  this.defaultCharts_ = [
      'compute.googleapis.com/instance/uptime',
      'compute.googleapis.com/instance/disk/read_ops_count',
      'compute.googleapis.com/instance/disk/write_ops_count',
      'compute.googleapis.com/instance/disk/read_latencies',
      'compute.googleapis.com/instance/disk/write_latencies',
      'compute.googleapis.com/instance/network/received_bytes_count',
      'compute.googleapis.com/instance/network/sent_bytes_count',
      'compute.googleapis.com/instance/cpu/usage_time',
      'compute.googleapis.com/firewall/dropped_packets_count'
  ];
};

/**
 * Add the chart based on the provided metric.
 * @param {Object} metric A single metric object returned from the
 *     metricDescriptors.list API endpoint.
 */
ChartDisplay.prototype.display = function(metric) {

  var chartNumber = this.charts_.length;

  // Create a container to hold all chart elements.
  var chartContainer = this.createChartContainer_(chartNumber);

  // Create a title for the chart.
  var chartTitle = this.createChartTitle_(metric.description);
  $(chartContainer).append(chartTitle);

  // Create an error element in which to display errors.
  var errorElement = this.createErrorElement_(chartNumber);
  $(chartContainer).append(errorElement);

  // Create an element in which to display the chart itself.
  var chartElement = this.createChartElement_(chartNumber);
  $(chartContainer).append(chartElement);

  // Create the chart legend.
  var chartLegend = this.createChartLegend_(chartNumber, chart);
  $(chartContainer).append(chartLegend);

  // Create a query object to query the API.
  var query = {
    metric: metric.name,
    project: this.api_.projectId,
    timespan: this.timespanValues[this.defaultTimespanIndex]
  };

  // Create a data formatter based on the type of metric.
  var formatter = null;
  if (metric.typeDescriptor.valueType == 'distribution') {
    formatter = this.formatDataDistribution_();
  } else if (metric.typeDescriptor.valueType == 'double') {
    formatter = this.formatDataSimple_('doubleValue');
  } else {
    formatter = this.formatDataSimple_('int64Value');
  }

  // Create the actual chart.
  var chart = new Chart(
      chartElement, chartLegend, errorElement, this.api_, query, formatter);

  // Create the label form.
  var chartLabelForm = this.createChartLabelForm_(chartNumber, metric);

  // Create the search icon.
  var searchIcon = this.createSearchIcon_(chartLabelForm);
  $(chartContainer).append(searchIcon);
  $(chartContainer).append(chartLabelForm);

  // Add the container to the charts HTML element.
  $('#charts').append(chartContainer);

  // Add the chart object to the list of charts.
  this.charts_.push(chart);
};

/**
 * Displays default charts. Called by the controller once all necessary
 * initialization steps have been completed.
 * @return {Function} A function to display the default charts on the page.
 */
ChartDisplay.prototype.displayDefaultCharts = function() {
  var self = this;

  return function(metrics) {
    $('#charts').empty();
    for (var metric in metrics) {
      if (self.defaultCharts_.indexOf(metrics[metric].name) > -1) {
        self.display(metrics[metric]);
      }
    }
  }
};

/**
 * Update all the charts at a given interval. The interval is set by the
 * controller.
 * @return {Function} A function to update the charts.
 */
ChartDisplay.prototype.intervalUpdater = function() {
  var self = this;
  return function() {
    for (var chart in self.charts_) {
      self.charts_[chart].update();
    }
  }
};

/**
 * Update the timespan of the query. This method is called when the value
 * of the range selector changes.
 * @param {string} timespan The new timespan for the query.
 */
ChartDisplay.prototype.rangeUpdater = function(timespan) {
  for (var chart in this.charts_) {
    this.charts_[chart].update({'timespan': timespan});
  }
};

/**
 * Update the chart with the given labels in the chart form.
 * @param {number} chartNumber The chart number to update.
 * @return {Function} A function to update the charts with the new query.
 */
ChartDisplay.prototype.labelUpdater = function(chartNumber) {
  var self = this;

  return function() {
    // Get query parameters from label form and add them to the query object.
    var query = {};
    query['labels'] = [];
    $('*[name="' + chartNumber + '"]').each(function() {
      if ($(this).val()) {
        var label = $(this).data('label') + '==' + $(this).val();
        query['labels'].push(label);
      }
    });
    self.charts_[chartNumber].update(query);
  };
};

/**
 * Reset the chart by removing all labels from the query.
 * @param {number} chartNumber The chart number to update.
 * @return {Function} A function to reset the charts.
 */
ChartDisplay.prototype.reset = function(chartNumber) {
  var self = this;

  return function() {
    $('*[name="' + chartNumber + '"]').each(function() {
      $(this).val('');
    });
    self.charts_[chartNumber].reset();
  };
};

/**
 * Create the container for the chart and corresponding elements.
 * @param {number} chartNumber The number of the chart.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartContainer_ = function(chartNumber) {
  // Add the chart container.
  var chartContainer = document.createElement('div');
  $(chartContainer).attr('id', 'chartContainer' + chartNumber);
  $(chartContainer).addClass('chartContainer');
  return chartContainer;
};

/**
 * Create the title for the chart.
 * @param {string} title The title of the chart.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartTitle_ = function(title) {
  // Add the chart title.
  var chartTitle = document.createElement('h4');
  $(chartTitle).text(title);
  return chartTitle;
};

/**
 * Create the error element for the chart.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createErrorElement_ = function() {
  // Add the chart title.
  var error = document.createElement('div');
  $(error).addClass('error');
  return error;
};

/**
 * Create the HTML element for the actual chart.
 * @param {number} chartNumber The number of the chart.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartElement_ = function(chartNumber) {
  // Add the chart.
  var chart = document.createElement('div');
  $(chart).attr('id', 'chart' + chartNumber);
  $(chart).addClass('chart');
  return chart;
};

/**
 * Create the HTML Element for the legend.
 * @param {number} chartNumber The number of the chart.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartLegend_ = function(chartNumber) {
  // Add the chart legend.
  var chartLegend = document.createElement('div');
  $(chartLegend).attr('id', 'legend' + chartNumber);
  $(chartLegend).addClass('legend');
  return chartLegend;
};

/**
 * Create the label form.
 * @param {number} chartNumber The number of the chart.
 * @param {Object} metric Metric object returned from the API.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createChartLabelForm_ = function(chartNumber, metric) {
  var self = this;

  // Add the label form.
  var formContainer = document.createElement('form');
  $(formContainer).addClass('chartLabelForm');

  // Display the labels specific to the metric by getting them from the API.
  this.api_.getDescriptors(metric.name, function(descriptors) {

    // Create a dictionary mapping label name to all possible values
    // using the metricDescriptors.list API endpoint.
    var descriptorLists = {};
    for (var descriptor in descriptors) {
      for (var label in descriptors[descriptor].labels) {
        if (!descriptorLists[label]) {
          descriptorLists[label] = [];
        }
        var labelValue = descriptors[descriptor].labels[label];
        if (descriptorLists[label].indexOf(labelValue) == -1) {
          descriptorLists[label].push(labelValue);
        }
      }
    }

    // For each label, add an input with drop-down selector using all possible
    // label values.
    for (var label in metric.labels) {
      var labelName = metric.labels[label].key;
      self.addLabelInput_(
          formContainer,
          chartNumber,
          labelName,
          descriptorLists[labelName]);
    }

    // Add Go and Reset buttons to the form.
    var go = document.createElement('input');
    $(go).attr('type', 'button');
    $(go).val('Go');
    $(go).click(self.labelUpdater(chartNumber));
    $(formContainer).append(go);
    var reset = document.createElement('input');
    $(reset).attr('type', 'button');
    $(reset).val('Reset');
    $(reset).click(self.reset(chartNumber));
    $(formContainer).append(reset);
  });

  return formContainer;
};

/**
 * Create the search icon.
 * @param {Element} chartLabelForm The HTML element in which the chart label
 *     form is displayed.
 * @return {Element} An HTML Element.
 * @private
 */
ChartDisplay.prototype.createSearchIcon_ = function(chartLabelForm) {
  // Add the search icon.
  var search = document.createElement('div');
  $(search).addClass('search');

  // When the search icon is clicked, hide or display the label form.
  $(search).click(function() {
    if ($(chartLabelForm).css('display') == 'none') {
      $(chartLabelForm).fadeIn(500);
    } else {
      $(chartLabelForm).fadeOut(500);
    }
  });

  return search;
};

/**
 * Add a form label and input for a given API label.
 * @param {Element} formContainer The container for the form elements.
 * @param {number} chartNumber The chart number.
 * @param {string} label The text to display in the form label.
 * @param {Array.<string>} descriptors A list of values for the select menu.
 * @private
 */
ChartDisplay.prototype.addLabelInput_ = function(
    formContainer, chartNumber, label, descriptors) {
  var formLabel = document.createElement('label');
  $(formLabel).text(label + ': ');
  $(formContainer).append(formLabel);

  var input = null;
  if (descriptors) {
    input = document.createElement('select');
    var option = document.createElement('option');
    $(option).attr('value', '');
    $(option).text('--Select--');
    $(input).append(option);
    for (var descriptor in descriptors) {
      var option = document.createElement('option');
      $(option).attr('value', descriptors[descriptor]);
      $(option).text(descriptors[descriptor]);
      $(input).append(option);
    }
  } else {
    input = document.createElement('input');
    $(input).attr('type', 'text');
  }
  $(input).attr('name', chartNumber);
  $(input).data('label', label);
  $(formContainer).append(input);

  var lineBreak = document.createElement('br');
  $(formContainer).append(lineBreak);
};

/**
 * Format the data for display in the chart.
 * @return {Function} A function for formatting the data.
 * @private
 */
ChartDisplay.prototype.formatDataSimple_ = function(valueKey) {
  return function(data) {
    var formattedData = [];
    var palette = new Rickshaw.Color.Palette({scheme: 'munin'});

    // Create a list of objects (aka, series) for display in the chart.
    // List is formatted as follows:
    // [{
    //   name: <instance-name|resource-id>,
    //   data: <data-points>,
    //   color: <color>
    // }, ...]
    for (var timeseries in data) {
      var formattedSeries = {};

      // Add a name to the series. Name is displayed in the legend.
      var resourceType = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_type'];
      if (resourceType == 'instance') {
        formattedSeries.name = data[timeseries].timeseriesDesc.labels[
          'compute.googleapis.com/instance_name'];
      } else {
        formattedSeries.name = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_id'];
      }

      // Add the data to the series, formatted as a list of objects with syntax:
      // [{x: <time>, y: <value>},...].
      formattedSeries.data = [];
      for (var point in data[timeseries].points) {
        var formattedDataPoint = {};
        var y = data[timeseries].points[point][valueKey];
        if (valueKey == 'int64Value') {
          y = parseInt(y);
        }
        formattedDataPoint.y = y;
        formattedDataPoint.x = new Date(
              data[timeseries].points[point].end).getTime();
        // Since Rickshaw requires times in ascending order, and the API
        // returns the data in descending order, add the value to the
        // beginning of the list.
        formattedSeries.data.unshift(formattedDataPoint);
      }

      // Add a color to the data using the Rickshaw.Color.Palette.
      formattedSeries.color = palette.color();

      formattedData.push(formattedSeries);
    }
    return formattedData;
  };
};

/**
 * Format the data for display in the chart.
 * @return {Function} A function for formatting the data.
 * @private
 */
ChartDisplay.prototype.formatDataDistribution_ = function() {
  return function(data) {
    // Create a temporary object mapping name to data and range. Syntax:
    // {
    //   <resource-id:distribution-range>: {
    //     data: <data-points>,
    //     range: <distribution-range>,
    //     name: <(instance-name|resource-id):distribution-range>
    //   } ...
    // }
    var tempData = {};

    // Create an object to map the range to a color.
    var colorForRange = {};

    for (var timeseries in data) {
      // Get the instance name and resource ID.
      var resourceName = null;
      var resourceId = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_id'];
      var resourceType = data[timeseries].timeseriesDesc.labels[
          'cloud.googleapis.com/resource_type'];
      if (resourceType == 'instance') {
        resourceName = data[timeseries].timeseriesDesc.labels[
          'compute.googleapis.com/instance_name'];
      } else {
        resourceName = resourceId;
      }

      // Fill in the tempData object with data from the timeseries buckets.
      for (var point in data[timeseries].points) {
        var time = new Date(data[timeseries].points[point].end).getTime();
        if (data[timeseries].points[point].distributionValue) {
          for (var bucket in data[timeseries].points[
              point].distributionValue.buckets) {

            // Find the distribution range.
            var lower = data[timeseries].points[
                point].distributionValue.buckets[bucket].lowerBound;
            var upper = data[timeseries].points[
                point].distributionValue.buckets[bucket].upperBound;
            var range = lower + '-' + upper;

            // Add a field to the colorForRange object for the range.
            colorForRange[range] = null;

            // Create the key from the resource ID and range, create
            // a field in the object for that key if it doesn't exist.
            var resourceRange = resourceId + ':' + range;
            if (!tempData[resourceRange]) {
              tempData[resourceRange] = {
                data: [],
                range: range,
                name: resourceName + ':' + range
              };
            }

            // Since Rickshaw requires times in ascending order, and the API
            // returns the data in descending order, add the value to the
            // beginning of the list.
            var value = parseInt(data[timeseries].points[
                point].distributionValue.buckets[bucket].count);
            tempData[resourceRange].data.unshift({y: value, x: time});
          }
        }
      }
    }

    // Apply a color to a range.
    var palette = new Rickshaw.Color.Palette({scheme: 'munin'});
    for (var range in colorForRange) {
      colorForRange[range] = palette.color();
    }

    // Use the tempData and colorForRange objects to construct a list of
    // series formatted for display in the chart. Syntax:
    // {
    //   name: <name>,
    //   data: <data-points>,
    //   legend: <distribution-range>,
    //   color: <line-color>
    // }
    var formattedData = [];
    for (var resourceRange in tempData) {
      var formattedSeries = {};
      formattedSeries.name = tempData[resourceRange].name;
      formattedSeries.data = tempData[resourceRange].data;
      // The legend field is used to display the text in the legend.
      formattedSeries.legend = tempData[resourceRange].range;
      formattedSeries.color = colorForRange[tempData[resourceRange].range];
      formattedData.push(formattedSeries);
    }
    return formattedData;
  };
};
