using Microsoft.AspNetCore.Mvc;

namespace ERP.API.Controllers
{
    [ApiController]
    [Route("api/ping-test")]
    public class PingTestController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() => Ok(new { ok = true });
    }
}