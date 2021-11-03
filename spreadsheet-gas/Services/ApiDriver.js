/*
 * Functions to facilitate connection to 
 * the function api
 */

/**
 * getAllDatabaseDevices
 * Gets intents for each device
 *
 * @returns {object} - Array of device objects
 */
 function getAllDatabaseDevices() {
  // get all device names
  let devices = getDevices();
  let returnedDevices = [];
  if (devices.length != 0) {
    devices.forEach(name => {
      // get device intents from api
      let deviceIntents = databaseGet(name);
      // if bad api request
      if (deviceIntents.hasOwnProperty("badRequest")) {
        if (deviceIntents["badRequest"] === "Resource not found") {
          // could be a newly added device
          // create device object with empty intents
          let deviceObject = {
            "name": name,
            "intents": [{"intent" : "!insert intent!", "response" : "!insert response!"}]
          };
          returnedDevices.push(deviceObject);
        }
        else {
          // error not expected, throw error
          throw "Bad request. Error message:\n" + deviceIntents["badRequest"];
        }
      }
      else {
        // create device object
        let deviceObject = {
          "name": name,
          "intents": deviceIntents
        };
        returnedDevices.push(deviceObject);
      }
    });
  }
  return returnedDevices;
}

/**
 * databaseGet
 * Does a GET request to the API
 * Requests the passed deviceId
 *
 * @param {string} deviceId - Id of health device to retrieve
 * @returns {object} - Intents component of response json 
 */
function databaseGet(deviceId) {
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
    "request-query": deviceId
  }
  let options = {
    "contentType" : "application/json",
    muteHttpExceptions: true,
    "payload": JSON.stringify(payload)
  };
  if (VERBOSE) Logger.log("url output:\n" + JSON.stringify(options));

  let response = UrlFetchApp.fetch(requestUrl, options);
  if (VERBOSE) Logger.log("response code: " + response.getResponseCode());
  // check to ensure OK request
  if (response.getResponseCode() == 200) {
    let data = JSON.parse(response.getContentText());
    if (VERBOSE) Logger.log("response:\n" + makeJSON_(data, getExportOptions()))

    return data["intents"];
  }
  else {
    if (VERBOSE) Logger.log("bad request:\n" + response.getContentText());
    let badRequestObject = {
      "badRequest" : response.getContentText()
    };
    return badRequestObject;
  }
}

/**
 * databasePut
 * Does a PUT request to the API
 * Pases inputJsonString as payload and deviceId as device to upsert
 *
 * @param {string} inputJsonString - Json data for the device
 * @param {string} deviceId - The name of the device to upsert
 * @returns {object} - Success state of response
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
  if (VERBOSE) Logger.log("response code: " + response.getResponseCode());
  // check to ensure OK request
  if (response.getResponseCode() == 200) {
    let data = JSON.parse(response.getContentText());
    if (VERBOSE) Logger.log("response:\n" + makeJSON_(data, getExportOptions()))

    let okRequestObject = {
      "okRequest" : "Successfully pushed to database."
    }
    return okRequestObject;
  }
  else {
    if (VERBOSE) Logger.log("bad request:\n" + response.getContentText());
    let badRequestObject = {
      "badRequest" : response.getContentText()
    };
    return badRequestObject;
  }
}