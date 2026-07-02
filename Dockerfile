# STAGE 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy only the backend project file first and restore dependencies
COPY CleanDataStudio.Server/CleanDataStudio.Server.csproj ./CleanDataStudio.Server/
RUN dotnet restore "./CleanDataStudio.Server/CleanDataStudio.Server.csproj"

# Copy the rest of the backend source files
COPY CleanDataStudio.Server/ ./CleanDataStudio.Server/
WORKDIR "/src/CleanDataStudio.Server"

# Build and publish the release configuration
RUN dotnet publish "CleanDataStudio.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# STAGE 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "CleanDataStudio.Server.dll"]