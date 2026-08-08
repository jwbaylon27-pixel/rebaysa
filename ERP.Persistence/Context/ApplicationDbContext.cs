using ERP.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Persistence.Context
{    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options){ }

        public DbSet<Producto> Productos => Set<Producto>();
        public DbSet<Marcas> Marcas => Set<Marcas>();
        public DbSet<Categorias> Categorias => Set<Categorias>();
        public DbSet<SocioNegocio> SociosNegocio => Set<SocioNegocio>();
        public DbSet<Compra> Compras => Set<Compra>();
        public DbSet<CompraDetalle> CompraDetalle => Set<CompraDetalle>();
        public DbSet<Venta> Ventas => Set<Venta>();
        public DbSet<VentaDetalle> VentaDetalle => Set<VentaDetalle>();
        public DbSet<PlanCuenta> PlanCuentas { get; set; }
        public DbSet<AsientoContable> AsientosContables { get; set; }
        public DbSet<AsientoDetalle> AsientosContablesDetalle { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Producto>(entity =>
            {
                entity.ToTable("Productos");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Nombre)
                    .HasMaxLength(200)
                    .IsRequired();
                entity.Property(x => x.Codigo)
                    .HasMaxLength(50)
                    .IsRequired();
                entity.Property(x => x.PrecioCompra)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.PrecioVenta)
                    .HasColumnType("decimal(18,2)");
            });

                modelBuilder.Entity<Marcas>(entity =>
                {
                    entity.ToTable("Marcas");
                    entity.HasKey(x => x.Id);
                    entity.Property(x => x.Nombre)
                        .HasMaxLength(200)
                        .IsRequired();
                    entity.Property(x => x.Activo)
                        .HasMaxLength(1)
                        .IsRequired();
                });

                modelBuilder.Entity<Categorias>(entity =>
                {
                    entity.ToTable("Categorias");
                    entity.HasKey(x => x.Id);
                    entity.Property(x => x.Nombre)
                        .HasMaxLength(200)
                        .IsRequired();
                    entity.Property(x => x.Activo)
                        .HasMaxLength(1)
                        .IsRequired();
                });
            modelBuilder.Entity<SocioNegocio>(entity =>
            {
                entity.ToTable("SocioNegocio");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TipoSocio)
                    .HasMaxLength(1)
                    .IsRequired();
                entity.Property(x => x.TipoDocumento)
                    .HasMaxLength(10)
                    .IsRequired();
                entity.Property(x => x.NumeroDocumento)
                    .HasMaxLength(20)
                    .IsRequired();
                entity.Property(x => x.Nombres)
                    .HasMaxLength(150)
                    .IsRequired();
                entity.Property(x => x.Direccion)
                    .HasMaxLength(250);
                entity.Property(x => x.Telefono)
                    .HasMaxLength(20);
                entity.Property(x => x.Email)
                    .HasMaxLength(150);
                entity.Property(x => x.LimiteCredito)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Saldo)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Activo);
                entity.Property(x => x.FechaRegistro);
            });

            modelBuilder.Entity<Compra>(entity =>
            {
                entity.ToTable("Compras");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TipoDocumento)
                    .HasMaxLength(20);
                entity.Property(x => x.Serie)
                    .HasMaxLength(10);
                entity.Property(x => x.NumeroDocumento)
                    .HasMaxLength(20);
                entity.Property(x => x.SubTotal)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.IGV)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Observacion)
                    .HasMaxLength(500);
                entity.Property(x => x.Estado)
                    .HasMaxLength(20);

                /*entity.HasOne(x => x.Proveedor)
                    .WithMany()
                    .HasForeignKey(x => x.ProveedorId)
                    .OnDelete(DeleteBehavior.Restrict);*/
            });

            modelBuilder.Entity<CompraDetalle>(entity =>
            {
                entity.ToTable("CompraDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.PrecioUnitario)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Descuento)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total)
                    .HasColumnType("decimal(18,2)");
                entity.HasOne(x => x.Compra)
                    .WithMany(x => x.Detalles)
                    .HasForeignKey(x => x.CompraId);

                /*entity.HasOne(x => x.Producto)
                    .WithMany()
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);*/
            });

            modelBuilder.Entity<Venta>(entity =>
            {
                entity.ToTable("Ventas");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TipoDocumento)
                    .HasMaxLength(20);
                entity.Property(x => x.Serie)
                    .HasMaxLength(10);
                entity.Property(x => x.NumeroDocumento)
                    .HasMaxLength(20);
                entity.Property(x => x.SubTotal)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.IGV)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.MetodoPago)
                    .HasMaxLength(50);
                entity.Property(x => x.Estado)
                    .HasMaxLength(20);
                entity.Property(x => x.Observacion)
                    .HasMaxLength(500);
                entity.HasOne(x => x.Cliente)
                    .WithMany()
                    .HasForeignKey(x => x.ClienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<VentaDetalle>(entity =>
            {
                entity.ToTable("VentaDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.PrecioUnitario)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Descuento)
                    .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total)
                    .HasColumnType("decimal(18,2)");
                entity.HasOne(x => x.Venta)
                    .WithMany(x => x.Detalles)
                    .HasForeignKey(x => x.VentaId);
                entity.HasOne(x => x.Producto)
                    .WithMany()
                    .HasForeignKey(x => x.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PlanCuenta>()
                .HasOne(x => x.CuentaPadre)
                .WithMany(x => x.SubCuentas)
                .HasForeignKey(x => x.CuentaPadreId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AsientoDetalle>(entity =>
            {
                entity.ToTable("AsientoContableDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Debe)
                      .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Haber)
                      .HasColumnType("decimal(18,2)");
                entity.Property(x => x.Glosa)
                      .HasMaxLength(250);
                entity.HasOne(x => x.AsientoContable)
                      .WithMany(x => x.Detalles)
                      .HasForeignKey(x => x.AsientoId);
                entity.HasOne(x => x.PlanCuenta)
                      .WithMany(x => x.Asientos)
                      .HasForeignKey(x => x.CuentaId);
            });
        }
    }
}
