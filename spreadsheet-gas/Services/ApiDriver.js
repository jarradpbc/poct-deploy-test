/*
 * Functions to facilitate connection to 
 * the function api
 */

/**
 * databaseGet
 * Does a GET request to the API
 * Requests the istat device
 *
 * @returns {object} - Intents component of response json 
 */
function databaseGet() {
  getGlobals();
  if (VERBOSE) Logger.log("starting api get request");
  // construct request url
  let requestUrl = "https://" 
    + AZURE_HOST 
    + ".azurewebsites.net/api/"
    + API_HOST
    + "?code="
    + API_KEY;
  // json get request for the istat document
  payload = {
    "source": "Google App Script",
    "method": "GET",
    "request-type": "DEVICE",
    "request-query": "istat"
  }
  let options = {
    "contentType" : "application/json",
    muteHttpExceptions: true,
    "payload": JSON.stringify(payload)
  };
  if (VERBOSE) Logger.log("url output:\n" + JSON.stringify(options));

  let response = UrlFetchApp.fetch(requestUrl, options);
  let data = JSON.parse(response.getContentText());
  if (VERBOSE) Logger.log("response:\n" + makeJSON_(data, getExportOptions()))

  return data["intents"];
}

/**
 * databasePut
 * Does a PUT request to the API
 * Pases inputJsonString as payload and deviceId as device to upsert
 *
 * @param {string} inputJsonString - Json data for the device
 * @param {string} deviceId - The name of the device to upsert
 */
function databasePut(inputJsonString, deviceId) {
  getGlobals();
  if (VERBOSE) Logger.log("starting api put request");
  // construct request url
  let requestUrl = "https://" 
    + AZURE_HOST 
    + ".azurewebsites.net/api/"
    + API_HOST
    + "?code="
    + API_KEY;
  // json put request for the inputJson
  payload = {
    "source": "Google App Script",
    "method": "PUT",
    "request-type": "DEVICE",
    "request-query": String(deviceId),
    "payload": inputJsonString
  }
  let options = {
    "contentType" : "application/json",
    muteHttpExceptions: true,
    "payload": JSON.stringify(payload)
  };
  if (VERBOSE) Logger.log("url output:\n" + JSON.stringify(options));

  let response = UrlFetchApp.fetch(requestUrl, options);
  let data = JSON.parse(response.getContentText());
  if (VERBOSE) Logger.log("response:\n" + makeJSON_(data, getExportOptions()))

  //return makeJSON_(data, getExportOptions());
}