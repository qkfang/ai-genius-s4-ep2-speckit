using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "AI Genius API",
        Version = "v1",
        Description = "REST API for Microsoft AI Genius Season 4 — SpecKit episode."
    });
});

var app = builder.Build();

app.UseCors();
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "AI Genius API v1");
    options.RoutePrefix = "swagger";
});

// GET /health — minimal liveness probe for deploy workflow smoke test
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// GET /api/status — runtime status
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "running",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow.ToString("o"),
    speckit = new { enabled = true, version = "1.0.0" }
}))
.WithName("GetStatus")
.WithSummary("Runtime status")
.WithDescription("Returns the current runtime status of the API.")
.WithTags("System");

// GET /api/health — health check
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    uptime = Environment.TickCount64 / 1000.0,
    timestamp = DateTime.UtcNow.ToString("o")
}))
.WithName("GetHealth")
.WithSummary("Health check")
.WithDescription("Returns health status and uptime.")
.WithTags("System");

// Load Season 4 episodes from JSON file
var episodesJsonPath = Path.Combine(app.Environment.ContentRootPath, "episodes.json");
var episodesJson = File.ReadAllText(episodesJsonPath);
var season4Episodes = JsonSerializer.Deserialize<JsonElement[]>(episodesJson)!;

// GET /api/series — AI Genius Season 4 series info
app.MapGet("/api/series", () => Results.Ok(new
{
    name = "Microsoft AI Genius",
    season = 4,
    seriesId = "s-1453",
    url = "https://developer.microsoft.com/en-us/reactor/series/s-1453/",
    description = "Season 4 of Microsoft AI Genius — hands-on sessions on agentic AI, DevOps automation, and developer experience upgrades.",
    topics = season4Episodes.Select(e => new
    {
        episode = e.GetProperty("episode").GetInt32(),
        title = e.GetProperty("title").GetString(),
        presenter = e.GetProperty("presenter").GetString(),
        status = e.GetProperty("status").GetString()
    })
}))
.WithName("GetSeries")
.WithSummary("Series information")
.WithDescription("Returns information about the Microsoft AI Genius Season 4 series.")
.WithTags("Content");

// GET /api/episodes — all Season 4 episodes
app.MapGet("/api/episodes", () => Results.Ok(new
{
    season = 4,
    name = "Microsoft AI Genius — Season 4",
    episodes = season4Episodes
}))
.WithName("GetEpisodes")
.WithSummary("All Season 4 episodes")
.WithDescription("Returns all episodes for Microsoft AI Genius Season 4.")
.WithTags("Content");

// GET /api/episodes/{id} — single Season 4 episode by number
app.MapGet("/api/episodes/{id:int}", (int id) =>
{
    var episode = season4Episodes.FirstOrDefault(e => e.GetProperty("episode").GetInt32() == id);
    return episode.ValueKind != JsonValueKind.Undefined
        ? Results.Ok(episode)
        : Results.NotFound(new { error = $"Episode {id} not found" });
})
.WithName("GetEpisodeById")
.WithSummary("Episode by number")
.WithDescription("Returns a single episode by its episode number.")
.WithTags("Content");

app.Run();
