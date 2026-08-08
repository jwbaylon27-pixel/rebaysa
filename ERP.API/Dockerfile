FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ERP.API/ERP.API.csproj ERP.API/
COPY ERP.Application/ERP.Application.csproj ERP.Application/
COPY ERP.Domain/ERP.Domain.csproj ERP.Domain/
COPY ERP.Infrastructure/ERP.Infrastructure.csproj ERP.Infrastructure/
COPY ERP.Persistence/ERP.Persistence.csproj ERP.Persistence/
COPY ERP.Shared/ERP.Shared.csproj ERP.Shared/
RUN dotnet restore ERP.API/ERP.API.csproj

COPY . .
RUN dotnet publish ERP.API/ERP.API.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000
ENTRYPOINT ["dotnet", "ERP.API.dll"]
