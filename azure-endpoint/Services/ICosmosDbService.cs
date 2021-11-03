using System.Threading.Tasks;

using JarradPrice.Function.Models;

namespace JarradPrice.Function.Services
{
    public interface ICosmosDbService
    {
        // Database getters
        Task<DbServiceResponse> GetHealthDeviceAsync(string id);
        Task<DbServiceResponse> GetHealthDevicesAsync(string queryString);
        Task<DbServiceResponse> GetDeviceIntentsAsync(string query);

        // Database manipulation
        Task AddAsync(HealthDevice item);
        Task<DbServiceResponse> UpdateAsync(string id, HealthDevice item);
        Task DeleteAsync(string id);
    }
}