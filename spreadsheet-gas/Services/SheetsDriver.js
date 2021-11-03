/*
 * Functions to facilitate interaction with 
 * the spreadsheet
 */

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

/**
 * commitNewInteractionModel
 * Gets new interaction model JSON and commits to GitHub
 *
 */
function commitNewInteractionModel() {
  getGlobals();

  let allValid = isQuestionSheetValid();
  if (allValid) {
    Logger.log(GitHub(GITHUB_CONFIG).SetBranch(GITHUB_CONFIG.branch));
    let tree = GitHub(GITHUB_CONFIG).BuildTree("alexa-skill/skill-package/interactionModels/custom/en-AU.json", JSON.stringify(getQuestionsAlexaJson()));
    Logger.log(tree);
    let commitUrl = GitHub(GITHUB_CONFIG).Commit(tree, GITHUB_CONFIG.username, GITHUB_EMAIL);
    Logger.log(commitUrl);
  }
  else {
    Logger.log("invalid Question cells found");
    // alert user that cells are invalid
    showAlert("ERROR: Invalid Question cells found.");
  }
}

/**
 * getDevices
 * Returns array of device names from Questions sheet
 *
 * @returns {array} - Array of string device names
 */
function getDevices() {
  let sheet = SPREADSHEET.getSheetByName("Questions");
  let deviceNames = [];
  // if sheet not found
  if (sheet != null) {
    // get data range, start at row QT_START and go for length of sheet
    // +1 the max rows as to get last row with data correctly
    let dataRange = sheet.getRange(QT_START, 1, sheet.getLastRow()+1, 2);
    // returns a two-dimensional array of values, indexed by row, then by column
    let data = dataRange.getValues();

    for (let i = 0; i < data.length; i++) {
      // start of device
      if (data[i][0] == "DEVICE NAME") {
        deviceNames.push(data[i][1].toLowerCase());
      }
    }
  }
  return deviceNames;
}

/**
 * isQuestionSheetValid
 * Checks all Question sheet cells if they are all valid
 *
 * @returns {boolean} - Are all cells valid
 */
function isQuestionSheetValid() {
  // remove empty question cells
  checkForEmptyQuestionCells();

  let cellsValid = true;
  // check intent names
  cellsValid = checkIntentNames();
  // get Questions sheet
  // this sheet contains intent names and their questions
  let sheet = SPREADSHEET.getSheetByName("Questions");

  // if sheet not found
  if (sheet != null) {
    // get data range, start at row QT_START and go for length of sheet
    // +1 the max rows as to get last row with data correctly
    let dataRange = sheet.getRange(QT_START, 1, sheet.getLastRow()+1, 2);
    // returns a two-dimensional array of values, indexed by row, then by column
    let data = dataRange.getValues();

    for (let i = 0; i < data.length; i++) {
      let validCell = true;
      // start of device
      if (data[i][0] == "DEVICE NAME") {
        validCell = isDeviceNameValid(data[i][1]);
      }
      // blank row
      else if (isCellEmpty(data[i][0]) && isCellEmpty(data[i][1])) {
        continue;
      }
      else {
        // left cell empty or not, right not empty 
        // row with question
        validCell = isQuestionCellValid(data[i][1]);
      }
      
      if (!validCell) {
        cellsValid = false;
        // change colour to red
        sheet.getRange(QT_START+i, 2).setBackground("#e06666");
      }
      else {
        sheet.getRange(QT_START+i, 2).setBackground("#b6d7a8");
      }
    }
  }
  else {
    Logger.log("no Questions sheet found");
    // alert user that sheet is missing
    showAlert("ERROR: Questions sheet not found.");
    return false;
  }
  return cellsValid;
}

/**
 * checkForEmptyQuestionCells
 * Checks if there are any question cells with nothing in them
 * if so, deletes that row
 *
 */
function checkForEmptyQuestionCells() {
  let sheet = SPREADSHEET.getSheetByName("Questions");

  if (sheet != null) {
    let dataRange = sheet.getRange(QT_START, 1, sheet.getLastRow()+1, 2);
    let data = dataRange.getValues();

    let devicesAmount = getDevices().length;

    //let deviceStarted = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == "DEVICE NAME") {
        continue;
      }
      // have to check if blank row in question group
      // if blank row
      if (isCellEmpty(data[i][0]) && isCellEmpty(data[i][1])) {
        let deleteRow = false;
        // if end of data skip
        if(i+1 >= data.length) {
          continue;
        }
        // if immediate next row new device don't delete
        if (data[i+1][0] != "DEVICE NAME") {
          // check next rows
          for(let x = i; x < data.length; x++) {
            // if filled cells after
            if (!isCellEmpty(data[x][0]) || !isCellEmpty(data[x][1])) {
              // if row with data after empty row delete row
              deleteRow = true;
            }
          }
        }
        if (deleteRow) {
          sheet.deleteRow(i+QT_START);
        }
      }
    }
  }
}

/**
 * checkIntentNames
 * Checks all Question sheet intent cells if they are valid
 *
 * @returns {boolean} - Are all cells valid
 */
function checkIntentNames() {
  let cellsValid = true;
  // get Questions sheet
  // this sheet contains intent names and their questions
  let sheet = SPREADSHEET.getSheetByName("Questions");

  // if sheet not found
  if (sheet != null) {
    // get data range, start at row QT_START and go for length of sheet
    // +1 the max rows as to get last row with data correctly
    let dataRange = sheet.getRange(QT_START, 1, sheet.getLastRow()+1, 2);
    // returns a two-dimensional array of values, indexed by row, then by column
    let data = dataRange.getValues();

    let intentNames = [];
    for (let i = 0; i < data.length; i++) {
      let validCell = true;
      // start of device, skip
      if (data[i][0] == "DEVICE NAME") {
        continue;
      }
      // if blank cell, skip
      if (isCellEmpty(data[i][0])) {
        continue;
      }
      let intentName = data[i][0];
      // otherwise considered cell with intent name
      // first check if valid formatting
      if (!isIntentValid(intentName)) {
        validCell = false;
      }
      // else check if already in array
      // if so, invalid
      else if (intentNames.includes(intentName)) {
        validCell = false;
      }
      else {
        intentNames.push(intentName)
      }

      if (!validCell) {
        cellsValid = false;
        // change colour to red
        sheet.getRange(QT_START+i, 1).setBackground("#e06666");
      }
      else {
        sheet.getRange(QT_START+i, 1).setBackground("#ffffff");
      }
    }
  }
  return cellsValid;
}

/**
 * isDeviceNameValid
 * Checks input against regex
 *
 * @param {string} cellData - Cell data as string
 * @returns {boolean} - Is cell valid
 */
function isDeviceNameValid(cellInput) {
  // device name is only valid if it is five characters and
  // only consists of letters
  let deviceNameRegex = /^([A-Z]|[a-z]){5}$/;
  if (deviceNameRegex.test(cellInput)) {
    return true;
  }
  else {
    return false;
  }
}

/**
 * isIntentValid
 * Checks input against regex
 *
 * @param {string} cellInput - The innerHTML of a cell
 * @returns {boolean} - True if valid, false if not
 */
function isIntentValid(cellInput) {
  // match only uppercase seperated by underscore
  let intentRegex = /^([A-Z]+(_?[A-Z])*)$/;
  if(intentRegex.test(cellInput)) {
      return true;
  } 
  else {
      return false;
  }
}

/**
 * isQuestionCellValid
 * Checks input against regex
 *
 * @param {string} cellData - Cell data as string
 * @returns {boolean} - Is cell valid
 */
function isQuestionCellValid(cellInput) {
  // match special characters
  let specialCharRegex = /^([a-z||A-Z|| ||.||_||'||\-||\{||\}])*$/;
  // match white space
  let whiteSpaceRegex = /^\s*$/;
  // if only whitespace not valid
  if (whiteSpaceRegex.test(cellInput)) {
    return false;
  }
  // if only includes regex set
  if(specialCharRegex.test(cellInput)) {
      return true;
  } 
  else {
      return false;
  }
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

  // get data range, start at row QT_START and go for length of sheet
  // +1 the max rows as to get last row with data correctly
  let dataRange = sheet.getRange(QT_START, 1, sheet.getLastRow()+1, 2);
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

  // must include inbuilt amazon intents
  let amazonIntent = {
    "name": "AMAZON.StopIntent",
    "samples": []
  };
  deviceObjects.push(amazonIntent);
  amazonIntent = {
    "name": "AMAZON.FallbackIntent",
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
  displayText(displayJson);
  
  return(json);
}

/**
 * makeJSON
 * Turns the passed object into a JSON string
 *
 * @param {object} object - The json object to be turned into a string
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