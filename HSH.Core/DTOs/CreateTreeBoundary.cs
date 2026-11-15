using System;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace HSH.Core.DTOs;

public class CreateTreeBoundary
{
    [Required]
    public int TreeId {get;set;}

    [Required]
    public int BoundaryId {get;set;}

    [Required]
    [Range(0.01f,999999f)]
    public float Value {get;set;}
}
