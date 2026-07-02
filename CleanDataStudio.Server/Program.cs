using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("https://localhost:64965", "http://localhost:64965", "http://localhost:5173", "http://localhost:3000") // Add your React URL ports here [cite: 1]
            .AllowAnyMethod()
            .AllowAnyHeader());
});

var app = builder.Build();

// ==============================================================
// 3. Configure the HTTP Request Pipeline (Middleware Stage)
// ==============================================================

// 1. Core security must happen first!
// FIX: Only enforce HTTPS redirection locally. Render handles SSL/HTTPS termination 
// at its load balancer, forwarding standard HTTP (port 8080) to your container.
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// 2. CORS must be handled early before routing or authentication happens
app.UseCors("AllowReactApp");

app.UseDefaultFiles();
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 3. Enable standard routing rules
app.UseRouting();
app.UseAuthorization();

// 4. Map your DataController API routes explicitly!
app.MapControllers();

// 5. CRITICAL: The frontend fallback MUST be the absolute last line.
// This tells C#: "Only redirect to index.html if the URL doesn't match an API controller!"
app.MapFallbackToFile("/index.html");

// 4. Run the Application
app.Run();