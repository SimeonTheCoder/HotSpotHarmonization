using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    [Table("Data")]
    public class FireData
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }  // Primary Key: fireId
        
        [Required]
        public int TreeId { get; set; }  // Foreign key reference to Trees table
        public virtual TreeBoundary Tree { get; set; } // Navigation property
        
        [Required]
        public int CountryId { get; set; }  // Foreign key reference to Countries table
        public virtual Country Country { get; set; } // Navigation property
        
        [Required]
        [Range(-90, 90)]
        public double Latitude { get; set; }
        
        [Required]
        [Range(-180, 180)]
        public double Longitude { get; set; }
        
        public string Sat { get; set; }  // MODIS, T, A, N20
        
        [Required]
        [Range(typeof(decimal), "0.1", "100")]
        public decimal PixelSize { get; set; }
        
        [Required]
        public float TemperatureK { get; set; }
        
        [Required]
        public int Type { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
    }
}