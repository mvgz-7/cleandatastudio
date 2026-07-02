# STAGE 1: Build Frontend (React)
FROM node:20 AS frontend-build
WORKDIR /client
COPY cleandatastudio.client/package*.json ./
RUN npm install
COPY cleandatastudio.client/ ./
RUN npm run build

# STAGE 2: Build Backend (.NET)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

# Copy only backend project and restore dependencies
COPY CleanDataStudio.Server/CleanDataStudio.Server.csproj ./CleanDataStudio.Server/
RUN dotnet restore "./CleanDataStudio.Server/CleanDataStudio.Server.csproj"

# Copy the rest of the backend files
COPY CleanDataStudio.Server/ ./CleanDataStudio.Server/
WORKDIR "/src/CleanDataStudio.Server"

# Build and publish backend
RUN dotnet publish "CleanDataStudio.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# STAGE 3: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Copy published .NET API binaries
COPY --from=backend-build /app/publish .

# Copy compiled React static assets into the .NET wwwroot directory
COPY --from=frontend-build /client/dist ./wwwroot

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "CleanDataStudio.Server.dll"]