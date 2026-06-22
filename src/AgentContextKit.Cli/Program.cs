using AgentContextKit.Core;
using System.Text.Json;

namespace AgentContextKit.Cli;

public static class Program
{
    private const string Version = "0.2.0-alpha.4";
    private const string DefaultBaselinePath = ".ackit-baseline.json";
    private const int JsonSchemaVersion = 2;
    private const int ExitSuccess = 0;
    private const int ExitError = 1;
    private const int ExitCritical = 2;

    public static int Main(string[] args)
    {
        var language = LanguageCode.English;
        try
        {
            var services = CreateServices();
            var repositoryPath = Directory.GetCurrentDirectory();
            var config = services.ConfigReader.Read(repositoryPath);
            language = LanguageCode.From(GetOption(args, "--lang") ?? config.DefaultLanguage.Value);
            var command = args.Length == 0 ? "help" : args[0].Trim().ToLowerInvariant();
            var json = HasFlag(args, "--json");
            var ci = HasFlag(args, "--ci");

            return command switch
            {
                "help" or "--help" or "-h" => RunHelp(language, services.TextProvider),
                "version" or "--version" => RunVersion(),
                "init" => RunInit(repositoryPath, language, json, services),
                "config-check" => RunConfigCheck(repositoryPath, language, json, services),
                "scan" => RunScan(args, repositoryPath, config, language, json, ci, services),
                "baseline" => RunBaseline(args, repositoryPath, config, language, json, services),
                "sarif" => RunSarif(args, repositoryPath, config, language, json, services),
                "report" => RunReport(args, repositoryPath, config, language, json, services),
                "webui" => RunWebUi(args, repositoryPath, config, language, json, services),
                "prompt-pack" => RunPromptPack(args, repositoryPath, config, language, json, services),
                "context-export" => RunContextExport(args, repositoryPath, config, language, json, services),
                "generate" => RunGenerate(args, repositoryPath, language, json, services),
                "task" => RunTask(args, repositoryPath, language, json, services),
                "redact-check" => RunRedactCheck(args, repositoryPath, config, language, json, services),
                "doctor" => RunDoctor(repositoryPath, config, language, json, services),
                "hooks" => RunHooks(args, repositoryPath, language, json, services),
                "mcp" => RunMcp(args, repositoryPath, language, services),
                "diff" => RunDiff(args, repositoryPath, language, json, services),
                "trim" => RunTrim(args, repositoryPath, language, json, services),
                "watch" => RunWatch(args, repositoryPath, config, language, json, services),
                _ => RunUnknown(command, language, services.TextProvider)
            };
        }
        catch (Exception ex)
        {
            var textProvider = new TextProvider();
            Console.Error.WriteLine($"{textProvider.Get("ackitError", language)}: {ex.Message}");
            Console.Error.WriteLine(textProvider.Get("suggestedAction", language));
            return ExitError;
        }
    }
