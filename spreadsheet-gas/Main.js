// onOpen() runs when a user opens the spreadsheet
function onOpen() {
  // initalise global spreadSheet variable
  SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  // initalise global variables
  getGlobals();
  // insert menu buttons
  // alexa tools menu
  var exportButtons = [{
    name : "Export Questions",
    functionName : "commitNewInteractionModel"
  },
  {
    name: "Export Answers",
    functionName : "openSidebar"
  }];
  SPREADSHEET.addMenu("EXPORT TOOLS", exportButtons);
};

function getGlobals() {
  var sheet = SPREADSHEET.getSheetByName("CONFIG");
  if (sheet != null) {
    INVOCATION_NAME = String(sheet.getRange('D8').getValue());
    // azure variables
    AZURE_HOST = String(sheet.getRange('D11').getValue());
    API_HOST = String(sheet.getRange('D12').getValue());
    API_KEY = String(sheet.getRange('D13').getValue());
    
    if (VERBOSE) {
      Logger.log(AZURE_HOST + "\n" 
      + API_HOST + "\n"
      + API_KEY);
    }
    // github client variables
    let config = {
      "owner" : sheet.getRange('D16').getValue(),
      "repo" : sheet.getRange('D17').getValue(),
      "username" : sheet.getRange('D18').getValue(),
      "token" : sheet.getRange('D19').getValue(),
      "branch" : sheet.getRange('D20').getValue()
    }
    GITHUB_CONFIG = config;
    if (VERBOSE) Logger.log(GITHUB_CONFIG);
    GITHUB_EMAIL = sheet.getRange('D21').getValue();
    if (VERBOSE) Logger.log(GITHUB_EMAIL);
  }
}

function openSidebar() {
  var html = doGet().setTitle('Update Database Responses');
  SpreadsheetApp.getUi().showSidebar(html);
}

function doGet(request) {
  return HtmlService.createTemplateFromFile('Sidebar/Sidebar')
      .evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}