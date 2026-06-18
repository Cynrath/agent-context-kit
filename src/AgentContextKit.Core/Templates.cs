namespace AgentContextKit.Core;

public sealed class TextProvider : ITextProvider
{
    private static readonly Dictionary<string, Dictionary<string, string>> Texts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["help"] = new()
        {
            ["en"] = "AgentContextKit CLI",
            ["tr"] = "AgentContextKit CLI"
        },
        ["usage"] = new()
        {
            ["en"] = "Usage:",
            ["tr"] = "Kullanım:"
        },
        ["created"] = new()
        {
            ["en"] = "created",
            ["tr"] = "oluşturuldu"
        },
        ["skipped"] = new()
        {
            ["en"] = "skipped existing",
            ["tr"] = "var olan atlandı"
        },
        ["scanSummary"] = new()
        {
            ["en"] = "Scan summary",
            ["tr"] = "Tarama özeti"
        },
        ["doctor"] = new()
        {
            ["en"] = "Doctor checks",
            ["tr"] = "Sağlık kontrolleri"
        },
        ["noFindings"] = new()
        {
            ["en"] = "No risk findings.",
            ["tr"] = "Risk bulgusu yok."
        },
        ["detectedAgentInstructionFiles"] = new()
        {
            ["en"] = "Detected agent instruction files:",
            ["tr"] = "Algılanan agent yönerge dosyaları:"
        },
        ["found"] = new()
        {
            ["en"] = "found",
            ["tr"] = "bulundu"
        },
        ["missing"] = new()
        {
            ["en"] = "missing",
            ["tr"] = "eksik"
        },
        ["repository"] = new()
        {
            ["en"] = "Repository",
            ["tr"] = "Repository"
        },
        ["files"] = new()
        {
            ["en"] = "Files",
            ["tr"] = "Dosyalar"
        },
        ["stacks"] = new()
        {
            ["en"] = "Stacks:",
            ["tr"] = "Teknoloji yığınları:"
        },
        ["unknown"] = new()
        {
            ["en"] = "Unknown",
            ["tr"] = "Bilinmiyor"
        },
        ["repositoryHealth"] = new()
        {
            ["en"] = "Repository health:",
            ["tr"] = "Repository sağlığı:"
        },
        ["tests"] = new()
        {
            ["en"] = "Tests",
            ["tr"] = "Testler"
        },
        ["agentInstructions"] = new()
        {
            ["en"] = "Agent instructions",
            ["tr"] = "Agent yönergeleri"
        },
        ["yes"] = new()
        {
            ["en"] = "yes",
            ["tr"] = "evet"
        },
        ["no"] = new()
        {
            ["en"] = "no",
            ["tr"] = "hayır"
        },
        ["baselineCreated"] = new()
        {
            ["en"] = "Baseline created",
            ["tr"] = "Baseline oluşturuldu"
        },
        ["baselineUpdated"] = new()
        {
            ["en"] = "Baseline updated",
            ["tr"] = "Baseline güncellendi"
        },
        ["entries"] = new()
        {
            ["en"] = "Entries",
            ["tr"] = "Kayıtlar"
        },
        ["baselineReview"] = new()
        {
            ["en"] = "Review and commit the baseline only if it contains no private repository metadata.",
            ["tr"] = "Baseline dosyasını yalnızca özel repository metadata içermediğini doğruladıktan sonra inceleyip commit edin."
        },
        ["sarifFindings"] = new()
        {
            ["en"] = "SARIF findings",
            ["tr"] = "SARIF bulguları"
        },
        ["criticalHighFindings"] = new()
        {
            ["en"] = "Critical/high findings",
            ["tr"] = "Critical/high bulguları"
        },
        ["riskFindings"] = new()
        {
            ["en"] = "Risk findings",
            ["tr"] = "Risk bulguları"
        },
        ["noRemoteCall"] = new()
        {
            ["en"] = "No remote LLM provider call was made.",
            ["tr"] = "Uzak LLM provider çağrısı yapılmadı."
        },
        ["approvalRecorded"] = new()
        {
            ["en"] = "Approval recorded locally only.",
            ["tr"] = "Onay yalnızca local olarak kaydedildi."
        },
        ["sarifRequiresOutput"] = new()
        {
            ["en"] = "ackit sarif requires --output <repo-relative.sarif>.",
            ["tr"] = "ackit sarif, --output <repo-relative.sarif> gerektirir."
        },
        ["contextExportRequiresApproval"] = new()
        {
            ["en"] = "ackit context-export requires explicit --approve.",
            ["tr"] = "ackit context-export açık bir --approve onayı gerektirir."
        },
        ["contextExportRequiresPromptPack"] = new()
        {
            ["en"] = "ackit context-export requires --prompt-pack <repo-relative.md>.",
            ["tr"] = "ackit context-export, --prompt-pack <repo-relative.md> gerektirir."
        },
        ["taskRequiresTitle"] = new()
        {
            ["en"] = "ackit task requires a title.",
            ["tr"] = "ackit task bir başlık gerektirir."
        },
        ["taskExample"] = new()
        {
            ["en"] = "Example: ackit task \"Add role based permission management\" --lang en",
            ["tr"] = "Örnek: ackit task \"Rol tabanlı yetki yönetimi ekle\" --lang tr"
        },
        ["unknownCommand"] = new()
        {
            ["en"] = "Unknown command",
            ["tr"] = "Bilinmeyen komut"
        },
        ["baselineClassification"] = new()
        {
            ["en"] = "Baseline classification:",
            ["tr"] = "Baseline sınıflandırması:"
        },
        ["file"] = new()
        {
            ["en"] = "File",
            ["tr"] = "Dosya"
        },
        ["existingFindings"] = new()
        {
            ["en"] = "Existing findings",
            ["tr"] = "Mevcut bulgular"
        },
        ["newFindings"] = new()
        {
            ["en"] = "New findings",
            ["tr"] = "Yeni bulgular"
        },
        ["occurrence"] = new()
        {
            ["en"] = "occurrence",
            ["tr"] = "oluşum"
        },
        ["more"] = new()
        {
            ["en"] = "more",
            ["tr"] = "daha"
        },
        ["suppressedFindings"] = new()
        {
            ["en"] = "Suppressed findings",
            ["tr"] = "Bastırılan bulgular"
        },
        ["via"] = new()
        {
            ["en"] = "via",
            ["tr"] = "aracılığıyla"
        },
        ["ackitError"] = new()
        {
            ["en"] = "ackit error",
            ["tr"] = "ackit hatası"
        },
        ["suggestedAction"] = new()
        {
            ["en"] = "Suggested action: check repository permissions and run `ackit --help`.",
            ["tr"] = "Önerilen işlem: repository izinlerini kontrol edin ve `ackit --help` çalıştırın."
        },
        ["hooksPreview"] = new()
        {
            ["en"] = "Preview only. Pass --install to write the following files:",
            ["tr"] = "Yalnızca önizleme. Aşağıdaki dosyaları yazmak için --install kullanın:"
        },
        ["hooksInstalled"] = new()
        {
            ["en"] = "Installed",
            ["tr"] = "Yüklendi"
        },
        ["hooksSkipped"] = new()
        {
            ["en"] = "Skipped (already exists)",
            ["tr"] = "Atlandı (zaten var)"
        },
        ["hooksDryRun"] = new()
        {
            ["en"] = "Dry run",
            ["tr"] = "Dry-run"
        },
        ["hooksWouldWrite"] = new()
        {
            ["en"] = "Would write",
            ["tr"] = "Yazılacak"
        },
        ["hooksNotGitRepo"] = new()
        {
            ["en"] = "Not a Git repository. Run from inside a repository or pass --output.",
            ["tr"] = "Git repository değil. Bir repository içinden çalıştırın veya --output kullanın."
        }
    };

    public string Get(string key, LanguageCode language)
    {
        if (!Texts.TryGetValue(key, out var byLanguage))
        {
            return key;
        }

        return byLanguage.TryGetValue(language.Value, out var value)
            ? value
            : byLanguage["en"];
    }
}

public sealed class TemplateRenderer : ITemplateRenderer
{
    public string Render(string templateId, LanguageCode language, IReadOnlyDictionary<string, string> values)
    {
        var template = TemplateCatalog.Get(templateId, language);
        foreach (var pair in values)
        {
            template = template.Replace("{{" + pair.Key + "}}", pair.Value, StringComparison.Ordinal);
        }

        return template;
    }
}

public static class TemplateCatalog
{
    private static readonly Dictionary<string, Dictionary<string, string>> Templates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AGENTS"] = new()
        {
            ["en"] = """
            # Agent Instructions

            ## Project
            {{ProjectName}}

            ## Stack
            {{StackList}}

            ## Repository Health
            {{HealthSummary}}

            ## Risk Summary
            {{RiskSummary}}

            ## Required Workflow
            - Read docs before editing.
            - Create or update a task file before implementation.
            - Inspect git status before edits.
            - Do not overwrite existing files without explicit approval.
            - Keep changes small, tested, and secure.
            - Update handoff and active task completion notes.

            ## Recommended Checks
            {{RecommendedChecks}}

            ## Safety Rules
            - Keep work local and offline unless explicitly approved.
            - Do not push, publish, tag, create remotes, or redact automatically.
            - Treat secret/PII/brand findings as release-blocking until reviewed.
            - Run relevant checks before completion.
            """,
            ["tr"] = """
            # Agent Yonergeleri

            ## Proje
            {{ProjectName}}

            ## Stack
            {{StackList}}

            ## Repository Sagligi
            {{HealthSummary}}

            ## Risk Ozeti
            {{RiskSummary}}

            ## Zorunlu Workflow
            - Kodlamadan once dokumanlari oku.
            - Implementation oncesi task dosyasi olustur veya guncelle.
            - Edit oncesi git durumunu incele.
            - Acik onay olmadan var olan dosyalari ezme.
            - Degisiklikleri kucuk, testli ve guvenli tut.
            - Handoff ve aktif task completion notlarini guncelle.

            ## Onerilen Kontroller
            {{RecommendedChecks}}

            ## Guvenlik Kurallari
            - Acik onay olmadan calismayi local ve offline tut.
            - Push, publish, tag, remote creation veya automatic redaction yapma.
            - Secret/PII/brand bulgularini incelenene kadar release-blocking say.
            - Tamamlamadan once ilgili kontrolleri calistir.
            """
        },
        ["CLAUDE"] = new()
        {
            ["en"] = """
            # Claude Project Context

            Use the same repository rules as AGENTS.md.

            ## Stack
            {{StackList}}

            ## Repository Health
            {{HealthSummary}}

            ## Risk Summary
            {{RiskSummary}}

            ## Recommended Checks
            {{RecommendedChecks}}
            """,
            ["tr"] = """
            # Claude Proje Context

            AGENTS.md ile ayni repository kurallarini kullan.

            ## Stack
            {{StackList}}

            ## Repository Sagligi
            {{HealthSummary}}

            ## Risk Ozeti
            {{RiskSummary}}

            ## Onerilen Kontroller
            {{RecommendedChecks}}
            """
        },
        ["CURSOR"] = new()
        {
            ["en"] = """
            # Cursor Rules

            - Respect existing architecture.
            - Use task-first workflow.
            - Keep generated changes safe and reviewable.
            - Check repository health and risk summary before editing.

            ## Recommended Checks
            {{RecommendedChecks}}
            """,
            ["tr"] = """
            # Cursor Kurallari

            - Mevcut mimariye uy.
            - Task-first workflow kullan.
            - Uretilen degisiklikleri guvenli ve incelenebilir tut.
            - Edit oncesi repository sagligi ve risk ozetini kontrol et.

            ## Onerilen Kontroller
            {{RecommendedChecks}}
            """
        },
        ["COPILOT"] = new()
        {
            ["en"] = """
            # Copilot Instructions

            Prefer minimal, tested, secure changes that follow the project docs and task files.

            Repository health:
            {{HealthSummary}}

            Recommended checks:
            {{RecommendedChecks}}
            """,
            ["tr"] = """
            # Copilot Yonergeleri

            Proje dokumanlari ve task dosyalarina uyan minimal, testli ve guvenli degisiklikleri tercih et.

            Repository sagligi:
            {{HealthSummary}}

            Onerilen kontroller:
            {{RecommendedChecks}}
            """
        },
        ["ANTHROPIC"] = new()
        {
            ["en"] = """
            # Anthropic CLI Instructions

            Prefer minimal, tested, secure changes that follow the project docs and task files. Honor AGENTS.md first; this file adds Anthropic CLI-specific guidance.

            Repository health:
            {{HealthSummary}}

            Recommended checks:
            {{RecommendedChecks}}
            """,
            ["tr"] = """
            # Anthropic CLI Yonergeleri

            Proje dokumanlari ve task dosyalarina uyan minimal, testli ve guvenli degisiklikleri tercih et. Once AGENTS.md'yi, sonra bu dosyayi dikkate al.

            Repository sagligi:
            {{HealthSummary}}

            Onerilen kontroller:
            {{RecommendedChecks}}
            """
        },
        ["CONTINUE"] = new()
        {
            ["en"] = """
            {
              "name": "agent-context-kit",
              "version": "0.2.0-alpha.2",
              "schema": "v1",
              "models": [],
              "tabAutocompleteModel": null,
              "embeddingsProvider": null,
              "contextProviders": [
                {
                  "name": "code",
                  "params": {}
                }
              ],
              "systemPrompt": "{{SystemPrompt}}",
              "docs": []
            }
            """,
            ["tr"] = """
            {
              "name": "agent-context-kit",
              "version": "0.2.0-alpha.2",
              "schema": "v1",
              "models": [],
              "tabAutocompleteModel": null,
              "embeddingsProvider": null,
              "contextProviders": [
                {
                  "name": "code",
                  "params": {}
                }
              ],
              "systemPrompt": "{{SystemPrompt}}",
              "docs": []
            }
            """
        },
        ["HOOK_GIT_PWSH"] = new()
        {
            ["en"] = """
            ackit scan --ci
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            """,
            ["tr"] = """
            ackit scan --ci
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            """
        },
        ["HOOK_GIT_SH"] = new()
        {
            ["en"] = """
            #!/usr/bin/env sh
            ackit scan --ci || exit $?
            """,
            ["tr"] = """
            #!/usr/bin/env sh
            ackit scan --ci || exit $?
            """
        },
        ["HOOK_ANTHROPIC_MARKER"] = new()
        {
            ["en"] = """
            AgentContextKit hooks installed for the Anthropic target.
            Local reminder only; no remote registration was performed.
            """,
            ["tr"] = """
            AgentContextKit hooks installed for the Anthropic target.
            Local reminder only; no remote registration was performed.
            """
        },
        ["HOOK_ANTHROPIC_PWSH"] = new()
        {
            ["en"] = """
            Write-Output "AgentContextKit reminder: run ackit scan --ci before sharing repository context."
            """,
            ["tr"] = """
            Write-Output "AgentContextKit reminder: run ackit scan --ci before sharing repository context."
            """
        },
        ["HOOK_ANTHROPIC_SH"] = new()
        {
            ["en"] = """
            #!/usr/bin/env sh
            printf '%s\n' 'AgentContextKit reminder: run ackit scan --ci before sharing repository context.'
            """,
            ["tr"] = """
            #!/usr/bin/env sh
            printf '%s\n' 'AgentContextKit reminder: run ackit scan --ci before sharing repository context.'
            """
        },
        ["HOOK_CONTINUE_MARKER"] = new()
        {
            ["en"] = """
            AgentContextKit hooks installed for the Continue target.
            Local reminder only; no remote registration was performed.
            """,
            ["tr"] = """
            AgentContextKit hooks installed for the Continue target.
            Local reminder only; no remote registration was performed.
            """
        },
        ["HOOK_CONTINUE_JSON"] = new()
        {
            ["en"] = """
            {
              "hooks": [
                {
                  "name": "ackit-pre-prompt-reminder",
                  "event": "pre-prompt",
                  "action": "print",
                  "message": "AgentContextKit reminder: run ackit scan --ci before sharing repository context."
                }
              ]
            }
            """,
            ["tr"] = """
            {
              "hooks": [
                {
                  "name": "ackit-pre-prompt-reminder",
                  "event": "pre-prompt",
                  "action": "print",
                  "message": "AgentContextKit reminder: run ackit scan --ci before sharing repository context."
                }
              ]
            }
            """
        },
        ["PROJECT_MAP"] = new()
        {
            ["en"] = """
            # Project Map

            Generated: {{GeneratedAt}}

            ## Stack
            {{StackList}}

            ## Files
            {{FileList}}
            """,
            ["tr"] = """
            # Proje Haritasi

            Uretim zamani: {{GeneratedAt}}

            ## Stack
            {{StackList}}

            ## Dosyalar
            {{FileList}}
            """
        },
        ["AI_WORKFLOW"] = new()
        {
            ["en"] = "# AI Workflow\n\n1. Read README, architecture, security, and the active task.\n2. Create or update a task before implementation.\n3. Inspect git status and preserve user changes.\n4. Make small, focused changes.\n5. Run relevant checks.\n6. Update docs, task completion notes, and handoff.\n7. Commit a logical unit of work.\n\n## Recommended Checks\n{{RecommendedChecks}}\n",
            ["tr"] = "# AI Workflow\n\n1. README, architecture, security ve aktif task dosyasini oku.\n2. Implementation oncesi task olustur veya guncelle.\n3. Git durumunu incele ve user degisikliklerini koru.\n4. Kucuk ve odakli degisiklikler yap.\n5. Ilgili kontrolleri calistir.\n6. Docs, task completion notlari ve handoff guncelle.\n7. Mantikli bir is birimi commit et.\n\n## Onerilen Kontroller\n{{RecommendedChecks}}\n"
        },
        ["SECURITY_NOTES"] = new()
        {
            ["en"] = "# Security Notes\n\n- Do not commit secrets.\n- Review production configuration before public release.\n- Keep redaction checks report-only unless explicitly approved.\n- Treat Critical and High findings as blockers until reviewed.\n\n## Current Risk Summary\n{{RiskSummary}}\n",
            ["tr"] = "# Guvenlik Notlari\n\n- Secret commit etme.\n- Public release oncesi production config dosyalarini incele.\n- Acik onay olmadan redaction kontrollerini sadece rapor olarak tut.\n- Critical ve High bulgulari incelenene kadar blocker say.\n\n## Guncel Risk Ozeti\n{{RiskSummary}}\n"
        },
        ["DEVELOPMENT_STANDARD"] = new()
        {
            ["en"] = "# Development Standard\n\n- Task-first.\n- Docs-first.\n- Security-first.\n- Tests before completion.\n- Update handoff after major changes.\n- Keep public release actions maintainer-only.\n\n## Recommended Checks\n{{RecommendedChecks}}\n",
            ["tr"] = "# Gelistirme Standardi\n\n- Task-first.\n- Docs-first.\n- Security-first.\n- Tamamlama oncesi test.\n- Buyuk degisikliklerden sonra handoff guncelle.\n- Public release aksiyonlarini maintainer-only tut.\n\n## Onerilen Kontroller\n{{RecommendedChecks}}\n"
        },
        ["TASK"] = new()
        {
            ["en"] = """
            # {{TaskNumber}}: {{TaskTitle}}

            ## Purpose

            ## Scope

            ## Out of scope

            ## Affected files

            ## Data/database impact

            ## Security impact

            ## Permission/auth impact

            ## Localization impact

            ## UX impact

            ## Logging/audit impact

            ## Acceptance criteria

            ## Test steps

            ## Risks

            ## Rollback plan

            ## Completion notes
            """,
            ["tr"] = """
            # {{TaskNumber}}: {{TaskTitle}}

            ## Amac

            ## Kapsam

            ## Kapsam disi

            ## Etkilenen dosyalar

            ## Veri tabani etkisi

            ## Guvenlik etkisi

            ## Yetki/auth etkisi

            ## Lokalizasyon etkisi

            ## UX etkisi

            ## Log/audit etkisi

            ## Kabul kriterleri

            ## Test adimlari

            ## Riskler

            ## Geri alma plani

            ## Tamamlama notlari
            """
        },
        ["HANDOFF"] = new()
        {
            ["en"] = "# Handoff\n\nGenerated: {{GeneratedAt}}\n\n## Current Repository\n{{ProjectName}}\n\n## Stack\n{{StackList}}\n\n## Repository Health\n{{HealthSummary}}\n\n## Risk Summary\n{{RiskSummary}}\n\n## Recommended Checks\n{{RecommendedChecks}}\n",
            ["tr"] = "# Handoff\n\nUretim zamani: {{GeneratedAt}}\n\n## Repository\n{{ProjectName}}\n\n## Stack\n{{StackList}}\n\n## Repository Sagligi\n{{HealthSummary}}\n\n## Risk Ozeti\n{{RiskSummary}}\n\n## Onerilen Kontroller\n{{RecommendedChecks}}\n"
        },
        ["CONTEXT_PACK"] = new()
        {
            ["en"] = "# Context Pack\n\n## Project\n{{ProjectName}}\n\n## Stack\n{{StackList}}\n\n## Repository Health\n{{HealthSummary}}\n\n## Risk Summary\n{{RiskSummary}}\n\n## Recommended Checks\n{{RecommendedChecks}}\n\n## Files\n{{FileList}}\n",
            ["tr"] = "# Context Pack\n\n## Proje\n{{ProjectName}}\n\n## Stack\n{{StackList}}\n\n## Repository Sagligi\n{{HealthSummary}}\n\n## Risk Ozeti\n{{RiskSummary}}\n\n## Onerilen Kontroller\n{{RecommendedChecks}}\n\n## Dosyalar\n{{FileList}}\n"
        }
    };

    public static string Get(string templateId, LanguageCode language)
    {
        if (!Templates.TryGetValue(templateId, out var byLanguage))
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        return byLanguage.TryGetValue(language.Value, out var template)
            ? template
            : byLanguage["en"];
    }
}
