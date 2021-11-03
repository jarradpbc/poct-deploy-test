using Newtonsoft.Json;

namespace JarradPrice.Function.Models
{
    public class HealthDevice
    {
        [JsonProperty("id")]
        public string Id { get; set; }
        [JsonProperty("intents")]
        public DeviceIntent[] Intents;

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    public class DeviceIntent
    {
        [JsonProperty("intent")]
        public string Name { get; set; }

        [JsonProperty("response")]
        public string Response { get; set; }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}