using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class CatalogRuleStabilityTests
{
    [Fact]
    public void CatalogRuleShapeMatchesStructuralInvariants()
    {
        var rules = RiskRuleCatalog.All;

        Assert.NotEmpty(rules);
        Assert.All(rules, rule =>
        {
            Assert.Matches("^ACKIT\\d{3}$", rule.Id);
            Assert.False(string.IsNullOrWhiteSpace(rule.Name));
            Assert.False(string.IsNullOrWhiteSpace(rule.Description));
            Assert.False(string.IsNullOrWhiteSpace(rule.Recommendation));
            Assert.True(Enum.IsDefined(rule.DefaultSeverity),
                $"Rule {rule.Id} has an undefined severity value: {rule.DefaultSeverity}");
        });

        var ids = rules.Select(rule => rule.Id).ToArray();
        Assert.Equal(ids.Length, ids.Distinct(StringComparer.Ordinal).Count());

        var idSeverityPairs = rules
            .Select(rule => (rule.Id, rule.DefaultSeverity))
            .ToArray();
        Assert.Equal(idSeverityPairs.Length, idSeverityPairs.Distinct().Count());
    }

    [Fact]
    public void CatalogRuleBaselineJsonDoesNotDrift()
    {
        var actual = SerializeCatalog();

        if (BaselineNode is null)
        {
            throw new InvalidOperationException(
                "Embedded catalog baseline is null. Re-run after regenerating the embedded baseline from the current SerializeCatalog() output.");
        }

        var actualNode = JsonNode.Parse(actual);
        if (actualNode is null || !JsonNode.DeepEquals(actualNode, BaselineNode))
        {
            var tempPath = Path.Combine(Path.GetTempPath(), "catalog-baseline-" + Guid.NewGuid().ToString("N") + ".json");
            File.WriteAllText(tempPath, actual);

            Assert.Fail(
                "RiskRuleCatalog baseline drifted. If the change is intentional, regenerate the embedded `BaselineNode` (or `Baseline`) constant from the current SerializeCatalog() output and commit the new baseline alongside the rule change. Actual baseline written to: "
                + tempPath
                + "\n\nActual:\n"
                + actual
                + "\n\nExpected:\n"
                + BaselineNode.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
    }

    private static string SerializeCatalog()
    {
        var payload = RiskRuleCatalog.All
            .OrderBy(rule => rule.Id, StringComparer.Ordinal)
            .Select(rule => new
            {
                id = rule.Id,
                name = rule.Name,
                category = rule.Category.ToString(),
                defaultSeverity = rule.DefaultSeverity.ToString(),
                description = rule.Description,
                recommendation = rule.Recommendation
            })
            .ToArray();

        var options = new JsonSerializerOptions
        {
            WriteIndented = true
        };

        return JsonSerializer.Serialize(payload, options) + Environment.NewLine;
    }

    private const string Baseline = """
        [
          {
            "id": "ACKIT001",
            "name": "SecretLike",
            "category": "Secret",
            "defaultSeverity": "Critical",
            "description": "Secret-like value, credential, key, or production secret risk.",
            "recommendation": "Remove the secret from source, rotate the credential if it was real, and move runtime values to a safe local secret store."
          },
          {
            "id": "ACKIT002",
            "name": "PiiOrBrandLike",
            "category": "Pii",
            "defaultSeverity": "Medium",
            "description": "PII-like, brand-like, email-like, or domain-like value requiring review.",
            "recommendation": "Confirm the value is intended for public release or replace it with a safe placeholder."
          },
          {
            "id": "ACKIT003",
            "name": "GeneratedOrBuildArtifact",
            "category": "BuildArtifact",
            "defaultSeverity": "Medium",
            "description": "Generated, build, package, backup, database, or archive artifact requiring review.",
            "recommendation": "Remove generated artifacts from source control and keep local outputs ignored."
          },
          {
            "id": "ACKIT004",
            "name": "LocalPathOrPrivateLocation",
            "category": "LocalPath",
            "defaultSeverity": "Low",
            "description": "Local path, user profile path, file URI, or private machine location requiring review.",
            "recommendation": "Replace absolute local paths with repository-relative paths or documentation-safe placeholders."
          },
          {
            "id": "ACKIT005",
            "name": "RepositoryHygiene",
            "category": "RepositoryHygiene",
            "defaultSeverity": "Medium",
            "description": "Repository hygiene, configuration, documentation, or release readiness issue.",
            "recommendation": "Review the repository hygiene item before public release or generated context export."
          },
          {
            "id": "ACKIT006",
            "name": "ProductionConfigLike",
            "category": "ProductionConfig",
            "defaultSeverity": "High",
            "description": "Production configuration, deployment manifest, environment template, or live-service connection string requiring review.",
            "recommendation": "Replace production connection strings, environment names, and deployment-only settings with safe local or placeholder values before public release."
          },
          {
            "id": "ACKIT007",
            "name": "DocumentationGap",
            "category": "Documentation",
            "defaultSeverity": "Medium",
            "description": "Documentation gap, stale guidance, missing required public document, or unclear wording requiring review.",
            "recommendation": "Update or add the relevant public documentation so the next reader or AI agent receives accurate, current guidance."
          },
          {
            "id": "ACKIT008",
            "name": "HighEntropyString",
            "category": "RepositoryHygiene",
            "defaultSeverity": "High",
            "description": "Long high-entropy string detected that may indicate an embedded secret, signing key, or signing token.",
            "recommendation": "Confirm the value is intentionally public; if it is a credential, remove it from source, rotate it, and move it to a safe local secret store."
          },
          {
            "id": "ACKIT999",
            "name": "GeneralFinding",
            "category": "RepositoryHygiene",
            "defaultSeverity": "Info",
            "description": "General AgentContextKit scanner finding.",
            "recommendation": "Review the finding and decide whether it should remain in the repository."
          }
        ]
        """;

    private static readonly JsonNode? BaselineNode = JsonNode.Parse(Baseline);
}