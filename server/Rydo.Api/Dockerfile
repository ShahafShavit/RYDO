# API-only image (no SPA). For production-style single host, use the repo-root Dockerfile.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Rydo.Api.csproj .
RUN dotnet restore Rydo.Api.csproj
COPY . .
RUN dotnet publish Rydo.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Rydo.Api.dll"]
