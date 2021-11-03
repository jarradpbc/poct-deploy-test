/*
 * Global variables
 * These are to be pulled from the CONFIG sheet
*/

// debug verbose
const VERBOSE = false;
// active Spreadsheet object
let SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
// invocation name for Alexa
let INVOCATION_NAME;
// connection driver variables
let AZURE_HOST;
let API_HOST;
let API_KEY;
// github client variables
let GITHUB_CONFIG;
let GITHUB_EMAIL;