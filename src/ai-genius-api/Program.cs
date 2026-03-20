var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHttpsRedirection();

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "1.0.0"
}))
.WithName("HealthCheck")
.WithTags("Health");

// API status endpoint
app.MapGet("/api/status", () => Results.Ok(new
{
    status = "running",
    service = "AI Genius API",
    environment = builder.Environment.EnvironmentName,
    timestamp = DateTime.UtcNow
}))
.WithName("GetStatus")
.WithTags("Status");

// Topics endpoint – returns the AI Genius course topics
var topics = new[]
{
    new Topic(1, "AI Foundations & GitHub Copilot",
        "Get started with AI fundamentals and learn how GitHub Copilot transforms your development workflow.",
        "foundations"),
    new Topic(2, "Agentic DevOps with SpecKit",
        "Automate your CI/CD pipelines using AI-driven specifications that generate GitHub Actions workflows.",
        "devops"),
    new Topic(3, "Building AI Apps with Azure OpenAI",
        "Build intelligent applications using Azure OpenAI Service with chat completions, embeddings, and prompt engineering.",
        "azure-openai"),
    new Topic(4, "Retrieval-Augmented Generation (RAG)",
        "Implement RAG patterns to ground your AI applications in your own data using Azure AI Search and vector databases.",
        "rag"),
    new Topic(5, "AI Agents & Multi-Agent Systems",
        "Design and deploy autonomous AI agents that can plan, use tools, and collaborate to complete complex tasks.",
        "agents"),
    new Topic(6, "Responsible AI & Production Deployment",
        "Learn best practices for deploying AI responsibly—safety, fairness, monitoring, and scaling on Azure.",
        "responsible-ai")
};

app.MapGet("/api/topics", () => Results.Ok(topics))
.WithName("GetTopics")
.WithTags("Topics");

app.MapGet("/api/topics/{id:int}", (int id) =>
{
    var topic = topics.FirstOrDefault(t => t.Id == id);
    return topic is not null ? Results.Ok(topic) : Results.NotFound(new { error = $"Topic {id} not found" });
})
.WithName("GetTopicById")
.WithTags("Topics");

app.Run();

record Topic(int Id, string Title, string Description, string Slug);

