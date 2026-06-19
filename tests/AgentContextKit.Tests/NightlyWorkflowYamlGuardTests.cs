using YamlDotNet.RepresentationModel;

namespace AgentContextKit.Tests;

public sealed class NightlyWorkflowYamlGuardTests
{
    [Fact]
    public void NightlyWorkflowYamlParses()
    {
        var path = LocateNightlyWorkflow();
        var text = File.ReadAllText(path);

        var stream = new YamlStream();
        using var reader = new StringReader(text);
        stream.Load(reader);

        Assert.Single(stream.Documents);
    }

    [Fact]
    public void NightlyWorkflowDeclaresScheduleAndDispatchTriggers()
    {
        var path = LocateNightlyWorkflow();
        var text = File.ReadAllText(path);

        var stream = new YamlStream();
        using var reader = new StringReader(text);
        stream.Load(reader);
        var root = stream.Documents[0].RootNode;

        Assert.True(
            TryGetMappingValue(root, "on", out var onNode),
            "Nightly workflow is missing the `on:` trigger root.");

        var triggerNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (onNode is YamlMappingNode onMap)
        {
            foreach (var entry in onMap.Children)
            {
                triggerNames.Add(((YamlScalarNode)entry.Key).Value ?? string.Empty);
            }
        }
        else if (onNode is YamlSequenceNode)
        {
            foreach (var entry in ((YamlSequenceNode)onNode).Children.OfType<YamlScalarNode>())
            {
                triggerNames.Add(entry.Value ?? string.Empty);
            }
        }
        else if (onNode is YamlScalarNode scalar)
        {
            triggerNames.Add(scalar.Value ?? string.Empty);
        }
        else
        {
            Assert.Fail("Unsupported `on:` trigger shape in nightly workflow YAML.");
        }

        Assert.Contains("schedule", triggerNames);
        Assert.Contains("workflow_dispatch", triggerNames);
    }

    private static string LocateNightlyWorkflow()
    {
        var current = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(current))
        {
            var probe = Path.Combine(current, "AgentContextKit.sln");
            if (File.Exists(probe))
            {
                return Path.Combine(current, ".github", "workflows", "nightly-local-check.yml");
            }

            current = Directory.GetParent(current)?.FullName ?? string.Empty;
        }

        throw new DirectoryNotFoundException("Could not locate nightly-local-check.yml from " + AppContext.BaseDirectory);
    }

    private static bool TryGetMappingValue(YamlNode parent, string key, out YamlNode? value)
    {
        value = null;
        if (parent is not YamlMappingNode map)
        {
            return false;
        }

        foreach (var entry in map.Children)
        {
            if (entry.Key is YamlScalarNode scalar && string.Equals(scalar.Value, key, StringComparison.Ordinal))
            {
                value = entry.Value;
                return true;
            }
        }

        return false;
    }
}