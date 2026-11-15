using HSH.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace HSH.Importer;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) => Create(ConnectionString.Resolve(args));

    public static AppDbContext Create(string connectionString) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString, o => o.CommandTimeout(0))
            .Options);
}

public static class ConnectionString
{
    public const string EnvVar = "HSH_CONNECTION";
    private const string Default =
        "Server=.;Database=HSH;Integrated Security=True;TrustServerCertificate=True";

    public const string SecretKey = "ConnectionStrings:DefaultConnection";

    // Order: command-line argument -> HSH_CONNECTION env var -> user secrets (secrets.json) -> local default.
    public static string Resolve(string[] args) =>
        args.FirstOrDefault(a => a.Contains('=')) // anything with '=' looks like a connection string
        ?? Environment.GetEnvironmentVariable(EnvVar)
        ?? new ConfigurationBuilder().AddUserSecrets<DesignTimeDbContextFactory>(optional: true).Build()[SecretKey]
        ?? Default;
}
