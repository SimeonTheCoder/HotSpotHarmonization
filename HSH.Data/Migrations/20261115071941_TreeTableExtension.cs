using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSH.Data.Migrations
{
    /// <inheritdoc />
    public partial class TreeTableExtension : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeftChildId",
                table: "Trees",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RightChildId",
                table: "Trees",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeftChildId",
                table: "Trees");

            migrationBuilder.DropColumn(
                name: "RightChildId",
                table: "Trees");
        }
    }
}
