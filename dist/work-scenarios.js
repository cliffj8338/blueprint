/* Maintained task-level scenarios, not personal readiness or agent certification. */
(function (root) {
    'use strict';
    var library = [
        {
            id: 'finance', label: 'Financial analysis and modeling',
            pattern: /\b(financ\w*|budget\w*|accounting|valuation|investment|private equity)\b/i,
            human: ['Choose business assumptions and evaluate a consequential financial decision', 'A defensible recommendation that reflects risk, incentives and business context'],
            augmented: ['Prepare a financial model and compare alternative assumptions', 'The person interprets scenarios while an agent prepares calculations and flags inconsistencies'],
            performed: ['Refresh a recurring financial report from approved structured inputs', 'A repeatable report with reconciliation checks and exceptions routed for review'],
            judgment: 'Choose assumptions, assess materiality and uncertainty, and approve financial conclusions.',
            assistance: 'Structure approved data, draft formulas, run specified scenarios and flag inconsistent totals.',
            execution: 'Run an approved reporting template, reconcile totals and stop on failed checks or unfamiliar inputs.',
            capabilities: ['Structured-data extraction', 'Spreadsheet or calculation-tool execution', 'Reconciliation and anomaly flagging'],
            limits: ['Incorrect formulas or plausible-looking numbers can survive superficial review.', 'Do not delegate investment approval, fiduciary decisions or financial sign-off.']
        },
        {
            id: 'leadership', label: 'Leadership and people management',
            pattern: /\b(leadership|management|negotiation|mentoring|coaching|personnel|human resources|administration)\b/i,
            human: ['Resolve a sensitive team disagreement and agree on a direction', 'People understand the decision, trade-offs and their responsibilities'],
            augmented: ['Prepare for a team decision using approved notes and operating information', 'A human-led discussion supported by an agent-generated issue summary and options'],
            performed: ['Prepare routine action-item follow-ups from approved meeting notes', 'A checked action list with owners and dates, queued for approval before distribution'],
            judgment: 'Build trust, understand unspoken context, resolve conflict and retain responsibility for people decisions.',
            assistance: 'Summarize agreed facts, identify unresolved questions and draft alternative discussion plans.',
            execution: 'Extract explicit actions and dates, match approved recipients and draft reminders without making commitments.',
            capabilities: ['Source-grounded summarization', 'Action and deadline extraction', 'Constrained drafting'],
            limits: ['Agents may miss interpersonal context or misattribute a commitment.', 'Employment decisions, performance judgments and sensitive personnel communication remain human-led.']
        },
        {
            id: 'research', label: 'Research, strategy and market intelligence',
            pattern: /\b(research|strategy|strategic|analysis|futurist|competitive|go.to.market|business intelligence)\b/i,
            human: ['Frame a strategic question and choose a course of action under uncertainty', 'A decision connected to organizational context and competing priorities'],
            augmented: ['Compare evidence about a market or strategic option', 'A person tests implications using an agent-prepared, source-linked evidence brief'],
            performed: ['Monitor an approved set of public sources for specified changes', 'A scheduled change digest that cites sources and flags ambiguous findings'],
            judgment: 'Frame the question, assess source credibility, interpret weak signals and decide what matters.',
            assistance: 'Retrieve approved sources, extract comparable claims, cite evidence and surface contradictions.',
            execution: 'Check allowlisted sources, compare changes with a baseline and route unexpected findings to a person.',
            capabilities: ['Approved-source retrieval', 'Citation-linked extraction', 'Comparison and change detection'],
            limits: ['Coverage gaps and stale or biased sources can distort conclusions.', 'Source-linked output is not proof of correctness or a substitute for strategic judgment.']
        },
        {
            id: 'communication', label: 'Writing, storytelling and communication',
            pattern: /\b(writing|storytelling|communications?|presentation|public speaking|speaker|content|marketing)\b/i,
            human: ['Shape a consequential message for a specific audience', 'A credible message that reflects intent, relationships and accountability'],
            augmented: ['Develop a narrative or presentation from an approved brief', 'The person chooses the argument and voice while an agent drafts and challenges alternatives'],
            performed: ['Adapt an approved announcement into a routine format', 'A draft that preserves approved facts and meets a checked style template'],
            judgment: 'Choose the message, understand the audience, judge nuance and approve public claims.',
            assistance: 'Outline alternatives, draft supporting text, check consistency and suggest audience-specific revisions.',
            execution: 'Transform approved content into a fixed format, check required facts and queue it for publication approval.',
            capabilities: ['Constrained text generation', 'Fact-preserving transformation', 'Style and consistency checks'],
            limits: ['Persuasive wording can conceal unsupported claims or inappropriate tone.', 'Do not let the agent invent quotations, endorsements or commitments.']
        },
        {
            id: 'software', label: 'Software, data and AI work',
            pattern: /\b(software|programming|coding|engineering|cloud|cybersecurity|machine learning|artificial intelligence|applied ai|genai|ai agents|prompt)\b/i,
            human: ['Choose system architecture or approve a consequential technical change', 'A technical decision balancing requirements, safety, cost and long-term maintenance'],
            augmented: ['Implement and evaluate a bounded technical change', 'The person specifies behavior and reviews an agent-generated implementation with test results'],
            performed: ['Run a preapproved validation or maintenance workflow in a sandbox', 'An auditable result with failed checks and unexpected changes escalated'],
            judgment: 'Define requirements and threat boundaries, review failure modes and approve changes to real systems.',
            assistance: 'Draft code or queries, generate tests, inspect logs and explain proposed changes.',
            execution: 'Execute allowlisted commands in an isolated environment, record results and stop outside the approved scope.',
            capabilities: ['Code and query generation', 'Tool execution in a sandbox', 'Automated testing and log inspection'],
            limits: ['Passing tests do not establish security, correctness or agent competence for other tasks.', 'Production access, credentials and destructive actions require explicit controls and approval.']
        },
        {
            id: 'crm', label: 'CRM and business operations',
            pattern: /\b(salesforce|crm|sales|customer relationship|customer service|operations|coordination)\b/i,
            human: ['Resolve a consequential customer or operational exception', 'A decision that balances customer context, commitments and business constraints'],
            augmented: ['Prepare a customer or operating review from approved records', 'The person evaluates priorities using an agent-organized history, gaps and draft next steps'],
            performed: ['Check routine records for missing fields and prepare a correction queue', 'A source-linked queue of suggested corrections without unauthorized customer contact'],
            judgment: 'Interpret customer intent, negotiate commitments and approve decisions affecting people or accounts.',
            assistance: 'Summarize authorized records, identify missing information and draft follow-up options.',
            execution: 'Apply approved validation rules, identify duplicates or gaps and route exceptions for approval.',
            capabilities: ['Permission-scoped record retrieval', 'Record matching and validation', 'Structured summarization'],
            limits: ['Incorrect record matching can expose or alter the wrong customer information.', 'No autonomous contract changes, mass outreach or irreversible record edits.']
        },
        {
            id: 'physical', label: 'Physical, safety-critical or regulated work',
            pattern: /\b(pilot\w*|piloting|flight|aviation|instrument rated|mental health|medical|nursing|therapy|construction|electrical|surgery|driving)\b/i,
            human: ['Perform the real-world or regulated activity within professional authority', 'A result that requires embodied skill, situational awareness and accountable professional judgment'],
            augmented: ['Prepare a briefing or checklist from authoritative approved material', 'The qualified person checks an agent-prepared information summary before performing the work'],
            performed: ['Organize routine administrative records associated with the activity', 'A checked administrative draft, not autonomous execution of the physical or regulated task'],
            judgment: 'Perform the activity, verify current conditions and retain professional and safety responsibility.',
            assistance: 'Retrieve approved reference material and organize a briefing with explicit source citations.',
            execution: 'Classify approved documents, check completeness and route missing or inconsistent records.',
            capabilities: ['Approved-reference retrieval', 'Document classification', 'Completeness checks'],
            limits: ['A software agent is not assumed to possess physical capabilities, professional licensing or clinical authority.', 'The agent-performed scenario covers administrative work only; it does not replace a pilot, clinician or qualified operator.']
        },
        {
            id: 'creative', label: 'Creative practice and design',
            pattern: /\b(design|music\w*|musician|percussion|performance|art|creative|multimedia|photography)\b/i,
            human: ['Choose artistic direction or deliver an original live creative performance', 'A distinctive result shaped by taste, lived experience and audience response'],
            augmented: ['Explore alternatives for a creative brief', 'The person selects and develops a direction using agent-generated variations or research'],
            performed: ['Prepare routine versions of approved creative assets', 'Checked format variations that preserve the approved design and usage rights'],
            judgment: 'Set intent, exercise taste, handle real-time audience response and approve provenance and rights.',
            assistance: 'Generate rough alternatives, organize references and compare options against the brief.',
            execution: 'Apply approved formatting or metadata rules, check output specifications and flag exceptions.',
            capabilities: ['Brief-constrained generation', 'Asset transformation tools', 'Format and metadata validation'],
            limits: ['An agent-generated variant is not a substitute for embodied performance or artistic authorship.', 'Rights, resemblance, provenance and quality require review.']
        }
    ];
    var fallback = {
        id: 'general', label: 'General task illustration',
        human: ['Decide how to apply this skill in an unfamiliar or consequential situation', 'A context-sensitive decision with a person accountable for the result'],
        augmented: ['Prepare a first-pass information brief for a task using this skill', 'The person reviews source-linked preparation instead of starting from an empty page'],
        performed: ['Organize approved documents for a repeatable supporting task', 'A checked administrative draft with exceptions escalated'],
        judgment: 'Interpret context, assess exceptions and approve decisions that affect other people.',
        assistance: 'Organize supplied information, draft options and identify missing facts for human review.',
        execution: 'Apply explicit document rules and return structured output without making consequential decisions.',
        capabilities: ['Structured extraction', 'Constrained drafting', 'Rule-based validation'],
        limits: ['This skill has no specific library match; these are broad illustrations, not a role-specific analysis.', 'Do not infer that the core skill or the whole job can be automated.']
    };
    function describe(name, options) {
        name = String(name || '').trim();
        if (!name || name.length > 200) throw new Error('Choose a skill name between 1 and 200 characters.');
        options = options || {};
        // Safety boundaries take precedence over broad words such as "management".
        var priority = ['physical', 'finance', 'software', 'crm', 'communication', 'leadership', 'creative', 'research'];
        var profile = priority.map(function (id) { return library.find(function (p) { return p.id === id; }); })
            .find(function (p) { return p.pattern.test(name); }) || fallback;
        var confidence = profile === fallback ? 'Low' : 'Moderate';
        return {
            skill: name,
            proficiency: options.level || 'Not specified',
            match: {
                label: profile.label, confidence: confidence,
                basis: profile === fallback
                    ? 'No specific match. Broad supporting-task illustrations are shown, with low confidence.'
                    : 'Maintained scenario template matched to skill wording. Not a tested capability benchmark or a personal assessment.'
            },
            assumptions: [
                'Illustrative present-day software-agent capabilities; a particular tool must be evaluated before use.',
                'Only approved inputs, least-privilege access and measurable acceptance checks are available.',
                'These are alternative task scenarios, not sequential readiness stages or predictions that the whole skill disappears.'
            ],
            scenarios: [
                { id: 'human', title: 'Human-led', task: profile.human[0], outcome: profile.human[1],
                    humanContribution: profile.judgment, agentContribution: 'None required in this scenario.',
                    capabilities: [], conditions: ['A person has the relevant context, authority and professional competence.'],
                    limits: profile.limits.slice(), confidence: confidence,
                    reason: 'Human contribution is concentrated in judgment, relationships, real-world execution or accountability.' },
                { id: 'augmented', title: 'Agent-augmented', task: profile.augmented[0], outcome: profile.augmented[1],
                    humanContribution: profile.judgment, agentContribution: profile.assistance,
                    capabilities: profile.capabilities.slice(),
                    conditions: ['Approved data and suitable tools are available.', 'The person checks sources and output before acting.'],
                    limits: profile.limits.slice(), confidence: confidence,
                    reason: 'An agent could perform preparation or analysis while the person directs and reviews the work.' },
                { id: 'performed', title: 'Agent-performed', task: profile.performed[0], outcome: profile.performed[1],
                    humanContribution: 'Define the scope and acceptance checks, review exceptions, and approve consequential downstream actions.',
                    agentContribution: profile.execution, capabilities: profile.capabilities.slice(),
                    conditions: ['The task is narrow, repeatable and testable against an approved baseline.', 'Access is constrained; exceptions stop execution and reach a person.'],
                    limits: profile.limits.slice(), confidence: profile === fallback ? 'Low' : 'Conditional',
                    reason: 'A bounded routine task could move from human execution to agent execution; oversight and the broader human skill remain.' }
            ]
        };
    }
    root.BPWorkScenarios = { describe: describe };
})(window);
