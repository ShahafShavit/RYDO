# Full-stack image: Vite client -> wwwroot + ASP.NET Core API (same origin, /api/* for REST).
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_MODE=real
ENV VITE_API_BASE_URL=
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS api-build
WORKDIR /src
COPY server/Rydo.Api/Rydo.Api.csproj server/Rydo.Api/
RUN dotnet restore server/Rydo.Api/Rydo.Api.csproj
COPY server/Rydo.Api/ ./server/Rydo.Api/
COPY --from=client-build /app/client/dist ./server/Rydo.Api/wwwroot
RUN dotnet publish server/Rydo.Api/Rydo.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Rydo.Api.dll"]
