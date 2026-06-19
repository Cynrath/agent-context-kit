namespace AgentContextKit.Core;

public static class TextTrimmer
{
    public const string Header = "# Trimmed by ackit trim";

    public const string Note = "\n<!-- trimmed: content exceeded max-chars; body truncated deterministically. -->\n";

    public static string Trim(string content, int maxChars)
    {
        if (content is null)
        {
            throw new ArgumentNullException(nameof(content));
        }

        if (maxChars < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxChars), "maxChars must not be negative.");
        }

        if (content.Length <= maxChars)
        {
            return content;
        }

        if (maxChars <= Header.Length + Note.Length)
        {
            return Header + Note;
        }

        var bodyBudget = maxChars - Header.Length - Note.Length;
        return Header + Note + content.Substring(0, bodyBudget);
    }
}
