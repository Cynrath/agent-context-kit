using AgentContextKit.Core;
using System.Globalization;
using System.Text.Json.Nodes;

[assembly: Xunit.CollectionBehavior(DisableTestParallelization = true)]

namespace AgentContextKit.Tests;

public sealed class StackDetectorTests
{
    [Fact]
    public void DetectsDotNetSolution()
    {
        var detector = new StackDetector();

        var stacks = detector.Detect("repo", ["AgentContextKit.sln", "src/App/App.csproj"]);

        Assert.Contains(stacks, stack => stack.Name == ".NET");
    }

    [Fact]
    public void DetectsDotNetToolProject()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/Tool/Tool.csproj", """
        <Project Sdk="Microsoft.NET.Sdk">
          <PropertyGroup>
            <PackAsTool>true</PackAsTool>
            <ToolCommandName>ackit</ToolCommandName>
          </PropertyGroup>
        </Project>
        """);
        var detector = new StackDetector(new PhysicalFileSystem());

        var stacks = detector.Detect(repo.Path, ["src/Tool/Tool.csproj"]);

        Assert.Contains(stacks, stack => stack.Name == ".NET");
        Assert.Contains(stacks, stack => stack.Name == ".NET CLI / .NET Tool");
    }

    [Fact]
    public void DetectsNodePackageJson()
    {
        var detector = new StackDetector();

        var stacks = detector.Detect("repo", ["package.json"]);

        Assert.Contains(stacks, stack => stack.Name == "Node");
    }

    [Fact]
    public void DetectsDotNetProjectSdkSignals()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/Web/Web.csproj", """<Project Sdk="Microsoft.NET.Sdk.Web"></Project>""");
        repo.Write("src/Razor/Razor.csproj", """<Project Sdk="Microsoft.NET.Sdk.Razor"></Project>""");
        repo.Write("src/Blazor/Blazor.csproj", """<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly"></Project>""");
        repo.Write("src/Worker/Worker.csproj", """<Project Sdk="Microsoft.NET.Sdk.Worker"></Project>""");
        var detector = new StackDetector(new PhysicalFileSystem());

        var stacks = detector.Detect(repo.Path,
        [
            "src/Web/Web.csproj",
            "src/Razor/Razor.csproj",
            "src/Blazor/Blazor.csproj",
            "src/Worker/Worker.csproj"
        ]);

        Assert.Contains(stacks, stack => stack.Name == ".NET");
        Assert.Contains(stacks, stack => stack.Name == "ASP.NET Core");
        Assert.Contains(stacks, stack => stack.Name == "Razor/Razor Pages");
        Assert.Contains(stacks, stack => stack.Name == "Blazor WebAssembly");
        Assert.Contains(stacks, stack => stack.Name == ".NET Worker Service");
    }

    [Fact]
    public void DetectsMinimalApiProgramSignal()
    {
        using var repo = TempRepository.Create();
        repo.Write("Program.cs", """
        var builder = WebApplication.CreateBuilder(args);
        var app = builder.Build();
        app.MapGet("/", () => "ok");
        app.Run();
        """);
        var detector = new StackDetector(new PhysicalFileSystem());

        var stacks = detector.Detect(repo.Path, ["Program.cs"]);

        Assert.Contains(stacks, stack => stack.Name == ".NET");
        Assert.Contains(stacks, stack => stack.Name == "ASP.NET Core Minimal API");
    }

    [Fact]
    public void DetectsFrontendPackageManagerAndToolingSignals()
    {
        var detector = new StackDetector();

        var stacks = detector.Detect("repo",
        [
            "package.json",
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "bun.lockb",
            "tsconfig.json",
            "tailwind.config.js"
        ]);

        Assert.Contains(stacks, stack => stack.Name == "Node");
        Assert.Contains(stacks, stack => stack.Name == "npm");
        Assert.Contains(stacks, stack => stack.Name == "pnpm");
        Assert.Contains(stacks, stack => stack.Name == "Yarn");
        Assert.Contains(stacks, stack => stack.Name == "Bun");
        Assert.Contains(stacks, stack => stack.Name == "TypeScript");
        Assert.Contains(stacks, stack => stack.Name == "Tailwind CSS");
    }

    [Fact]
    public void IgnoresSampleStacksWhenDetectingMainRepositoryStacks()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/AgentContextKit.Cli/AgentContextKit.Cli.csproj", """
        <Project Sdk="Microsoft.NET.Sdk">
          <PropertyGroup>
            <PackAsTool>true</PackAsTool>
            <ToolCommandName>ackit</ToolCommandName>
          </PropertyGroup>
        </Project>
        """);
        repo.Write("samples/dotnet-minimal-api/Sample.MinimalApi.csproj", """<Project Sdk="Microsoft.NET.Sdk.Web"></Project>""");
        repo.Write("samples/dotnet-minimal-api/Program.cs", """
        var builder = WebApplication.CreateBuilder(args);
        var app = builder.Build();
        app.MapGet("/", () => "ok");
        app.Run();
        """);
        repo.Write("samples/node-tooling/package.json", "{}");
        repo.Write("samples/node-tooling/tsconfig.json", "{}");
        repo.Write("samples/node-tooling/tailwind.config.js", "module.exports = {};");
        var detector = new StackDetector(new PhysicalFileSystem());

        var stacks = detector.Detect(repo.Path,
        [
            "AgentContextKit.sln",
            "src/AgentContextKit.Cli/AgentContextKit.Cli.csproj",
            ".github/workflows/ci.yml",
            "samples/dotnet-minimal-api/Sample.MinimalApi.csproj",
            "samples/dotnet-minimal-api/Program.cs",
            "samples/node-tooling/package.json",
            "samples/node-tooling/tsconfig.json",
            "samples/node-tooling/tailwind.config.js"
        ]);

        Assert.Contains(stacks, stack => stack.Name == ".NET");
        Assert.Contains(stacks, stack => stack.Name == ".NET CLI / .NET Tool");
        Assert.Contains(stacks, stack => stack.Name == "GitHub Actions");
        Assert.DoesNotContain(stacks, stack => stack.Name == "ASP.NET Core");
        Assert.DoesNotContain(stacks, stack => stack.Name == "ASP.NET Core Minimal API");
        Assert.DoesNotContain(stacks, stack => stack.Name == "Node");
        Assert.DoesNotContain(stacks, stack => stack.Name == "TypeScript");
        Assert.DoesNotContain(stacks, stack => stack.Name == "Tailwind CSS");
    }
}

public sealed class LlmProviderAbstractionTests
{
    [Fact]
    public async Task SupportsFakeProviderWithoutProviderSdk()
    {
        var metadata = new Dictionary<string, string>
        {
            ["scope"] = "task"
        };
        var request = new LlmProviderRequest(
            "fake-model",
            [new LlmMessage(LlmMessageRole.User, "Summarize the approved dry-run context.")],
            dryRun: true,
            exportReviewId: "review-001",
            auditCorrelationId: "audit-001",
            metadata: metadata);
        metadata["scope"] = "mutated";

        ILLMProvider provider = new FakeLlmProvider();
        var response = await provider.GenerateAsync(request, CancellationToken.None);

        Assert.True(request.DryRun);
        Assert.Equal("review-001", request.ExportReviewId);
        Assert.Equal("audit-001", request.AuditCorrelationId);
        Assert.Equal("task", request.Metadata["scope"]);
        Assert.Equal("fake", provider.Name);
        Assert.Equal("fake", response.ProviderName);
        Assert.Equal("fake-model", response.Model);
        Assert.Equal("req-001", response.RequestId);
        Assert.Equal("Dry-run only.", response.OutputText);
        Assert.Equal(3, response.TokenUsage?.InputTokens);
        Assert.Equal(2, response.TokenUsage?.OutputTokens);
        Assert.Equal(5, response.TokenUsage?.TotalTokens);
        Assert.Contains("No remote call was made.", response.Warnings);
    }
}

public sealed class RiskScannerTests
{
    public static TheoryData<string, string, RiskSeverity, RiskCategory, string> SecretAndLocalPathFixtures => new()
    {
        { "settings.txt", "token" + "=" + TestData.OpenAiProjectKey(), RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "token" + "=" + TestData.GenericApiKey(), RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "token" + "=" + TestData.GitHubFineGrainedToken(), RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "token" + "=" + TestData.GitHubClassicToken(), RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "key=" + TestData.AwsAccessKey(), RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "key.pem", "-----BEGIN " + "OPENSSH PRIVATE KEY-----", RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "aws" + "_secret_access_key=placeholder", RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "password" + "=not-for-public", RiskSeverity.High, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "api" + "_key=not-for-public", RiskSeverity.High, RiskCategory.Secret, "ACKIT001" },
        { "headers.txt", "Authorization: Bearer " + "abcdefghijklmnopqrstuvwxyz123456", RiskSeverity.High, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "connection" + " string=review-before-sharing", RiskSeverity.High, RiskCategory.Secret, "ACKIT001" },
        { "settings.txt", "smtp" + "=review-before-sharing", RiskSeverity.Medium, RiskCategory.Secret, "ACKIT001" },
        { "docs/paths.md", "Workspace " + TestData.WindowsWorkspacePath(), RiskSeverity.Low, RiskCategory.LocalPath, "ACKIT004" },
        { "docs/paths.md", "Workspace " + TestData.UnixWorkspacePath(), RiskSeverity.Low, RiskCategory.LocalPath, "ACKIT004" }
    };

    public static TheoryData<string, RiskSeverity, RiskCategory, string> RepositoryPathFixtures => new()
    {
        { ".env", RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" },
        { ".env.sample", RiskSeverity.Medium, RiskCategory.Configuration, "ACKIT005" },
        { "config/appsettings.Production.json", RiskSeverity.High, RiskCategory.ProductionConfig, "ACKIT006" },
        { "backups/export.txt", RiskSeverity.High, RiskCategory.RepositoryHygiene, "ACKIT005" },
        { "artifacts/source.zip", RiskSeverity.Medium, RiskCategory.BuildArtifact, "ACKIT003" },
        { "certs/signing.pfx", RiskSeverity.Critical, RiskCategory.Secret, "ACKIT001" }
    };

    public static TheoryData<string, string, string> SafeBrandPiiFixtures => new()
    {
        { "tests/fixtures/contact.txt", "Contact private@example.internal for fixture setup.", "Email-like" },
        { "samples/demo/contact.txt", "Contact sample@example.test for sample setup.", "Email-like" },
        { "docs/platforms.md", "Use github.com, api.nuget.org, and learn.microsoft.com.", "Domain-like" },
        { "Program.cs", "using System.Net;", "Domain-like" },
        { "Storage.cs", "using System.IO;", "Domain-like" },
        { "docs/badges.md", "Badge host: img.shields.io.", "Domain-like" },
        { "docs/network.md", "Examples use 127.0.0.1 and 203.0.113.10.", "IP address" },
        { "docs/releases.md", "Released 2026-06-12 10.", "Phone-like" }
    };

    [Theory]
    [MemberData(nameof(SecretAndLocalPathFixtures))]
    public void SecretAndLocalPathFixturesMapToStableRules(
        string path,
        string content,
        RiskSeverity severity,
        RiskCategory category,
        string ruleId)
    {
        var findings = new SecretScanner().ScanText(path, content);

        Assert.Contains(findings, finding =>
            finding.Severity == severity &&
            finding.Category == category &&
            RiskRuleCatalog.GetRuleId(finding) == ruleId);
    }

    [Theory]
    [MemberData(nameof(RepositoryPathFixtures))]
    public void RepositoryPathFixturesMapToStableRules(
        string path,
        RiskSeverity severity,
        RiskCategory category,
        string ruleId)
    {
        using var repo = TempRepository.Create();
        repo.Write(path, "fixture content");

        var result = TestServices.CreateRepositoryScanner().Scan(repo.Path);

        Assert.Contains(result.Findings, finding =>
            finding.Path == path &&
            finding.Severity == severity &&
            finding.Category == category &&
            RiskRuleCatalog.GetRuleId(finding) == ruleId);
    }

    [Theory]
    [MemberData(nameof(SafeBrandPiiFixtures))]
    public void SafeBrandPiiFixturesDoNotProduceKnownNoise(string path, string content, string messageFragment)
    {
        var findings = new BrandPiiScanner().ScanText(path, content, AckitConfig.Default);

        Assert.DoesNotContain(findings, finding =>
            finding.Message.Contains(messageFragment, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void ConfiguredWildcardSafeDomainIsCultureInvariantAndDoesNotMatchApexDomain()
    {
        var originalCulture = CultureInfo.CurrentCulture;
        var originalUiCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("tr-TR");
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("tr-TR");
            var scanner = new BrandPiiScanner();
            var config = AckitConfig.Default with
            {
                SafeDomains = ["*.tooling" + ".dev"]
            };

            var subdomain = "api.tooling" + ".dev";
            var apex = "tooling" + ".dev";
            var subdomainScan = scanner.ScanTextWithAudit("docs/platforms.md", "Use " + subdomain + ".", config);
            var apexFindings = scanner.ScanText("docs/platforms.md", "Use " + apex + ".", config);

            Assert.DoesNotContain(subdomainScan.Findings, finding => finding.Message.Contains("Domain-like", StringComparison.OrdinalIgnoreCase));
            Assert.Equal(RiskSuppressionReason.SafeDomain, Assert.Single(subdomainScan.Suppressions).Reason);
            Assert.Contains(apexFindings, finding => finding.Category == RiskCategory.Brand && finding.Match == apex);
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
            CultureInfo.CurrentUICulture = originalUiCulture;
        }
    }

    [Fact]
    public void SecretScannerFindsPasswordAssignment()
    {
        var scanner = new SecretScanner();

        var findings = scanner.ScanText("appsettings.json", "password" + "=not-for-public");

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.High && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void SecretScannerFindsCriticalOpenAiLikeKey()
    {
        var scanner = new SecretScanner();

        var fakeKey = TestData.OpenAiProjectKey();
        var findings = scanner.ScanText("settings.txt", "token" + "=" + fakeKey);

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.Critical);
    }

    [Theory]
    [InlineData("generic")]
    [InlineData("ec")]
    [InlineData("pgp")]
    public void SecretScannerFindsGenericPrivateKeyBlocks(string keyType)
    {
        var scanner = new SecretScanner();
        var privateKeyHeader = keyType switch
        {
            "ec" => "-----BEGIN EC " + "PRIVATE KEY-----",
            "pgp" => "-----BEGIN PGP " + "PRIVATE KEY BLOCK-----",
            _ => "-----BEGIN " + "PRIVATE KEY-----"
        };

        var findings = scanner.ScanText("key.pem", privateKeyHeader);

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.Critical && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void RepositoryScannerIgnoresGitBinAndObjContent()
    {
        using var repo = TempRepository.Create();
        repo.Write(".git/config", "token" + "=" + TestData.OpenAiProjectKey());
        repo.Write("bin/output.txt", "password" + "=hidden");
        repo.Write("obj/cache.txt", "password" + "=hidden");
        repo.Write("README.md", "# Test");

        var scanner = TestServices.CreateRepositoryScanner();
        var result = scanner.Scan(repo.Path);

        Assert.DoesNotContain(result.Files, file => file.StartsWith(".git/", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(result.Files, file => file.StartsWith("bin/", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(result.Files, file => file.StartsWith("obj/", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(result.Findings, finding => finding.Severity == RiskSeverity.Critical);
    }

    [Fact]
    public void RepositoryScannerTreatsEnvSamplesAsReviewFindingsAndRealEnvAsCritical()
    {
        using var repo = TempRepository.Create();
        repo.Write(".env.example", "API_URL=https://example.com");
        repo.Write(".env", "API_URL=https://example.com");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path);

        Assert.Contains(result.Findings, finding =>
            finding.Path == ".env" &&
            finding.Severity == RiskSeverity.Critical &&
            finding.Category == RiskCategory.Secret);
        Assert.Contains(result.Findings, finding =>
            finding.Path == ".env.example" &&
            finding.Severity == RiskSeverity.Medium &&
            finding.Category == RiskCategory.Configuration);
        Assert.DoesNotContain(result.Findings, finding =>
            finding.Path == ".env.example" &&
            finding.Severity == RiskSeverity.Critical);
    }

    [Fact]
    public void RepositoryScannerStillRiskScansSampleFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("samples/demo/appsettings.Production.json", "{}");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path);

        Assert.Contains(result.Files, file => file == "samples/demo/appsettings.Production.json");
        Assert.Contains(result.Findings, finding =>
            finding.Path == "samples/demo/appsettings.Production.json" &&
            finding.Severity == RiskSeverity.High &&
            finding.Category == RiskCategory.ProductionConfig);
    }

    [Fact]
    public void RepositoryScannerFindsPrivateKeyAndKeyStoreFileNames()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ssh/id_ed25519", "");
        repo.Write("certs/signing.pfx", "");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path);

        Assert.Contains(result.Findings, finding =>
            finding.Path == ".ssh/id_ed25519" &&
            finding.Severity == RiskSeverity.Critical &&
            finding.Category == RiskCategory.Secret);
        Assert.Contains(result.Findings, finding =>
            finding.Path == "certs/signing.pfx" &&
            finding.Severity == RiskSeverity.Critical &&
            finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void RepositoryScannerUsesConfiguredIgnorePaths()
    {
        using var repo = TempRepository.Create();
        repo.Write("generated/secret.txt", "token" + "=" + TestData.OpenAiProjectKey());
        repo.Write("README.md", "# Test");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            IgnorePaths = ["generated/"]
        });

        Assert.DoesNotContain(result.Files, file => file.StartsWith("generated/", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(result.Findings, finding => finding.Path.StartsWith("generated/", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void RiskScannerUsesConfiguredRiskExtensions()
    {
        using var repo = TempRepository.Create();
        repo.Write("private.snapshot", "not secret");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            RiskExtensions = [".snapshot"]
        });

        Assert.Contains(result.Findings, finding => finding.Path == "private.snapshot" && finding.Category == RiskCategory.BuildArtifact);
    }

    [Fact]
    public void RepositoryScannerSuppressesConfiguredIgnoredPathFindingsButKeepsFileVisible()
    {
        using var repo = TempRepository.Create();
        repo.Write("generated-output/archive.bak", "not secret");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            IgnoredPaths = ["generated-output/"]
        });

        Assert.Contains(result.Files, file => file == "generated-output/archive.bak");
        Assert.DoesNotContain(result.Findings, finding => finding.Path == "generated-output/archive.bak");
        var suppression = Assert.Single(result.Suppressions);
        Assert.Equal("ACKIT003", suppression.RuleId);
        Assert.Equal(RiskSuppressionReason.IgnoredPath, suppression.Reason);
        Assert.Equal("generated-output/archive.bak", suppression.Path);
    }

    [Fact]
    public void RepositoryScannerUsesIgnoredFindingIdsForNonCriticalFindings()
    {
        using var repo = TempRepository.Create();
        repo.Write("artifacts/tool.nupkg", "not secret");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            IgnoredFindingIds = ["ACKIT003"]
        });

        Assert.DoesNotContain(result.Findings, finding => finding.Path == "artifacts/tool.nupkg");
        var suppression = Assert.Single(result.Suppressions);
        Assert.Equal("ACKIT003", suppression.RuleId);
        Assert.Equal(RiskSuppressionReason.IgnoredFindingId, suppression.Reason);
        Assert.Equal("artifacts/tool.nupkg", suppression.Path);
    }

    [Fact]
    public void RepositoryScannerDoesNotSuppressCriticalSecretFindingsWithIgnoredFindingIds()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            IgnoredFindingIds = ["ACKIT001"]
        });

        Assert.Contains(result.Findings, finding =>
            finding.Path == "settings.txt" &&
            finding.Severity == RiskSeverity.Critical &&
            finding.Category == RiskCategory.Secret);
        Assert.DoesNotContain(result.Suppressions, suppression => suppression.Severity == RiskSeverity.Critical);
        Assert.Contains(result.Suppressions, suppression =>
            suppression.Severity == RiskSeverity.High &&
            suppression.Reason == RiskSuppressionReason.IgnoredFindingId);
    }

    [Fact]
    public void RepositoryScannerDoesNotSuppressCriticalSecretFindingsWithIgnoredPaths()
    {
        using var repo = TempRepository.Create();
        repo.Write("fixtures/settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path, AckitConfig.Default with
        {
            IgnoredPaths = ["fixtures/"]
        });

        Assert.Contains(result.Findings, finding =>
            finding.Path == "fixtures/settings.txt" &&
            finding.Severity == RiskSeverity.Critical &&
            finding.Category == RiskCategory.Secret);
        Assert.DoesNotContain(result.Suppressions, suppression => suppression.Severity == RiskSeverity.Critical);
        Assert.Contains(result.Suppressions, suppression =>
            suppression.Severity == RiskSeverity.High &&
            suppression.Reason == RiskSuppressionReason.IgnoredPath);
    }

    [Fact]
    public void BrandPiiScannerFindsConfiguredKeywordAndEmail()
    {
        var scanner = new BrandPiiScanner();
        var email = "a" + "@" + "b" + "." + "com";

        var findings = scanner.ScanText("notes.txt", "Contact private-name at " + email, AckitConfig.Default with
        {
            PiiKeywords = ["private-name"]
        });

        Assert.Contains(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == "private-name");
        Assert.Contains(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == email);
    }

    [Fact]
    public void BrandPiiScannerIgnoresSafeTechnicalDomains()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText(
            "docs/platforms.md",
            "Use Microsoft.NET with api.nuget.org, github.com, nuget.org, learn.microsoft.com, and json-schema.org.",
            AckitConfig.Default);

        Assert.DoesNotContain(findings, finding => finding.Message.Contains("Domain-like", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void BrandPiiScannerUsesConfiguredSafeDomains()
    {
        var scanner = new BrandPiiScanner();
        var configuredDomain = "internal" + ".tooling" + ".dev";

        var scan = scanner.ScanTextWithAudit(
            "docs/platforms.md",
            "Use " + configuredDomain + " for local fixture docs.",
            AckitConfig.Default with
            {
                SafeDomains = [configuredDomain]
            });

        Assert.DoesNotContain(scan.Findings, finding => finding.Message.Contains("Domain-like", StringComparison.OrdinalIgnoreCase));
        var suppression = Assert.Single(scan.Suppressions);
        Assert.Equal("ACKIT002", suppression.RuleId);
        Assert.Equal(RiskSuppressionReason.SafeDomain, suppression.Reason);
        Assert.Equal(RiskCategory.Brand, suppression.Category);
    }

    [Fact]
    public void BrandPiiScannerIgnoresNonRealFixtureEmailsInFixturePaths()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText(
            "tests/fixtures/sample-data.txt",
            "Contact private@example.internal for fake fixture setup.",
            AckitConfig.Default);

        Assert.DoesNotContain(findings, finding => finding.Message.Contains("Email-like", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void BrandPiiScannerFindsLaterRealEmailAfterSafeExample()
    {
        var scanner = new BrandPiiScanner();
        var realLookingEmail = "security" + "@" + "private-customer" + ".dev";

        var findings = scanner.ScanText(
            "docs/contact.md",
            "Example: sample@example.com. Review " + realLookingEmail + ".",
            AckitConfig.Default);

        Assert.Contains(findings, finding =>
            finding.Category == RiskCategory.Pii &&
            finding.Severity == RiskSeverity.Medium &&
            finding.Match == realLookingEmail);
    }

    [Fact]
    public void BrandPiiScannerFindsLaterPrivateIpAndPhoneAfterDocumentationValues()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText(
            "docs/ops.md",
            "Published 2026-06-13; build 27444536856; example host 203.0.113.10; internal host " + "10.20" + ".30.40; call " + "555" + " 123 " + "4567.",
            AckitConfig.Default);

        Assert.Contains(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == "10.20" + ".30.40");
        Assert.Contains(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == "555" + " 123 " + "4567");
        Assert.DoesNotContain(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == "27444536856");
    }

    [Fact]
    public void BrandPiiScannerDeduplicatesRepeatedSafeDomainAudit()
    {
        var scanner = new BrandPiiScanner();
        var domain = "mail" + ".trusted" + ".dev";

        var scan = scanner.ScanTextWithAudit(
            "docs/contact.md",
            "Use first@" + domain + " and second@" + domain + ".",
            AckitConfig.Default with { SafeDomains = [domain] });

        Assert.Empty(scan.Findings);
        Assert.Single(scan.Suppressions);
    }

    [Fact]
    public void BrandPiiScannerReportsRealLookingDomainOutsideFixtures()
    {
        var scanner = new BrandPiiScanner();
        var domain = "portal" + ".customerportal" + "." + "dev";

        var findings = scanner.ScanText(
            "docs/contact.md",
            "Review " + domain + " before public release.",
            AckitConfig.Default);

        Assert.Contains(findings, finding => finding.Category == RiskCategory.Brand && finding.Match == domain);
    }

    [Fact]
    public void SecretScannerFindsCriticalGitHubFineGrainedTokenLikeValue()
    {
        var scanner = new SecretScanner();

        var findings = scanner.ScanText("settings.txt", "token" + "=" + TestData.GitHubFineGrainedToken());

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.Critical && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void SecretScannerFindsCriticalAwsAccessKeyLikeValue()
    {
        var scanner = new SecretScanner();

        var findings = scanner.ScanText("settings.txt", "key" + "=" + TestData.AwsAccessKey());

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.Critical && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void SecretScannerFindsBearerTokenLikeValue()
    {
        var scanner = new SecretScanner();

        var findings = scanner.ScanText("headers.txt", "Authorization: Bearer " + "abcdefghijklmnopqrstuvwxyz123456");

        Assert.Contains(findings, finding => finding.Severity == RiskSeverity.High && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void SecretScannerIgnoresHyphenatedTokenMetadataButKeepsStandaloneAssignments()
    {
        var scanner = new SecretScanner();

        var metadata = scanner.ScanText("workflow.yml", "permissions:\n  id-token: write\n  cancellation-token: none");
        var assignment = scanner.ScanText("settings.txt", "to" + "ken: placeholder");

        Assert.DoesNotContain(metadata, finding => finding.Message.Contains("Token or API key assignment", StringComparison.Ordinal));
        Assert.DoesNotContain(metadata, finding => finding.Category == RiskCategory.LocalPath);
        Assert.Contains(assignment, finding => finding.Severity == RiskSeverity.High && finding.Category == RiskCategory.Secret);
    }

    [Fact]
    public void SecretScannerFindsUnixHomeAndFileUriPaths()
    {
        var scanner = new SecretScanner();

        var unixFindings = scanner.ScanText("docs/paths.md", "Local path: " + "/" + "home/example/project.");
        var fileUriFindings = scanner.ScanText("docs/paths.md", "Local URI: " + "file:" + "///tmp/project.");

        Assert.Contains(unixFindings, finding => finding.Severity == RiskSeverity.Low && finding.Category == RiskCategory.LocalPath);
        Assert.Contains(fileUriFindings, finding => finding.Severity == RiskSeverity.Low && finding.Category == RiskCategory.LocalPath);
    }

    [Fact]
    public void RepositoryScannerFindsPackageDatabaseAndCertificateArtifacts()
    {
        using var repo = TempRepository.Create();
        repo.Write("artifacts/tool.nupkg", "not secret");
        repo.Write("artifacts/tool.snupkg", "not secret");
        repo.Write("data/app.sqlite", "not secret");
        repo.Write("certs/signing.p12", "not secret");
        var scanner = TestServices.CreateRepositoryScanner();

        var result = scanner.Scan(repo.Path);

        Assert.Contains(result.Findings, finding => finding.Path == "artifacts/tool.nupkg" && finding.Category == RiskCategory.BuildArtifact);
        Assert.Contains(result.Findings, finding => finding.Path == "artifacts/tool.snupkg" && finding.Category == RiskCategory.BuildArtifact);
        Assert.Contains(result.Findings, finding => finding.Path == "data/app.sqlite" && finding.Category == RiskCategory.BuildArtifact);
        Assert.Contains(result.Findings, finding => finding.Path == "certs/signing.p12" && finding.Severity == RiskSeverity.Critical);
    }

    [Fact]
    public void BrandPiiScannerIgnoresLoopbackWildcardAndDocumentationIpAddresses()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText("notes.md", "Use 127.0.0.1, 0.0.0.0, and 203.0.113.10 in examples.", AckitConfig.Default);

        Assert.DoesNotContain(findings, finding => finding.Message.Contains("IP address", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void BrandPiiScannerReportsPrivateIpAddresses()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText("ops.md", "Internal host is " + "10.0" + ".0.5.", AckitConfig.Default);

        Assert.Contains(findings, finding => finding.Category == RiskCategory.Pii && finding.Match == "10.0" + ".0.5");
    }

    [Fact]
    public void BrandPiiScannerIgnoresCommonDotNetNamespaces()
    {
        var scanner = new BrandPiiScanner();

        var findings = scanner.ScanText("Program.cs", "using System.Net;", AckitConfig.Default);

        Assert.DoesNotContain(findings, finding => finding.Category == RiskCategory.Brand);
    }

    [Fact]
    public void BrandPiiScannerUsesTokenBoundariesForConfiguredKeywords()
    {
        var scanner = new BrandPiiScanner();
        var config = AckitConfig.Default with
        {
            BrandKeywords = ["Acme"]
        };

        var substringFindings = scanner.ScanText("notes.md", "AcmeCorp is a different token.", config);
        var tokenFindings = scanner.ScanText("notes.md", "Acme Corp is a configured brand token.", config);

        Assert.DoesNotContain(substringFindings, finding => finding.Category == RiskCategory.Brand && finding.Match == "Acme");
        Assert.Contains(tokenFindings, finding => finding.Category == RiskCategory.Brand && finding.Match == "Acme");
    }
}

public sealed class SarifReportWriterTests
{
    [Fact]
    public void SarifExcludesSuppressionAuditRecords()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var scan = CreateScan(repo.Path, []) with
        {
            Suppressions =
            [
                new RiskSuppression(
                    "ACKIT003",
                    RiskSeverity.Medium,
                    RiskCategory.BuildArtifact,
                    "artifacts/tool.nupkg",
                    RiskSuppressionReason.IgnoredFindingId)
            ]
        };

        var report = writer.BuildReport(repo.Path, scan, "0.2.0-test");

        Assert.Empty(report.Runs[0].Results);
    }

    [Fact]
    public void SarifEmptyFindingsProducesValidReport()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var scan = CreateScan(repo.Path, []);

        var result = writer.Generate(repo.Path, ".ackit/reports/empty.sarif", scan, "0.1.0-test");
        var json = JsonNode.Parse(File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "empty.sarif")));

        Assert.True(result.Created);
        Assert.Equal("2.1.0", json?["version"]?.GetValue<string>());
        Assert.Equal("https://json.schemastore.org/sarif-2.1.0.json", json?["$schema"]?.GetValue<string>());
        Assert.Equal("AgentContextKit", json?["runs"]?[0]?["tool"]?["driver"]?["name"]?.GetValue<string>());
        Assert.Equal("0.1.0-test", json?["runs"]?[0]?["tool"]?["driver"]?["version"]?.GetValue<string>());
        Assert.Equal(0, json?["runs"]?[0]?["results"]?.AsArray().Count);
    }

    [Fact]
    public void SarifRulesUseCentralRiskRuleCatalogMetadata()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var scan = CreateScan(repo.Path, []);

        writer.Generate(repo.Path, ".ackit/reports/rules.sarif", scan, "0.1.0-test");
        var json = JsonNode.Parse(File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "rules.sarif")));
        var rules = json?["runs"]?[0]?["tool"]?["driver"]?["rules"]?.AsArray();

        Assert.Equal(RiskRuleCatalog.All.Count, rules?.Count);
        Assert.Contains(rules!, rule => rule?["id"]?.GetValue<string>() == "ACKIT001" &&
                                        (rule?["help"]?["text"]?.GetValue<string>()?.Contains("Remove the secret", StringComparison.OrdinalIgnoreCase) ?? false));
        Assert.Contains(rules!, rule => rule?["id"]?.GetValue<string>() == "ACKIT999");
    }

    [Fact]
    public void RiskRuleCatalogKeepsStableRuleIdMapping()
    {
        Assert.Equal("ACKIT001", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "settings.txt", "secret")));
        Assert.Equal("ACKIT002", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Medium, RiskCategory.Pii, "docs/contact.md", "pii")));
        Assert.Equal("ACKIT003", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, "artifact.zip", "artifact")));
        Assert.Equal("ACKIT004", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Low, RiskCategory.LocalPath, "docs/path.md", "path")));
        Assert.Equal("ACKIT005", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Medium, RiskCategory.Configuration, ".env.example", "config")));
        Assert.Equal("ACKIT006", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/appsettings.Production.json", "production")));
        Assert.Equal("ACKIT007", RiskRuleCatalog.GetRuleId(new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/README.md", "stale")));
    }

    [Fact]
    public void RiskRuleCatalogExposesNewProductionConfigAndDocumentationRules()
    {
        Assert.Contains(RiskRuleCatalog.All, rule => rule.Id == "ACKIT006" && rule.Category == RiskCategory.ProductionConfig);
        Assert.Contains(RiskRuleCatalog.All, rule => rule.Id == "ACKIT007" && rule.Category == RiskCategory.Documentation);

        var productionFinding = new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/prod.json", "fixture");
        var productionRule = RiskRuleCatalog.GetRule(productionFinding);
        Assert.Equal("ACKIT006", productionRule.Id);
        Assert.Equal(RiskSeverity.High, productionRule.DefaultSeverity);

        var documentationFinding = new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/missing.md", "fixture");
        var documentationRule = RiskRuleCatalog.GetRule(documentationFinding);
        Assert.Equal("ACKIT007", documentationRule.Id);
        Assert.Equal(RiskSeverity.Medium, documentationRule.DefaultSeverity);

        var suppression = new RiskSuppression("ACKIT006", RiskSeverity.High, RiskCategory.ProductionConfig, "config/prod.json", RiskSuppressionReason.IgnoredFindingId);
        Assert.Equal("ACKIT006", suppression.RuleId);
    }

    [Fact]
    public void SarifSecretFindingDoesNotExposeRawMatch()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var fakeKey = TestData.OpenAiProjectKey();
        var scan = CreateScan(repo.Path,
        [
            new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "settings.txt", "API key-like value detected.", fakeKey)
        ]);

        writer.Generate(repo.Path, ".ackit/reports/secret.sarif", scan, "0.1.0-test");
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "secret.sarif"));
        var json = JsonNode.Parse(content);
        var result = json?["runs"]?[0]?["results"]?[0];

        Assert.DoesNotContain(fakeKey, content);
        Assert.Equal("ACKIT001", result?["ruleId"]?.GetValue<string>());
        Assert.Equal("error", result?["level"]?.GetValue<string>());
        Assert.Equal("settings.txt", result?["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>());
    }

    [Fact]
    public void SarifNormalizesPathsWithoutAbsoluteLocalPathLeakage()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var absolutePath = System.IO.Path.Combine(repo.Path, "src", "Secrets.cs");
        var scan = CreateScan(repo.Path,
        [
            new RiskFinding(RiskSeverity.Low, RiskCategory.LocalPath, absolutePath, "Local filesystem path detected."),
            new RiskFinding(RiskSeverity.Medium, RiskCategory.Pii, @"docs\Contact.md", "Email-like value detected.")
        ]);

        writer.Generate(repo.Path, ".ackit/reports/paths.sarif", scan, "0.1.0-test");
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "paths.sarif"));
        var json = JsonNode.Parse(content);

        Assert.DoesNotContain(repo.Path, content);
        var windowsDrivePrefix = "C:" + "\\";
        var workspaceDrivePrefix = "O:" + "\\";
        Assert.DoesNotContain(windowsDrivePrefix, content);
        Assert.DoesNotContain(workspaceDrivePrefix, content);
        Assert.Equal("src/Secrets.cs", json?["runs"]?[0]?["results"]?[0]?["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>());
        Assert.Equal("docs/Contact.md", json?["runs"]?[0]?["results"]?[1]?["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>());
    }

    [Fact]
    public void SarifMapsMediumAndLowSeverityLevels()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var scan = CreateScan(repo.Path,
        [
            new RiskFinding(RiskSeverity.Medium, RiskCategory.Pii, "docs/contact.md", "Email-like value detected."),
            new RiskFinding(RiskSeverity.Low, RiskCategory.Brand, "docs/site.md", "Domain-like value detected.")
        ]);

        writer.Generate(repo.Path, ".ackit/reports/severity.sarif", scan, "0.1.0-test");
        var json = JsonNode.Parse(File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "severity.sarif")));

        Assert.Equal("warning", json?["runs"]?[0]?["results"]?[0]?["level"]?.GetValue<string>());
        Assert.Equal("note", json?["runs"]?[0]?["results"]?[1]?["level"]?.GetValue<string>());
    }

    [Fact]
    public void SarifIncludesSanitizedBaselineProperties()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var classifier = new BaselineClassifier();
        var existing = new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "settings.txt", "Secret-like value detected.", TestData.OpenAiProjectKey());
        var added = new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, "artifacts/tool.nupkg", "Package artifact detected.");
        var scan = CreateScan(repo.Path, [existing, added]);
        var baseline = classifier.Classify(scan.Findings, classifier.CreateManifest([existing]));

        writer.Generate(repo.Path, ".ackit/reports/baseline.sarif", scan, "0.3.0-test", baseline);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "baseline.sarif"));
        var json = JsonNode.Parse(content);

        Assert.Equal("existing", json?["runs"]?[0]?["results"]?[0]?["properties"]?["baselineStatus"]?.GetValue<string>());
        Assert.Equal("new", json?["runs"]?[0]?["results"]?[1]?["properties"]?["baselineStatus"]?.GetValue<string>());
        Assert.Matches("^[0-9a-f]{64}$", json?["runs"]?[0]?["results"]?[0]?["properties"]?["baselineFingerprint"]?.GetValue<string>() ?? "");
        Assert.True(json?["runs"]?[0]?["results"]?[0]?["properties"]?["baselineOccurrence"]?.GetValue<int>() > 0);
        Assert.DoesNotContain(TestData.OpenAiProjectKey(), content, StringComparison.Ordinal);
    }

    private static ScanResult CreateScan(string repositoryPath, IReadOnlyList<RiskFinding> findings)
    {
        return new ScanResult(
            repositoryPath,
            ["README.md"],
            [new StackInfo(".NET", ".sln/.slnx/*proj/Program.cs")],
            findings,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false);
    }
}

public sealed class TemplateAndGenerationTests
{
    [Fact]
    public void TemplateRendererFallsBackToEnglishForUnknownLanguage()
    {
        var renderer = new TemplateRenderer();

        var content = renderer.Render("AGENTS", LanguageCode.From("de"), new Dictionary<string, string>
        {
            ["ProjectName"] = "Demo",
            ["StackList"] = "- .NET"
        });

        Assert.Contains("Agent Instructions", content);
    }

    [Fact]
    public void TaskGeneratorProducesSafeSlugAndNextTaskNumber()
    {
        using var repo = TempRepository.Create();
        repo.Write("docs/tasks/TASK-0001-foundation.md", "# Existing");
        var generator = new TaskFileGenerator(new PhysicalFileSystem(), new TemplateRenderer());

        var result = generator.CreateTask(repo.Path, new TaskSpec("Admin panel yetki sistemi ekle!", LanguageCode.Turkish));

        Assert.True(result.Created);
        Assert.Equal("docs/tasks/TASK-0002-admin-panel-yetki-sistemi-ekle.md", result.Path);
        Assert.True(File.Exists(System.IO.Path.Combine(repo.Path, result.Path.Replace('/', System.IO.Path.DirectorySeparatorChar))));
    }

    [Fact]
    public void AgentGeneratorDoesNotOverwriteExistingFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("AGENTS.md", "original");
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(repo.Path, ["AGENTS.md"], [new StackInfo(".NET", ".csproj")], [], true, false, false, false, false, false, false, false, false, true);

        var results = generator.Generate(repo.Path, AgentTarget.Codex, LanguageCode.English, scan);

        Assert.Contains(results, result => result.Path == "AGENTS.md" && result.Status == GeneratedFileStatus.SkippedExisting);
        Assert.Equal("original", File.ReadAllText(System.IO.Path.Combine(repo.Path, "AGENTS.md")));
    }

    [Fact]
    public void AgentGeneratorWritesExpandedAgentContext()
    {
        using var repo = TempRepository.Create();
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            ["README.md", "AgentContextKit.sln"],
            [new StackInfo(".NET", ".sln/.slnx/*proj/Program.cs")],
            [],
            true,
            true,
            true,
            false,
            false,
            false,
            true,
            true,
            false,
            false);

        var results = generator.Generate(repo.Path, AgentTarget.Codex, LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, "AGENTS.md"));

        Assert.Contains(results, result => result.Path == "AGENTS.md" && result.Created);
        Assert.Contains("## Repository Health", content);
        Assert.Contains("## Risk Summary", content);
        Assert.Contains("## Recommended Checks", content);
        Assert.Contains("- dotnet build", content);
        Assert.Contains("- ackit scan", content);
    }

    [Fact]
    public void HtmlReportGeneratorCreatesEncodedReport()
    {
        using var repo = TempRepository.Create();
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            ["notes.md"],
            [new StackInfo(".NET", ".csproj")],
            [new RiskFinding(RiskSeverity.High, RiskCategory.Secret, "notes.md", "<script>alert</script>")],
            true,
            true,
            true,
            false,
            false,
            false,
            true,
            true,
            false,
            false);

        var result = generator.Generate(repo.Path, "reports/scan.html", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, "reports", "scan.html"));

        Assert.True(result.Created);
        Assert.Contains("&lt;script&gt;alert&lt;/script&gt;", content);
        Assert.DoesNotContain("<script>alert</script>", content);
    }

    [Fact]
    public void HtmlReportGeneratorDoesNotOverwriteExistingReport()
    {
        using var repo = TempRepository.Create();
        repo.Write("reports/scan.html", "original");
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        var result = generator.Generate(repo.Path, "reports/scan.html", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, "reports", "scan.html"));

        Assert.False(result.Created);
        Assert.Equal("original", content);
    }

    [Fact]
    public void HtmlReportGeneratorRejectsUnsafeOutputPath()
    {
        using var repo = TempRepository.Create();
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        Assert.Throws<InvalidOperationException>(() => generator.Generate(repo.Path, "../scan.html", LanguageCode.English, scan));
    }

    [Fact]
    public void HtmlReportGeneratorShowsBaselineClassification()
    {
        using var repo = TempRepository.Create();
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var classifier = new BaselineClassifier();
        var existing = new RiskFinding(RiskSeverity.High, RiskCategory.Secret, "settings.txt", "Credential assignment detected.");
        var added = new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, "artifact.zip", "Archive detected.");
        var scan = new ScanResult(repo.Path, ["settings.txt", "artifact.zip"], [], [existing, added], false, false, false, false, false, false, false, false, false, false);
        var baseline = classifier.Classify(scan.Findings, classifier.CreateManifest([existing]));

        generator.Generate(repo.Path, "reports/baseline.html", LanguageCode.English, scan, baseline);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, "reports", "baseline.html"));

        Assert.Contains("Baseline Classification", content);
        Assert.Contains("Existing", content);
        Assert.Contains("New", content);
        Assert.Contains("Baseline status records prior review", content);
    }

    [Fact]
    public void WebUiGeneratorCreatesEncodedPrototype()
    {
        using var repo = TempRepository.Create();
        repo.Write("AGENTS.md", "<script>alert</script>");
        repo.Write("docs/tasks/TASK-0001-demo.md", "# Demo Task");
        repo.Write("docs/tasks/TASK-0002-completed.md", """
            # TASK-0002: Completed Task

            ## Completion notes
            Completed.

            - The phrase `Not implemented yet.` can appear in explanatory text without reopening the task.
            """);
        var generator = new WebUiGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            ["AGENTS.md", "docs/tasks/TASK-0001-demo.md", "docs/tasks/TASK-0002-completed.md"],
            [new StackInfo(".NET", ".csproj")],
            [
                new RiskFinding(RiskSeverity.Medium, RiskCategory.Configuration, "config.md", "Review config"),
                new RiskFinding(RiskSeverity.High, RiskCategory.Secret, "notes.md", "<script>alert</script>", "<token>")
            ],
            true,
            true,
            true,
            false,
            false,
            false,
            true,
            true,
            false,
            true);

        var result = generator.Generate(repo.Path, ".ackit/webui/index.html", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "webui", "index.html"));

        Assert.True(result.Created);
        Assert.Contains("Scan Result Dashboard", content);
        Assert.Contains("Readiness Score", content);
        Assert.Contains("Needs review", content);
        Assert.Contains("Risk Severity Breakdown", content);
        Assert.Contains("Recommended Checks", content);
        Assert.Contains("dotnet build AgentContextKit.sln", content);
        Assert.Contains("Review Queue", content);
        Assert.Contains("Finding ID", content);
        Assert.Contains("Recommended Action", content);
        Assert.Contains("RF-001", content);
        Assert.Contains("Review before CI or release.", content);
        Assert.DoesNotContain("&lt;token&gt;", content);
        Assert.Contains("Generated File Preview", content);
        Assert.Contains("Category", content);
        Assert.Contains("Status", content);
        Assert.Contains("Size", content);
        Assert.Contains("Present", content);
        Assert.Contains("Missing", content);
        Assert.Contains("Codex", content);
        Assert.Contains("Task Preview", content);
        Assert.Contains("Task ID", content);
        Assert.Contains("Task Status", content);
        Assert.Contains("TASK-0001", content);
        Assert.Contains("Demo Task", content);
        Assert.Contains("Open", content);
        Assert.Contains("TASK-0002", content);
        Assert.Contains("Completed Task", content);
        Assert.Contains("Completed", content);
        Assert.Contains("&lt;script&gt;alert&lt;/script&gt;", content);
        Assert.DoesNotContain("<script>alert</script>", content);
        Assert.True(content.IndexOf("notes.md", StringComparison.Ordinal) < content.IndexOf("config.md", StringComparison.Ordinal));
    }

    [Fact]
    public void WebUiGeneratorDoesNotOverwriteExistingPrototype()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/webui/index.html", "original");
        var generator = new WebUiGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        var result = generator.Generate(repo.Path, ".ackit/webui/index.html", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "webui", "index.html"));

        Assert.False(result.Created);
        Assert.Equal("original", content);
    }

    [Fact]
    public void WebUiGeneratorRejectsUnsafeOutputPath()
    {
        using var repo = TempRepository.Create();
        var generator = new WebUiGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        Assert.Throws<InvalidOperationException>(() => generator.Generate(repo.Path, "../index.html", LanguageCode.English, scan));
    }

    [Fact]
    public void WebUiGeneratorShowsBaselineMetricsAndFindingStatus()
    {
        using var repo = TempRepository.Create();
        var generator = new WebUiGenerator(new PhysicalFileSystem(), new FixedClock());
        var classifier = new BaselineClassifier();
        var existing = new RiskFinding(RiskSeverity.High, RiskCategory.Secret, "settings.txt", "Credential assignment detected.");
        var added = new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, "artifact.zip", "Archive detected.");
        var scan = new ScanResult(repo.Path, ["settings.txt", "artifact.zip"], [], [existing, added], false, false, false, false, false, false, false, false, false, false);
        var baseline = classifier.Classify(scan.Findings, classifier.CreateManifest([existing]));

        generator.Generate(repo.Path, ".ackit/webui/baseline.html", LanguageCode.English, scan, baseline);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "webui", "baseline.html"));

        Assert.Contains("Existing findings", content);
        Assert.Contains("New findings", content);
        Assert.Contains("<th>Baseline</th>", content);
        Assert.Contains("baseline-existing", content);
        Assert.Contains("baseline-new", content);
    }

    [Fact]
    public void PromptPackGeneratorCreatesLocalDryRunPack()
    {
        using var repo = TempRepository.Create();
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("docs/tasks/TASK-0001-demo.md", """
            # TASK-0001: Demo Task

            ## Completion notes
            Completed.
            """);
        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            ["AGENTS.md", "docs/tasks/TASK-0001-demo.md"],
            [new StackInfo(".NET", ".csproj")],
            [],
            true,
            false,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            true);

        var result = generator.Generate(repo.Path, ".ackit/prompt-packs/demo.md", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "prompt-packs", "demo.md"));

        Assert.True(result.Created);
        Assert.Contains("AgentContextKit Dry-Run Prompt Pack", content);
        Assert.Contains("No remote LLM provider call was made.", content);
        Assert.Contains("Generated/Context File Status", content);
        Assert.Contains("Latest Task Summary", content);
        Assert.Contains("TASK-0001", content);
        Assert.Contains("Completed", content);
        Assert.Contains("No API key was read", content);
    }

    [Fact]
    public void PromptPackGeneratorDoesNotOverwriteExistingPack()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/prompt-packs/demo.md", "original");
        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        var result = generator.Generate(repo.Path, ".ackit/prompt-packs/demo.md", LanguageCode.English, scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "prompt-packs", "demo.md"));

        Assert.False(result.Created);
        Assert.Equal("original", content);
    }

    [Fact]
    public void PromptPackGeneratorRejectsUnsafeOutputPath()
    {
        using var repo = TempRepository.Create();
        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        Assert.Throws<InvalidOperationException>(() => generator.Generate(repo.Path, "../prompt.md", LanguageCode.English, scan));
    }

    [Fact]
    public void ContextExportManifestGeneratorCreatesLocalApprovalManifest()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/prompt-packs/demo.md", "# Prompt Pack");
        var generator = new ContextExportManifestGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [".ackit/prompt-packs/demo.md"], [], [], true, false, false, false, false, false, false, false, false, false);

        var result = generator.Generate(
            repo.Path,
            new ContextExportSpec(".ackit/prompt-packs/demo.md", ".ackit/context-exports/demo.json", "explicit-cli-flag", LanguageCode.English),
            scan);
        var manifestPath = System.IO.Path.Combine(repo.Path, ".ackit", "context-exports", "demo.json");
        var json = JsonNode.Parse(File.ReadAllText(manifestPath));

        Assert.True(result.Created);
        Assert.Equal(".ackit/prompt-packs/demo.md", json?["sourcePromptPack"]?["path"]?.GetValue<string>());
        Assert.True(json?["sourcePromptPack"]?["sizeBytes"]?.GetValue<long>() > 0);
        Assert.True(json?["approval"]?["approved"]?.GetValue<bool>());
        Assert.Equal("explicit-cli-flag", json?["approval"]?["mode"]?.GetValue<string>());
        Assert.True(json?["safety"]?["noRemoteCall"]?.GetValue<bool>());
        Assert.False(json?["safety"]?["apiKeyAccessed"]?.GetValue<bool>());
    }

    [Fact]
    public void ContextExportManifestGeneratorDoesNotOverwriteExistingManifest()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/prompt-packs/demo.md", "# Prompt Pack");
        repo.Write(".ackit/context-exports/demo.json", "original");
        var generator = new ContextExportManifestGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        var result = generator.Generate(
            repo.Path,
            new ContextExportSpec(".ackit/prompt-packs/demo.md", ".ackit/context-exports/demo.json", "explicit-cli-flag", LanguageCode.English),
            scan);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "context-exports", "demo.json"));

        Assert.False(result.Created);
        Assert.Equal("original", content);
    }

    [Fact]
    public void ContextExportManifestGeneratorRejectsUnsafePaths()
    {
        using var repo = TempRepository.Create();
        var generator = new ContextExportManifestGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(repo.Path, [], [], [], false, false, false, false, false, false, false, false, false, false);

        Assert.Throws<InvalidOperationException>(() => generator.Generate(
            repo.Path,
            new ContextExportSpec("../pack.md", ".ackit/context-exports/demo.json", "explicit-cli-flag", LanguageCode.English),
            scan));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(
            repo.Path,
            new ContextExportSpec(".ackit/prompt-packs/demo.md", "../demo.json", "explicit-cli-flag", LanguageCode.English),
            scan));
    }
}

public sealed class ConfigAndDoctorTests
{
    [Fact]
    public void ConfigReaderFallsBackToEnglishForUnknownLanguage()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/config.yml", "defaultLanguage: de");
        var reader = new AckitConfigReader(new PhysicalFileSystem());

        var config = reader.Read(repo.Path);

        Assert.Equal("en", config.DefaultLanguage.Value);
        Assert.Contains(".ackit/reports/", config.IgnorePaths);
        Assert.Contains(".ackit/webui/", config.IgnorePaths);
        Assert.Contains(".ackit/prompt-packs/", config.IgnorePaths);
        Assert.Contains(".ackit/context-exports/", config.IgnorePaths);
    }

    [Fact]
    public void ConfigReaderParsesSchemaIgnorePathsAndRiskExtensions()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/config.yml", """
        schemaVersion: 3
        defaultLanguage: tr
        brandKeywords: ["Acme"]
        piiKeywords:
          - private-name
        ignorePaths:
          - generated/
        riskExtensions:
          - snapshot
        safeDomains:
          - docs.example.invalid
          - "*.trusted.example"
        ignoredPaths:
          - reports/
        ignoredFindingIds:
          - ackit003
        """);
        var reader = new AckitConfigReader(new PhysicalFileSystem());

        var config = reader.Read(repo.Path);

        Assert.Equal(3, config.SchemaVersion);
        Assert.Equal("tr", config.DefaultLanguage.Value);
        Assert.Contains("Acme", config.BrandKeywords);
        Assert.Contains("private-name", config.PiiKeywords);
        Assert.Contains("generated/", config.IgnorePaths);
        Assert.Contains(".snapshot", config.RiskExtensions);
        Assert.Contains("docs.example.invalid", config.SafeDomains);
        Assert.Contains("*.trusted.example", config.SafeDomains);
        Assert.Contains("reports/", config.IgnoredPaths);
        Assert.Contains("ACKIT003", config.IgnoredFindingIds);
    }

    [Fact]
    public void DoctorReportsMissingReadmeLicenseAndSecurity()
    {
        using var repo = TempRepository.Create();
        var scanner = TestServices.CreateRepositoryScanner();
        var scan = scanner.Scan(repo.Path);
        var doctor = new RepositoryDoctor(new PhysicalFileSystem());

        var result = doctor.Check(repo.Path, scan);

        Assert.Contains(result.Checks, check => check.Name == "README" && !check.Passed);
        Assert.Contains(result.Checks, check => check.Name == "LICENSE" && !check.Passed);
        Assert.Contains(result.Checks, check => check.Name == "SECURITY" && !check.Passed);
    }
}

public sealed class CliJsonAndMetadataTests
{
    [Theory]
    [InlineData("")]
    [InlineData("help")]
    [InlineData("--help")]
    [InlineData("-h")]
    [InlineData("version")]
    [InlineData("--version")]
    public void HelpAndVersionAliasesReturnSuccess(string argument)
    {
        using var repo = TempRepository.Create();
        var args = string.IsNullOrEmpty(argument) ? Array.Empty<string>() : [argument];

        var result = RunCli(repo.Path, args);

        Assert.Equal(0, result.ExitCode);
        Assert.True(result.Output.Contains("Usage:", StringComparison.Ordinal) ||
                    result.Output.Contains("AgentContextKit 0.2.0-alpha.2", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("sarif")]
    [InlineData("task")]
    [InlineData("context-export --approve")]
    [InlineData("context-export --prompt-pack missing.md")]
    public void InvalidInvocationsReturnError(string commandLine)
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, commandLine.Split(' ', StringSplitOptions.RemoveEmptyEntries));

        Assert.Equal(1, result.ExitCode);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }

    [Fact]
    public void HumanAndJsonModesShareRiskAndHealthExitDecisions()
    {
        using var highRepo = TempRepository.Create();
        highRepo.Write("settings.txt", "password" + "=not-for-public");
        AssertSameExitCode(highRepo.Path, ["scan", "--ci"], 1);

        using var productionConfigRepo = TempRepository.Create();
        productionConfigRepo.Write("appsettings.Production.json", "{}");
        AssertSameExitCode(productionConfigRepo.Path, ["redact-check", "--profile", "public-release"], 1);

        using var incompleteRepo = TempRepository.Create();
        AssertSameExitCode(incompleteRepo.Path, ["doctor"], 1);

        using var invalidConfigRepo = TempRepository.Create();
        invalidConfigRepo.Write(".ackit/config.yml", "safeDomains: [not-a-domain]");
        AssertSameExitCode(invalidConfigRepo.Path, ["config-check"], 1);
    }

    [Fact]
    public void SuccessfulJsonCommandsExposeSchemaVersionTwoEnvelope()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("LICENSE", "MIT");
        repo.Write("SECURITY.md", "# Security");
        repo.Write("CONTRIBUTING.md", "# Contributing");
        repo.Write("CODE_OF_CONDUCT.md", "# Code of Conduct");
        repo.Write("CHANGELOG.md", "# Changelog");
        repo.Write(".gitignore", "bin/");
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("tests/DemoTests.cs", "// tests");

        var commands = new (string Command, string[] Args)[]
        {
            ("init", ["init", "--json"]),
            ("config-check", ["config-check", "--json"]),
            ("scan", ["scan", "--json"]),
            ("sarif", ["sarif", "--output", ".ackit/reports/contract.sarif", "--json"]),
            ("report", ["report", "--output", ".ackit/reports/contract.html", "--json"]),
            ("webui", ["webui", "--output", ".ackit/webui/contract.html", "--json"]),
            ("prompt-pack", ["prompt-pack", "--output", ".ackit/prompt-packs/contract.md", "--json"]),
            ("context-export", ["context-export", "--prompt-pack", ".ackit/prompt-packs/contract.md", "--approve", "--output", ".ackit/context-exports/contract.json", "--json"]),
            ("generate", ["generate", "--target", "codex", "--json"]),
            ("task", ["task", "JSON contract task", "--json"]),
            ("redact-check", ["redact-check", "--profile", "public-release", "--json"]),
            ("doctor", ["doctor", "--json"])
        };

        foreach (var (command, args) in commands)
        {
            var result = RunCli(repo.Path, args);
            var json = JsonNode.Parse(result.Output);

            Assert.Equal(0, result.ExitCode);
            AssertJsonEnvelope(json, command);
        }
    }

    [Fact]
    public void ScanJsonFindingContractIncludesStableRequiredFields()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "password" + "=not-for-public");

        var result = RunCli(repo.Path, ["scan", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var finding = Assert.Single(json?["findings"]?.AsArray() ?? []);

        Assert.Equal(0, result.ExitCode);
        AssertJsonEnvelope(json, "scan");
        AssertRiskSummary(json?["riskSummary"]);
        Assert.StartsWith("ACKIT", finding?["ruleId"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(finding?["severity"]?.GetValue<string>()));
        Assert.False(string.IsNullOrWhiteSpace(finding?["category"]?.GetValue<string>()));
        Assert.Equal("settings.txt", finding?["path"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(finding?["message"]?.GetValue<string>()));
        Assert.True(finding?.AsObject().ContainsKey("match"));
    }

    [Fact]
    public void ConfigCheckMissingFileReportsValidDefaults()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["config-check", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(0, result.ExitCode);
        AssertJsonEnvelope(json, "config-check");
        Assert.Equal(0, json?["exitCode"]?.GetValue<int>());
        Assert.False(json?["config"]?["exists"]?.GetValue<bool>());
        Assert.Equal("default", json?["config"]?["status"]?.GetValue<string>());
        Assert.Equal(0, json?["diagnosticSummary"]?["total"]?.GetValue<int>());
        Assert.Empty(json?["diagnostics"]?.AsArray() ?? []);
    }

    [Fact]
    public void ConfigCheckWarningReportsMigrationWithoutMutation()
    {
        using var repo = TempRepository.Create();
        const string content = "allowedFindingIds: [ACKIT003]";
        repo.Write(".ackit/config.yml", content);

        var result = RunCli(repo.Path, ["config-check", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var diagnostic = Assert.Single(json?["diagnostics"]?.AsArray() ?? []);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("warnings", json?["config"]?["status"]?.GetValue<string>());
        Assert.True(json?["config"]?["migrationRequired"]?.GetValue<bool>());
        Assert.Equal("ACKITCFG002", diagnostic?["code"]?.GetValue<string>());
        Assert.Equal("Warning", diagnostic?["severity"]?.GetValue<string>());
        Assert.Equal(content, File.ReadAllText(Path.Combine(repo.Path, ".ackit", "config.yml")));
    }

    [Fact]
    public void ConfigCheckErrorsAreSanitizedAndReturnOne()
    {
        using var repo = TempRepository.Create();
        const string rawValue = "private-value-not-for-output/path";
        repo.Write(".ackit/config.yml", $"safeDomains: [{rawValue}]");

        var human = RunCli(repo.Path, ["config-check"]);
        var jsonResult = RunCli(repo.Path, ["config-check", "--json"]);
        var json = JsonNode.Parse(jsonResult.Output);

        Assert.Equal(1, human.ExitCode);
        Assert.Equal(1, jsonResult.ExitCode);
        Assert.Equal(1, json?["exitCode"]?.GetValue<int>());
        Assert.Equal("errors", json?["config"]?["status"]?.GetValue<string>());
        Assert.Equal(1, json?["diagnosticSummary"]?["errors"]?.GetValue<int>());
        Assert.Equal("ACKITCFG009", json?["diagnostics"]?[0]?["code"]?.GetValue<string>());
        Assert.DoesNotContain(rawValue, human.Output, StringComparison.Ordinal);
        Assert.DoesNotContain(rawValue, jsonResult.Output, StringComparison.Ordinal);
    }

    [Fact]
    public void HelpIncludesConfigCheckCommand()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["--help"]);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("ackit config-check [--lang en|tr] [--json]", result.Output);
    }

    [Fact]
    public void TurkishConfigCheckUsesLocalizedLabels()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["config-check", "--lang", "tr"]);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("Yapılandırma kontrolü", result.Output);
        Assert.Contains("Durum: varsayılan", result.Output);
        Assert.Contains("Tanılar: 0", result.Output);
    }

    [Fact]
    public void ScanJsonIncludesSanitizedSuppressionAudit()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/config.yml", """
            schemaVersion: 1
            defaultLanguage: en
            ignoredFindingIds:
              - ACKIT003
            """);
        repo.Write("artifacts/tool.nupkg", "fixture content");

        var jsonResult = RunCli(repo.Path, ["scan", "--json"]);
        var json = JsonNode.Parse(jsonResult.Output);
        var suppression = Assert.Single(json?["suppressions"]?.AsArray() ?? []);

        Assert.Equal(0, jsonResult.ExitCode);
        Assert.Empty(json?["findings"]?.AsArray() ?? []);
        Assert.Equal(1, json?["suppressionSummary"]?["total"]?.GetValue<int>());
        Assert.Equal(1, json?["suppressionSummary"]?["ignoredFindingIds"]?.GetValue<int>());
        Assert.Equal("ACKIT003", suppression?["ruleId"]?.GetValue<string>());
        Assert.Equal("artifacts/tool.nupkg", suppression?["path"]?.GetValue<string>());
        Assert.Equal("ignoredFindingIds", suppression?["reason"]?.GetValue<string>());
        Assert.False(suppression?.AsObject().ContainsKey("match"));
        Assert.False(suppression?.AsObject().ContainsKey("message"));

        var humanResult = RunCli(repo.Path, ["scan"]);
        Assert.Equal(0, humanResult.ExitCode);
        Assert.Contains("Suppressed findings: 1", humanResult.Output);
        Assert.Contains("via ignoredFindingIds", humanResult.Output);
        Assert.DoesNotContain("fixture content", humanResult.Output);
    }

    [Fact]
    public void ScanHumanAndJsonDoNotExposeRawSecretMatches()
    {
        using var repo = TempRepository.Create();
        var fakeKey = TestData.OpenAiProjectKey();
        repo.Write("settings.txt", "token" + "=" + fakeKey);

        var human = RunCli(repo.Path, ["scan"]);
        var jsonResult = RunCli(repo.Path, ["scan", "--json"]);
        var json = JsonNode.Parse(jsonResult.Output);

        Assert.DoesNotContain(fakeKey, human.Output, StringComparison.Ordinal);
        Assert.DoesNotContain(fakeKey, jsonResult.Output, StringComparison.Ordinal);
        Assert.Null(json?["findings"]?[0]?["match"]);
    }

    [Fact]
    public void ScanJsonOutputIsValid()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("LICENSE", "MIT");

        var result = RunCli(repo.Path, ["scan", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(2, json?["schemaVersion"]?.GetValue<int>());
        Assert.Equal("0.2.0-alpha.2", json?["toolVersion"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json?["generatedAtUtc"]?.GetValue<string>()));
        Assert.Equal("scan", json?["command"]?.GetValue<string>());
        Assert.False(json?["ciMode"]?.GetValue<bool>());
        Assert.Equal(0, json?["exitCode"]?.GetValue<int>());
        Assert.False(string.IsNullOrWhiteSpace(json?["repositoryName"]?.GetValue<string>()));
        Assert.True(json?["fileCount"]?.GetValue<int>() >= 2);
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
    }

    [Fact]
    public void TurkishScanOutputUsesNaturalUtf8Text()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");

        var result = RunCli(repo.Path, ["scan", "--lang", "tr"]);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("Tarama özeti", result.Output);
        Assert.Contains("Risk bulgusu yok.", result.Output);
    }

    [Fact]
    public void TurkishInitOutputUsesNaturalUtf8Text()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["init", "--lang", "tr"]);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("oluşturuldu", result.Output);
    }

    [Fact]
    public void TurkishDoctorOutputUsesNaturalUtf8Text()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["doctor", "--lang", "tr"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Sağlık kontrolleri", result.Output);
    }

    [Fact]
    public void TurkishJsonOutputKeepsSchemaFields()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");

        var result = RunCli(repo.Path, ["scan", "--lang", "tr", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(2, json?["schemaVersion"]?.GetValue<int>());
        Assert.Equal("scan", json?["command"]?.GetValue<string>());
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
        Assert.DoesNotContain("Tarama özeti", result.Output);
    }

    [Fact]
    public void ScanWithoutCiPreservesZeroExitForFindings()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "password" + "=not-for-public");

        var result = RunCli(repo.Path, ["scan"]);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("High", result.Output);
    }

    [Fact]
    public void ScanCiReturnsOneForHighFindings()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "password" + "=not-for-public");

        var result = RunCli(repo.Path, ["scan", "--ci"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("High", result.Output);
    }

    [Fact]
    public void ScanCiReturnsTwoForCriticalFindings()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());

        var result = RunCli(repo.Path, ["scan", "--ci"]);

        Assert.Equal(2, result.ExitCode);
        Assert.Contains("Critical", result.Output);
    }

    [Fact]
    public void ScanCiJsonIncludesExitCode()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "password" + "=not-for-public");

        var result = RunCli(repo.Path, ["scan", "--ci", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(1, result.ExitCode);
        Assert.True(json?["ciMode"]?.GetValue<bool>());
        Assert.Equal(1, json?["exitCode"]?.GetValue<int>());
        Assert.True(json?["riskSummary"]?["high"]?.GetValue<int>() > 0);
    }

    [Fact]
    public void BaselineCommandCreatesSanitizedFileAndRequiresExplicitUpdate()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());

        var created = RunCli(repo.Path, ["baseline", "--json"]);
        var json = JsonNode.Parse(created.Output);
        var path = System.IO.Path.Combine(repo.Path, ".ackit-baseline.json");
        var content = File.ReadAllText(path);
        var duplicate = RunCli(repo.Path, ["baseline"]);
        var updated = RunCli(repo.Path, ["baseline", "--update", "--json"]);

        Assert.Equal(0, created.ExitCode);
        Assert.Equal("baseline", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit-baseline.json", json?["baseline"]?["path"]?.GetValue<string>());
        Assert.True(json?["baseline"]?["entryCount"]?.GetValue<int>() > 0);
        Assert.True(File.Exists(path));
        Assert.DoesNotContain(TestData.OpenAiProjectKey(), content, StringComparison.Ordinal);
        Assert.DoesNotContain("match", content, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, duplicate.ExitCode);
        Assert.Contains("ACKITBASE003", duplicate.Error);
        Assert.Equal(0, updated.ExitCode);
        Assert.Equal("Updated", JsonNode.Parse(updated.Output)?["baseline"]?["status"]?.GetValue<string>());
    }

    [Fact]
    public void BaselineAwareCiIgnoresExistingCriticalButBlocksNewCritical()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        Assert.Equal(0, RunCli(repo.Path, ["baseline"]).ExitCode);

        var baselineHuman = RunCli(repo.Path, ["scan", "--ci", "--baseline", ".ackit-baseline.json"]);
        var baselineJson = RunCli(repo.Path, ["scan", "--ci", "--baseline", ".ackit-baseline.json", "--json"]);
        var json = JsonNode.Parse(baselineJson.Output);
        var defaultCi = RunCli(repo.Path, ["scan", "--ci"]);

        Assert.Equal(0, baselineHuman.ExitCode);
        Assert.Equal(0, baselineJson.ExitCode);
        Assert.Contains("Critical", baselineHuman.Output);
        Assert.Contains("Existing findings:", baselineHuman.Output);
        Assert.Contains("New findings: 0", baselineHuman.Output);
        Assert.True(json?["baseline"]?["existing"]?.GetValue<int>() > 0);
        Assert.Equal(0, json?["baseline"]?["new"]?.GetValue<int>());
        Assert.Equal("existing", json?["baseline"]?["classifiedFindings"]?[0]?["status"]?.GetValue<string>());
        Assert.Equal(2, defaultCi.ExitCode);

        repo.Write("second.txt", "token" + "=" + TestData.GitHubFineGrainedToken());
        var changed = RunCli(repo.Path, ["scan", "--ci", "--baseline", ".ackit-baseline.json", "--json"]);
        var changedJson = JsonNode.Parse(changed.Output);

        Assert.Equal(2, changed.ExitCode);
        Assert.True(changedJson?["baseline"]?["new"]?.GetValue<int>() > 0);
        Assert.Equal(2, changedJson?["exitCode"]?.GetValue<int>());
    }

    [Fact]
    public void BaselineAwareCiBlocksSeverityEscalationForExistingFingerprint()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        var reviewedHigh = new BaselineManifest(
        [
            new BaselineEntry("ACKIT001", "settings.txt", RiskSeverity.High, new BaselineLocation(occurrence: 1))
        ]);
        new BaselineStore(new PhysicalFileSystem()).Write(repo.Path, ".ackit-baseline.json", reviewedHigh, update: false);

        var result = RunCli(repo.Path, ["scan", "--ci", "--baseline", ".ackit-baseline.json", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(2, result.ExitCode);
        Assert.True(json?["baseline"]?["new"]?.GetValue<int>() >= 1);
        Assert.Equal("new", json?["baseline"]?["classifiedFindings"]?[0]?["status"]?.GetValue<string>());
    }

    [Fact]
    public void BaselineScanReportsStructuredMissingFileError()
    {
        using var repo = TempRepository.Create();

        var human = RunCli(repo.Path, ["scan", "--baseline", "missing.json"]);
        var jsonResult = RunCli(repo.Path, ["scan", "--baseline", "missing.json", "--json"]);
        var json = JsonNode.Parse(jsonResult.Output);

        Assert.Equal(1, human.ExitCode);
        Assert.Contains("ACKITBASE002", human.Error);
        Assert.Equal(1, jsonResult.ExitCode);
        Assert.Equal("ACKITBASE002", json?["error"]?["code"]?.GetValue<string>());
        Assert.Equal(1, json?["exitCode"]?.GetValue<int>());
    }

    [Fact]
    public void UnknownCommandReturnsErrorExitCode()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["unknown-command"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Unknown command", result.Error);
    }

    [Fact]
    public void TaskWithoutTitleReturnsErrorExitCode()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["task", "--lang", "en"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("requires a title", result.Error);
    }

    [Fact]
    public void ReportJsonCreatesHtmlReport()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");

        var result = RunCli(repo.Path, ["report", "--output", ".ackit/reports/test-report.html", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var reportPath = System.IO.Path.Combine(repo.Path, ".ackit", "reports", "test-report.html");

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("report", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit/reports/test-report.html", json?["report"]?["path"]?.GetValue<string>());
        Assert.True(File.Exists(reportPath));
        Assert.Contains("<!doctype html>", File.ReadAllText(reportPath));
    }

    [Fact]
    public void SarifJsonCreatesParseableSarifReport()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");

        var result = RunCli(repo.Path, ["sarif", "--output", ".ackit/reports/test.sarif", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var sarifPath = System.IO.Path.Combine(repo.Path, ".ackit", "reports", "test.sarif");
        var sarif = JsonNode.Parse(File.ReadAllText(sarifPath));

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("sarif", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit/reports/test.sarif", json?["sarif"]?["path"]?.GetValue<string>());
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
        Assert.True(File.Exists(sarifPath));
        Assert.Equal("2.1.0", sarif?["version"]?.GetValue<string>());
        Assert.Equal("AgentContextKit", sarif?["runs"]?[0]?["tool"]?["driver"]?["name"]?.GetValue<string>());
    }

    [Fact]
    public void WebUiJsonCreatesPrototype()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("docs/tasks/TASK-0001-demo.md", "# Demo Task");

        var result = RunCli(repo.Path, ["webui", "--output", ".ackit/webui/test-index.html", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var webUiPath = System.IO.Path.Combine(repo.Path, ".ackit", "webui", "test-index.html");
        var content = File.ReadAllText(webUiPath);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("webui", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit/webui/test-index.html", json?["webUi"]?["path"]?.GetValue<string>());
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
        Assert.True(File.Exists(webUiPath));
        Assert.Contains("AgentContextKit Web UI", content);
        Assert.Contains("docs/tasks/TASK-0001-demo.md", content);
    }

    [Fact]
    public void BaselineMetadataIsConsistentAcrossSarifReportAndWebUi()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        Assert.Equal(0, RunCli(repo.Path, ["baseline"]).ExitCode);

        var sarifResult = RunCli(repo.Path, ["sarif", "--output", ".ackit/reports/baseline.sarif", "--baseline", ".ackit-baseline.json", "--json"]);
        var reportResult = RunCli(repo.Path, ["report", "--output", ".ackit/reports/baseline.html", "--baseline", ".ackit-baseline.json", "--json"]);
        var webUiResult = RunCli(repo.Path, ["webui", "--output", ".ackit/webui/baseline.html", "--baseline", ".ackit-baseline.json", "--json"]);
        var sarifJson = JsonNode.Parse(sarifResult.Output);
        var reportJson = JsonNode.Parse(reportResult.Output);
        var webUiJson = JsonNode.Parse(webUiResult.Output);
        var sarif = JsonNode.Parse(File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "baseline.sarif")));
        var report = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "reports", "baseline.html"));
        var webUi = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".ackit", "webui", "baseline.html"));

        Assert.Equal(0, sarifResult.ExitCode);
        Assert.Equal(0, reportResult.ExitCode);
        Assert.Equal(0, webUiResult.ExitCode);
        Assert.True(sarifJson?["baseline"]?["existing"]?.GetValue<int>() > 0);
        Assert.Equal(sarifJson?["baseline"]?["existing"]?.GetValue<int>(), reportJson?["baseline"]?["existing"]?.GetValue<int>());
        Assert.Equal(sarifJson?["baseline"]?["existing"]?.GetValue<int>(), webUiJson?["baseline"]?["existing"]?.GetValue<int>());
        Assert.Equal("existing", sarif?["runs"]?[0]?["results"]?[0]?["properties"]?["baselineStatus"]?.GetValue<string>());
        Assert.Contains("Baseline Classification", report);
        Assert.Contains("Existing findings", webUi);
    }

    [Theory]
    [InlineData("sarif", ".ackit/reports/missing.sarif")]
    [InlineData("report", ".ackit/reports/missing.html")]
    [InlineData("webui", ".ackit/webui/missing.html")]
    public void BaselineOutputCommandsUseStructuredMissingFileError(string command, string output)
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, [command, "--output", output, "--baseline", "missing.json", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(1, result.ExitCode);
        Assert.Equal("ACKITBASE002", json?["error"]?["code"]?.GetValue<string>());
        Assert.False(File.Exists(System.IO.Path.Combine(repo.Path, output.Replace('/', System.IO.Path.DirectorySeparatorChar))));
    }

    [Fact]
    public void PromptPackJsonCreatesDryRunPack()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("docs/tasks/TASK-0001-demo.md", "# Demo Task");

        var result = RunCli(repo.Path, ["prompt-pack", "--output", ".ackit/prompt-packs/test-pack.md", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var packPath = System.IO.Path.Combine(repo.Path, ".ackit", "prompt-packs", "test-pack.md");
        var content = File.ReadAllText(packPath);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("prompt-pack", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit/prompt-packs/test-pack.md", json?["promptPack"]?["path"]?.GetValue<string>());
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
        Assert.True(File.Exists(packPath));
        Assert.Contains("AgentContextKit Dry-Run Prompt Pack", content);
        Assert.Contains("No remote LLM provider call was made.", content);
    }

    [Fact]
    public void ContextExportRequiresExplicitApproval()
    {
        using var repo = TempRepository.Create();
        repo.Write(".ackit/prompt-packs/test-pack.md", "# Prompt Pack");

        var result = RunCli(repo.Path, ["context-export", "--prompt-pack", ".ackit/prompt-packs/test-pack.md", "--json"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("requires explicit --approve", result.Error);
    }

    [Fact]
    public void ContextExportJsonCreatesLocalManifest()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write(".ackit/prompt-packs/test-pack.md", "# Prompt Pack");

        var result = RunCli(repo.Path, ["context-export", "--prompt-pack", ".ackit/prompt-packs/test-pack.md", "--approve", "--output", ".ackit/context-exports/test-export.json", "--json"]);
        var json = JsonNode.Parse(result.Output);
        var manifestPath = System.IO.Path.Combine(repo.Path, ".ackit", "context-exports", "test-export.json");
        var manifest = JsonNode.Parse(File.ReadAllText(manifestPath));

        Assert.Equal(0, result.ExitCode);
        Assert.Equal("context-export", json?["command"]?.GetValue<string>());
        Assert.Equal(".ackit/context-exports/test-export.json", json?["contextExport"]?["path"]?.GetValue<string>());
        Assert.Equal(0, json?["riskSummary"]?["total"]?.GetValue<int>());
        Assert.Equal(".ackit/prompt-packs/test-pack.md", manifest?["sourcePromptPack"]?["path"]?.GetValue<string>());
        Assert.True(manifest?["approval"]?["approved"]?.GetValue<bool>());
        Assert.True(manifest?["safety"]?["noRemoteCall"]?.GetValue<bool>());
    }

    [Fact]
    public void DoctorJsonOutputIsValid()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("LICENSE", "MIT");
        repo.Write("SECURITY.md", "# Security");
        repo.Write(".gitignore", "bin/");
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("tests/DemoTests.cs", "// tests");

        var result = RunCli(repo.Path, ["doctor", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(2, json?["schemaVersion"]?.GetValue<int>());
        Assert.Equal("0.2.0-alpha.2", json?["toolVersion"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json?["generatedAtUtc"]?.GetValue<string>()));
        Assert.Equal("doctor", json?["command"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json?["repositoryName"]?.GetValue<string>()));
        Assert.True(json?["checkSummary"]?["total"]?.GetValue<int>() > 0);
        Assert.Equal(0, json?["checkSummary"]?["failedHighOrCritical"]?.GetValue<int>());
        Assert.True(json?["checks"]?.AsArray().Count > 0);
    }

    [Fact]
    public void RedactCheckJsonPreservesCriticalExitCode()
    {
        using var repo = TempRepository.Create();
        repo.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());

        var result = RunCli(repo.Path, ["redact-check", "--profile", "public-release", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(2, result.ExitCode);
        Assert.Equal(2, json?["schemaVersion"]?.GetValue<int>());
        Assert.Equal("0.2.0-alpha.2", json?["toolVersion"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json?["generatedAtUtc"]?.GetValue<string>()));
        Assert.Equal("redact-check", json?["command"]?.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json?["repositoryName"]?.GetValue<string>()));
        Assert.Equal("public-release", json?["profile"]?.GetValue<string>());
        Assert.Equal(2, json?["exitCode"]?.GetValue<int>());
        Assert.True(json?["riskSummary"]?["critical"]?.GetValue<int>() > 0);
    }

    [Fact]
    public void GenerateJsonIncludesFileSummary()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");

        var result = RunCli(repo.Path, ["generate", "--target", "codex", "--json"]);
        var json = JsonNode.Parse(result.Output);

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(2, json?["schemaVersion"]?.GetValue<int>());
        Assert.False(string.IsNullOrWhiteSpace(json?["generatedAtUtc"]?.GetValue<string>()));
        Assert.Equal("generate", json?["command"]?.GetValue<string>());
        Assert.True(json?["fileSummary"]?["total"]?.GetValue<int>() > 0);
        Assert.True(json?["fileSummary"]?["created"]?.GetValue<int>() > 0);
        Assert.True(json?["files"]?.AsArray().Count > 0);
    }

    [Fact]
    public void PackageMetadataAndLicenseUsePseudonym()
    {
        var root = LocateRepositoryRoot();
        var projectFile = File.ReadAllText(System.IO.Path.Combine(root, "src", "AgentContextKit.Cli", "AgentContextKit.Cli.csproj"));
        var license = File.ReadAllText(System.IO.Path.Combine(root, "LICENSE"));

        Assert.Contains("<Authors>Cynrath</Authors>", projectFile);
        Assert.Contains("<Company>Cynrath</Company>", projectFile);
        Assert.Contains("<Copyright>Copyright (c) 2026 Cynrath</Copyright>", projectFile);
        Assert.Contains("<Version>0.2.0-alpha.2</Version>", projectFile);
        Assert.Contains("Scanner precision hardening, sanitized suppression audit output, baseline severity-escalation policy, config diagnostic polish, local Markdown link validation, and exact-commit OIDC release automation.", projectFile);
        Assert.Contains("<PackageProjectUrl>https://github.com/Cynrath/agent-context-kit</PackageProjectUrl>", projectFile);
        Assert.Contains("<RepositoryUrl>https://github.com/Cynrath/agent-context-kit</RepositoryUrl>", projectFile);
        Assert.Contains("<RepositoryType>git</RepositoryType>", projectFile);
        Assert.Contains("<PackageReadmeFile>README.md</PackageReadmeFile>", projectFile);
        Assert.Contains("<ToolCommandName>ackit</ToolCommandName>", projectFile);
        Assert.Contains("Copyright (c) 2026 Cynrath", license);
    }

    private static (int ExitCode, string Output, string Error) RunCli(string workingDirectory, string[] args)
    {
        var originalDirectory = Directory.GetCurrentDirectory();
        var originalOut = Console.Out;
        var originalError = Console.Error;

        using var output = new StringWriter();
        using var error = new StringWriter();

        try
        {
            Directory.SetCurrentDirectory(workingDirectory);
            Console.SetOut(output);
            Console.SetError(error);
            var exitCode = AgentContextKit.Cli.Program.Main(args);
            return (exitCode, output.ToString(), error.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
            Directory.SetCurrentDirectory(originalDirectory);
        }
    }

    private static void AssertJsonEnvelope(JsonNode? json, string command)
    {
        Assert.NotNull(json);
        Assert.Equal(2, json["schemaVersion"]?.GetValue<int>());
        Assert.Equal("0.2.0-alpha.2", json["toolVersion"]?.GetValue<string>());
        Assert.Equal(command, json["command"]?.GetValue<string>());
        Assert.True(DateTimeOffset.TryParse(json["generatedAtUtc"]?.GetValue<string>(), out _));
    }

    private static void AssertRiskSummary(JsonNode? summary)
    {
        Assert.NotNull(summary);
        foreach (var field in new[] { "total", "critical", "high", "medium", "low", "info" })
        {
            Assert.True(summary.AsObject().ContainsKey(field));
            Assert.True(summary[field]?.GetValue<int>() >= 0);
        }
    }

    private static void AssertSameExitCode(string repositoryPath, string[] args, int expectedExitCode)
    {
        var humanResult = RunCli(repositoryPath, args);
        var jsonResult = RunCli(repositoryPath, [.. args, "--json"]);
        var json = JsonNode.Parse(jsonResult.Output);

        Assert.Equal(expectedExitCode, humanResult.ExitCode);
        Assert.Equal(expectedExitCode, jsonResult.ExitCode);
        Assert.Equal(expectedExitCode, json?["exitCode"]?.GetValue<int>());
    }

    [Fact]
    public void AgentGeneratorCreatesAnthropicTarget()
    {
        using var repo = TempRepository.Create();
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(repo.Path, ["AGENTS.md"], [new StackInfo(".NET", ".csproj")], [], true, false, false, false, false, false, false, false, false, true);

        var results = generator.Generate(repo.Path, AgentTarget.Anthropic, LanguageCode.English, scan);

        var anthropic = Assert.Single(results, r => r.Path == "ANTHROPIC.md");
        Assert.Equal(GeneratedFileStatus.Created, anthropic.Status);
        Assert.True(File.Exists(System.IO.Path.Combine(repo.Path, "ANTHROPIC.md")));
    }

    [Fact]
    public void AgentGeneratorCreatesContinueTarget()
    {
        using var repo = TempRepository.Create();
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(repo.Path, ["AGENTS.md"], [new StackInfo(".NET", ".csproj")], [], true, false, false, false, false, false, false, false, false, true);

        var results = generator.Generate(repo.Path, AgentTarget.Continue, LanguageCode.English, scan);

        var cont = Assert.Single(results, r => r.Path == ".continue/config.json");
        Assert.Equal(GeneratedFileStatus.Created, cont.Status);
        var content = File.ReadAllText(System.IO.Path.Combine(repo.Path, ".continue", "config.json"));
        Assert.Contains("\"name\": \"agent-context-kit\"", content);
        Assert.Contains("\"systemPrompt\":", content);
    }

    [Fact]
    public void AgentGeneratorAllTargetIncludesAnthropicAndContinue()
    {
        using var repo = TempRepository.Create();
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(repo.Path, ["AGENTS.md"], [new StackInfo(".NET", ".csproj")], [], true, false, false, false, false, false, false, false, false, true);

        var results = generator.Generate(repo.Path, AgentTarget.All, LanguageCode.English, scan);

        Assert.Contains(results, r => r.Path == "ANTHROPIC.md" && r.Status == GeneratedFileStatus.Created);
        Assert.Contains(results, r => r.Path == ".continue/config.json" && r.Status == GeneratedFileStatus.Created);
        Assert.Contains(results, r => r.Path == "CLAUDE.md");
        Assert.Contains(results, r => r.Path == "AGENTS.md");
    }

    [Fact]
    public void AgentGeneratorSkipsExistingAnthropicAndContinue()
    {
        using var repo = TempRepository.Create();
        repo.Write("ANTHROPIC.md", "kept-anthropic");
        repo.Write(".continue/config.json", "{\"kept\": true}");
        var generator = new AgentInstructionGenerator(new PhysicalFileSystem(), new TemplateRenderer(), new FixedClock());
        var scan = new ScanResult(repo.Path, ["AGENTS.md"], [new StackInfo(".NET", ".csproj")], [], true, false, false, false, false, false, false, false, false, true);

        var results = generator.Generate(repo.Path, AgentTarget.Anthropic, LanguageCode.English, scan);
        Assert.Contains(results, r => r.Path == "ANTHROPIC.md" && r.Status == GeneratedFileStatus.SkippedExisting);

        results = generator.Generate(repo.Path, AgentTarget.Continue, LanguageCode.English, scan);
        Assert.Contains(results, r => r.Path == ".continue/config.json" && r.Status == GeneratedFileStatus.SkippedExisting);
    }

    private static string LocateRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(System.IO.Path.Combine(directory.FullName, "AgentContextKit.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Repository root could not be located.");
    }
}

internal static class TestServices
{
    public static RepositoryScanner CreateRepositoryScanner()
    {
        var fileSystem = new PhysicalFileSystem();
        var secretScanner = new SecretScanner();
        var brandPiiScanner = new BrandPiiScanner();
        var riskScanner = new RiskScanner(fileSystem, secretScanner, brandPiiScanner);
        return new RepositoryScanner(fileSystem, new StackDetector(fileSystem), riskScanner);
    }
}

internal static class TestData
{
    public static string OpenAiProjectKey()
    {
        return "sk" + "-proj-" + "1234567890abcdef";
    }

    public static string GitHubFineGrainedToken()
    {
        return "github" + "_pat_" + "1234567890abcdef";
    }

    public static string GenericApiKey()
    {
        return "sk" + "-" + "1234567890abcdef";
    }

    public static string GitHubClassicToken()
    {
        return "ghp" + "_" + "1234567890abcdef";
    }

    public static string AwsAccessKey()
    {
        return "AKIA" + "1234567890ABCDEF";
    }

    public static string WindowsWorkspacePath()
    {
        return "C" + ":\\Users\\example\\project";
    }

    public static string UnixWorkspacePath()
    {
        return "/" + "home/example/project";
    }
}

internal sealed class FixedClock : IClock
{
    public DateTimeOffset UtcNow => new(2026, 6, 2, 0, 0, 0, TimeSpan.Zero);
}

internal sealed class FakeLlmProvider : ILLMProvider
{
    public string Name => "fake";

    public Task<LlmProviderResponse> GenerateAsync(LlmProviderRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(new LlmProviderResponse(
            "Dry-run only.",
            Name,
            request.Model,
            requestId: "req-001",
            tokenUsage: new LlmTokenUsage(3, 2, 5),
            warnings: ["No remote call was made."]));
    }
}

internal sealed class TempRepository : IDisposable
{
    private TempRepository(string path)
    {
        Path = path;
    }

    public string Path { get; }

    public static TempRepository Create()
    {
        var path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "ackit-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return new TempRepository(path);
    }

    public void Write(string relativePath, string content)
    {
        var fullPath = System.IO.Path.Combine(Path, relativePath.Replace('/', System.IO.Path.DirectorySeparatorChar));
        var directory = System.IO.Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(fullPath, content);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
