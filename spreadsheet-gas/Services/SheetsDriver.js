// Includes functions for exporting active sheet or all sheets as JSON object (also Python object syntax compatible).
// Tweak the makePrettyJSON_ function to customize what kind of JSON to export.

/**
 * showAlert
 * Pre-built dialog box
 *
 * @param {string} alert - String to show user
 */
function showAlert(alert) {
  let ui = SpreadsheetApp.getUi();

  let result = ui.alert(
    alert,
    ui.ButtonSet.OK);
}

function exportSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var sheet = ss.getActiveSheet();
  var sheet = ss.getSheetByName("dbimport");
  
  if (sheet != null) {
    var rowsData = getRowsData(sheet, getExportOptions());
    var json = rowsData;//makeJSON_(rowsData, getExportOptions());

    return json;
    //displayText_(json);
  }
  else {
    Logger.log("no dbimport");
  }
}

/**
 * commitNewInteractionModel
 * Gets new interaction model JSON and commits to GitHub
 *
 */
function commitNewInteractionModel() {
  getGlobals();
  Logger.log(GitHub(GITHUB_CONFIG).SetBranch(GITHUB_CONFIG.branch));
  let tree = GitHub(GITHUB_CONFIG).BuildTree("alexa-skill/skill-package/interactionModels/custom/en-AU.json", JSON.stringify(getQuestionsAlexaJson()));
  Logger.log(tree);
  let commitUrl = GitHub(GITHUB_CONFIG).Commit(tree, GITHUB_CONFIG.username, GITHUB_EMAIL);
  Logger.log(commitUrl);
}

/**
 * getQuestionsAlexaJson
 * Creates JSON object from Questions sheet entries
 *
 * @returns {object} - JSON object
 */
function getQuestionsAlexaJson() {
  // get Questions sheet
  // this sheet contains intent names and their questions
  let sheet = SPREADSHEET.getSheetByName("Questions");

  // if sheet not found
  if (sheet != null) {
    // get data range, start at row 9 and go for length of sheet
    // +1 the max rows as to get last row with data correctly
    let dataRange = sheet.getRange(9, 1, sheet.getLastRow()+1, 2);
    // returns a two-dimensional array of values, indexed by row, then by column
    let data = dataRange.getValues();
    
    let deviceObjects = [];
    // current iteration device
    let newDeviceName = "";
    let newDeviceIntents = [];
    for (let i = 0; i < data.length; i++) {
      // the start of a device must always follow this format,
      // first column = DEVICE NAME, second column = the actual name of the device
      // e.g. data[i][0] = DEVICE NAME, data[i][1] = istat
      if (data[i][0] == "DEVICE NAME") {
        // start new device json
        newDeviceName = data[i][1].toUpperCase();
        newDeviceIntents = [];
        i++;
      }

      // if reached empty row, end of current device
      if (isCellEmpty(data[i][0]) && isCellEmpty(data[i][1])) {
        // if device not empty add
        if (newDeviceIntents.length > 0) {
          deviceObjects = deviceObjects.concat(newDeviceIntents);
        }
        newDeviceIntents = [];
      }
      else {
        // otherwise add intents
        // insert the intent name attribute
        let intentName = newDeviceName + "_" + data[i][0].toUpperCase();
        let questionSamples = [];
        let newIntent = {}
        newIntent['name'] = intentName;
        // insert the first sample
        questionSamples.push(data[i][1]);
        i++;
        // loop through all other samples
        while(i != data.length && isCellEmpty(data[i][0]) && !isCellEmpty(data[i][1])) {
          questionSamples.push(data[i][1]);
          i++;
        }
        newIntent['samples'] = questionSamples;
        newDeviceIntents.push(newIntent);
        // once finished with all samples for intent put index back to start of next row
        i--;
      }
    }

    // must include inbuilt amazon intent
    let amazonIntent = {
      "name": "AMAZON.StopIntent",
      "samples": []
    };
    deviceObjects.push(amazonIntent);

    let invocationName = INVOCATION_NAME;
    let json = {
      "interactionModel": {
        "languageModel": {
            "invocationName": invocationName,
            "intents": deviceObjects,
            "types": []
        }
      }
    }

    displayJson = makeJson(json);

    //Logger.log(displayJson);
    displayText(displayJson);
    
    return(json);
  }
  else {
    Logger.log("no Questions sheet found");
    // alert user that sheet is missing
    showAlert("Questions sheet not found.");
  }
}

/**
 * makeJSON
 * Turns the passed object into a JSON string
 *
 * @param {object} object - The jsoon object to be turned into a string
 * @returns {string} - JSON string
 */
function makeJson(object) {
  var FORMAT_ONELINE   = 'One-line';
  var FORMAT_MULTILINE = 'Multi-line';
  var FORMAT_PRETTY    = 'Pretty';
  var options = {};
  options.language = 'JavaScript';
  options.format   = FORMAT_PRETTY;
  options.structure = 'List';

  if (options.format == FORMAT_PRETTY) {
    var jsonString = JSON.stringify(object, null, 4);
  } else if (options.format == FORMAT_MULTILINE) {
    var jsonString = Utilities.jsonStringify(object);
    jsonString = jsonString.replace(/},/gi, '},\n');
    jsonString = prettyJSON.replace(/":\[{"/gi, '":\n[{"');
    jsonString = prettyJSON.replace(/}\],/gi, '}],\n');
  } else {
    var jsonString = Utilities.jsonStringify(object);
  }

  return jsonString;
}

/**
 * displayText
 * Displays text in a HTML window overlay
 *
 * @param {string} text - Text to display
 */
function displayText(text) {
  var output = HtmlService.createHtmlOutput("<textarea style='width:100%;' rows='40'>" + text + "</textarea>");
  output.setWidth(1000)
  output.setHeight(1000);
  SpreadsheetApp.getUi()
      .showModalDialog(output, 'Exported JSON');
}

// Below code grabbed from https://gist.github.com/crstamps2/3111817
/**
 * getRowsData
 * Iterates row by row in the input range and returns an array of objects
 * Each object contains all the data for a given row, indexed by its normalized column name
 *
 * @param {object} sheet - The sheet object that contains the data to be processed
 * @returns {object} - Row data objects
 */
function getRowsData(sheet) {
  let headersRange = sheet.getRange(1, 1, sheet.getFrozenRows(), sheet.getMaxColumns());
  let headers = headersRange.getValues()[0];
  let dataRange = sheet.getRange(sheet.getFrozenRows()+1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
  let objects = getObjects(dataRange.getValues(), normalizeHeaders(headers));
  
  return objects;
}

/**
 * getColumnsData
 * Iterates column by column in the input range and returns an array of objects
 * Each object contains all the data for a given column, indexed by its normalized row name
 *
 * @param {object} sheet - The sheet object that contains the data to be processed
 * @param {number} range - The exact range of cells where the data is stored
 * @param {number} rowHeadersColumnIndex - Specifies the column number where the row names are stored. This argument is optional and it defaults to the column immediately left of the range
 * @returns {array} - Array of objects
 */
function getColumnsData(sheet, range, rowHeadersColumnIndex) {
  rowHeadersColumnIndex = rowHeadersColumnIndex || range.getColumnIndex() - 1;
  let headersTmp = sheet.getRange(range.getRow(), rowHeadersColumnIndex, range.getNumRows(), 1).getValues();
  let headers = normalizeHeaders(arrayTranspose(headersTmp)[0]);
  return getObjects(arrayTranspose(range.getValues()), headers);
}

/**
 * getObjects
 * For every row of data in data, generates an object that contains the data
 * Names of object fields are defined in keys
 *
 * @param {array} data - JavaScript 2d array
 * @param {data} keys - Array of Strings that define the property names for the objects to create
 * @returns {object} - Row data objects
 */
function getObjects(data, keys) {
  let objects = [];
  for (let i = 0; i < data.length; ++i) {
    let object = {};
    let hasData = false;
    for (let j = 0; j < data[i].length; ++j) {
      let cellData = data[i][j];
      if (isCellEmpty(cellData)) {
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}

/**
 * normalizeHeaders
 * Returns an Array of normalized Strings
 *
 * @param {array} headers - Array of Strings to normalize
 * @returns {array} - Array of normalized Strings
 */
function normalizeHeaders(headers) {
  let keys = [];
  for (let i = 0; i < headers.length; ++i) {
    let key = normalizeHeader(headers[i]);
    if (key.length > 0) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * normalizeHeader
 * Normalizes a string, by removing all alphanumeric characters and using mixed case
 * to separate words. The output will always start with a lower case letter
 * This function is designed to produce JavaScript object property names
 * Examples:
 *  "First Name" -> "firstName"
 *  "Market Cap (millions) -> "marketCapMillions"
 *  "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"
 *
 * @param {string} header - String to normalize
 * @returns {string} - Normalized string
 */
function normalizeHeader(header) {
  let key = "";
  let upperCase = false;
  for (let i = 0; i < header.length; ++i) {
    let letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

/**
 * isCellEmpty
 * Returns true if the cell where cellData was read from is empty
 *
 * @param {string} cellData - Cell data as string
 * @returns {boolean} - Is data empty
 */
function isCellEmpty(cellData) {
  return typeof(cellData) == "string" && cellData == "";
}

/**
 * isAlnum
 * Returns true if the character char is alphabetical, false otherwise
 *
 * @param {char} char - Character char
 * @returns {boolean} - Is char alphabetical
 */
function isAlnum(char) {
  return char >= 'A' && char <= 'Z' ||
    char >= 'a' && char <= 'z' ||
    isDigit(char);
}

/**
 * isDigit
 * Returns true if the character char is a digit, false otherwise
 *
 * @param {char} char - Character char
 * @returns {boolean} - Is char a digit
 */
function isDigit(char) {
  return char >= '0' && char <= '9';
}

/**
 * arrayTranspose
 * Given a JavaScript 2d Array, this function returns the transposed table
 * Example: arrayTranspose([[1,2,3],[4,5,6]]) returns [[1,4],[2,5],[3,6]]
 *
 * @param {array} data - JavaScript 2d array
 * @returns {array} - Returns JavaScript 2d array
 */
function arrayTranspose(data) {
  if (data.length == 0 || data[0].length == 0) {
    return null;
  }

  let ret = [];
  for (let i = 0; i < data[0].length; ++i) {
    ret.push([]);
  }

  for (let i = 0; i < data.length; ++i) {
    for (let j = 0; j < data[i].length; ++j) {
      ret[j][i] = data[i][j];
    }
  }

  return ret;
}