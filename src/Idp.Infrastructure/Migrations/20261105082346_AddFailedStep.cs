using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Idp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFailedStep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FailedStep",
                table: "Services",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FailedStep",
                table: "Services");
        }
    }
}
