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
 * @fileoverview Graphs data from the Monitoring API using Rickshaw.
 */

/**
 * The Chart class wraps the Rickshaw class.
 * @constructor
 * @param {Element} chartElement The HTML element in which to add the chart.
 * @param {Element} legendElement The HTML element in which to add the legend.
 * @param {Element} errorElement The HTML element in which to display an error.
 * @param {Object} api An instance of the MonitoringApi class.
 * @param {Object} query The query specific to this chart.
 * @param {Function} formatter Function to format the data.
 */
var Chart = function(
    chartElement, legendElement, errorElement, api, query, formatter) {

  /**
   * Element in which to display the chart.
   * @type {Element}
   */
  this.chartElement = chartElement;

  /**
   * Element in which to display the legend.
   * @type {Element}
   */
  this.legendElement = legendElement;

  /**
   * Element in which to display an error message.
   * @type {Element}
   */
  this.errorElement = errorElement;

  /**
   * Data returned by the Monitoring API and formatted for display on the chart.
   * @type {Object}
   */
  this.data = null;

  /**
   * Specific API query for this chart.
   * @type {Object}
   */
  this.query = query;

  /**
   * A function to format the data.
   * @type {Function}
   */
  this.formatter = formatter;

  /**
   * Rickshaw chart.
   * @type {Rickshaw.Graph}
   * @private
   */
  this.chart_ = null;

  /**
   * Monitoring API object.
   * @type {Object}
   * @private
   */
  this.api_ = api;

  /**
   * Copy of a query for rollback if there's an error.
   * @type {Object}
   * @private
   */
  this.oldQuery_ = query;

  /**
   * Chart height.
   * @type {number}
   * @private
   */
  this.chartHeight_ = 400;

  /**
   * Chart width.
   * @type {number}
   * @private
   */
  this.chartWidth_ = 600;

  /**
   * Number of ticks on the x-axis.
   * @type {number}
   * @private
   */
  this.numberTicks_ = 4;

  this.update();
};

/**
 * Update the chart with the provided query.
 * @param {Object} query The new query (optional).
 */
Chart.prototype.update = function(query) {
  // Make a copy of the current query in case there's an error.
  this.oldQuery_ = $.extend({}, this.query);

  // Extend the existing query with the new query. The new query
  // overwrites existing query parameters.
  this.query = $.extend({}, this.query, query);

  this.update_();
};

/**
 * Reset the chart by removing all query labels.
 */
Chart.prototype.reset = function() {
  // Remove labels from query.
  delete this.query.labels;
  this.update_();
};

/**
 * Run the API call to get new data with which to update the chart.
 * @private
 */
Chart.prototype.update_ = function() {
  var self = this;

  // Call the API to get the new data for the chart.
  this.api_.getData(this.query, function(data, response) {
    // If there's no data, display an error message and revert to the old query.
    if (response) {
      var errorText = ['Query returned no results.'];
      errorText.push('Query parameters:');
      errorText.push(JSON.stringify(self.query));
      errorText.push(JSON.stringify(response));
      self.error_(errorText.join(' '));
      self.query = self.oldQuery_;
      return;
    }

    // Format the data for display in the chart.
    self.data = self.formatter(data);

    // Create the chart if it doesn't exist. This is done the first time.
    if (!self.chart_) {
      self.create_(self.data);

    } else {
      // Boolean value set to true if a series is added or removed.
      var updateLegend = false;

      // Replace chart data series with new data.
      var removeIndices = [];
      for (var series in self.chart_.series) {
        var exists = false;
        for (var data in self.data) {
          if (self.chart_.series[series].name == self.data[data].name) {
            self.chart_.series[series].data = self.data[data].data;
            exists = true;
          } else if (series == 'active') {
            // Rickshaw adds this field to the series data, so keep it.
            exists = true;
          }
        }
        // If this series doesn't exist in the new data, keep note for later
        // removal.
        if (!exists) {
          removeIndices.push(series);
          updateLegend = true;
        }
      }

      // Remove any series that don't exist in the new data.
      for (var index in removeIndices) {
        self.chart_.series.splice(removeIndices[index]);
      }

      // Find new data that doesn't exist in the series and add it.
      for (var data in self.data) {
        var exists = false;
        for (var series in self.chart_.series) {
          if (self.chart_.series[series].name == self.data[data].name) {
            exists = true;
          }
        }
        if (!exists) {
          self.chart_.series.push(self.data[data]);
          updateLegend = true;
        }
      }

      // If there was any change to the number of series, then update the
      // legend by recreating it.
      if (updateLegend) {
        self.createLegend_();
      }

      // Update the chart.
      self.chart_.update();
    }
  });
};

/**
 * Create the Rickshaw chart and supporting elements.
 * @param {Object} data The data to display on the chart.
 * @private
 */
Chart.prototype.create_ = function(data) {
  var self = this;

  // Create and display the actual Rickshaw chart.
  this.chart_ = new Rickshaw.Graph({
    element: this.chartElement,
    renderer: 'line',
    width: this.chartWidth_,
    height: this.chartHeight_,
    series: data,
    min: 'auto'
  });
  this.chart_.render();

  // Create a time fixture for the X axis.
  var time = this.createTimeFixture_();

  // Add the X axis to the chart.
  var xAxis = new Rickshaw.Graph.Axis.Time({
    graph: this.chart_,
    timeFixture: time
  });
  // Rewrite the tickOffsets function to display only a specific number of
  // ticks on the X axis.
  xAxis.tickOffsets = function() {
    var domain = this.graph.x.domain();
    var unit = this.fixedTimeUnit || this.appropriateTimeUnit();
    var step = Math.ceil((domain[1] - domain[0]) / self.numberTicks_);
    var offsets = [];
    for (var i = 0; i < self.numberTicks_; i++) {
      var tickValue = domain[0] + step * i;
      offsets.push({value: tickValue, unit: unit});
    }
    return offsets;
  };
  xAxis.render();

  // Add the Y axis to the chart.
  var yAxis = new Rickshaw.Graph.Axis.Y({
    graph: this.chart_,
    tickFormat: Rickshaw.Fixtures.Number.formatKMBT
  });
  yAxis.render();

  // Add hover state to the chart.
  var hoverDetail = new Rickshaw.Graph.HoverDetail({
    graph: this.chart_,
    xFormatter: function(date) {
      return self.stringifyDate_(date);
    }
  });

  // Add the legend to the chart.
  this.createLegend_();
};

/**
 * Create a Rickshaw.Fixtures.Time object for the X axis to display the
 * date as a string.
 * @return {Rickshaw.Fixtures.Time} A Rickshaw.Fixtures.Time object.
 * @private
 */
Chart.prototype.createTimeFixture_ = function() {
  var self = this;

  var time = new Rickshaw.Fixtures.Time();
  for (var unit in time.units) {
    // Update the formatters to display the date as a string.
    time.units[unit].formatter = function(date) {
      return self.stringifyDate_(date);
    };
  }
  return time;
};

/**
 * Display a legend next to the graph.
 * @private
 */
Chart.prototype.createLegend_ = function() {
  $(this.legendElement).empty();

  // Add a legend to the chart.
  var legend = new Rickshaw.Graph.Legend({
    graph: this.chart_,
    element: this.legendElement
  });

  // Update the render method in the legend to color-code series
  // according to the distribution range value rather than the series
  // name. This is done via the legend value within the series object.
  legend.render = function() {
    var self = this;

    $(this.list).empty();
    this.lines = [];

    var series = this.graph.series.map(function(s) {
      return s;
    });

    if (!this.naturalOrder) {
      series = series.reverse();
    }

    var labels = [];
    series.forEach(function(s) {
      if (s.legend) {
        if (labels.indexOf(s.legend) == -1) {
          self.addLine(s);
          labels.push(s.legend);
        }
      } else {
        self.addLine(s);
      }
    });
  };

  // Update the addLine method in the legend object to display the
  // series legend value as the text rather than the series name.
  legend.addLine = function(series) {
    var line = document.createElement('li');
    line.className = 'line';
    if (series.disabled) {
      line.className += ' disabled';
    }
    if (series.className) {
      d3.select(line).classed(series.className, true);
    }

    var swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = series.color;
    line.appendChild(swatch);

    var label = document.createElement('span');
    label.className = 'label';
    if (series.legend) {
      label.innerHTML = series.legend;
    } else {
      label.innerHTML = series.name;
    }
    line.appendChild(label);

    this.list.appendChild(line);

    line.series = series;
    if (series.noLegend) {
      line.style.display = 'none';
    }

    var _line = {element: line, series: series};

    if (this.shelving) {
      this.shelving.addAnchor(_line);
      this.shelving.updateBehaviour();
    }
    if (this.highlighter) {
      this.highlighter.addHighlightEvents(_line);
    }

    this.lines.push(_line);
    return line;
  };
  legend.render();
};

/**
 * Format the date as YYYY-mm-dd HH:MM:SS.
 * @param {number} date A date in milliseconds.
 * @return {string} A stringified date object.
 * @private
 */
Chart.prototype.stringifyDate_ = function(date) {
  var date = new Date(date);
  var stringDate = [];
  stringDate.push(date.getFullYear());
  stringDate.push('-');
  stringDate.push(date.getMonth() + 1);
  stringDate.push('-');
  stringDate.push(date.getDate());
  stringDate.push(' ');
  stringDate.push(date.getHours());
  stringDate.push(':');
  if (date.getMinutes() < 10) {
    stringDate.push('0');
  }
  stringDate.push(date.getMinutes());
  stringDate.push(':');
  if (date.getSeconds() < 10) {
    stringDate.push('0');
  }
  stringDate.push(date.getSeconds());
  return stringDate.join('');
};

/**
 * Display an error message for the chart.
 * @param {string} errorText An error message to display.
 * @private
 */
Chart.prototype.error_ = function(errorText) {
  var self = this;

  $(this.errorElement).empty();
  var error = document.createElement('div');
  $(error).addClass('alert alert-danger alert-dismissable');
  $(error).text(errorText);
  var close = document.createElement('button');
  $(close).attr('type', 'button');
  $(close).addClass('close');
  $(close).attr('data-dismiss', 'alert');
  $(close).attr('aria-hidden', 'true');
  $(close).text('x');
  $(error).append(close);
  $(this.errorElement).append(error);
  window.setTimeout(function() {
    $(error).fadeTo(200, 0).slideUp(700, function() {
      $(this).remove();
    });
  }, 7000);
};
