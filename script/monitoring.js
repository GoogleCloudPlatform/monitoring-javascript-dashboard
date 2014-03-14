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
 * @fileoverview Monitoring API demo.
 */

/**
 * The MonitoringApi class performs authorization and retrieves
 * data from the Monitoring API.
 * @constructor
 */
var MonitoringApi = function() {
  /**
   * User's project ID. Set via the UI.
   * @type {string}
   * @private
   */
  this.projectId = null;

  /**
   * Google API Key.
   * @type {String}
   * @private
   */
  this.apiKey_ = '<your-api-key>';

  /**
   * Google Client ID.
   * @type {String}
   * @private
   */
  this.clientId = '<your-client-id>';

  /**
   * Google API scope.
   * @type {String}
   * @private
   */
  this.scopes = 'https://www.googleapis.com/auth/monitoring.readonly';
};

/**
 * Initialize the HTML page and authorization settings.
 * @param {Function} authComplete Function to call when authorization is done.
 */
MonitoringApi.prototype.auth = function(authComplete) {
  gapi.client.setApiKey(this.apiKey_);
  gapi.auth.authorize({
    client_id: this.clientId,
    scope: this.scopes,
    immediate: true}, this.handleAuthResult(authComplete));
};

/**
 * Handle the response from Google's authorization server.
 * @param {Function} authComplete Function to call when authorization is done.
 */
MonitoringApi.prototype.handleAuthResult = function(authComplete) {
  var self = this;

  return function(authResult) {
    if (authResult && authResult.name != 'TypeError') {
      $('#authorize-button').css('visibility', 'hidden');
      authComplete();
    } else {
      $('#authorize-button').css('visibility', '');
      $('#authorize-button').click(function(event) {
        gapi.auth.authorize({
          client_id: self.clientId,
          scope: self.scopes,
          immediate: false}, self.handleAuthResult(authComplete));
        return false;
      });
    }
  };
};

/**
 * Make a call to the Monitoring API and pass
 * the data to the provided callback function.
 * @param {Object} query Query parameters for the call to the API. For example:
 *     {
 *       timespan: '2d',
 *       labels: ['label==value',...]
 *     }
 * @param {function} callback Method to call when API returns.
 */
MonitoringApi.prototype.getData = function(query, callback) {
  var self = this;
  var timeseries = [];
  // Make a copy of the query in case the pageToken needs to be added.
  var localQuery = $.extend({}, query);

  var makeCall = function() {
    gapi.client.load('cloudmonitoring', 'v2beta1', function() {
      var request = gapi.client.cloudmonitoring.timeseries.list(localQuery);
      request.execute(function(resp) {
        $.merge(timeseries, resp.timeseries);
        if (resp.nextPageToken) {
          $.extend(localQuery, {'pageToken': resp.nextPageToken});
          makeCall();
        } else {
          callback(timeseries);
        }
      });
    });
  };
  makeCall();
};
