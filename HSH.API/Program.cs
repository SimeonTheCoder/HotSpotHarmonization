using System.Reflection;
using HSH.API.Services;
using HSH.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSqlServer<AppDbContext>(
    builder.Configuration.GetConnectionString("DefaultConnection"),
    sql => sql.CommandTimeout(120)
);

builder.Services.AddMemoryCache();
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
app.MapControllers();

app.Run();
