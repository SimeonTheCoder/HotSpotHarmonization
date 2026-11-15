using HSH.Data;

var builder = WebApplication.CreateBuilder();

builder.Services.AddSqlServer<AppDbContext>(
    builder.Configuration.GetConnectionString("DefaultConnection")
);

var app = builder.Build();

app.Run();