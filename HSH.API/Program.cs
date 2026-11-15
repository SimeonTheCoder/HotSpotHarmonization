using HSH.Core.Services.Contracts;
using HSH.Core.Services.MapService;
using HSH.Data;

var builder = WebApplication.CreateBuilder();

builder.Services.AddSqlServer<AppDbContext>(
    builder.Configuration.GetConnectionString("DefaultConnection")
);

builder.Services.AddScoped<IMapService, MapService>();

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();
app.UseRouting();
app.Run();
