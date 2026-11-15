/* Maintained task-level scenarios, not personal readiness or agent certification. */
(function (root) {
    'use strict';
    // Exact, reviewed ontology labels and aliases only. Do not infer specialist
    // capability from a substring, acronym inside another word, or category.
    var specialties = [
        {
            id: 'gis', label: 'Geographic information systems',
            aliases: ['geographic information systems', 'use geographic information systems', 'GIS'],
            human: ['Choose map layers and coordinate systems for a site comparison', 'A spatial interpretation that accounts for data age, scale and local context'],
            augmented: ['Compare candidate sites using approved geographic layers', 'A person reviews an agent-prepared overlay with coordinate systems and missing coverage identified'],
            performed: ['Check an approved GIS layer for missing attributes and invalid geometries', 'A validation report with feature identifiers and exceptions, leaving source layers unchanged'],
            judgment: 'Choose suitable spatial evidence, assess uncertainty and approve any location-based decision.',
            assistance: 'Prepare overlays using specified coordinate systems, cite layer provenance and flag gaps or mismatched units.',
            execution: 'Run approved geometry and attribute checks on a read-only layer copy and report failed checks.',
            capabilities: ['GIS tool execution', 'Coordinate-system and geometry validation', 'Layer provenance tracking'],
            limits: ['Maps can appear precise despite outdated coverage, projection errors or uncertain boundaries.', 'No cadastral certification, navigation decisions or disclosure of sensitive locations without qualified review.']
        },
        {
            id: 'hplc', label: 'High-performance liquid chromatography',
            aliases: ['high-performance liquid chromatography', 'high performance liquid chromatography', 'HPLC'],
            human: ['Select and validate an HPLC method for a laboratory sample', 'A qualified analyst establishes whether the method and chromatogram support the intended conclusion'],
            augmented: ['Review chromatographic peaks against an approved HPLC method', 'An analyst reviews an agent-prepared comparison of retention times, integration flags and system-suitability results'],
            performed: ['Check exported HPLC run records for required method and calibration fields', 'A completeness report linking each missing field to its run, not a certified assay result'],
            judgment: 'Handle samples, operate instruments safely, evaluate interferences and authorize laboratory conclusions.',
            assistance: 'Compare exported peak tables with supplied method criteria and flag deviations without silently reintegrating peaks.',
            execution: 'Validate run identifiers, calibration references and required fields in approved exports; route gaps to an analyst.',
            capabilities: ['Chromatography export parsing', 'Method-specific rule checks', 'Traceable run-record validation'],
            limits: ['Co-elution, instrument drift and sample preparation can invalidate apparently plausible peak results.', 'No physical instrument operation, method validation, clinical interpretation or regulated batch release is delegated to a software agent.']
        },
        {
            id: 'welding', label: 'Welding and weld documentation',
            aliases: ['welding', 'welding engineering', 'welding techniques', 'apply arc welding techniques', 'arc welding', 'perform tungsten inert gas welding', 'gas tungsten arc welding', 'TIG welding', 'perform metal inert gas welding', 'metal inert gas (MIG) welding', 'MIG welding', 'welding procedure specification'],
            human: ['Prepare and weld a joint under an approved welding procedure', 'A qualified welder produces a joint for inspection under the applicable acceptance criteria'],
            augmented: ['Prepare a weld-job briefing from the approved welding procedure specification', 'The welder verifies an agent-organized summary of joint preparation, materials and specified parameter ranges'],
            performed: ['Check weld documentation for missing procedure and inspection references', 'An administrative exception list linked to weld identifiers, not approval of weld quality'],
            judgment: 'Set up and perform the physical weld, verify site conditions and obtain qualified inspection and sign-off.',
            assistance: 'Extract specified materials and parameter ranges from the current approved procedure and cite the source revision.',
            execution: 'Cross-check weld log fields and referenced procedure revisions against approved records without changing equipment settings.',
            capabilities: ['Procedure-grounded extraction', 'Revision and weld-record matching', 'Documentation completeness checks'],
            limits: ['Heat, fumes, material defects and joint conditions require on-site safety controls and qualified judgment.', 'The agent handles documentation only; it cannot weld, control welding equipment, certify an inspection or approve structural safety.']
        },
        {
            id: 'carpentry', label: 'Carpentry and cabinet making',
            aliases: ['carpentry', 'bench carpentry', 'finish carpentry', 'cabinet making', 'cabinetmaking'],
            human: ['Measure, fit and assemble a cabinet for a real installation', 'A craftsperson verifies fit, materials and safe assembly against actual site conditions'],
            augmented: ['Prepare a cabinet cut-list draft from approved drawings', 'The craftsperson checks an agent-prepared list of dimensions, quantities and material allowances before cutting'],
            performed: ['Reconcile an approved cabinet cut list with a materials inventory', 'A shortage and unit-mismatch report without purchasing materials or operating tools'],
            judgment: 'Verify site measurements, material behavior, joinery and load requirements; perform tool work safely.',
            assistance: 'Extract dimensions from supplied drawings, calculate specified allowances and flag inconsistent units for review.',
            execution: 'Compare approved part quantities and units with a supplied inventory snapshot and report discrepancies.',
            capabilities: ['Drawing and dimension extraction', 'Unit-aware calculations', 'Parts-list reconciliation'],
            limits: ['Drawing dimensions may not reflect site tolerances, wood movement or hidden structural conditions.', 'No autonomous cutting, machinery operation, building-code approval or structural sign-off.']
        },
        {
            id: 'food-safety', label: 'Food safety and HACCP records',
            aliases: ['food safety principles', 'food safety standards', 'comply with food safety and hygiene', 'perform food safety checks', 'audit food safety procedures', 'food safety and sanitation', 'food safety management systems', 'food safety & HACCP', 'HACCP'],
            human: ['Evaluate a food-process hazard and approve a corrective action', 'An accountable food-safety professional decides how to protect consumers under the applicable food-safety plan'],
            augmented: ['Review temperature logs against the approved HACCP plan', 'A person investigates agent-flagged missing readings and critical-limit deviations before deciding corrective actions'],
            performed: ['Screen recorded HACCP monitoring logs for missing or out-of-range entries', 'An exception queue using supplied critical limits, not confirmation that food is safe'],
            judgment: 'Inspect real conditions, verify measurements, set validated critical limits and decide product disposition.',
            assistance: 'Compare supplied logs with the current approved plan and cite the relevant limit and record for each flag.',
            execution: 'Apply specified log rules, identify missing timestamps or deviations and stop for human escalation.',
            capabilities: ['Monitoring-log parsing', 'Plan-specific threshold checks', 'Traceable exception reporting'],
            limits: ['Incomplete logs, sensor error and unrecorded contamination can hide hazards.', 'No autonomous food handling, safety certification, critical-limit changes or product release; qualified people retain regulatory responsibility.']
        },
        {
            id: 'translation', label: 'Translation and terminology review',
            aliases: ['translation', 'use computer-aided translation', 'use translation memory software', 'machine translation', 'revise translation works', 'review translation works', 'employ translation techniques', 'translate texts', 'translate different types of texts', 'language translation', 'perform sworn translations'],
            human: ['Resolve culturally sensitive meaning in a translation for a defined audience', 'A qualified translator approves wording that preserves intent, nuance and context'],
            augmented: ['Prepare a translation draft using an approved bilingual glossary', 'A translator revises an agent-produced draft with ambiguous terms and unsupported terminology highlighted'],
            performed: ['Check an approved bilingual text for missing segments, numbers and glossary mismatches', 'A segment-linked quality-check report, not a certified translation'],
            judgment: 'Resolve ambiguity, cultural context and domain meaning; approve the final translation and any certification.',
            assistance: 'Draft target-language segments using approved terminology, preserve numbers and flag uncertain interpretations.',
            execution: 'Compare aligned segments with explicit glossary and numeric-consistency rules without publishing or certifying text.',
            capabilities: ['Glossary-constrained translation', 'Bilingual segment alignment', 'Terminology and numeric checks'],
            conditions: ['Specify source and target languages, dialect, script, register and domain; evaluate both languages on representative examples with a qualified bilingual reviewer before use.'],
            limits: ['Fluent wording can conceal mistranslation, dialect errors or meaning lost from context; quality and low-resource language coverage remain uncertain until evaluated.', 'Sworn, legal, medical and safety-critical translations require appropriate qualified review; no certification or live interpreting authority is assumed. Clinical decisions, consent and emergency instructions remain with qualified people.']
        },
        {
            id: 'web-accessibility', label: 'Web accessibility testing',
            aliases: ['web accessibility', 'web accessibility testing', 'web accessibility standards', 'web content accessibility guidelines', 'WCAG', 'ICT accessibility standards', 'test system accessibility for users with special needs'],
            human: ['Evaluate whether a web task is usable with assistive technology', 'A person judges task completion, keyboard behavior and accessibility barriers in context'],
            augmented: ['Investigate accessibility barriers in a web form', 'A reviewer combines agent-prepared scan findings with manual keyboard and assistive-technology testing'],
            performed: ['Run a preapproved automated accessibility scan on specified pages', 'A reproducible issue report with affected elements and manual-review gaps explicitly identified'],
            judgment: 'Evaluate actual usability, test with people and assistive technology, and prioritize verified barriers.',
            assistance: 'Locate suspect elements, explain relevant WCAG criteria and draft fixes for a person to validate.',
            execution: 'Run allowlisted scan rules on approved pages, record tool versions and report findings without claiming full conformance.',
            capabilities: ['Browser accessibility inspection', 'Automated rule execution', 'Reproducible element-level reporting'],
            limits: ['Automated checks cannot establish meaningful reading order, useful alternatives or full accessibility conformance.', 'No legal compliance certification or claim that a passing scan replaces manual or disabled-user testing.']
        },
        {
            id: 'procurement', label: 'Procurement and supplier comparison',
            aliases: ['procurement', 'perform procurement processes', 'develop procurement strategy', 'draft procurement technical specifications', 'e-procurement', 'procurement lifecycle', 'use e-procurement', 'assess procurement needs'],
            human: ['Choose a supplier after weighing requirements, risk and conflicts of interest', 'An authorized buyer makes a defensible sourcing decision within the applicable procurement rules'],
            augmented: ['Compare supplier bids against an approved procurement specification', 'A buyer reviews an agent-prepared matrix of quoted terms, requirement gaps and missing evidence'],
            performed: ['Check submitted bid packages for required documents and dates', 'A source-linked completeness queue without awarding a contract or excluding suppliers automatically'],
            judgment: 'Set fair criteria, assess supplier risk, resolve conflicts and authorize commitments under procurement policy.',
            assistance: 'Extract quoted terms into a common matrix, preserve units and currencies, and flag unsupported comparisons.',
            execution: 'Apply an approved bid-document checklist and flag missing items or dates without contacting vendors.',
            capabilities: ['Permission-scoped bid extraction', 'Requirements-to-evidence matching', 'Document and deadline validation'],
            limits: ['Quotes may conceal exclusions, currency differences or commercially sensitive terms.', 'No autonomous supplier award, contract signature, purchase commitment or public-procurement compliance decision.']
        },
        {
            id: 'archives', label: 'Archival management and preservation',
            aliases: ['manage digital archives', 'manage archive', 'archival management', 'archival preservation', 'archival processing', 'store archival documents'],
            human: ['Appraise an archival collection and decide access and preservation priorities', 'An archivist balances historical context, provenance, rights and obligations'],
            augmented: ['Draft collection descriptions from approved archival records', 'An archivist reviews agent-proposed metadata with uncertain dates, names and provenance clearly flagged'],
            performed: ['Validate a digital archive manifest against approved metadata and checksum rules', 'An integrity and missing-field report without deleting, moving or changing archival originals'],
            judgment: 'Evaluate provenance, retention duties, sensitive access and preservation treatment; approve descriptive claims.',
            assistance: 'Extract supplied descriptive evidence, preserve source references and mark uncertain attributions rather than inventing them.',
            execution: 'Check manifest fields and file checksums using approved read-only tools; report mismatches without repairing originals.',
            capabilities: ['Source-linked metadata extraction', 'Manifest schema validation', 'Read-only checksum verification'],
            limits: ['OCR errors and incomplete provenance can create false attributions or misleading descriptions.', 'No autonomous disposal, deaccessioning, access-rights changes or physical preservation treatment; retention and privacy obligations require review.']
        },
        {
            id: 'horticulture', label: 'Horticulture and plant-care records',
            aliases: ['horticulture', 'horticulture principles', 'sustainable horticulture', 'apply horticultural standards and practices', 'landscaping / horticulture'],
            human: ['Inspect plant health and select care suited to the growing site', 'A horticulturist considers species, soil, season and actual conditions before treating plants'],
            augmented: ['Compare garden observations with an approved seasonal care plan', 'A grower reviews agent-organized symptoms, weather records and missing observations before deciding care'],
            performed: ['Check a plant-care log for missing observations and scheduled follow-ups', 'A dated exception list using the approved care schedule, not an autonomous treatment plan'],
            judgment: 'Inspect plants and soil, distinguish causes of damage and perform safe care within local requirements.',
            assistance: 'Organize supplied observations by plant and date, cite approved care references and flag uncertainty about causes.',
            execution: 'Match logged observations to an approved schedule and prepare reminders without controlling irrigation or applying treatments.',
            capabilities: ['Plant-record organization', 'Approved care-reference retrieval', 'Schedule and observation checks'],
            limits: ['Similar symptoms can have different causes; images and logs alone may omit soil, pest or weather conditions.', 'No autonomous pesticide application, equipment operation or plant-disease diagnosis; regulated treatments require qualified authority.']
        }
    ];
    // Signing is a visual language capability, not spoken-language recognition
    // or written translation. All agent tasks here use approved preparation data.
    var signingConditions = [
        'Specify the sign language, regional variation, register and domain with a competent signer; ASL, BSL and other sign languages are distinct, not universal or signed forms of English.',
        'Respect participant communication preferences. Obtain explicit participant consent before camera access, recording, upload or reuse; agree purpose, access and retention, and use approved material only. These agent tasks require no camera or recording.',
        'Evaluate the specific tool on representative preparation tasks with a competent signer or qualified sign-language interpreter; this label does not establish tool capability.'
    ];
    var signingLimits = [
        'Visual recognition quality is uncertain: handshape, movement, spatial grammar, facial expression and other non-manual signals can be missed, especially with occlusion, poor lighting or camera framing. Text, captions or speech recognition do not establish signing competence.',
        'A competent human retains signing, visual comprehension, clarification and cultural judgment. Preparation records do not prove sign-language proficiency or interpreting competence.',
        'No autonomous live sign-language interpreting, signing avatar substitution or certified interpretation is delegated. Sworn, legal, clinical and safety-critical communication requires appropriately qualified people; clinical decisions, informed consent and emergency instructions remain human responsibilities.'
    ];
    [
        { id: 'sign-language-asl', language: 'American Sign Language (ASL)', aliases: ['American Sign Language (ASL)', 'American Sign Language', 'ASL'] },
        { id: 'sign-language-bsl', language: 'British Sign Language', aliases: ['British Sign Language', 'British Sign Language (BSL)', 'BSL'] },
        { id: 'sign-language-hksl', language: 'Hong Kong Sign Language', aliases: ['Hong Kong Sign Language'] },
        { id: 'sign-language', language: 'a specified sign language', aliases: ['sign language', 'Sign Languages'] }
    ].forEach(function (entry) {
        specialties.push({
            id: entry.id, label: 'Signing in ' + entry.language, aliases: entry.aliases,
            human: ['Discuss a routine workplace arrangement using ' + entry.language, 'Competent signers exchange meaning visually, check understanding and clarify ambiguous signs'],
            augmented: ['Prepare an agenda and terminology questions for a workplace exchange using ' + entry.language, 'A competent signer reviews an agent-organized brief and selects appropriate signs and visual explanations'],
            performed: ['Check approved sign-language session preparation records for missing agenda and resource references', 'A source-linked preparation checklist with gaps escalated, not generated signing or a video transcript'],
            judgment: 'Produce and understand signing, including spatial grammar and non-manual signals; clarify meaning directly and respect participant preferences.',
            assistance: 'Organize supplied agenda items and retrieve approved resource references for signer review without generating signs or interpreting video.',
            execution: 'Apply explicit completeness rules to supplied preparation metadata and approved resource references; report gaps without accessing a camera, recognizing signs or contacting participants.',
            capabilities: ['Approved preparation-material organization', 'Source-linked resource retrieval', 'Preparation-record completeness checks'],
            conditions: signingConditions, limits: signingLimits
        });
    });
    specialties.push({
        id: 'sign-language-interpreting', label: 'Sign-language interpreting preparation and records',
        aliases: ['Sign Language Interpretation'],
        human: ['Interpret a live workplace exchange involving a specified sign language and language pair', 'A qualified sign-language interpreter preserves meaning across visual signing and the other specified language, manages turn-taking and requests clarification'],
        augmented: ['Organize approved briefing materials before a sign-language interpreting session', 'The qualified interpreter checks terminology questions, language pair, regional variation and visual access needs before the live exchange'],
        performed: ['Check approved sign-language interpreting booking records for missing language-pair and briefing references', 'An administrative exception list, not live interpretation, a certified transcript or approval of interpreter qualifications'],
        judgment: 'Perform visual interpreting within professional authority, handle spatial and non-manual meaning, manage sightlines and turn-taking, and preserve confidentiality.',
        assistance: 'Organize supplied briefing material and questions for qualified interpreter review; do not infer signed equivalents from written words or interpret a live video feed.',
        execution: 'Check supplied booking metadata and briefing references against approved completeness rules without camera access, sign recognition, live interpreting or certifying interpreter qualifications.',
        capabilities: ['Language-pair briefing organization', 'Approved-reference tracking', 'Booking-record completeness checks'],
        conditions: signingConditions.concat([
            'Specify and validate both languages and interpreting direction with a qualified sign-language interpreter; confirm visual access, sightlines, turn-taking and confidentiality requirements.'
        ]),
        limits: signingLimits.concat([
            'Latency, overlapping signing, obstructed sightlines and missing non-manual signals can change meaning in real time; administrative completeness is not proof of accessible communication or qualified interpreting.'
        ])
    });
    function normalizedLabel(name) {
        return name.toLowerCase().replace(/\s+/g, ' ').trim();
    }
    // Reviewed ESCO grammar in skills/index-v4.json: 73 write/understand-written
    // languages, and 70 modern understand-spoken/interact-verbally languages.
    // Do not accept arbitrary suffixes or infer capability from language names.
    var writtenLanguages = [
        'Albanian', 'Ancient Greek', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque',
        'Belarusian', 'Bengali', 'Berber', 'Bihari', 'Bosnian', 'Bulgarian',
        'Catalan', 'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English',
        'Estonian', 'Finnish', 'French', 'Galician', 'Georgian', 'German', 'Greek',
        'Gujarati', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic', 'Irish', 'Italian',
        'Japanese', 'Javanese', 'Kazakh', 'Korean', 'Kurdish', 'Latin', 'Latvian',
        'Limburgish', 'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malay',
        'Maltese', 'Marathi', 'Montenegrin', 'Norwegian', 'Occitan', 'Persian',
        'Polish', 'Portuguese', 'Punjabi', 'Romani', 'Romanian', 'Russian',
        'Sanskrit', 'Sardinian', 'Serbian', 'Slovak', 'Slovenian', 'Spanish',
        'Swedish', 'Tamil', 'Telugu', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
        'Walloon', 'Welsh', 'Yiddish'
    ];
    var languageLimits = [
        'Quality varies by language, dialect, script, register and domain; fluent output can hide errors, omissions or cultural misunderstandings. Low-resource coverage and OCR or speech recognition errors require explicit checks.',
        'Reading, writing, listening, conversation, translation and live interpreting are different capabilities; none proves competence in another or in an unspecified language pair.',
        'Sworn or legal certification remains with an appropriately qualified person. Clinical and safety-critical communication requires qualified human review; no autonomous diagnosis, consent, emergency instructions or live interpreting authority is assumed.'
    ];
    var languageTasks = [
        {
            id: 'language-reading', prefix: 'understand written ', label: 'Reading comprehension in {language}',
            human: ['Read a {language} workplace notice and resolve its intended meaning', 'A reader identifies obligations and ambiguities in their original written context'],
            augmented: ['Extract key points from an approved {language} document', 'A reader checks an agent summary against quoted source passages, including negation and uncertain terms'],
            performed: ['Extract dates and reference numbers from approved routine {language} notices', 'A source-linked extraction with missing or ambiguous fields escalated, not a certified translation'],
            judgment: 'Interpret the original written meaning, context and implications; verify quoted evidence before acting.',
            assistance: 'Summarize supplied text with source passages and mark uncertain readings; do not silently turn reading into translation.',
            execution: 'Extract specified fields against a checked example set, preserve source quotations and stop on ambiguous readings.',
            capabilities: ['{language} text comprehension', 'Source-linked extraction', 'OCR uncertainty detection']
        },
        {
            id: 'language-writing', prefix: 'write ', label: 'Writing in {language}',
            human: ['Compose a {language} workplace message for a defined audience', 'An author approves meaning, tone, register and cultural appropriateness'],
            augmented: ['Draft a routine {language} message from approved facts', 'An author revises the draft and checks grammar, factual fidelity and audience expectations'],
            performed: ['Populate an approved {language} acknowledgement template', 'A checked routine draft preserving supplied facts, queued for approval rather than sent'],
            judgment: 'Choose the intended message and register, verify facts and approve final wording and any release.',
            assistance: 'Draft in the requested language and register, flag uncertain phrasing and avoid inventing facts; bilingual translation is not assumed.',
            execution: 'Fill allowlisted template fields with approved facts, check required wording and route novel wording to a reviewer without sending.',
            capabilities: ['{language} constrained drafting', 'Register and grammar checks', 'Template and fact validation']
        },
        {
            id: 'language-listening', prefix: 'understand spoken ', label: 'Listening comprehension in {language}',
            human: ['Listen to a {language} work briefing and clarify uncertain statements', 'A listener checks meaning with the speaker rather than assuming a transcript is correct'],
            augmented: ['Review a consented {language} briefing recording with timestamped notes', 'A listener checks agent-prepared notes against the audio and resolves unclear speech'],
            performed: ['Index a consented routine {language} recording against an approved vocabulary', 'Timestamped candidate mentions and unclear-audio flags, not live instructions or an authoritative transcript'],
            judgment: 'Interpret speech in context, ask for clarification and verify accents, speaker intent and consequential details.',
            assistance: 'Prepare timestamped notes, mark inaudible speech and speaker uncertainty, and retain access to the original recording.',
            execution: 'Find specified vocabulary in approved recordings, link timestamps and escalate low-quality audio without inventing missing speech.',
            capabilities: ['{language} speech recognition', 'Timestamp-linked audio retrieval', 'Audio-quality and accent uncertainty checks']
        },
        {
            id: 'language-conversation', prefix: 'interact verbally in ', label: 'Spoken interaction in {language}',
            human: ['Discuss a routine work arrangement in {language}', 'Participants clarify intent and agree next steps in a shared language'],
            augmented: ['Rehearse a {language} work conversation using an approved brief', 'A speaker practices turn-taking and checks suggested phrasing with a competent reviewer'],
            performed: ['Run a scripted {language} conversation rehearsal in a sandbox', 'Practice prompts from an approved script with unrecognized responses handed back to a person'],
            judgment: 'Manage relationships, clarify intent, handle unexpected turns and retain responsibility for real commitments.',
            assistance: 'Offer practice dialogue and pronunciation cues, flag uncertainty and avoid claiming bilingual interpreting competence.',
            execution: 'Present approved practice turns, check allowed responses and stop outside the rehearsal script; do not contact real participants.',
            capabilities: ['{language} speech interaction', 'Bounded dialogue handling', 'Pronunciation and turn-taking feedback']
        },
        {
            id: 'language-interpreting', label: 'Live interpreting preparation and records',
            aliases: ['interpret spoken language between two parties', 'translate spoken language', 'translate spoken language simultaneously', 'interpret languages in conferences', 'interpret languages in live broadcasting shows', 'perform bilateral interpretation', 'voice interpreting', 'chuchotage interpreting', 'court interpreting', 'perform sworn interpretations'],
            human: ['Interpret a live exchange between speakers in a defined language pair', 'A qualified interpreter preserves meaning, turn-taking and confidentiality while requesting clarification'],
            augmented: ['Prepare a bilingual glossary for a qualified interpreter before a live session', 'The interpreter verifies terms, dialect and context before using the preparation'],
            performed: ['Check approved interpreting-session records for missing glossary and booking references', 'An administrative exception list, not autonomous live interpreting or a certified transcript'],
            judgment: 'Perform live interpreting within professional authority; handle ambiguity, latency, confidentiality and consequential meaning in real time.',
            assistance: 'Organize approved briefing material and proposed bilingual terms for interpreter review; never substitute an unverified live audio feed.',
            execution: 'Check supplied session metadata and glossary references against explicit completeness rules without listening to or interpreting a live session.',
            capabilities: ['Language-pair terminology preparation', 'Glossary provenance tracking', 'Session-record completeness checks'],
            limits: ['Live interpreting adds latency, overlapping speakers, accents and unrecoverable real-time errors; a translation draft or transcript does not establish interpreting competence. No autonomous live interpreting, sworn certification or clinical or safety-critical communication is delegated.']
        }
    ];
    function languageProfile(name) {
        var normalized = normalizedLabel(name);
        var language;
        var task = languageTasks.find(function (p) {
            if (p.aliases) return p.aliases.indexOf(normalized) !== -1;
            return writtenLanguages.some(function (candidate) {
                if ((p.id === 'language-listening' || p.id === 'language-conversation') &&
                    ['Ancient Greek', 'Latin', 'Sanskrit'].indexOf(candidate) !== -1) return false;
                if (normalizedLabel(p.prefix + candidate) !== normalized) return false;
                language = candidate;
                return true;
            });
        });
        if (!task) return null;
        var profile = {};
        function render(text) { return text.replace(/\{language\}/g, language); }
        Object.keys(task).forEach(function (key) {
            var value = task[key];
            profile[key] = Array.isArray(value) ? value.map(render) : render(value);
        });
        profile.limits = languageLimits.concat(profile.limits || []);
        profile.conditions = [
            'Evaluate the specific tool on representative examples for the required language, dialect, script, register and domain; coverage and quality are not established by this label.',
            'Use authorized material and consented recordings only; a competent language reviewer checks meaning, and any translation or interpreting preparation specifies and validates both languages.'
        ];
        return profile;
    }
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
            pattern: /\b(pilot\w*|piloting|flight|aviation|instrument rated|mental health|medical|clinical|sworn|safety[- ]critical|legal translation|court interpreting|nursing|therapy|construction|electrical|surgery|driving|welding|carpentry|cabinet making|cabinetmaking|chromatography|hplc|horticultur\w*|food safety|haccp)\b/i,
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
        // Reviewed exact specialties carry their own safety boundaries. Broader
        // compound labels still go through the existing safety-first routing.
        var specialty = languageProfile(name) || specialties.find(function (p) {
            return p.aliases.some(function (alias) { return normalizedLabel(alias) === normalizedLabel(name); });
        });
        var profile = specialty || priority.map(function (id) { return library.find(function (p) { return p.id === id; }); })
            .find(function (p) { return p.pattern.test(name); }) || fallback;
        var confidence = profile === fallback ? 'Low' : 'Moderate';
        return {
            skill: name,
            proficiency: options.level || 'Not specified',
            match: {
                kind: specialty ? 'exact_specialist' : profile === fallback ? 'low_confidence_fallback' : 'broad_domain',
                profileId: profile.id,
                label: profile.label, confidence: confidence,
                basis: profile === fallback
                    ? 'No specific match. Broad supporting-task illustrations are shown, with low confidence.'
                    : specialty
                        ? 'Maintained task-specific template matched to an exact skill label or controlled alias. Not a tested capability benchmark or a personal assessment.'
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
                    capabilities: [], conditions: ['A person has the relevant context, authority and professional competence.'].concat(profile.conditions || []),
                    limits: profile.limits.slice(), confidence: confidence,
                    reason: 'Human contribution is concentrated in judgment, relationships, real-world execution or accountability.' },
                { id: 'augmented', title: 'Agent-augmented', task: profile.augmented[0], outcome: profile.augmented[1],
                    humanContribution: profile.judgment, agentContribution: profile.assistance,
                    capabilities: profile.capabilities.slice(),
                    conditions: ['Approved data and suitable tools are available.', 'The person checks sources and output before acting.'].concat(profile.conditions || []),
                    limits: profile.limits.slice(), confidence: confidence,
                    reason: 'An agent could perform preparation or analysis while the person directs and reviews the work.' },
                { id: 'performed', title: 'Agent-performed', task: profile.performed[0], outcome: profile.performed[1],
                    humanContribution: 'Define the scope and acceptance checks, review exceptions, and approve consequential downstream actions.',
                    agentContribution: profile.execution, capabilities: profile.capabilities.slice(),
                    conditions: ['The task is narrow, repeatable and testable against an approved baseline.', 'Access is constrained; exceptions stop execution and reach a person.'].concat(profile.conditions || []),
                    limits: profile.limits.slice(), confidence: profile === fallback ? 'Low' : 'Conditional',
                    reason: 'A bounded routine task could move from human execution to agent execution; oversight and the broader human skill remain.' }
            ]
        };
    }
    root.BPWorkScenarios = {
        describe: describe,
        // Read-only review metadata; no ontology loading or matching expansion.
        controlledAliases: function () {
            return specialties.map(function (p) { return { profileId: p.id, aliases: p.aliases.slice() }; });
        }
    };
})(window);
