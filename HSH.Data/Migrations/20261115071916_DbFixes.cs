using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSH.Data.Migrations
{
    /// <inheritdoc />
    public partial class DbFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TreeOrCountryId",
                table: "quad_tree");

            migrationBuilder.AlterColumn<int>(
                name: "CellId",
                table: "quad_tree",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<int>(
                name: "CountryId",
                table: "quad_tree",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TreeId",
                table: "quad_tree",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "FK_quad_tree_FireData_FireId",
                table: "quad_tree",
                column: "FireId",
                principalTable: "FireData",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quad_tree_FireData_FireId",
                table: "quad_tree");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "quad_tree");

            migrationBuilder.DropColumn(
                name: "TreeId",
                table: "quad_tree");

            migrationBuilder.AlterColumn<string>(
                name: "CellId",
                table: "quad_tree",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "TreeOrCountryId",
                table: "quad_tree",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
