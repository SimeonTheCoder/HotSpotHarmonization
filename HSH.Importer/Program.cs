// Each file is imported in its own transaction and recorded in dbo.ImportedFiles,
// so the import can be stopped and re-run; finished files are skipped.

//To run:
//dotnet ef database update --project HSH.Data --startup-project HSH.Importer   # optional: the importer also applies migrations itself
//dotnet run --project HSH.Importer -c Release -- NASAData "Server=localhost,1433;Database=HSH;User Id=sa;Password=...;TrustServerCertificate=True"

using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;
using HSH.Data.Enums;
using HSH.Data.Models;
using HSH.Importer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HSH.Data.Data.Models;

var positional = args.Where(a => !a.StartsWith("--")).ToArray();
bool validateOnly = args.Contains("--validate");
bool treeMode = args.Contains("--trees");

if (positional.Length == 0 || !Directory.Exists(positional[0]))
{
    Console.Error.WriteLine(
        "Usage: HSH.Importer <NASADataFolder> [\"<connection string>\"] [--validate]"
    );
    return 1;
}

async Task TreeMode(string folder)
{
    // 1. Discover files and resolve the country from each file name
    var fileNameRegex = new Regex(@"(?<country>.+)\.csv$", RegexOptions.IgnoreCase);
    var files = new List<(string FullPath, string RelativePath, string CountryKey)>();
    var unknownCountries = new SortedSet<string>();

    foreach (
        var path in Directory.EnumerateFiles(folder, "*.csv", SearchOption.AllDirectories).Order()
    )
    {
        var m = fileNameRegex.Match(Path.GetFileName(path));
        if (!m.Success)
        {
            Console.Error.WriteLine($"Skipping file with unexpected name: {path}");
            continue;
        }
        string country = m.Groups["country"].Value;
        if (!CountryCodes.ByFileName.ContainsKey(country))
            unknownCountries.Add(country);
        else
            files.Add((path, Path.GetRelativePath(folder, path), country));
    }

    if (unknownCountries.Count > 0)
    {
        Console.Error.WriteLine(
            "No hardcoded country code for: " + string.Join(", ", unknownCountries)
        );
        Console.Error.WriteLine("Add them to CountryCodes.cs and re-run.");
        // throw new Exception();
    }

    Console.WriteLine($"Found {files.Count:N0} CSV files.");

    // 2. Schema (EF migrations), countries, bookkeeping table
    string connectionString = ConnectionString.Resolve(positional.Skip(1).ToArray());

    Dictionary<string, int> countryIds;
    await using (var db = DesignTimeDbContextFactory.Create(connectionString))
    {
        Console.WriteLine("Applying migrations...");
        await db.Database.MigrateAsync();

        await db.Database.ExecuteSqlRawAsync(
            """
            IF OBJECT_ID(N'dbo.ImportedFiles') IS NULL
            CREATE TABLE dbo.ImportedFiles (
                FilePath   nvarchar(400) NOT NULL PRIMARY KEY,
                [Rows]     bigint        NOT NULL,
                ImportedAt datetime2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
            );
            """
        );

        var existing = await db.Countries.ToDictionaryAsync(
            c => c.CountryName,
            StringComparer.OrdinalIgnoreCase
        );
        foreach (
            var key in files.Select(f => f.CountryKey).Distinct(StringComparer.OrdinalIgnoreCase)
        )
        {
            string name = CountryCodes.ToDisplayName(key);
            if (!existing.ContainsKey(name))
            {
                var c = new Country
                {
                    CountryName = name,
                    CountryCode = CountryCodes.ByFileName[key],
                };
                db.Countries.Add(c);
                existing[name] = c;
            }
        }
        await db.SaveChangesAsync();

        countryIds = files
            .Select(f => f.CountryKey)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                k => k,
                k => existing[CountryCodes.ToDisplayName(k)].Id,
                StringComparer.OrdinalIgnoreCase
            );

        foreach (var file in files)
        {
            int countryId = countryIds[file.CountryKey];
            Console.WriteLine($"Now processing {file.CountryKey}");

            if (db.TreeBoundaries.Count(t => t.TreeId == countryId) != 0)
            {
                Console.WriteLine($"BSP Tree for {file.CountryKey} already exists; skipping");
            }
            else
            {
                string[] lines = File.ReadAllLines(file.FullPath);

                for (int i = 0; i < lines.Length; i++)
                {
                    string[] tokens = lines[i].Split(",");

                    int id = i;
                    float boundary = float.Parse(tokens[0]);
                    int leftId = int.Parse(tokens[1]);
                    int rightId = int.Parse(tokens[2]);

                    await db.AddAsync(
                        new TreeBoundary()
                        {
                            TreeId = countryId,
                            BoundaryId = id,
                            Value = boundary,
                            LeftChildId = leftId,
                            RightChildId = rightId,
                        }
                    );
                }

                await db.SaveChangesAsync();
                Console.WriteLine("Done!");
            }

            FireData[] dbFireData = await db
                .FireData.Where(fd => fd.CountryId == countryId)
                .ToArrayAsync();

            TreeBoundary[] boundaries = await db
                .TreeBoundaries.Where(b => b.TreeId == countryId)
                .ToArrayAsync();

            boundaries.Sort((a, b) => a.BoundaryId.CompareTo(b.BoundaryId));

            for (int i = 0; i < dbFireData.Length; i++)
            {
                var fire = dbFireData[i];

                int pointer = 0;
                ushort result = 0;

                for (int depth = 0; depth < 16; depth++)
                {
                    result *= 2;

                    TreeBoundary currBoundary = boundaries[pointer];

                    if (
                        (depth % 2 == 0 && fire.Longitude >= currBoundary.Value)
                        || (depth % 2 == 1 && fire.Latitude >= currBoundary.Value)
                    )
                    {
                        result += 1;
                        pointer = currBoundary.RightChildId;
                    }
                    else
                    {
                        pointer = currBoundary.LeftChildId;
                    }

                    if (pointer == -1)
                    {
                        break;
                    }
                }

                await db.QuadTrees.AddAsync(
                    new()
                    {
                        CellId = result,
                        Fire = fire,
                        TreeId = countryId,
                        Country = fire.Country,
                    }
                );
            }

            System.Console.WriteLine(countryId);
            await db.SaveChangesAsync();
            Console.WriteLine("Cell Ids - Done!");
        }

        await db.FireData.ForEachAsync(
            (fire) =>
            {
                if (fire.TreeId == null)
                    fire.TreeId = fire.CountryId;
            }
        );

        await db.SaveChangesAsync();

        await db.SaveChangesAsync();
    }
}

if (treeMode)
{
    string folder = Path.GetFullPath(positional[0]);
    await TreeMode(folder);
    return 0;
}

string dataRoot = Path.GetFullPath(positional[0]);

// 1. Discover files and resolve the country from each file name
var fileNameRegex = new Regex(
    @"^(?<source>.+?)_(?<year>\d{4})_(?<country>.+)\.csv$",
    RegexOptions.IgnoreCase
);
var files = new List<(string FullPath, string RelativePath, string CountryKey)>();
var unknownCountries = new SortedSet<string>();

foreach (
    var path in Directory.EnumerateFiles(dataRoot, "*.csv", SearchOption.AllDirectories).Order()
)
{
    var m = fileNameRegex.Match(Path.GetFileName(path));
    if (!m.Success)
    {
        Console.Error.WriteLine($"Skipping file with unexpected name: {path}");
        continue;
    }
    string country = m.Groups["country"].Value;
    if (!CountryCodes.ByFileName.ContainsKey(country))
        unknownCountries.Add(country);
    files.Add((path, Path.GetRelativePath(dataRoot, path), country));
}

if (unknownCountries.Count > 0)
{
    Console.Error.WriteLine(
        "No hardcoded country code for: " + string.Join(", ", unknownCountries)
    );
    Console.Error.WriteLine("Add them to CountryCodes.cs and re-run.");
    return 1;
}
Console.WriteLine($"Found {files.Count:N0} CSV files.");

if (validateOnly)
{
    long total = 0;
    var table = FireRowParser.CreateTable();
    foreach (var f in files)
    {
        total += FireRowParser.ParseFile(
            f.FullPath,
            countryId: 0,
            table,
            batchSize: 200_000,
            _ => table.Clear()
        );
    }
    Console.WriteLine($"Validation OK: {total:N0} rows parsed.");
    return 0;
}

// 2. Schema (EF migrations), countries, bookkeeping table
string connectionString = ConnectionString.Resolve(positional.Skip(1).ToArray());

Dictionary<string, int> countryIds;
await using (var db = DesignTimeDbContextFactory.Create(connectionString))
{
    Console.WriteLine("Applying migrations...");
    await db.Database.MigrateAsync();

    await db.Database.ExecuteSqlRawAsync(
        """
        IF OBJECT_ID(N'dbo.ImportedFiles') IS NULL
        CREATE TABLE dbo.ImportedFiles (
            FilePath   nvarchar(400) NOT NULL PRIMARY KEY,
            [Rows]     bigint        NOT NULL,
            ImportedAt datetime2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
        );
        """
    );

    var existing = await db.Countries.ToDictionaryAsync(
        c => c.CountryName,
        StringComparer.OrdinalIgnoreCase
    );
    foreach (var key in files.Select(f => f.CountryKey).Distinct(StringComparer.OrdinalIgnoreCase))
    {
        string name = CountryCodes.ToDisplayName(key);
        if (!existing.ContainsKey(name))
        {
            var c = new Country { CountryName = name, CountryCode = CountryCodes.ByFileName[key] };
            db.Countries.Add(c);
            existing[name] = c;
        }
    }
    await db.SaveChangesAsync();

    countryIds = files
        .Select(f => f.CountryKey)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToDictionary(
            k => k,
            k => existing[CountryCodes.ToDisplayName(k)].Id,
            StringComparer.OrdinalIgnoreCase
        );
}

// 3. Bulk import, one transaction per file
await using var conn = new SqlConnection(connectionString);
await conn.OpenAsync();

var alreadyImported = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
await using (var cmd = new SqlCommand("SELECT FilePath FROM dbo.ImportedFiles", conn))
await using (var reader = await cmd.ExecuteReaderAsync())
    while (await reader.ReadAsync())
        alreadyImported.Add(reader.GetString(0));

var pending = files.Where(f => !alreadyImported.Contains(f.RelativePath)).ToList();
Console.WriteLine($"{alreadyImported.Count:N0} files already imported, {pending.Count:N0} to go.");

var buffer = FireRowParser.CreateTable();
var totalWatch = Stopwatch.StartNew();
long grandTotal = 0;

for (int i = 0; i < pending.Count; i++)
{
    var f = pending[i];
    var watch = Stopwatch.StartNew();

    await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();
    using var bulk = new SqlBulkCopy(
        conn,
        SqlBulkCopyOptions.TableLock | SqlBulkCopyOptions.CheckConstraints,
        tx
    )
    {
        DestinationTableName = "dbo.FireData",
        BulkCopyTimeout = 0,
    };
    foreach (DataColumn col in buffer.Columns)
        bulk.ColumnMappings.Add(col.ColumnName, col.ColumnName);

    long rows = FireRowParser.ParseFile(
        f.FullPath,
        countryIds[f.CountryKey],
        buffer,
        batchSize: 100_000,
        table =>
        {
            bulk.WriteToServer(table);
            table.Clear();
        }
    );

    await using (
        var mark = new SqlCommand(
            "INSERT INTO dbo.ImportedFiles (FilePath, [Rows]) VALUES (@p, @r)",
            conn,
            tx
        )
    )
    {
        mark.Parameters.AddWithValue("@p", f.RelativePath);
        mark.Parameters.AddWithValue("@r", rows);
        await mark.ExecuteNonQueryAsync();
    }
    await tx.CommitAsync();

    grandTotal += rows;
    Console.WriteLine(
        $"[{i + 1}/{pending.Count}] {f.RelativePath}: {rows:N0} rows in {watch.Elapsed.TotalSeconds:N1}s "
            + $"(total {grandTotal:N0}, {grandTotal / Math.Max(1, totalWatch.Elapsed.TotalSeconds):N0} rows/s)"
    );
}

Console.WriteLine($"Done. Imported {grandTotal:N0} rows in {totalWatch.Elapsed}.");
return 0;

// ==========================================================================================

static class FireRowParser
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static DataTable CreateTable()
    {
        var t = new DataTable();
        void Add(string name, Type type) => t.Columns.Add(name, type);
        Add(nameof(FireData.CountryId), typeof(int));
        Add(nameof(FireData.Latitude), typeof(double));
        Add(nameof(FireData.Longitude), typeof(double));
        Add(nameof(FireData.AcquiredAt), typeof(DateTime));
        Add(nameof(FireData.Satellite), typeof(byte));
        Add(nameof(FireData.Instrument), typeof(byte));
        Add(nameof(FireData.ConfidencePercent), typeof(byte));
        Add(nameof(FireData.ConfidenceLevel), typeof(byte));
        Add(nameof(FireData.Brightness), typeof(float));
        Add(nameof(FireData.BrightT31), typeof(float));
        Add(nameof(FireData.BrightTi4), typeof(float));
        Add(nameof(FireData.BrightTi5), typeof(float));
        Add(nameof(FireData.Scan), typeof(float));
        Add(nameof(FireData.Track), typeof(float));
        Add(nameof(FireData.Frp), typeof(float));
        Add(nameof(FireData.Version), typeof(float));
        Add(nameof(FireData.DayNight), typeof(byte));
        Add(nameof(FireData.Type), typeof(byte));
        return t;
    }

    /// <summary>Streams a CSV into <paramref name="table"/>, calling <paramref name="flush"/> every batch.</summary>
    public static long ParseFile(
        string path,
        int countryId,
        DataTable table,
        int batchSize,
        Action<DataTable> flush
    )
    {
        using var reader = new StreamReader(path, System.Text.Encoding.UTF8, true, 1 << 20);
        string? header = reader.ReadLine();
        if (header is null)
            return 0;

        // The first line names the columns; look them up by name so MODIS and VIIRS layouts both work.
        var idx = header
            .Trim()
            .Split(',')
            .Select((name, i) => (name: name.Trim().ToLowerInvariant(), i))
            .ToDictionary(x => x.name, x => x.i);

        int Req(string n) =>
            idx.TryGetValue(n, out var i)
                ? i
                : throw new InvalidDataException($"{path}: missing column '{n}'");
        int Opt(string n) => idx.TryGetValue(n, out var i) ? i : -1;

        int cLat = Req("latitude"),
            cLon = Req("longitude"),
            cScan = Req("scan"),
            cTrack = Req("track"),
            cDate = Req("acq_date"),
            cTime = Req("acq_time"),
            cSat = Req("satellite"),
            cInst = Req("instrument"),
            cConf = Req("confidence"),
            cVer = Req("version"),
            cFrp = Req("frp"),
            cDn = Req("daynight"),
            cType = Req("type");
        int cBright = Opt("brightness"),
            cT31 = Opt("bright_t31"),
            cTi4 = Opt("bright_ti4"),
            cTi5 = Opt("bright_ti5");

        long count = 0;
        int lineNo = 1;
        string? line;
        var values = new object[table.Columns.Count];

        while ((line = reader.ReadLine()) != null)
        {
            lineNo++;
            if (line.Length == 0)
                continue;
            var p = line.Split(',');
            try
            {
                values[0] = countryId;
                values[1] = double.Parse(p[cLat], Inv);
                values[2] = double.Parse(p[cLon], Inv);
                values[3] = ParseDateTime(p[cDate], p[cTime]);
                values[4] = (byte)ParseSatellite(p[cSat]);
                values[5] = (byte)ParseInstrument(p[cInst]);

                // MODIS confidence is 0-100, VIIRS is l/n/h.
                string conf = p[cConf].Trim();
                if (byte.TryParse(conf, NumberStyles.Integer, Inv, out byte pct))
                {
                    values[6] = pct;
                    values[7] = DBNull.Value;
                }
                else
                {
                    values[6] = DBNull.Value;
                    values[7] = (byte)ParseConfidenceLevel(conf);
                }

                values[8] = OptFloat(p, cBright);
                values[9] = OptFloat(p, cT31);
                values[10] = OptFloat(p, cTi4);
                values[11] = OptFloat(p, cTi5);
                values[12] = float.Parse(p[cScan], Inv);
                values[13] = float.Parse(p[cTrack], Inv);
                values[14] = float.Parse(p[cFrp], Inv);
                values[15] = float.Parse(p[cVer], Inv);
                values[16] = (byte)ParseDayNight(p[cDn]);
                values[17] = (byte)ParseFireType(p[cType]);
            }
            catch (Exception ex)
                when (ex is FormatException or IndexOutOfRangeException or OverflowException)
            {
                throw new InvalidDataException($"{path}:{lineNo}: {ex.Message} -> \"{line}\"", ex);
            }

            table.Rows.Add(values);
            count++;
            if (table.Rows.Count >= batchSize)
                flush(table);
        }

        if (table.Rows.Count > 0)
            flush(table);
        return count;
    }

    private static object OptFloat(string[] p, int i) =>
        i < 0 || string.IsNullOrWhiteSpace(p[i]) ? DBNull.Value : float.Parse(p[i], Inv);

    private static DateTime ParseDateTime(string date, string time)
    {
        var d = DateTime.ParseExact(date.Trim(), "yyyy-MM-dd", Inv);
        int hhmm = int.Parse(time, Inv); // "0953" or "953"
        return d.AddHours(hhmm / 100).AddMinutes(hhmm % 100);
    }

    private static Satellite ParseSatellite(string s) =>
        s.Trim() switch
        {
            "Terra" or "T" => Satellite.Terra,
            "Aqua" or "A" => Satellite.Aqua,
            "N" or "1" => Satellite.SuomiNpp,
            "N20" => Satellite.Noaa20,
            "N21" => Satellite.Noaa21,
            _ => throw new FormatException($"Unknown satellite '{s}'"),
        };

    private static Instrument ParseInstrument(string s) =>
        s.Trim().ToUpperInvariant() switch
        {
            "MODIS" => Instrument.Modis,
            "VIIRS" => Instrument.Viirs,
            _ => throw new FormatException($"Unknown instrument '{s}'"),
        };

    private static ConfidenceLevel ParseConfidenceLevel(string s) =>
        s.ToLowerInvariant() switch
        {
            "l" or "low" => ConfidenceLevel.Low,
            "n" or "nominal" => ConfidenceLevel.Nominal,
            "h" or "high" => ConfidenceLevel.High,
            _ => throw new FormatException($"Unknown confidence '{s}'"),
        };

    private static DayNight ParseDayNight(string s) =>
        s.Trim().ToUpperInvariant() switch
        {
            "D" => DayNight.Day,
            "N" => DayNight.Night,
            _ => throw new FormatException($"Unknown daynight '{s}'"),
        };

    private static FireType ParseFireType(string s) =>
        byte.TryParse(s, NumberStyles.Integer, Inv, out byte b) && Enum.IsDefined((FireType)b)
            ? (FireType)b
            : throw new FormatException($"Unknown type '{s}'");
}
