using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    [Table("quad_tree")]
    public class QuadTree
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }  // Primary Key
        
        [Required, MaxLength(50)]
        public string CellId { get; set; }
        
        [Required]
        public long FireId { get; set; }  // Reference to fire in FireData table

        public string? TreeOrCountryId { get; set; }  // Could store either ID (string for flexibility)
    }
}