# STAGE 1: Build the application using the full .NET SDK
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the solution and project files first to restore dependencies (leverages Docker caching)
COPY *.sln ./
COPY CleanDataStudio.Server/*.csproj ./CleanDataStudio.Server/
RUN dotnet restore

# Copy the remaining source code and publish the build artifacts
COPY . .
WORKDIR /src/CleanDataStudio.Server
RUN dotnet publish -c Release -o /app/publish

# STAGE 2: Create the lightweight runtime container
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy the compiled files from the build stage
COPY --from=build /app/publish .

# Expose the standard port used by ASP.NET Core containers
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Define the command to start your API server
ENTRYPOINT ["dotnet", "CleanDataStudio.Server.dll"]