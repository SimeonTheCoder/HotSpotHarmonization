using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    [Table("Trees")]
    public class TreeBoundary
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int TreeId { get; set; }

        [Required]
        public int BoundaryId { get; set; }

        [Required]
        public int LeftChildId { get; set; } = -1;

        [Required]
        public int RightChildId { get; set; } = -1;

        [Required]
        public float Value { get; set; }
    }
}
