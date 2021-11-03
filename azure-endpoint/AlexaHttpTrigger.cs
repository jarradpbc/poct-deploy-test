using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.Azure.Cosmos;

using Alexa.NET;
using Alexa.NET.Response;
using Alexa.NET.Request.Type;
using Alexa.NET.Request;
using System.Net.Http;
using System.Text;

using JarradPrice.Function.Models;
using JarradPrice.Function.Services;
using System.Collections.Generic;
using System.Linq;

namespace JarradPrice.Function.Endpoint
{
    public static class AlexaHttpTrigger
    {
        #region Cosmos initialisation
        private static async Task<CosmosDbService> InitialiseCosmosClientInstanceAsync()
        {
            var databaseName = GetEnvironmentVariable("COSMOS_DATABASE_ID");
            var containerName = GetEnvironmentVariable("COSMOS_CONTAINER_ID");
            var account = GetEnvironmentVariable("COSMOS_URI");
            var key = GetEnvironmentVariable("COSMOS_PRIMARY_KEY");

            var client = new CosmosClient(account, key);
            var database = await client.CreateDatabaseIfNotExistsAsync(databaseName);
            await database.Database.CreateContainerIfNotExistsAsync(containerName, "/id");

            var cosmosDbService = new CosmosDbService(client, databaseName, containerName);
            return cosmosDbService;
        }

        public static string GetEnvironmentVariable(string name)
        {
            return System.Environment.GetEnvironmentVariable(name, EnvironmentVariableTarget.Process);
        }

        public static async Task<string> GetDatabaseIntents(ILogger log)
        {
            // initialise cosmos instance
            CosmosDbService _cosmosDbService = await InitialiseCosmosClientInstanceAsync();
            // call CosmosDbService class
            DbServiceResponse result = await _cosmosDbService.GetHealthDevicesAsync("");

            if (result.Status == Status.OK)
            {
                log.LogInformation("success running cosmos query");
                List<HealthDevice> healthDevices = (List<HealthDevice>)result.HealthDevicePayload;
                if (healthDevices.Count == 0)
                {
                    log.LogInformation("error no health devices were returned");
                    return "ER";
                }
                else
                {
                    var json = JsonConvert.SerializeObject(healthDevices);
                    return json;
                }
            }
            else if (result.Status == Status.ER)
            {
                log.LogInformation("error, response: " + result.Response);
                return "ER";
            }
            // should never reach this return statement
            return "ER";
        }
        #endregion

        [FunctionName("AlexaHttpTrigger")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            // parse json
            string json = await req.ReadAsStringAsync();
            // if no json passed
            if (String.IsNullOrEmpty(json)) return new BadRequestResult();
            // must check ID of incoming skill to verify that the request came from our skill
            string idCheck = "amzn1.ask.skill.ad97d3eb-4c6e-4830-bbd7-293fb151c41a";
            JObject jsonObject = JObject.Parse(json);
            // if applicationId does not match, drop the request
            if ((string)jsonObject["session"]["application"]["applicationId"] != idCheck)
            {
                log.LogInformation("dropped request, invalid applicationId");
                return new BadRequestResult();
            }

            // immediatly get database json to decrease response time
            Task<string> databaseTask = GetDatabaseIntents(log);

            // convert json to Alexa.NET SkillRequest object
            SkillRequest skillRequest = JsonConvert.DeserializeObject<SkillRequest>(json);
            // get the request type
            var requestType = skillRequest.GetRequestType();
            // response object to be returned to Alexa
            SkillResponse response = null;

            if (requestType == typeof(LaunchRequest))
            {
                log.LogInformation("launch request");
                response = ResponseBuilder.Tell("Health manual has launched");
                response.Response.ShouldEndSession = false;
            }
            else if (requestType == typeof(SessionEndedRequest))
            {
                log.LogInformation("end session request");
                response = ResponseBuilder.Tell("Goodbye!");
                response.Response.ShouldEndSession = true;
            }
            else if (requestType == typeof(IntentRequest))
            {
                log.LogInformation("intent request");
                IntentRequest intentRequest = skillRequest.Request as IntentRequest;
                switch (intentRequest.Intent.Name)
                {
                    case "AMAZON.CancelIntent":
                        response = await GetEndSessionResponse(intentRequest, log);
                        break;
                    case "AMAZON.StopIntent":
                        response = await GetEndSessionResponse(intentRequest, log);
                        break;
                    case "AMAZON.FallbackIntent":
                        response = await GetFallbackResponse(intentRequest, log);
                        break;
                    default:
                    {
                        // wait for database json to be returned before continuing
                        string dbJsonString = await databaseTask;
                        response = await ParseQuery(dbJsonString, intentRequest, log);
                        break;
                    }
                }
            }

            if (response != null)
            {
                log.LogInformation("success");
                return new OkObjectResult(response);
            }
            else
            {
                log.LogInformation("bad response");
                return new BadRequestResult();
            }
        }

         public static async Task<SkillResponse> ParseQuery(String dbJsonString, IntentRequest intentRequest, ILogger log)
        {
            SkillResponse response = null;
            string intentRequestFullName = intentRequest.Intent.Name;
            log.LogInformation("intent to retrieve " + intentRequestFullName);

            string intentName = intentRequestFullName.Substring(6);
            string deviceId = intentRequestFullName.Substring(0, 5).ToLower();
            string responseSpeach = String.Empty;
            // parse database json into array of json, each health device is a child
            try
            {
                JArray devicesJsonArray = JArray.Parse(dbJsonString);
                // retrieve device intents
                var deviceJsonObject = devicesJsonArray.Children<JObject>().FirstOrDefault(x => x["id"] != null && x["id"].ToString().Equals(deviceId, StringComparison.OrdinalIgnoreCase));
                if (deviceJsonObject != null)
                {
                    // get the wanted device intent
                    var foundResponse = deviceJsonObject.SelectToken($"$.intents[?(@.intent == '{intentName}')]");
                    if (foundResponse != null)
                    {
                        responseSpeach = foundResponse["response"].Value<string>();
                        log.LogInformation($"found response: \n {responseSpeach}");
                    }
                    else
                    {
                        // bad request intent not found
                        log.LogInformation($"{intentName} intent not found");
                        return null;
                    }
                }
                else
                {
                    // bad request device not found
                    log.LogInformation($"{deviceId} device not found");
                    return null;
                }
                
                response = ResponseBuilder.Tell(responseSpeach);
                response.Response.ShouldEndSession = false;

                return response;
            }
            catch (Exception exc)
            {
                log.LogInformation($"failed to parse database json: \n {exc}");
                return null;
            }
        }

        public static async Task<SkillResponse> GetEndSessionResponse(IntentRequest intentRequest, ILogger log)
        {
            SkillResponse response = null;
            log.LogInformation("ending session from request" + intentRequest.Intent.Name);

            string responseSpeach = "Goodbye!";

            response = ResponseBuilder.Tell(responseSpeach);
            response.Response.ShouldEndSession = true;

            return response;
        }

        public static async Task<SkillResponse> GetFallbackResponse(IntentRequest intentRequest, ILogger log)
        {
            SkillResponse response = null;
            log.LogInformation("fallback from request" + intentRequest.Intent.Name);

            string responseSpeach = "Sorry I can't help with that at this time!";

            response = ResponseBuilder.Tell(responseSpeach);
            response.Response.ShouldEndSession = false;

            return response;
        }
    }
}
