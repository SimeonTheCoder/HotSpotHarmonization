using System;
using System.Linq;
using HSH.Data.Models;
using HSH.Data.Data.Models;
using HSH.Data.Enums;

namespace HSH.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            // Ensure the database is created
            context.Database.EnsureCreated();

            // Look for any existing fire data
            if (context.FireData.Any())
            {
                return;   // Database has been seeded already
            }

            // 1. Seed a Country
            var france = new Country
            {
                CountryName = "France"
            };
            context.Countries.Add(france);
            context.SaveChanges(); // Save to generate Country.Id

            // 2. Seed Example Fire Data (including hot fires for testing your new endpoint)
            var sampleFires = new FireData[]
            {
                new FireData
                {
                    CountryId = france.Id,
                    Latitude = 45.123,
                    Longitude = 5.456,
                    Brightness = 350.5f, // Hot fire
                    AcquiredAt = DateTime.UtcNow.AddDays(-2),
                    Satellite = Satellite.Terra, 
                    Type = FireType.PresumedVegetationFire   // Fixed enum name
                },
                new FireData
                {
                    CountryId = france.Id,
                    Latitude = 46.789,
                    Longitude = 2.123,
                    Brightness = 410.2f, // Hottest fire
                    AcquiredAt = DateTime.UtcNow.AddDays(-1),
                    Satellite = Satellite.Aqua,
                    Type = FireType.PresumedVegetationFire   // Fixed enum name
                },
                new FireData
                {
                    CountryId = france.Id,
                    Latitude = 44.555,
                    Longitude = 4.333,
                    Brightness = 295.0f, // Cooler fire
                    AcquiredAt = DateTime.UtcNow,
                    Satellite = Satellite.Terra,
                    Type = FireType.OtherStaticLandSource // Fixed enum name
                }
            };

            context.FireData.AddRange(sampleFires);
            context.SaveChanges();
        }
    }
}