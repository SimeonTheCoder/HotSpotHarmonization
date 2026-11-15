using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HSH.Data.Models
{
    [Table("quad_tree")]
    public class QuadTree
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; } // Primary Key

        [Required]
        public ushort CellId { get; set; }

        [Required]
        public long FireId { get; set; } // Reference to fire in FireData table

        [ForeignKey(nameof(FireId))]
        public virtual FireData Fire { get; set; } = null!;

        [Required]
        public int TreeId { get; set; } // Could store either ID (string for flexibility)

        [Required]
        public int CountryId {get; set;}
    }
}
