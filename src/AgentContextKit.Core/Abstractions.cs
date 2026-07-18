namespace AgentContextKit.Core;

public interface IRepositoryScanner
{
    ScanResult Scan(
        string repositoryPath,
        AckitConfig? config = null,
        IReadOnlyList<string>? includeGlobs = null,
        IReadOnlyList<string>? excludeGlobs = null);
}

public interface IInstructionAuditor
{
    InstructionAuditResult Audit(
        string repositoryPath,
        AckitConfig? config = null,
        InstructionAuditOptions? options = null,
        CancellationToken cancellationToken = default);
}

public interface IInstructionAuditReportWriter
{
    string RenderJson(
        InstructionAuditResult result,
        InstructionAuditReportContext context,
        InstructionAuditOutputInfo output);

    string RenderMarkdown(InstructionAuditResult result, string repositoryName);

    string RenderSarif(InstructionAuditResult result, string toolVersion);

    string RenderHtml(InstructionAuditResult result, string repositoryName);

    GeneratedFileResult Generate(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditReportFormat format,
        string content);

    GeneratedFileResult GenerateJson(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditResult result,
        InstructionAuditReportContext context);
}

public interface IStackDetector
{
    IReadOnlyList<StackInfo> Detect(string repositoryPath, IReadOnlyList<string> relativeFiles);
}

public interface IProjectMapBuilder
{
    ProjectMap Build(ScanResult scanResult);
}

public interface IRiskScanner
{
    IReadOnlyList<RiskFinding> Scan(string repositoryPath, IReadOnlyList<string> relativeFiles, AckitConfig config);

    RiskScanResult ScanWithAudit(string repositoryPath, IReadOnlyList<string> relativeFiles, AckitConfig config)
    {
        return new RiskScanResult(Scan(repositoryPath, relativeFiles, config), Array.Empty<RiskSuppression>());
    }
}

public interface ISecretScanner
{
    IReadOnlyList<RiskFinding> ScanText(string relativePath, string content);
}

public interface IBrandPiiScanner
{
    IReadOnlyList<RiskFinding> ScanText(string relativePath, string content, AckitConfig config);

    BrandPiiScanResult ScanTextWithAudit(string relativePath, string content, AckitConfig config)
    {
        return new BrandPiiScanResult(ScanText(relativePath, content, config), Array.Empty<RiskSuppression>());
    }
}

public interface IHighEntropyScanner
{
    IReadOnlyList<RiskFinding> ScanText(string relativePath, string content);
}

public interface IRiskReporter
{
    string Render(IReadOnlyList<RiskFinding> findings);
}

public interface ITemplateRenderer
{
    string Render(string templateId, LanguageCode language, IReadOnlyDictionary<string, string> values);
}

public interface ITextProvider
{
    string Get(string key, LanguageCode language);
}

public interface ITaskFileGenerator
{
    GeneratedFileResult CreateTask(string repositoryPath, TaskSpec spec);
}

public interface IAgentInstructionGenerator
{
    IReadOnlyList<GeneratedFileResult> Generate(string repositoryPath, AgentTarget target, LanguageCode language, ScanResult scanResult);
}

public interface IHtmlReportGenerator
{
    GeneratedFileResult Generate(
        string repositoryPath,
        string? relativeOutputPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline = null);
}

public interface IWebUiGenerator
{
    GeneratedFileResult Generate(
        string repositoryPath,
        string? relativeOutputPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline = null);
}

public interface IPromptPackGenerator
{
    GeneratedFileResult Generate(string repositoryPath, string? relativeOutputPath, LanguageCode language, ScanResult scanResult);
}

public interface IContextExportManifestGenerator
{
    GeneratedFileResult Generate(string repositoryPath, ContextExportSpec spec, ScanResult scanResult);
}

public interface ISarifReportWriter
{
    GeneratedFileResult Generate(
        string repositoryPath,
        string relativeOutputPath,
        ScanResult scanResult,
        string toolVersion,
        BaselineEvaluation? baseline = null);
}

public interface ILLMProvider
{
    string Name { get; }

    Task<LlmProviderResponse> GenerateAsync(LlmProviderRequest request, CancellationToken cancellationToken = default);
}

public interface IFileSystem
{
    bool FileExists(string path);

    bool DirectoryExists(string path);

    void CreateDirectory(string path);

    string ReadAllText(string path);

    void WriteAllText(string path, string content);

    long GetFileLength(string path);

    IEnumerable<string> EnumerateFiles(string rootPath, IReadOnlySet<string> ignoredDirectoryNames);
}

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public interface IAckitConfigReader
{
    AckitConfig Read(string repositoryPath);
}

public interface IAckitConfigValidator
{
    ConfigValidationResult Validate(string content);
}

public interface IAckitConfigWriter
{
    GeneratedFileResult WriteDefaultIfMissing(string repositoryPath, LanguageCode language);
}

public interface IBaselineStore
{
    BaselineFileResult Write(string repositoryPath, string relativePath, BaselineManifest manifest, bool update);

    BaselineManifest Load(string repositoryPath, string relativePath);
}

public interface IBaselineClassifier
{
    BaselineManifest CreateManifest(IReadOnlyList<RiskFinding> findings);

    BaselineEvaluation Classify(IReadOnlyList<RiskFinding> findings, BaselineManifest manifest);
}
