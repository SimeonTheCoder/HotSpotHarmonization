using HSH.Core.Services.Contracts;
using HSH.Core.Services.MapService;
using System.Reflection;
using HSH.Core.Interfaces;
using HSH.Core.Services;
using HSH.Data;

var builder = WebApplication.CreateBuilder(args);

// Lets the API run as a Windows service on the server (does nothing when started with dotnet run).
builder.Host.UseWindowsService();

builder.Services.AddSqlServer<AppDbContext>(
    builder.Configuration.GetConnectionString("DefaultConnection"),
    sql => sql.CommandTimeout(120)
);

builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IFireService,FireService >();
builder.Services.AddScoped<ICountryService,CountryService >();
builder.Services.AddScoped<ICountryLookup, CountryLookup>();
builder.Services.AddScoped<IFireBlockLocator, FireBlockLocator>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

builder.Services.AddControllers();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xml)) options.IncludeXmlComments(xml);
});

// Lets the Vite dev server (npm run dev) call the API from another port.
builder.Services.AddCors(options => options.AddPolicy("Client", policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

// Swagger UI at /swagger
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("Client");

// The built website (HSH.Client) lives in wwwroot after dotnet publish.
// index.html must never be cached: after a deploy it points to new /assets/*.js file names.
var staticFiles = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name == "index.html")
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    },
};
app.UseDefaultFiles();
app.UseStaticFiles(staticFiles);

app.MapControllers();

// Unknown /api addresses return 404 instead of the website.
app.MapFallback("/api/{**path}", () => Results.NotFound());

// Page addresses like /statistics are handled by React Router, so they get index.html.
// Paths that look like files (/assets/x.js) are not caught here, so a missing file is a real 404.
app.MapFallbackToFile("index.html", staticFiles);

app.Run();
