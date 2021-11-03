using System.Collections.Generic;

namespace JarradPrice.Function.Models
{
    public enum Status
    {
        OK,
        ER
    }
    // used for providing a status, response and payload
    // return for database tasks
    public class DbServiceResponse
    {
        public Status Status { get; set; }
        public string Response { get; set; }

        public IEnumerable<HealthDevice> HealthDevicePayload { get; set; }
        public IEnumerable<DeviceIntent> DeviceIntentPayload { get; set; }

        public DbServiceResponse(Status _status, string _response)
        {
            Status = _status;
            Response = _response;
        }

        public DbServiceResponse(Status _status, string _response, IEnumerable<HealthDevice> _healthDevicePayload)
        {
            Status = _status;
            Response = _response;
            HealthDevicePayload = _healthDevicePayload;
        }

        public DbServiceResponse(Status _status, string _response, IEnumerable<DeviceIntent> _deviceIntentPayload)
        {
            Status = _status;
            Response = _response;
            DeviceIntentPayload = _deviceIntentPayload;
        }
    }
}
