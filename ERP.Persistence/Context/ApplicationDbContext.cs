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
        public DbSet<PagoVenta> PagosVenta => Set<PagoVenta>();
        public DbSet<NotaCredito> NotasCredito => Set<NotaCredito>();
        public DbSet<NotaCreditoDetalle> NotaCreditoDetalle => Set<NotaCreditoDetalle>();
        
        // 8 DbSet LandedCost
        public DbSet<LiquidacionCosto> LiquidacionesCosto => Set<LiquidacionCosto>();
        public DbSet<LiquidacionCompra> LiquidacionCompras => Set<LiquidacionCompra>();
        public DbSet<LiquidacionCostoDetalle> LiquidacionCostoDetalles => Set<LiquidacionCostoDetalle>();
        public DbSet<LiquidacionDistribucion> LiquidacionDistribuciones => Set<LiquidacionDistribucion>();
        public DbSet<LiquidacionAsiento> LiquidacionAsientos => Set<LiquidacionAsiento>();
        public DbSet<LiquidacionAsientoDetalle> LiquidacionAsientoDetalles => Set<LiquidacionAsientoDetalle>();
        public DbSet<MetodoDistribucion> MetodosDistribucion => Set<MetodoDistribucion>();
        public DbSet<TipoCosto> TiposCosto => Set<TipoCosto>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Producto>(entity =>
            {
                entity.ToTable("Productos");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
                entity.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
                entity.Property(x => x.PrecioCompra).HasColumnType("decimal(18,2)");
                entity.Property(x => x.PrecioVenta).HasColumnType("decimal(18,2)");
            });

                modelBuilder.Entity<Marcas>(entity =>
                {
                    entity.ToTable("Marcas");
                    entity.HasKey(x => x.Id);
                    entity.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
                    entity.Property(x => x.Activo)
                        .HasMaxLength(1)
                        .IsRequired();
                });

                modelBuilder.Entity<Categorias>(entity =>
                {
                    entity.ToTable("Categorias");
                    entity.HasKey(x => x.Id);
                    entity.Property(x => x.Nombre).HasMaxLength(200)
                        .IsRequired();entity.Property(x => x.Activo)
                        .HasMaxLength(1)
                        .IsRequired();
                });
            modelBuilder.Entity<SocioNegocio>(entity =>
            {
                entity.ToTable("SocioNegocio");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TipoSocio).HasMaxLength(1).IsRequired();
                entity.Property(x => x.TipoDocumento).HasMaxLength(10).IsRequired();
                entity.Property(x => x.NumeroDocumento).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Nombres).HasMaxLength(150).IsRequired();
                entity.Property(x => x.Direccion).HasMaxLength(250);
                entity.Property(x => x.Telefono).HasMaxLength(20);
                entity.Property(x => x.Email).HasMaxLength(150);
                entity.Property(x => x.LimiteCredito).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Saldo).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Activo);
                entity.Property(x => x.FechaRegistro);
            });

            modelBuilder.Entity<Compra>(entity =>
            {
                entity.ToTable("Compras");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.TipoDocumento).HasMaxLength(20);
                entity.Property(x => x.Serie).HasMaxLength(10);
                entity.Property(x => x.NumeroDocumento).HasMaxLength(20);
                entity.Property(x => x.SubTotal).HasColumnType("decimal(18,2)");
                entity.Property(x => x.IGV).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Observacion).HasMaxLength(500);
                entity.Property(x => x.Estado).HasMaxLength(20);

                /*entity.HasOne(x => x.Proveedor)
                    .WithMany()
                    .HasForeignKey(x => x.ProveedorId)
                    .OnDelete(DeleteBehavior.Restrict);*/
            });

            modelBuilder.Entity<CompraDetalle>(entity =>
            {
                entity.ToTable("CompraDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.PrecioUnitario).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Descuento).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
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
                entity.Property(x => x.TipoDocumento).HasMaxLength(20);
                entity.Property(x => x.Serie).HasMaxLength(10);
                entity.Property(x => x.NumeroDocumento).HasMaxLength(20);
                entity.Property(x => x.SubTotal).HasColumnType("decimal(18,2)");
                entity.Property(x => x.IGV).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
                entity.Property(x => x.MetodoPago).HasMaxLength(50);
                entity.Property(x => x.Estado).HasMaxLength(20);
                entity.Property(x => x.Observacion).HasMaxLength(500);
                entity.HasOne(x => x.Cliente).WithMany()
                    .HasForeignKey(x => x.ClienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<VentaDetalle>(entity =>
            {
                entity.ToTable("VentaDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.PrecioUnitario).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Descuento).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
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
                entity.Property(x => x.Debe).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Haber).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Glosa).HasMaxLength(250);
                entity.HasOne(x => x.AsientoContable)
                      .WithMany(x => x.Detalles)
                      .HasForeignKey(x => x.AsientoId);
                entity.HasOne(x => x.PlanCuenta)
                      .WithMany(x => x.Asientos)
                      .HasForeignKey(x => x.CuentaId);
            });

            modelBuilder.Entity<PagoVenta>(entity =>
            {
                entity.ToTable("PagosVenta");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Monto).HasColumnType("decimal(18,2)");
                entity.Property(x => x.MetodoPago).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Observacion).HasMaxLength(500);

                entity.HasOne(x => x.Venta)
                      .WithMany()
                      .HasForeignKey(x => x.VentaId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NotaCredito>(entity =>
            {
                entity.ToTable("NotasCredito");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.Serie).HasMaxLength(10).IsRequired();
                entity.Property(x => x.NumeroDocumento).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Motivo).HasMaxLength(500);
                entity.Property(x => x.TipoAfectacion).HasMaxLength(10).IsRequired();
                entity.Property(x => x.SubTotal).HasColumnType("decimal(18,2)");
                entity.Property(x => x.IGV).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Estado).HasMaxLength(20);

                entity.HasOne(x => x.Venta)
                      .WithMany()
                      .HasForeignKey(x => x.VentaId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NotaCreditoDetalle>(entity =>
            {
                entity.ToTable("NotaCreditoDetalle");
                entity.HasKey(x => x.Id);
                entity.Property(x => x.PrecioUnitario).HasColumnType("decimal(18,2)");
                entity.Property(x => x.Total).HasColumnType("decimal(18,2)");

                entity.HasOne(x => x.NotaCredito)
                      .WithMany(x => x.Detalles)
                      .HasForeignKey(x => x.NotaCreditoId);

                entity.HasOne(x => x.Producto)
                      .WithMany()
                      .HasForeignKey(x => x.ProductoId)
                      .OnDelete(DeleteBehavior.Restrict);
            });


            modelBuilder.Entity<MetodoDistribucion>(entity =>
            {
                entity.ToTable("LC_MetodoDistribucion");
                entity.HasKey(x => x.MetodoDistribucionId);
                entity.Property(x => x.Codigo).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
                entity.Property(x => x.Descripcion).HasMaxLength(250);
            });

            modelBuilder.Entity<TipoCosto>(entity =>
            {
                entity.ToTable("LC_TipoCosto");
                entity.HasKey(x => x.TipoCostoId);
                entity.Property(x => x.Codigo).HasMaxLength(30).IsRequired();
                entity.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
                entity.Property(x => x.Descripcion).HasMaxLength(250);

                entity.HasOne(x => x.MetodoDistribucion)
                      .WithMany()
                      .HasForeignKey(x => x.MetodoDistribucionId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<LiquidacionCosto>(entity =>
            {
                entity.ToTable("LC_LiquidacionCosto");
                entity.HasKey(x => x.LiquidacionCostoId);
                entity.Property(x => x.Numero).HasMaxLength(30).IsRequired();
                entity.Property(x => x.MonedaCodigo).HasMaxLength(3).IsRequired();
                entity.Property(x => x.Estado).HasMaxLength(20).IsRequired();
                entity.Property(x => x.Observacion).HasMaxLength(500);
                entity.Property(x => x.TipoCambio).HasColumnType("decimal(18,6)");
                entity.Property(x => x.TotalMercaderia).HasColumnType("decimal(19,6)");
                entity.Property(x => x.TotalCostos).HasColumnType("decimal(19,6)");
                entity.Property(x => x.TotalLiquidacion).HasColumnType("decimal(19,6)");
            });

            modelBuilder.Entity<LiquidacionCompra>(entity =>
            {
                entity.ToTable("LC_LiquidacionCompra");
                entity.HasKey(x => x.LiquidacionCompraId);
                entity.Property(x => x.TotalCompra).HasColumnType("decimal(19,6)");

                entity.HasOne(x => x.LiquidacionCosto)
                      .WithMany(x => x.Compras)
                      .HasForeignKey(x => x.LiquidacionCostoId);

                entity.HasOne(x => x.Compra)
                      .WithMany()
                      .HasForeignKey(x => x.CompraId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<LiquidacionCostoDetalle>(entity =>
            {
                entity.ToTable("LC_LiquidacionCostoDetalle");
                entity.HasKey(x => x.LiquidacionCostoDetalleId);
                entity.Property(x => x.TipoDocumento).HasMaxLength(10);
                entity.Property(x => x.Serie).HasMaxLength(10);
                entity.Property(x => x.NumeroDocumento).HasMaxLength(30);
                entity.Property(x => x.MonedaCodigo).HasMaxLength(3).IsRequired();
                entity.Property(x => x.Observacion).HasMaxLength(300);
                entity.Property(x => x.Importe).HasColumnType("decimal(19,6)");
                entity.Property(x => x.TipoCambio).HasColumnType("decimal(18,6)");
                entity.Property(x => x.ImporteBase).HasColumnType("decimal(19,6)");

                entity.HasOne(x => x.LiquidacionCosto)
                      .WithMany(x => x.Costos)
                      .HasForeignKey(x => x.LiquidacionCostoId);

                entity.HasOne(x => x.TipoCosto)
                      .WithMany()
                      .HasForeignKey(x => x.TipoCostoId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.MetodoDistribucion)
                      .WithMany()
                      .HasForeignKey(x => x.MetodoDistribucionId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<LiquidacionDistribucion>(entity =>
            {
                entity.ToTable("LC_LiquidacionDistribucion");
                entity.HasKey(x => x.LiquidacionDistribucionId);
                entity.Property(x => x.Cantidad).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CostoCompraUnitario).HasColumnType("decimal(19,6)");
                entity.Property(x => x.ValorCompra).HasColumnType("decimal(19,6)");
                entity.Property(x => x.Peso).HasColumnType("decimal(19,6)");
                entity.Property(x => x.Volumen).HasColumnType("decimal(19,6)");
                entity.Property(x => x.BaseDistribucion).HasColumnType("decimal(19,6)");
                entity.Property(x => x.PorcentajeDistribucion).HasColumnType("decimal(19,10)");
                entity.Property(x => x.CostoAsignado).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CostoUnitarioAdicional).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CostoUnitarioFinal).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CantidadStockActual).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CostoInventarioAjustado).HasColumnType("decimal(19,6)");
                entity.Property(x => x.CostoVentaAjustado).HasColumnType("decimal(19,6)");

                entity.HasOne(x => x.LiquidacionCosto)
                      .WithMany(x => x.Distribuciones)
                      .HasForeignKey(x => x.LiquidacionCostoId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(x => x.LiquidacionCostoDetalle)
                      .WithMany(x => x.Distribuciones)
                      .HasForeignKey(x => x.LiquidacionCostoDetalleId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<LiquidacionAsiento>(entity =>
            {
                entity.ToTable("LC_LiquidacionAsiento");
                entity.HasKey(x => x.AsientoId);
                entity.Property(x => x.NumeroAsiento).HasMaxLength(30).IsRequired();
                entity.Property(x => x.Glosa).HasMaxLength(300);
                entity.Property(x => x.Estado).HasMaxLength(20).IsRequired();
                entity.Property(x => x.TotalDebe).HasColumnType("decimal(19,6)");
                entity.Property(x => x.TotalHaber).HasColumnType("decimal(19,6)");
            });

            modelBuilder.Entity<LiquidacionAsientoDetalle>(entity =>
            {
                entity.ToTable("LC_LiquidacionAsientoDetalle");
                entity.HasKey(x => x.AsientoDetalleId);
                entity.Property(x => x.Descripcion).HasMaxLength(250);
                entity.Property(x => x.Debe).HasColumnType("decimal(19,6)");
                entity.Property(x => x.Haber).HasColumnType("decimal(19,6)");

                entity.HasOne(x => x.Asiento)
                      .WithMany(x => x.Detalles)
                      .HasForeignKey(x => x.AsientoId);

                entity.HasOne(x => x.CuentaContable)
                      .WithMany()
                      .HasForeignKey(x => x.CuentaContableId)
                      .OnDelete(DeleteBehavior.Restrict);
            });


        }
    }
}
