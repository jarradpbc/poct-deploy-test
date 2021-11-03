using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Schema;
using System.Collections.Generic;

using Microsoft.Azure.Cosmos;
using Microsoft.Azure.WebJobs.Extensions.CosmosDB;

using JarradPrice.Function.Models;
using JarradPrice.Function.Services;

namespace JarradPrice.Function.DatabaseConnect
{
    public static class DatabaseAccessHttpTrigger
    {
        #region Variables
        // Azure Cosmos DB endpoint
        private static readonly string EndpointUri = "https://manual-knowledgebase.documents.azure.com:443/";
        // primary key for the Azure Cosmos account
        private static readonly string PrimaryKey = "Bu3EXdxzZKhwmhF9C5IYRBjJNZkMSS6VHtMUt10RQzPWV6QlAZm8Cpp1oK0eb04MyGWvnN3ayLPyf1qQNAb7Vw==";
        private static readonly string databaseId = "my-database";
        private static readonly string containerId = "my-container";
        #endregion

        #region Trigger entry point
        [FunctionName("DatabaseAccessHttpTrigger")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            // parse json
            string json = await req.ReadAsStringAsync();
            // if no json passed
            if (String.IsNullOrEmpty(json)) return new BadRequestResult();
            // schema the json must follow
            string schemaJson = @"{
            'type': 'object',
            'properties':
                {
                    'source': {'type': 'string'},
                    'method': {'enum': ['GET','PUT']},
                    'request-type': {'enum': ['DEVICE', 'DEVICES', 'INTENT']},
                    'request-query': {'type': ['string', 'null']},
                    'payload': {'type': ['string', 'null']}
                }
            }";
            JSchema schema = JSchema.Parse(schemaJson);

            JObject jsonObject = JObject.Parse(json);

            IList<string> messages;
            bool valid = jsonObject.IsValid(schema, out messages);
            // if json does not follow schema
            if (!valid)
            {
                log.LogInformation("Invalid json");
                log.LogInformation(messages.ToString());
                return new BadRequestResult();
            }


            string result = String.Empty;

            if (jsonObject["method"].ToString().Equals("GET"))
            {
                log.LogInformation("get request from " + jsonObject["source"].ToString());

                string requestType = jsonObject["request-type"].ToString();
                string requestQuery = jsonObject["request-query"].ToString();

                log.LogInformation("type: " + requestType + " query: " + requestQuery);

                switch (requestType)
                {
                    case "DEVICE":
                        result = await GetDeviceRequest(requestQuery, log);
                        break;
                    case "DEVICES":
                        result = await GetDevicesRequest(requestQuery, log);
                        break;
                    case "INTENT":
                        result = await GetIntentRequest(requestQuery, log);
                        break;
                }
            }
            if (jsonObject["method"].ToString().Equals("PUT"))
            {
                log.LogInformation("post request " + jsonObject["source"].ToString());

                string payload = jsonObject["payload"].ToString();
                string id = jsonObject["request-query"].ToString();

                log.LogInformation("payload: " + payload + " id: " + id);

                result = await PutRequest(payload, id, log);
            }
            
            if (result.Equals("ER"))
            {
                return new BadRequestResult();
            }
            else
            {
                return new OkObjectResult(result);
            }
        }
        #endregion

        #region Cosmos initialisation
        private static async Task<CosmosDbService> InitialiseCosmosClientInstanceAsync()
        {
            var databaseName = databaseId;
            var containerName = containerId;
            var account = EndpointUri;
            var key = PrimaryKey;

            var client = new CosmosClient(account, key);
            var database = await client.CreateDatabaseIfNotExistsAsync(databaseName);
            await database.Database.CreateContainerIfNotExistsAsync(containerName, "/id");

            var cosmosDbService = new CosmosDbService(client, databaseName, containerName);
            return cosmosDbService;
        }
        #endregion

        #region Resource get requests
        private static async Task<string> GetDeviceRequest(string requestQuery, ILogger log)
        {
            // initialise cosmos instance
            CosmosDbService _cosmosDbService = await InitialiseCosmosClientInstanceAsync();
            // call CosmosDbService class
            DbServiceResponse result = await _cosmosDbService.GetHealthDeviceAsync(requestQuery);

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
                    HealthDevice healthDevice = healthDevices[0];
                    var json = JsonConvert.SerializeObject(healthDevice);
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

        private static async Task<string> GetDevicesRequest(string requestQuery, ILogger log)
        {
            // initialise cosmos instance
            CosmosDbService _cosmosDbService = await InitialiseCosmosClientInstanceAsync();
            // call CosmosDbService class
            DbServiceResponse result = await _cosmosDbService.GetHealthDevicesAsync(requestQuery);

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

        private static async Task<string> GetIntentRequest(string requestQuery, ILogger log)
        {
            // initialise cosmos instance
            CosmosDbService _cosmosDbService = await InitialiseCosmosClientInstanceAsync();
            // call CosmosDbService class
            DbServiceResponse result = await _cosmosDbService.GetDeviceIntentsAsync(requestQuery);

            if (result.Status == Status.OK)
            {
                log.LogInformation("success running cosmos query");
                List<DeviceIntent> deviceIntents = (List<DeviceIntent>)result.DeviceIntentPayload;
                // if no intents were found
                if (deviceIntents.Count == 0)
                {
                    log.LogInformation("error no intents were returned");
                    return "ER";
                }
                else
                {
                    // get first, there should only ever be one
                    DeviceIntent deviceIntent = deviceIntents[0];
                    var json = JsonConvert.SerializeObject(deviceIntent);
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

        #region Resource put requests
        private static async Task<string> PutRequest(string payload, string id, ILogger log)
        {
             // initialise cosmos instance
            CosmosDbService _cosmosDbService = await InitialiseCosmosClientInstanceAsync();

            HealthDevice healthDevice = JsonConvert.DeserializeObject<HealthDevice>(payload);
            healthDevice.Id = id;
            log.LogInformation("object to insert");
            log.LogInformation(healthDevice.ToString());

            // call CosmosDbService class
            DbServiceResponse result = await _cosmosDbService.UpdateAsync(id, healthDevice); 

            if (result.Status == Status.OK)
            {
                log.LogInformation("success, response: " + result.Response);
                return result.Response;
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
    }
}
