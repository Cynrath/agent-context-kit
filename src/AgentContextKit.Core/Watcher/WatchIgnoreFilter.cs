namespace AgentContextKit.Core;

public static class WatchIgnoreFilter
{
    private static readonly string[] AlwaysIgnoredDirectories = new[]
    {
        ".git", ".hg", ".svn",
        "bin", "obj", "out", "publish",
        "node_modules", ".pnp",
        ".vs", ".vscode", ".idea",
        ".next", ".turbo", ".cache"
    };

    private static readonly string[] IgnoredPathPrefixes = new[]
    {
        ".ackit/cache",
        ".ackit/reports",
        ".ackit/webui",
        ".ackit/prompt-packs",
        ".ackit/context-exports",
        ".ackit/sarif",
        ".ackit/baseline",
        ".remember"
    };

    private static readonly string[] EditorSwapPatterns = new[]
    {
        "*.swp", "*.swo", "*~", ".#*", "*.tmp", "*.bak"
    };

    public static bool IsIgnored(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return true;
        }

        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        if (normalized.Length == 0)
        {
            return true;
        }

        foreach (var prefix in IgnoredPathPrefixes)
        {
            if (normalized.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(normalized, prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        var segments = normalized.Split('/');
        foreach (var segment in segments)
        {
            foreach (var ignored in AlwaysIgnoredDirectories)
            {
                if (string.Equals(segment, ignored, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        var fileName = segments[^1];
        foreach (var pattern in EditorSwapPatterns)
        {
            if (MatchesWildcard(fileName, pattern))
            {
                return true;
            }
        }

        if (segments.Length == 1 && IsGeneratedOutput(normalized))
        {
            return true;
        }

        return false;
    }

    private static bool IsGeneratedOutput(string fileName)
    {
        if (fileName.EndsWith(".html", StringComparison.OrdinalIgnoreCase)) return true;
        if (fileName.EndsWith(".sarif", StringComparison.OrdinalIgnoreCase)) return true;
        if (fileName.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static bool MatchesWildcard(string value, string pattern)
    {
        if (!pattern.Contains('*'))
        {
            return string.Equals(value, pattern, StringComparison.OrdinalIgnoreCase);
        }

        var parts = pattern.Split('*');
        if (!string.IsNullOrEmpty(parts[0]) && !value.StartsWith(parts[0], StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
        var index = parts[0].Length;
        for (var i = 1; i < parts.Length - 1; i++)
        {
            var part = parts[i];
            if (part.Length == 0)
            {
                continue;
            }
            var found = value.IndexOf(part, index, StringComparison.OrdinalIgnoreCase);
            if (found < 0)
            {
                return false;
            }
            index = found + part.Length;
        }
        var tail = parts[^1];
        if (!string.IsNullOrEmpty(tail) && !value.EndsWith(tail, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
        return true;
    }
}
