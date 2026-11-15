using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HSH.Data.Enums;
using HSH.Data.Data.Models;

namespace HSH.Data.Models
{
    [Table("FireData")]
    public class FireData
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        public int? TreeId { get; set; }
        public virtual TreeBoundary? Tree { get; set; }

        public int CountryId { get; set; }
        public virtual Country Country { get; set; } = null!;

        [Range(-90, 90)]
        public double Latitude { get; set; }

        [Range(-180, 180)]
        public double Longitude { get; set; }

        // acq_date + acq_time (UTC)
        [Column(TypeName = "datetime2(0)")]
        public DateTime AcquiredAt { get; set; }

        public Satellite Satellite { get; set; }
        public Instrument Instrument { get; set; }

        /// <summary>MODIS only: confidence 0-100 %.</summary>
        public byte? ConfidencePercent { get; set; }

        /// <summary>VIIRS only: low / nominal / high.</summary>
        public ConfidenceLevel? ConfidenceLevel { get; set; }

        /// <summary>MODIS only: "brightness" - channel 21/22 brightness temperature (K).</summary>
        public float? Brightness { get; set; }

        /// <summary>MODIS only: "bright_t31" - channel 31 brightness temperature (K).</summary>
        public float? BrightT31 { get; set; }

        /// <summary>VIIRS only: "bright_ti4" - I-4 channel brightness temperature (K).</summary>
        public float? BrightTi4 { get; set; }

        /// <summary>VIIRS only: "bright_ti5" - I-5 channel brightness temperature (K).</summary>
        public float? BrightTi5 { get; set; }

        public float Scan { get; set; }
        public float Track { get; set; }

        /// <summary>Fire radiative power (MW).</summary>
        public float Frp { get; set; }

        /// <summary>Collection / version, e.g. 6.2, 61.03, 2.</summary>
        public float Version { get; set; }

        public DayNight DayNight { get; set; }

        public FireType Type { get; set; }
    }
}
