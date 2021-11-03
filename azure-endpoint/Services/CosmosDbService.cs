using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

using Microsoft.Azure.Cosmos;

using JarradPrice.Function.Models;

namespace JarradPrice.Function.Services
{
    public class CosmosDbService : ICosmosDbService
    {
        private Container _container;

        public CosmosDbService(CosmosClient cosmosDbClient, string databaseName, string containerName)
        {
            _container = cosmosDbClient.GetContainer(databaseName, containerName);
        }

        #region Database getters
        // gets document (health device) with matching id
        public async Task<DbServiceResponse> GetHealthDeviceAsync(string id)
        {
            Status status = Status.OK;
            string response = String.Empty;
            List<HealthDevice> returnedDevice = new List<HealthDevice>();
            try
            {
                returnedDevice.Add(await _container.ReadItemAsync<HealthDevice>(id, new PartitionKey(id)));
            }
            catch (Exception exc)
            {
                status = Status.ER;
                response = exc.ToString();
            }

            return new DbServiceResponse(status, response, returnedDevice);
        }
        // runs query and gets matching documents (health devices)
        public async Task<DbServiceResponse> GetHealthDevicesAsync(string queryString)
        {
            Status status = Status.OK;
            string response = String.Empty;
            List<HealthDevice> returnedDevices = new List<HealthDevice>();
            try
            {
                var query = _container.GetItemQueryIterator<HealthDevice>(new QueryDefinition(queryString));

                while (query.HasMoreResults)
                {
                    var healthDevice = await query.ReadNextAsync();
                    returnedDevices.AddRange(healthDevice.ToList());
                }
            }
            catch (Exception exc)
            {
                status = Status.ER;
                response = exc.ToString();
            }

            return new DbServiceResponse(status, response, returnedDevices);
        }
        // runs query and gets matching json (device intents)
        public async Task<DbServiceResponse> GetDeviceIntentsAsync(string queryString)
        {
            Status status = Status.OK;
            string response = String.Empty;
            List<DeviceIntent> returnedIntents = new List<DeviceIntent>();
            try
            {
                var query = _container.GetItemQueryIterator<DeviceIntent>(new QueryDefinition(queryString));
                while (query.HasMoreResults)
                {
                    var deviceIntent = await query.ReadNextAsync();
                    returnedIntents.AddRange(deviceIntent.ToList());
                }
            }
            catch (Exception exc)
            {
                status = Status.ER;
                response = exc.ToString();
            }

            return new DbServiceResponse(status, response, returnedIntents);
        }
        #endregion

        #region Database manipulation
        public async Task AddAsync(HealthDevice item)
        {
            await _container.CreateItemAsync(item, new PartitionKey(item.Id));
        }

        public async Task DeleteAsync(string id)
        {
            await _container.DeleteItemAsync<HealthDevice>(id, new PartitionKey(id));
        }

        public async Task<DbServiceResponse> UpdateAsync(string id, HealthDevice item)
        {
            Status status = Status.OK;
            string response = String.Empty;
            try
            {
                var returnedResponse = await _container.UpsertItemAsync(item, new PartitionKey(id));
                response = returnedResponse.Resource.ToString();
            }
            catch (Exception exc)
            {
                status = Status.ER;
                response = exc.ToString();
            }

            return new DbServiceResponse(status, response);
        }
        #endregion
    }
}