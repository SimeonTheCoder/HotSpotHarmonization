using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HSH.Data.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace HSH.Data.Models
{
    public class QuadTree
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; } // Primary Key

        [Required]
        public ushort CellId { get; set; }

        public long? FireId { get; set; } // Reference to fire in FireData table

        [ForeignKey(nameof(FireId))]
        public virtual FireData Fire { get; set; } = null!;

        [Required]
        public int TreeId { get; set; }

        [Required]
        public int CountryId { get; set; }

        [ForeignKey(nameof(CountryId))]
        public virtual Country Country { get; set; } = null!;
    }
}
