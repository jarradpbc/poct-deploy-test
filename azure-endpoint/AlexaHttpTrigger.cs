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

using Alexa.NET;
using Alexa.NET.Response;
using Alexa.NET.Request.Type;
using Alexa.NET.Request;
using System.Net.Http;
using System.Text;

namespace JarradPrice.Function.Endpoint
{
    public static class AlexaHttpTrigger
    {
        [FunctionName("Alexa")]
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
                        break;
                    case "AMAZON.StopIntent":
                        break;
                    default:
                    {
                        response = await ParseQuery(intentRequest, log);
                        //log.LogLine($"Unknown intent: " + intentRequest.Intent.Name);
                        //string speech = "I didn't understand - try again?";
                        //Reprompt rp = new Reprompt(speech);
                        //return ResponseBuilder.Ask(speech, rp, session);
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

        public static async Task<SkillResponse> ParseQuery(IntentRequest iR, ILogger log)
        {
            SkillResponse response = null;
            log.LogInformation("intent to retieve " + iR.Intent.Name);

            string result = await RetrieveResponse(iR.Intent.Name, log);

            response = ResponseBuilder.Tell(result);
            response.Response.ShouldEndSession = false;

            return response;
        }

        static readonly HttpClient client = new HttpClient();
        public static async Task<string> RetrieveResponse(string st, ILogger log)
        {
            string RemoteUrl = "https://seng4211-alexa-endpoint.azurewebsites.net/api/DatabaseAccessHttpTrigger?code=RlUlUu6QhAQ/1ieqak8y44JKompZhWAULOKagMiRlcUFGNjTxcRLeA==";

            var jsonObject = new JObject();
            jsonObject["source"] = "AlexaHttpTrigger";
            jsonObject["method"] = "GET";
            jsonObject["request-type"] = "INTENT";
            string intentName = st.Substring(6);
            string deviceId = st.Substring(0, 5).ToLower();
            string requestQuery = "SELECT t.intent, t.response FROM c JOIN t IN c.intents WHERE c.id = '" + deviceId + "' AND t.intent = '" + intentName + "'";
            jsonObject["request-query"] = requestQuery;
            
            try	
            {
                var content = new StringContent(jsonObject.ToString(), Encoding.UTF8, "application/json");
                HttpResponseMessage response = await client.PostAsync(RemoteUrl, content);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                // Above three lines can be replaced with new helper method below
                // string responseBody = await client.GetStringAsync(uri);
                log.LogInformation(responseBody);

                var returnedJson = JObject.Parse(responseBody);
                return returnedJson["response"].ToString();
            }
            catch(HttpRequestException e)
            {
                log.LogInformation("\nException Caught!");	
                log.LogInformation("Message: {0} ",e.Message);
                return "internal error";
            }
        }
    }
}
