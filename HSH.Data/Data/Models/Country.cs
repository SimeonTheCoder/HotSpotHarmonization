using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    public class Country
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; } // Primary Key: countryId

        [Required, MaxLength(100)]
        public string CountryName { get; set; } = string.Empty;

        [Required, MaxLength(5)]
        [RegularExpression(
            "^[A-Z]{2}$",
            ErrorMessage = "Country code must be ISO 3166-1 alpha-2 format"
        )]
        public string CountryCode { get; set; } = string.Empty;
    }
}
