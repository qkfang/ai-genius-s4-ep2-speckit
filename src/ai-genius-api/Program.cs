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

var app = builder.Build();

app.UseCors();
app.UseHttpsRedirection();

// GET /api/status — runtime status
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "running",
    environment = app.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow.ToString("o"),
    speckit = new { enabled = true, version = "1.0.0" }
}));

// GET /api/health — health check
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    uptime = Environment.TickCount64 / 1000.0,
    timestamp = DateTime.UtcNow.ToString("o")
}));

// GET /api/series — AI Genius series info
app.MapGet("/api/series", () => Results.Ok(new
{
    name = "Microsoft AI Genius",
    seriesId = "s-1453",
    url = "https://developer.microsoft.com/en-us/reactor/series/s-1453/",
    description = "A six-part progressive course with cutting-edge AI tech and tools presented by top Microsoft experts.",
    topics = new[]
    {
        new { episode = 1, title = "Introduction to AI Development", status = "available" },
        new { episode = 2, title = "SpecKit: Practical DevOps Controls", status = "available" },
        new { episode = 3, title = "Azure AI Services", status = "available" },
        new { episode = 4, title = "Responsible AI", status = "available" },
        new { episode = 5, title = "AI Agents & Orchestration", status = "available" },
        new { episode = 6, title = "Deploy & Monitor AI Apps", status = "available" }
    }
}));

// Season 4 episode data
var season4Episodes = new[]
{
    new
    {
        season = 4,
        episode = 1,
        title = "Getting Started with Microsoft Agent Framework: Build Practical AI Agents",
        presenter = "Rakesh L",
        introduction = "AI agents are moving fast — but building one that delivers real value requires more than just prompts. In this session, you'll get a hands-on introduction to the Microsoft Agent Framework, focusing on how to design and build practical AI agents that can reason, take actions, and integrate with real systems. You'll explore how agentic AI fits into modern application architectures and how developers can move from experimentation to production-ready agents.",
        youWillLearn = new[]
        {
            "Core concepts behind agentic AI and intelligent agents",
            "How the Microsoft Agent Framework is structured and applied",
            "How to build agents that interact with tools, APIs, and workflows",
            "Best practices for creating practical, extensible AI agents"
        },
        technologiesUsed = new[]
        {
            "Microsoft Agent Framework",
            "Azure AI services",
            "Large Language Models (LLMs)",
            "Tool and API integration patterns"
        },
        whoShouldAttend = new[]
        {
            "Developers getting started with agentic AI",
            "Engineers building AI-powered applications or services",
            "Architects exploring production-ready agent frameworks",
            "Anyone who wants to move beyond AI demos to real implementations"
        },
        status = "available"
    },
    new
    {
        season = 4,
        episode = 2,
        title = "Agentic DevOps with SpecKit: Turn Specs into CI/CD Using GitHub Actions",
        presenter = "Daniel Fang",
        introduction = "DevOps automation shouldn't stop at scripts and static rules. In this episode, you'll learn how to apply agentic AI to DevOps workflows, turning specifications into intelligent CI/CD pipelines using SpecKit and GitHub Actions. You'll see how agentic patterns enable workflows that can reason, adapt, and automate decisions — helping teams move faster with less manual effort.",
        youWillLearn = new[]
        {
            "How agentic patterns apply to modern DevOps scenarios",
            "How to turn specs into CI/CD workflows using SpecKit",
            "How GitHub Actions can support agent-driven pipelines",
            "Ways to improve delivery speed and reliability with intelligent automation"
        },
        technologiesUsed = new[]
        {
            "SpecKit",
            "GitHub Actions",
            "Agentic AI patterns",
            "GitHub-based CI/CD pipelines"
        },
        whoShouldAttend = new[]
        {
            "DevOps engineers and platform engineers",
            "Developers working with GitHub-based CI/CD",
            "Teams looking to automate from specs to delivery",
            "Anyone interested in smarter, AI-driven DevOps workflows"
        },
        status = "available"
    },
    new
    {
        season = 4,
        episode = 3,
        title = "Build Your Own Dev Experience Upgrades with GitHub Copilot SDK",
        presenter = "Renee Noble",
        introduction = "GitHub Copilot is more than an assistant — it's a platform for building smarter developer experiences. In this session, you'll learn how to use the GitHub Copilot SDK to create custom developer experience upgrades tailored to your workflows and needs. From task-specific intelligence to personalized coding experiences, you'll explore how to extend Copilot beyond out-of-the-box usage.",
        youWillLearn = new[]
        {
            "What's possible with the GitHub Copilot SDK",
            "How to design custom Copilot-powered developer experiences",
            "How to integrate AI into everyday development workflows",
            "How to build AI features that meaningfully improve developer productivity"
        },
        technologiesUsed = new[]
        {
            "GitHub Copilot SDK",
            "GitHub Copilot",
            "Large Language Models (LLMs)",
            "Developer workflow integrations"
        },
        whoShouldAttend = new[]
        {
            "Developers using GitHub Copilot today",
            "DX engineers and developer productivity teams",
            "Platform and tooling builders",
            "Anyone who wants to customize and extend AI in their daily coding experience"
        },
        status = "available"
    }
};

// GET /api/episodes — all Season 4 episodes
app.MapGet("/api/episodes", () => Results.Ok(new
{
    season = 4,
    name = "Microsoft AI Genius — Season 4",
    episodes = season4Episodes
}));

// GET /api/episodes/{id} — single Season 4 episode by number
app.MapGet("/api/episodes/{id:int}", (int id) =>
{
    var episode = season4Episodes.FirstOrDefault(e => e.episode == id);
    return episode is not null ? Results.Ok(episode) : Results.NotFound(new { error = $"Episode {id} not found" });
});

app.Run();
