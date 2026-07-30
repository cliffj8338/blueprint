                // Edit/remove — hidden for sample jobs unless admin
                var isSampleJob = job.sample === true;
                if (isSampleJob && !fbIsAdmin) {
                    html += '<div style="margin-top:8px; font-size:0.72em; color:var(--text-muted); text-align:right; font-style:italic;">' + bpIcon('lock', 10) + ' Demo job</div>';
                } else {
                    html += '<div style="margin-top:8px; display:flex; justify-content:flex-end; gap:8px;">'
                        + (isSampleJob ? '<span style="font-size:0.72em; color:var(--text-muted); align-self:center; margin-right:auto; font-style:italic;">' + bpIcon('lock', 10) + ' Demo</span>' : '')
                        + '<button onclick="event.stopPropagation(); editJobInfo(' + idx + ')" style="'
                        + 'background:none; border:1px solid var(--border); color:var(--text-muted); font-size:0.75em; '
                        + 'cursor:pointer; padding:4px 10px; border-radius:5px;" '
                        + 'onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-muted)\'">\u270E Edit</button>'
                        + '<button onclick="event.stopPropagation(); removeJob(' + idx + ')" style="'
                        + 'background:none; border:1px solid rgba(239,68,68,0.2); color:var(--text-muted); font-size:0.75em; '
                        + 'cursor:pointer; padding:4px 10px; border-radius:5px;" '
                        + 'onmouseover="this.style.color=\'#ef4444\';this.style.borderColor=\'rgba(239,68,68,0.5)\'" '
                        + 'onmouseout="this.style.color=\'var(--text-muted)\';this.style.borderColor=\'rgba(239,68,68,0.2)\'">\u2715 Remove</button>'
                        + '</div>';
                }
                
                // Scouting Report CTA
                html += '<div onclick="event.stopPropagation(); launchScoutingReport()" style="'
                    + 'margin-top:10px; padding:8px 14px; border-radius:8px; '
                    + 'background:linear-gradient(135deg, rgba(96,165,250,0.08), rgba(99,102,241,0.05)); '
                    + 'border:1px solid rgba(96,165,250,0.15); cursor:pointer; display:flex; align-items:center; '
                    + 'gap:8px; font-size:0.8em; font-weight:600; color:var(--accent); transition:all 0.2s;" '
                    + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.4)\';this.style.background=\'rgba(96,165,250,0.12)\'" '
                    + 'onmouseout="this.style.borderColor=\'rgba(96,165,250,0.15)\';this.style.background=\'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(99,102,241,0.05))\'">'
                    + bpIcon('file-text',14) + ' Create Scouting Report'
                    + '</div>';
                
                html += '</div>';
            });
            
            return html;
        }
        
        function renderFindJobs() {
            // Build role suggestions from user's profile
            var roleSuggestions = '';
            if (userData.roles && userData.roles.length > 0) {
                roleSuggestions = userData.roles.map(function(r) {
                    return '<button onclick="document.getElementById(\'findJobsKeyword\').value=\'' + escapeHtml(r.name).replace(/'/g, "&#39;") + '\'; searchOpportunities();" '
                        + 'style="padding:4px 12px; border-radius:14px; border:1px solid var(--border); background:none; '
                        + 'color:var(--text-secondary); cursor:pointer; font-size:0.82em; transition:all 0.15s;" '
                        + 'onmouseover="this.style.borderColor=\'var(--accent)\'; this.style.color=\'var(--accent)\'" '
                        + 'onmouseout="this.style.borderColor=\'var(--border)\'; this.style.color=\'var(--text-secondary)\'">'
                        + escapeHtml(r.name) + '</button>';
                }).join('');
            }
            
            return ''
                
                + '<div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">'
                + '<input id="findJobsKeyword" type="text" placeholder="Job title, skill, or keyword..." '
                + 'value="' + escapeHtml(window._lastJobSearch || '') + '" '
                + 'onkeydown="if(event.key===\'Enter\') searchOpportunities();" '
                + 'style="flex:2; min-width:180px; padding:10px 14px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.92em;" />'
                + '<input id="findJobsLocation" type="text" placeholder="City, state, or remote..." '
                + 'value="' + escapeHtml(window._lastJobLocation || '') + '" '
                + 'onkeydown="if(event.key===\'Enter\') searchOpportunities();" '
                + 'style="flex:1; min-width:140px; padding:10px 14px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.92em;" />'
                + '<button onclick="searchOpportunities()" style="padding:10px 20px; background:var(--accent); '
                + 'color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em; '
                + 'display:flex; align-items:center; gap:6px; white-space:nowrap;">'
                + bpIcon('search',14) + ' Search</button>'
                + '</div>'
                + '<div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">'
                
                + '<select id="findJobsCategory" style="padding:10px 14px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.88em; min-width:150px;">'
                + '<option value="">All Categories</option>'
                + '<option value="software-dev">Software Dev</option>'
                + '<option value="marketing">Marketing</option>'
                + '<option value="business">Business</option>'
                + '<option value="data">Data Science</option>'
                + '<option value="design">Design</option>'
                + '<option value="product">Product</option>'
                + '<option value="hr">Human Resources</option>'
                + '<option value="finance">Finance</option>'
                + '<option value="sales">Sales</option>'
                + '<option value="customer-support">Customer Support</option>'
                + '<option value="writing">Writing</option>'
                + '<option value="devops">DevOps / SysAdmin</option>'
                + '</select>'
                
                + '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85em; color:var(--text-secondary);">'
                + '<input type="checkbox" id="findJobsRemote" ' + (window._lastJobRemote ? 'checked' : '') + ' style="accent-color:var(--accent);"> Remote only</label>'
                
                + '<button onclick="clearJobSearch();" '
                + 'style="padding:8px 12px; background:none; border:1px solid var(--border); border-radius:8px; '
                + 'color:var(--text-muted); cursor:pointer; font-size:0.78em;">Clear</button>'
                + '<div style="display:flex; align-items:center; gap:8px; margin-left:auto;">'
                + '<span style="font-size:0.82em; color:var(--text-muted); white-space:nowrap;">Min match:</span>'
                + '<input type="range" min="0" max="80" value="' + currentMatchThreshold + '" '
                + 'oninput="updateMatchThreshold(this.value)" style="width:100px; accent-color:var(--accent);" />'
                + '<span id="matchValue" style="font-weight:600; color:var(--accent); font-size:0.85em; min-width:30px;">' + currentMatchThreshold + '%</span>'
                + '</div>'
                + '</div>'
                
                + (roleSuggestions ? '<div style="display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap;">'
                + '<span style="font-size:0.78em; color:var(--text-muted); padding:4px 0;">Quick search:</span>'
                + roleSuggestions + '</div>' : '')
                
                + '<div id="opportunitiesResults"></div>';
        }
        
        function clearJobSearch() {
            var kw = document.getElementById('findJobsKeyword'); if (kw) kw.value = '';
            var loc = document.getElementById('findJobsLocation'); if (loc) loc.value = '';
            var cat = document.getElementById('findJobsCategory'); if (cat) cat.selectedIndex = 0;
            var rem = document.getElementById('findJobsRemote'); if (rem) rem.checked = false;
            window._lastJobSearch = ''; window._lastJobLocation = ''; window._lastJobRemote = false;
            opportunitiesData = [];
            var r = document.getElementById('opportunitiesResults'); if (r) r.innerHTML = '';
        }
        window.clearJobSearch = clearJobSearch;
        
        // ===== ADD JOB MODAL =====
        
        function showAddJobModal() {
            if (readOnlyGuard()) return;
            var modal = document.getElementById('exportModal');
            var mc = modal.querySelector('.modal-content');
            var savedKey = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('wbAnthropicKey') : null) || safeGet('wbAnthropicKey') || '';
            
            mc.innerHTML = '<div class="modal-header">'
                + '<div class="modal-header-left">'
                + '<h2 class="modal-title">Add a Job</h2>'
                + '<p style="color:var(--text-muted); margin-top:5px;">Paste a job description to analyze your fit</p>'
                + '</div>'
                + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
                + '</div>'
                + '<div class="modal-body" style="padding:24px;">'
                
                // JD paste area
                + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px;">Job Description *</label>'
                + '<textarea id="jdTextInput" placeholder="Paste the full job description here..." style="'
                + 'width:100%; min-height:180px; padding:14px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); '
                + 'font-size:0.92em; line-height:1.6; font-family:inherit; resize:vertical;"></textarea>'
                
                // Source URL
                + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;">'
                + '<div>'
                + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Source URL</label>'
                + '<input id="jdSourceUrl" placeholder="https://..." style="'
                + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
                + '</div>'
                + '<div>'
                + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Source Note</label>'
                + '<input id="jdSourceNote" placeholder="e.g., Recruiter email, LinkedIn" style="'
                + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
                + '</div></div>'
                
                // API key (collapsible)
                + '<details style="margin-top:16px;">'
                + '<summary style="cursor:pointer; font-size:0.82em; color:var(--text-muted);">'
                + '\u26A1 AI-powered analysis (optional, requires API key)</summary>'
                + '<div style="margin-top:8px; padding:12px; background:var(--c-surface-1); '
                + 'border:1px solid var(--border); border-radius:8px;">'
                + '<input id="jdApiKey" type="password" placeholder="sk-ant-..." value="' + escapeHtml(savedKey) + '" style="'
                + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
                + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.88em; font-family:monospace;" />'
                + '<div style="font-size:0.75em; color:var(--text-muted); margin-top:6px; line-height:1.5;">'
                + '⚠ Security: This key is stored in your browser\u2019s localStorage and is accessible to browser extensions. Clear it when done. Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">console.anthropic.com</a>. '
                + 'Signed-in users get AI features automatically. Without sign-in or a key, analysis uses local skill matching (still good, but less nuanced).'
                + '</div></div></details>'
                
                + '<div id="jdParsingStatus" style="display:none; margin-top:16px; padding:16px; border-radius:8px; text-align:center;"></div>'
                
                // Actions
                + '<div style="display:flex; gap:12px; justify-content:flex-end; margin-top:20px;">'
                + '<button onclick="closeExportModal()" style="'
                + 'background:transparent; color:var(--text-muted); border:1px solid var(--border); '
                + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">Cancel</button>'
                + '<button id="analyzeJobBtn" onclick="analyzeJob()" style="'
                + 'background:var(--accent); color:#fff; border:none; padding:10px 24px; border-radius:8px; '
                + 'cursor:pointer; font-weight:600; font-size:0.9em;">\uD83D\uDD0D Analyze Fit</button>'
                + '</div></div>';
            
            history.pushState({ modal: true }, ''); modal.classList.add('active');
            setTimeout(function() { var el = document.getElementById('jdTextInput'); if (el) el.focus(); }, 100);
        }
        window.showAddJobModal = showAddJobModal;
        
        // ===== JOB ANALYSIS ENGINE =====
        
        // ===== BLS OCCUPATION MATCHING =====
        function matchJobToBLS(titleText, descText) {
            if (!window.blsWages) return null;
            var bls = window.blsWages;
            var text = ((titleText || '') + ' ' + (descText || '').substring(0, 500)).toLowerCase();
            var scores = {};
            
            // Phase 1: Alias matching (strongest signal, weight 5)
            if (bls.aliases) {
                // Sort aliases by length descending so longer phrases match first
                var sortedAliases = Object.keys(bls.aliases).sort(function(a, b) { return b.length - a.length; });
                for (var ai = 0; ai < sortedAliases.length; ai++) {
                    var alias = sortedAliases[ai];
                    if (text.indexOf(alias) !== -1) {
                        var soc = bls.aliases[alias];
                        scores[soc] = (scores[soc] || 0) + 5;
                    }
                }
            }
            
            // Phase 2: Title keyword matching (weight 1 per word)
            var words = text.match(/[a-z]+/g) || [];
            var skip = {and:1,or:1,the:1,of:1,for:1,all:1,other:1,except:1,a:1,an:1,in:1,to:1,with:1,by:1,is:1,are:1,was:1,will:1,this:1,that:1,you:1,our:1,your:1,we:1};
            words = words.filter(function(w) { return !skip[w] && w.length > 2; });
            
            for (var oi = 0; oi < bls.occupations.length; oi++) {
                var occ = bls.occupations[oi];
                var occWords = (occ.keywords || []);
                var overlap = 0;
                for (var wi = 0; wi < words.length; wi++) {
                    if (occWords.indexOf(words[wi]) !== -1) overlap++;
                }
                if (overlap > 0) {
                    scores[occ.soc] = (scores[occ.soc] || 0) + overlap;
                }
            }
            
            // Find best match
            var best = null;
            var bestScore = 0;
            for (var soc in scores) {
                if (scores[soc] > bestScore) {
                    bestScore = scores[soc];
                    best = soc;
                }
            }
            
            if (!best) return null;
            
            // Look up the occupation data
            var matched = null;
            for (var mi = 0; mi < bls.occupations.length; mi++) {
                if (bls.occupations[mi].soc === best) {
                    matched = bls.occupations[mi];
                    break;
                }
            }
            
            if (!matched) return null;
            
            return {
                soc: matched.soc,
                title: matched.title,
                median: matched.a_median,
                pct10: matched.a_pct10,
                pct25: matched.a_pct25,
                pct75: matched.a_pct75,
                pct90: matched.a_pct90,
                employment: matched.employment,
                confidence: bestScore,
                source: 'BLS OEWS ' + (bls.period || '2024')
            };
        }
        window.matchJobToBLS = matchJobToBLS;
        
        async function analyzeJob() {
            var jdText = (document.getElementById('jdTextInput').value || '').trim();
            if (!jdText || jdText.length < 50) {
                showToast('Paste a job description (at least a few sentences).', 'warning');
                return;
            }
            
            var sourceUrl = (document.getElementById('jdSourceUrl').value || '').trim();
            var sourceNote = (document.getElementById('jdSourceNote').value || '').trim();
            var apiKey = (document.getElementById('jdApiKey').value || '').trim();
            
            if (apiKey) {
                try { sessionStorage.setItem('wbAnthropicKey', apiKey); } catch(e) {}
                try { localStorage.removeItem('wbAnthropicKey'); } catch(e) {}
            }
            
            // Show progress
            var statusEl = document.getElementById('jdParsingStatus');
            var btn = document.getElementById('analyzeJobBtn');
            statusEl.style.display = 'block';
            statusEl.style.background = 'var(--c-accent-bg-3a)';
            statusEl.innerHTML = '<div class="loading-spinner" style="width:24px; height:24px; border-width:2px; margin:0 auto 8px;"></div>'
                + '<div style="color:var(--text-secondary); font-size:0.88em;">'
                + (apiKey ? 'Analyzing with AI...' : 'Matching against skill library...') + '</div>';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            
            try {
                var parsed;
                if (apiKey) {
                    parsed = await parseJobWithAPI(jdText, apiKey);
                } else {
                    parsed = parseJobLocally(jdText);
                }
                
                // Calculate match against user's skills
                var matchData = matchJobToProfile(parsed);
                
                // Build the job object
                var blsSalary = matchJobToBLS(parsed.title, jdText);
                var job = {
                    id: 'job-' + Date.now(),
                    title: parsed.title || 'Untitled Position',
                    company: parsed.company || '',
                    sourceUrl: sourceUrl,
                    sourceNote: sourceNote,
                    rawText: jdText.substring(0, 5000), // Cap storage
                    parsedSkills: parsed.skills || [],
                    parsedRoles: parsed.roles || [],
                    seniority: parsed.seniority || '',
                    matchData: matchData,
                    blsSalary: blsSalary,
                    addedAt: new Date().toISOString()
                };
                
                // Save
                if (!userData.savedJobs) userData.savedJobs = [];
                if (userData.savedJobs.length >= 10) {
                    showToast('Job pipeline is full (10 max). Remove one first.', 'warning');
                    return;
                }
                userData.savedJobs.unshift(job);
                saveUserData();
                if (fbUser) debouncedSave();
                
                closeExportModal();
                
                // Refresh the jobs view
                window.opportunitiesInitialized = false;
                switchView('opportunities');
                
                showToast('Job analyzed: ' + matchData.score + '% match with ' + (matchData.matched || []).length + ' skills aligned.', 'success', 5000);
                
            } catch (err) {
                console.error('Job analysis error:', err);
                statusEl.style.background = 'var(--c-red-bg-2b)';
                statusEl.innerHTML = '<div style="color:#ef4444; font-size:0.88em;">\u26A0 ' + escapeHtml(err.message || 'Analysis failed.') + '</div>';
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
        window.analyzeJob = analyzeJob;
        
        // ===== CLAUDE API PARSING =====
        
        async function parseJobWithAPI(jdText, apiKey) {
            logAnalyticsEvent('job_analysis', {});
            var userSkillNames = (skillsData.skills || []).map(function(s) { return s.name; });
            
            var systemPrompt = 'You extract structured data from job descriptions. Respond ONLY with valid JSON, no markdown fences, no preamble.';
            
            // Build vocabulary hint: user skills + canonical synonym keys
            var vocabSet = new Set();
            userSkillNames.slice(0, 60).forEach(function(n) { vocabSet.add(n); });
            Object.keys(SKILL_SYNONYMS).forEach(function(k) {
                // Capitalize for display
                vocabSet.add(k.replace(/\b\w/g, function(c) { return c.toUpperCase(); }));
            });
            var vocabHint = Array.from(vocabSet).slice(0, 120).join(', ');
            
            var userPrompt = 'Extract from this job description:\n\n' + jdText.substring(0, 4000) + '\n\n'
                + 'Return JSON with this exact structure:\n'
                + '{\n'
                + '  "title": "Job title",\n'
                + '  "company": "Company name or empty string",\n'
                + '  "seniority": "Entry|Mid|Senior|Executive",\n'
                + '  "roles": ["functional area 1", "functional area 2"],\n'
                + '  "skills": [\n'
                + '    {"name": "Skill Name", "requirement": "Required|Preferred|Nice-to-have", "proficiency": "Novice|Competent|Proficient|Expert|Mastery", "category": "Technical|Leadership|Business|Communication|Domain"}\n'
                + '  ]\n'
                + '}\n\n'
                + 'Rules:\n'
                + '- Extract 15-30 distinct skills from explicit requirements AND implied competencies\n'
                + '- Use professional skill names (e.g., "Strategic Planning" not "plan stuff")\n'
                + '- CRITICAL: Normalize skill names to match this vocabulary where possible: ' + vocabHint + '\n'
                + '- Use the FULL form of abbreviations (e.g., "Applicant Tracking System" not "ATS", "Customer Relationship Management" not "CRM") so matching works across profiles\n'
                + '- For skills NOT in the above list, use standard industry terminology (O*NET, LinkedIn Skills, etc.)\n'
                + '- Include both hard and soft skills\n'
                + '- Infer skills from responsibilities even if not explicitly listed\n'
                + '- requirement: Required for must-haves, Preferred for should-haves, Nice-to-have for bonus skills\n'
                + '- proficiency: infer the MINIMUM proficiency the job demands for each skill based on seniority and context:\n'
                + '  Novice = basic awareness, Competent = can do with guidance, Proficient = independent and effective,\n'
                + '  Expert = deep mastery and can teach others, Mastery = industry-leading authority\n'
                + '  For Executive/Senior roles, default most core skills to Expert or Mastery.\n'
                + '  For Mid roles, default to Proficient. For Entry, default to Competent or Novice.\n'
                + '- For common role-implied skills that are obvious but unstated (e.g., ATS for recruiters, Excel for analysts, Git for developers), include them as Preferred';
            
            var data = await callAnthropicAPI({
                    model: BP_AI_MODEL,
                    max_tokens: 2000,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }]
                }, apiKey, 'jd-analysis');
            
            var text = data.content.map(function(c) { return c.text || ''; }).join('');
            
            // Parse JSON, strip any fences
            text = text.replace(/```json|```/g, '').trim();
            var parsed = safeParse(text, null);
            if (!parsed) throw new Error('Failed to parse AI response as JSON');
            return parsed;
        }
        
        // ===== LOCAL FALLBACK PARSING =====
        
        function parseJobLocally(jdText) {
            var text = jdText.toLowerCase();
            var lines = jdText.split('\n');
            
            // ===== TITLE EXTRACTION =====
            // Skip meta lines, find first line that looks like a job title
            var title = '';
            var company = '';
            var skipPatterns = /^(about|we are|our |the |at |join|summary|generated|posted|apply|location|date|salary|benefits|equal|eeo|disclaimer|copyright|\d+\s*(day|hour|week|ago))/i;
            var titlePatterns = /\b(manager|director|lead|head|chief|vp|vice|president|senior|junior|engineer|designer|developer|analyst|recruiter|coordinator|specialist|consultant|architect|strategist|officer|partner|associate|advisor|scientist)\b/i;
            
            for (var i = 0; i < Math.min(lines.length, 15); i++) {
                var line = lines[i].trim();
                if (line.length < 5 || line.length > 150) continue;
                if (skipPatterns.test(line)) continue;
                
                // Prefer lines that contain a role keyword
                if (!title && titlePatterns.test(line)) {
                    title = line.replace(/^(job title|position|role|opening|title)[\s:\-]+/i, '').trim();
                    continue;
                }
                // Otherwise take the first substantial non-meta line
                if (!title && line.length > 8 && line.length < 120) {
                    title = line;
                }
            }
            
            // Try to extract company from common patterns
            var companyMatch = jdText.match(/(?:company|employer|organization|at)\s*[:|\-]?\s*([A-Z][A-Za-z0-9\s&.,]+)/);
            if (companyMatch) company = companyMatch[1].trim().substring(0, 60);
            if (!company) {
                // Try "About [Company]" pattern
                var aboutMatch = jdText.match(/about\s+([A-Z][A-Za-z0-9\s&]+?)(?:\n|\.|\,)/);
                if (aboutMatch && aboutMatch[1].length < 50) company = aboutMatch[1].trim();
            }
            
            // ===== SENIORITY (detect early for proficiency inference) =====
            var seniority = 'Mid';
            if (/\b(vp|vice president|chief|c-suite|head of|svp|evp)\b/i.test(jdText)) seniority = 'Executive';
            else if (/\b(senior director|director|principal|senior manager)\b/i.test(jdText)) seniority = 'Senior';
            else if (/\b(junior|entry|associate|intern|coordinator)\b/i.test(jdText)) seniority = 'Entry';
            
            // ===== SKILL EXTRACTION =====
            var skillMatches = [];
            var seen = new Set();
            var allSkills = skillsData.skills || [];
            
            // First pass: match user's own skill names in JD text
            allSkills.forEach(function(skill) {
                var skillLower = skill.name.toLowerCase();
                if (skillLower.length > 3 && text.indexOf(skillLower) !== -1 && !seen.has(skillLower)) {
                    seen.add(skillLower);
                    skillMatches.push({
                        name: skill.name,
                        requirement: classifyRequirementLevel(text, skillLower),
                        proficiency: inferJobProficiency(text, skillLower, seniority),
                        category: skill.category || 'General'
                    });
                }
            });
            
            // Second pass: check the full O*NET library if loaded
            if (skillLibraryIndex && skillLibraryIndex.index) {
                skillLibraryIndex.index.forEach(function(libSkill) {
                    var n = (libSkill.n || libSkill.name || '').toLowerCase();
                    if (n.length > 3 && text.indexOf(n) !== -1 && !seen.has(n)) {
                        seen.add(n);
                        skillMatches.push({
                            name: libSkill.n || libSkill.name,
                            requirement: classifyRequirementLevel(text, n),
                            proficiency: inferJobProficiency(text, n, seniority),
                            category: libSkill.c || libSkill.category || 'General'
                        });
                    }
                });
            }
            
            // Third pass: comprehensive skill keyword dictionary
            var skillDictionary = [
                // Recruiting & Talent
                'Talent Acquisition', 'Full-Cycle Recruiting', 'Sourcing', 'Boolean Search', 'Candidate Experience',
                'Employer Branding', 'Applicant Tracking System', 'ATS', 'Onboarding', 'Workforce Planning',
                'Diversity Recruiting', 'Campus Recruiting', 'Executive Search', 'Headhunting', 'Interviewing',
                'Offer Negotiation', 'Recruitment Marketing', 'Talent Pipeline', 'Screening', 'Reference Checking',
                // HR
                'Human Resources', 'Employee Relations', 'Performance Management', 'Compensation', 'Benefits Administration',
                'HRIS', 'Succession Planning', 'Organizational Development', 'Compliance', 'Labor Relations',
                'Employee Engagement', 'Retention', 'Training and Development', 'Learning and Development',
                // Project & Program Management
                'Project Management', 'Program Management', 'Strategic Planning', 'Roadmap', 'Risk Management',
                'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Sprint Planning', 'JIRA', 'Confluence',
                'Stakeholder Management', 'Change Management', 'Process Improvement', 'Continuous Improvement',
                // Leadership
                'Team Leadership', 'People Management', 'Cross-Functional Collaboration', 'Mentoring',
                'Coaching', 'Executive Presence', 'Decision Making', 'Conflict Resolution', 'Delegation',
                // Communication
                'Communication', 'Presentation', 'Public Speaking', 'Technical Writing', 'Copywriting',
                'Storytelling', 'Negotiation', 'Persuasion', 'Active Listening', 'Relationship Building',
                // Technical
                'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'NoSQL',
                'AWS', 'Azure', 'GCP', 'Cloud Computing', 'DevOps', 'CI/CD', 'Docker', 'Kubernetes',
                'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Data Engineering',
                'API Design', 'Microservices', 'System Design', 'Architecture',
                // Data & Analytics
                'Data Analysis', 'Business Intelligence', 'Tableau', 'Power BI', 'Excel',
                'SQL', 'Reporting', 'Dashboards', 'KPI', 'Metrics', 'Forecasting', 'Modeling',
                // Business
                'Business Development', 'Sales Strategy', 'Account Management', 'Pipeline Management',
                'Revenue Growth', 'Client Relations', 'Customer Success', 'Market Research',
                'Product Management', 'UX Design', 'User Research', 'A/B Testing', 'Go-to-Market',
                'Budgeting', 'Financial Analysis', 'P&L Management', 'Vendor Management',
                // Strategy
                'Strategy', 'Innovation', 'Transformation', 'Digital Transformation', 'Thought Leadership',
                'Competitive Analysis', 'Market Analysis', 'Business Strategy', 'GTM Strategy',
                // Marketing
                'Content Marketing', 'SEO', 'SEM', 'Social Media', 'Email Marketing', 'Brand Strategy',
                'Demand Generation', 'Lead Generation', 'Marketing Automation', 'CRM',
                // Soft Skills
                'Problem Solving', 'Critical Thinking', 'Analytical Thinking', 'Attention to Detail',
                'Time Management', 'Adaptability', 'Creativity', 'Emotional Intelligence',
                'Collaboration', 'Teamwork', 'Self-Motivation', 'Results-Oriented'
            ];
            
            skillDictionary.forEach(function(skill) {
                var lower = skill.toLowerCase();
                if (text.indexOf(lower) !== -1 && !seen.has(lower)) {
                    seen.add(lower);
                    skillMatches.push({ name: skill, requirement: classifyRequirementLevel(text, lower), proficiency: inferJobProficiency(text, lower, seniority), category: 'General' });
                }
            });
            
            // Fourth pass: extract phrase-level skills from requirement lines
            // Look for bullet-pointed or numbered requirements
            var reqLines = jdText.split('\n').filter(function(line) {
                return /^\s*[\u2022\u2023\u25E6\u2043\-\*\u2713\u2714]\s|^\s*\d+[\.\)]\s|^\s*[a-z][\.\)]\s/i.test(line);
            });
            
            // Common skill-indicator phrases in requirements
            var phrasePatterns = [
                /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+(?:in|with)\s+)?(.+?)(?:\.|,|;|$)/gi,
                /(?:proficien|experienc|knowledge|expertise|skill|familiar)\w*\s+(?:in|with|of)\s+(.+?)(?:\.|,|;|$)/gi,
                /(?:strong|excellent|proven|demonstrated)\s+(.+?)(?:\s+(?:skills?|abilities?|experience))(?:\.|,|;|$)/gi
            ];
            
            reqLines.forEach(function(line) {
                phrasePatterns.forEach(function(pat) {
                    var m;
                    pat.lastIndex = 0;
                    while ((m = pat.exec(line)) !== null) {
                        var extracted = (m[2] || m[1] || '').trim();
                        // Clean up and split on conjunctions
                        extracted.split(/\s*(?:and|or|,)\s*/).forEach(function(phrase) {
                            phrase = phrase.replace(/^\s*(?:a|an|the)\s+/i, '').trim();
                            if (phrase.length > 2 && phrase.length < 50 && !seen.has(phrase.toLowerCase())) {
                                seen.add(phrase.toLowerCase());
                                // Capitalize first letter of each word
                                var clean = phrase.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                                skillMatches.push({ name: clean, requirement: classifyRequirementLevel(text, phrase.toLowerCase()), proficiency: inferJobProficiency(text, phrase.toLowerCase(), seniority), category: 'Extracted' });
                            }
                        });
                    }
                });
            });
            
            // Extract roles/departments
            var roles = [];
            var rolePatterns = { 'Engineering': /engineer|develop|software|technical/i, 'Product': /product|ux|design/i,
                'Marketing': /marketing|brand|content|growth/i, 'Sales': /sales|revenue|account|business development/i,
                'Data': /data|analy|science|ml|ai/i, 'Operations': /operations|supply|logistics/i,
                'Finance': /finance|accounting|budget|treasury/i, 'HR': /human resources|talent|recruiting|people/i,
                'Strategy': /strategy|strateg|transformation|innovation/i, 'Leadership': /leader|executive|management/i
            };
            Object.keys(rolePatterns).forEach(function(role) { if (rolePatterns[role].test(jdText)) roles.push(role); });
            if (roles.length === 0) roles.push('General');
            
            return {
                title: title || 'Untitled Position',
                company: company,
                seniority: seniority,
                roles: roles,
                skills: skillMatches.slice(0, 30)
            };
        }
        
        function classifyRequirementLevel(text, skillLower) {
            // Look for context around the skill mention
            var idx = text.indexOf(skillLower);
            if (idx === -1) return 'Required';
            var context = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 100));
            if (/nice.to.have|bonus|plus|preferred|ideal/i.test(context)) return 'Nice-to-have';
            if (/prefer|desired|strongly prefer/i.test(context)) return 'Preferred';
            return 'Required';
        }
        
        function inferJobProficiency(text, skillLower, seniority) {
            // Infer minimum proficiency from context and seniority
            var idx = text.indexOf(skillLower);
            var context = idx >= 0 ? text.substring(Math.max(0, idx - 150), Math.min(text.length, idx + 150)) : '';
            
            // Context clues for specific proficiency
            if (/master|authority|world.class|industry.leading|thought leader|deep expertise/i.test(context)) return 'Mastery';
            if (/expert|extensive|advanced|senior|deep|strong|proven track/i.test(context)) return 'Expert';
            if (/proficien|solid|experienced|demonstrated|working knowledge/i.test(context)) return 'Proficient';
            if (/familiar|basic|exposure|awareness|entry|junior/i.test(context)) return 'Competent';
            
            // Years context
            var yearsMatch = context.match(/(\d+)\+?\s*years/);
            if (yearsMatch) {
                var yrs = parseInt(yearsMatch[1]);
                if (yrs >= 10) return 'Mastery';
                if (yrs >= 7) return 'Expert';
                if (yrs >= 4) return 'Proficient';
                if (yrs >= 2) return 'Competent';
                return 'Novice';
            }
            
            // Fall back to seniority-based default
            if (seniority === 'Executive') return 'Expert';
            if (seniority === 'Senior') return 'Proficient';
            if (seniority === 'Entry') return 'Competent';
            return 'Proficient'; // Mid default
        }
        
        // ===== PROFICIENCY SCALE =====
        var PROFICIENCY_SCALE = { 'Novice': 1, 'Competent': 2, 'Proficient': 3, 'Advanced': 3.5, 'Expert': 4, 'Mastery': 5 };
        
        function proficiencyValue(level) {
            return PROFICIENCY_SCALE[level] || PROFICIENCY_SCALE['Proficient'];
        }
        
        // ===== O*NET CROSSWALK RUNTIME =====
        // Title resolution, skill enrichment, and multi-source merge
        // Powered by onet-crosswalk.json

        /**
         * Normalize a job title for alias lookup.
         * Mirrors the pipeline's normalizeTitle() logic client-side.
         */
        function crosswalkNormalizeTitle(title) {
            if (!title) return '';
            var t = title.toLowerCase().trim();
            // Remove parentheticals
            t = t.replace(/\([^)]*\)/g, '');
            // Strip common prefixes
            var prefixes = ['senior ', 'sr ', 'sr. ', 'junior ', 'jr ', 'jr. ', 'lead ', 'principal ', 'staff ', 'associate ', 'assistant ', 'deputy ', 'interim '];
            for (var i = 0; i < prefixes.length; i++) {
                if (t.indexOf(prefixes[i]) === 0) { t = t.substring(prefixes[i].length); break; }
            }
            // Strip level suffixes
            var suffixes = [' i', ' ii', ' iii', ' iv', ' v', ' 1', ' 2', ' 3', ' level 1', ' level 2', ' level 3'];
            for (var i = 0; i < suffixes.length; i++) {
                if (t.length > suffixes[i].length && t.substring(t.length - suffixes[i].length) === suffixes[i]) {
                    t = t.substring(0, t.length - suffixes[i].length); break;
                }
            }
            // Normalize punctuation and whitespace
            t = t.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
            return t;
        }

        /**
         * Compute Dice coefficient (bigram overlap) for fuzzy matching.
         * Returns 0-1, where 1 = identical.
         */
        function crosswalkDice(a, b) {
            var sa = a.toLowerCase().replace(/\s+/g, ' ').trim();
            var sb = b.toLowerCase().replace(/\s+/g, ' ').trim();
            if (sa === sb) return 1;
            if (sa.length < 2 || sb.length < 2) return 0;
            var gramsA = {}, gramsB = {}, countA = 0, countB = 0;
            for (var i = 0; i < sa.length - 1; i++) { var g = sa.substring(i, i+2); if (!gramsA[g]) { gramsA[g] = true; countA++; } }
            for (var i = 0; i < sb.length - 1; i++) { var g = sb.substring(i, i+2); if (!gramsB[g]) { gramsB[g] = true; countB++; } }
            var intersection = 0;
            for (var g in gramsA) { if (gramsB[g]) intersection++; }
            return (2 * intersection) / (countA + countB);
        }

        /**
         * Resolve a raw job title to O*NET occupation(s).
         * Returns: { soc, title, family, confidence, alternatives[] } or null
         *
         * Strategy:
         *   1. Exact normalized alias match (confidence: 1.0)
         *   2. Stripped qualifiers retry (confidence: 0.95)
         *   3. Partial substring match (confidence: 0.85)
         *   4. Word-overlap scoring — best match by shared meaningful words (confidence: 0.6-0.8)
         *   5. Fuzzy bigram match via Dice coefficient (confidence: 0.5-0.7)
         */
        function resolveTitle(rawTitle) {
            if (!window.onetCrosswalk || !rawTitle) return null;
            var cw = window.onetCrosswalk;
            var norm = crosswalkNormalizeTitle(rawTitle);
            if (!norm) return null;

            function buildResult(soc, confidence, alts) {
                var primary = cw.occupations[soc];
                if (!primary) return null;
                return {
                    soc: soc,
                    title: primary.title,
                    family: primary.family,
                    confidence: confidence,
                    alternatives: (alts || []).slice(0, 4).map(function(s) {
                        var o = cw.occupations[s];
                        return o ? { soc: s, title: o.title, family: o.family } : null;
                    }).filter(Boolean)
                };
            }

            // Step 1: Exact alias match
            if (cw.aliases[norm]) {
                var socs = cw.aliases[norm];
                var r = buildResult(socs[0], 1.0, socs.slice(1));
                if (r) return r;
            }

            // Step 2: Strip common qualifiers and retry
            // Words like "global", "digital", "corporate", "regional" modify scope but not occupation
            var qualifiers = ['global', 'digital', 'corporate', 'regional', 'national', 'international', 'enterprise', 'strategic', 'commercial', 'general', 'group', 'divisional', 'worldwide', 'north america', 'emea', 'apac', 'americas'];
            var stripped = norm;
            qualifiers.forEach(function(q) {
                stripped = stripped.replace(new RegExp('\\b' + q + '\\b', 'g'), '');
            });
            // Also strip "of", "and", "the" that might be left dangling
            stripped = stripped.replace(/\b(of|and|the|for|in)\b/g, '').replace(/\s+/g, ' ').trim();
            if (stripped !== norm && stripped.length >= 3 && cw.aliases[stripped]) {
                var socs = cw.aliases[stripped];
                var r = buildResult(socs[0], 0.95, socs.slice(1));
                if (r) return r;
            }

            // Also try with "of" preserved (e.g., "vp of strategy" vs "vp strategy")
            var strippedKeepOf = norm;
            qualifiers.forEach(function(q) {
                strippedKeepOf = strippedKeepOf.replace(new RegExp('\\b' + q + '\\b', 'g'), '');
            });
            strippedKeepOf = strippedKeepOf.replace(/\s+/g, ' ').trim();
            if (strippedKeepOf !== norm && strippedKeepOf !== stripped && strippedKeepOf.length >= 3 && cw.aliases[strippedKeepOf]) {
                var socs = cw.aliases[strippedKeepOf];
                var r = buildResult(socs[0], 0.95, socs.slice(1));
                if (r) return r;
            }

            // Step 3: Partial substring match
            var partialMatches = [];
            for (var alias in cw.aliases) {
                if (alias.length < 4) continue;
                if (norm.indexOf(alias) !== -1 || alias.indexOf(norm) !== -1) {
                    var socs = cw.aliases[alias];
                    for (var i = 0; i < socs.length; i++) {
                        if (cw.occupations[socs[i]]) {
                            partialMatches.push({ soc: socs[i], alias: alias, len: alias.length });
                        }
                    }
                }
            }
            // Also try stripped version for partial matching
            if (stripped !== norm) {
                for (var alias in cw.aliases) {
                    if (alias.length < 4) continue;
                    if (stripped.indexOf(alias) !== -1 || alias.indexOf(stripped) !== -1) {
                        var socs = cw.aliases[alias];
                        for (var i = 0; i < socs.length; i++) {
                            if (cw.occupations[socs[i]]) {
                                partialMatches.push({ soc: socs[i], alias: alias, len: alias.length });
                            }
                        }
                    }
                }
            }
            if (partialMatches.length > 0) {
                // Prefer longest alias match (more specific)
                partialMatches.sort(function(a, b) { return b.len - a.len; });
                var seen = {};
                var unique = partialMatches.filter(function(m) {
                    if (seen[m.soc]) return false;
                    seen[m.soc] = true;
                    return true;
                });
                var r = buildResult(unique[0].soc, 0.85, unique.slice(1).map(function(m) { return m.soc; }));
                if (r) return r;
            }

            // Step 4: Word-overlap scoring
            // Tokenize the input and compare word sets against each alias
            var normWords = norm.split(' ').filter(function(w) { return w.length > 2; });
            var strippedWords = stripped.split(' ').filter(function(w) { return w.length > 2; });
            var stopWords = { 'the': 1, 'and': 1, 'for': 1, 'all': 1, 'other': 1 };
            var meaningfulWords = (strippedWords.length > 0 ? strippedWords : normWords).filter(function(w) { return !stopWords[w]; });

            if (meaningfulWords.length > 0) {
                var bestWordScore = 0;
                var bestWordSocs = null;
                for (var alias in cw.aliases) {
                    if (alias.length < 4) continue;
                    var aliasWords = alias.split(' ').filter(function(w) { return w.length > 2 && !stopWords[w]; });
                    if (aliasWords.length === 0) continue;

                    // Count shared meaningful words
                    var shared = 0;
                    meaningfulWords.forEach(function(w) {
                        if (aliasWords.indexOf(w) !== -1) shared++;
                    });

                    // Score: proportion of input words found in alias, weighted by proportion of alias covered
                    if (shared > 0) {
                        var inputCoverage = shared / meaningfulWords.length;
                        var aliasCoverage = shared / aliasWords.length;
                        var wordScore = (inputCoverage * 0.6) + (aliasCoverage * 0.4);

                        if (wordScore > bestWordScore) {
                            bestWordScore = wordScore;
                            bestWordSocs = cw.aliases[alias];
                        }
                    }
                }
                if (bestWordScore >= 0.5 && bestWordSocs && bestWordSocs.length > 0) {
                    var confidence = Math.round((0.6 + bestWordScore * 0.2) * 100) / 100;
                    var r = buildResult(bestWordSocs[0], Math.min(confidence, 0.8), bestWordSocs.slice(1));
                    if (r) return r;
                }
            }

            // Step 5: Fuzzy bigram match via Dice coefficient
            var bestDice = 0;
            var bestDiceSocs = null;
            for (var alias in cw.aliases) {
                if (alias.length < 4) continue;
                var score = crosswalkDice(norm, alias);
                if (score > bestDice && score >= 0.55) {
                    bestDice = score;
                    bestDiceSocs = cw.aliases[alias];
                }
            }
            if (bestDiceSocs && bestDiceSocs.length > 0 && cw.occupations[bestDiceSocs[0]]) {
                var r = buildResult(bestDiceSocs[0], Math.round(bestDice * 80) / 100, bestDiceSocs.slice(1));
                if (r) return r;
            }

            // Step 6: Last resort — scan occupation primary titles
            var bestOccDice = 0;
            var bestOccSoc = null;
            for (var soc in cw.occupations) {
                var occTitle = cw.occupations[soc].title.toLowerCase();
                var score = crosswalkDice(stripped || norm, occTitle);
                if (score > bestOccDice && score >= 0.5) {
                    bestOccDice = score;
                    bestOccSoc = soc;
                }
            }
            if (bestOccSoc) {
                var r = buildResult(bestOccSoc, Math.round(bestOccDice * 70) / 100, []);
                if (r) return r;
            }

            return null;
        }

        /**
         * Get the full skill profile for an occupation.
         * Returns: { skills[], abilities[], knowledge[], workStyles[] } or null
         */
        function getOccupationProfile(socCode) {
            if (!window.onetCrosswalk || !socCode) return null;
            var occ = window.onetCrosswalk.occupations[socCode];
            if (!occ) return null;
            return {
                soc: occ.soc,
                title: occ.title,
                family: occ.family,
                skills: occ.skills || [],
                abilities: occ.abilities || [],
                knowledge: occ.knowledge || [],
                workStyles: occ.workStyles || []
            };
        }

        /**
         * Compare user's skills against an occupation profile.
         * Returns: { matched[], gaps[], belowLevel[], surplus[] }
         *
         * matched:    user has skill at or above occupation level
         * gaps:       occupation expects skill, user doesn't have it
         * belowLevel: user has skill but below occupation's typical level
         * surplus:    user has skills not in the occupation profile
         */
        // ===== DETERMINISTIC SKILL INFERENCE ENGINE =====
        // Replaces Claude AI skill inference. Uses O*NET crosswalk data + heuristics.
        // Zero API cost. Deterministic. Works offline.
        
        function detectSeniority(title) {
            if (!title) return 1;
            var t = title.toLowerCase();
            if (/\b(chief|ceo|cfo|cto|coo|cio|cmo|president|founder|owner)\b/.test(t)) return 5;
            if (/\b(svp|evp|senior vice president|executive vice president)\b/.test(t)) return 4.5;
            if (/\b(vp|vice president|partner|principal|gm|general manager)\b/.test(t)) return 4;
            if (/\b(director|head of|senior director)\b/.test(t)) return 3.5;
            if (/\b(senior manager|sr manager|senior lead)\b/.test(t)) return 3;
            if (/\b(manager|lead|supervisor|team lead)\b/.test(t)) return 2.5;
            if (/\b(senior|sr|staff|principal)\b/.test(t)) return 2;
            if (/\b(specialist|analyst|engineer|consultant|developer|designer)\b/.test(t)) return 1.5;
            if (/\b(associate|coordinator|assistant|junior|jr|intern|entry)\b/.test(t)) return 1;
            return 1.5;
        }
        
        function adjustLevel(baseLevel, yearsInRole, seniority) {
            // Level hierarchy: Mastery > Expert > Advanced > Proficient > Novice
            var levels = ['Novice', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
            var idx = levels.indexOf(baseLevel);
            if (idx === -1) idx = 1; // default Proficient
            
            // Boost for seniority (VP+ gets +1, Director +0.5)
            if (seniority >= 4) idx = Math.min(idx + 1, 4);
            else if (seniority >= 3) idx = Math.min(idx + 0.5, 4);
            
            // Boost for years (10+ years: +1, 5-9: +0.5)
            if (yearsInRole >= 10) idx = Math.min(idx + 1, 4);
            else if (yearsInRole >= 5) idx = Math.min(idx + 0.5, 4);
            
            // Reduce for very junior or short tenure
            if (seniority <= 1 && yearsInRole < 2) idx = Math.max(idx - 1, 0);
            
            return levels[Math.round(Math.min(idx, 4))];
        }
        
        function inferSkillsDeterministic(rawSkills, workHistory, parsedRoles, skillCap) {
            var cw = window.onetCrosswalk;
            if (!cw || !rawSkills || rawSkills.length === 0) {
                // No crosswalk: return skills as Proficient with no enrichment
                return rawSkills.slice(0, skillCap || 30).map(function(name) {
                    return { name: name, level: 'Proficient', category: 'skill', roles: parsedRoles.length > 0 ? [parsedRoles[0].id] : [], key: false, evidence: [] };
                });
            }
            
            // 1. Resolve all position titles to SOC codes
            var matchedOccupations = [];
            (workHistory || []).forEach(function(w) {
                var result = resolveTitle(w.title);
                if (result) {
                    var startYear = parseInt((w.startDate || '').replace(/[^0-9]/g, '').slice(0,4)) || new Date().getFullYear();
                    var endStr = w.endDate === 'Present' || !w.endDate ? '' + new Date().getFullYear() : w.endDate;
                    var endYear = parseInt((endStr || '').replace(/[^0-9]/g, '').slice(0,4)) || new Date().getFullYear();
                    var yearsInRole = Math.max(1, endYear - startYear);
                    
                    matchedOccupations.push({
                        soc: result.soc,
                        title: w.title,
                        yearsInRole: yearsInRole,
                        isCurrent: w.endDate === 'Present' || !w.endDate,
                        seniority: detectSeniority(w.title),
                        roleId: null // will map below
                    });
                    
                    // Map to parsedRole ID
                    var roleKey = w.title.toLowerCase().trim();
                    parsedRoles.forEach(function(r) {
                        if (r.name.toLowerCase().trim() === roleKey) matchedOccupations[matchedOccupations.length - 1].roleId = r.id;
                    });
                }
            });
            
            console.log('Skill inference: resolved ' + matchedOccupations.length + ' of ' + (workHistory || []).length + ' positions to O*NET occupations');
            
            // 2. Build O*NET skill pool from all matched occupations
            var onetPool = {}; // key: normalized name → merged skill data
            matchedOccupations.forEach(function(occ) {
                var occData = cw.occupations[occ.soc];
                if (!occData) return;
                
                ['skills', 'abilities', 'knowledge'].forEach(function(type) {
                    (occData[type] || []).forEach(function(s) {
                        var key = s.name.toLowerCase().trim();
                        if (!onetPool[key]) {
                            onetPool[key] = {
                                name: s.name,
                                importance: s.importance,
                                level: s.level,
                                blueprintLevel: s.blueprintLevel,
                                category: s.category || type,
                                sources: [occ.soc],
                                roleIds: occ.roleId ? [occ.roleId] : [],
                                maxYears: occ.yearsInRole,
                                maxSeniority: occ.seniority,
                                occCount: 1
                            };
                        } else {
                            // Merge: take highest importance, track multiple sources
                            if (s.importance > onetPool[key].importance) {
                                onetPool[key].importance = s.importance;
                                onetPool[key].level = s.level;
                                onetPool[key].blueprintLevel = s.blueprintLevel;
                            }
                            if (onetPool[key].sources.indexOf(occ.soc) === -1) onetPool[key].sources.push(occ.soc);
                            if (occ.roleId && onetPool[key].roleIds.indexOf(occ.roleId) === -1) onetPool[key].roleIds.push(occ.roleId);
                            onetPool[key].maxYears = Math.max(onetPool[key].maxYears, occ.yearsInRole);
                            onetPool[key].maxSeniority = Math.max(onetPool[key].maxSeniority, occ.seniority);
                            onetPool[key].occCount++;
                        }
                    });
                });
            });
            
            console.log('Skill inference: O*NET pool has ' + Object.keys(onetPool).length + ' unique skills/abilities/knowledge');
            
            // 3. Match LinkedIn skills against O*NET pool
            var matched = [];
            var unmatched = [];
            var usedOnetKeys = {};
            
            rawSkills.forEach(function(skillName) {
                var key = skillName.toLowerCase().trim();
                var onetMatch = onetPool[key];
                
                // Fuzzy: check containment both ways
                if (!onetMatch) {
                    var bestKey = null, bestLen = 0;
                    Object.keys(onetPool).forEach(function(oKey) {
                        if (oKey.indexOf(key) >= 0 || key.indexOf(oKey) >= 0) {
                            // Prefer longer match (more specific)
                            var matchLen = Math.min(oKey.length, key.length);
                            if (matchLen > bestLen) { bestLen = matchLen; bestKey = oKey; }
                        }
                    });
                    if (bestKey) onetMatch = onetPool[bestKey];
                }
                
                if (onetMatch) {
                    usedOnetKeys[onetMatch.name.toLowerCase().trim()] = true;
                    matched.push({
                        name: skillName,
                        level: adjustLevel(onetMatch.blueprintLevel, onetMatch.maxYears, onetMatch.maxSeniority),
                        category: onetMatch.category,
                        importance: onetMatch.importance,
                        onetName: onetMatch.name,
                        roles: onetMatch.roleIds.length > 0 ? onetMatch.roleIds : (parsedRoles.length > 0 ? [parsedRoles[0].id] : []),
                        occCount: onetMatch.occCount
                    });
                } else {
                    unmatched.push(skillName);
                }
            });
            
            // 4. Sort matched by importance (highest first), then by occCount (breadth)
            matched.sort(function(a, b) {
                if (b.importance !== a.importance) return b.importance - a.importance;
                return b.occCount - a.occCount;
            });
            
            console.log('Skill inference: ' + matched.length + ' matched to O*NET, ' + unmatched.length + ' unmatched');
            
            // 5. Build final skill array with key/supporting tier
            var results = [];
            
            matched.forEach(function(m, i) {
                results.push({
                    name: m.name,
                    level: m.level,
                    category: m.category,
                    roles: m.roles,
                    key: i < 10,
                    evidence: [{
                        description: 'O*NET: ' + m.onetName,
                        outcome: 'Importance ' + m.importance + '/100, spans ' + m.occCount + ' role' + (m.occCount > 1 ? 's' : '')
                    }]
                });
            });
            
            // Add unmatched LinkedIn skills as Proficient (capped)
            unmatched.forEach(function(name) {
                results.push({
                    name: name,
                    level: 'Proficient',
                    category: 'skill',
                    roles: parsedRoles.length > 0 ? [parsedRoles[0].id] : [],
                    key: false,
                    evidence: [{ description: 'From LinkedIn profile', outcome: 'No O*NET match' }]
                });
            });
            
            // Cap
            var cap = skillCap || 30;
            if (results.length > cap) {
                console.log('Skill inference: capped from ' + results.length + ' to ' + cap + ' skills');
            }
            results = results.slice(0, cap);
            
            return results;
        }
        
        function suggestMissingSkills(userSkills, socCode) {
            var profile = getOccupationProfile(socCode);
            if (!profile) return null;

            // Combine all occupation elements into one list
            var occElements = [].concat(
                profile.skills.map(function(s) { return Object.assign({}, s, { _type: 'skill' }); }),
                profile.abilities.map(function(s) { return Object.assign({}, s, { _type: 'ability' }); }),
                profile.knowledge.map(function(s) { return Object.assign({}, s, { _type: 'knowledge' }); }),
                profile.workStyles.map(function(s) { return Object.assign({}, s, { _type: 'workstyle' }); })
            );

            // Blueprint proficiency → numeric score for comparison
            var levelScores = { 'Mastery': 95, 'Expert': 80, 'Advanced': 65, 'Proficient': 50, 'Novice': 25 };

            // Build lookup of user skills by normalized name
            var userSkillMap = {};
            (userSkills || []).forEach(function(s) {
                userSkillMap[s.name.toLowerCase()] = s;
                // Also index by onetId/blueprintSlug if available
                if (s.onetId) userSkillMap[s.onetId.toLowerCase()] = s;
            });

            var matched = [];
            var gaps = [];
            var belowLevel = [];
            var matchedNames = {};

            occElements.forEach(function(el) {
                var nameLower = el.name.toLowerCase();
                var slugLower = (el.blueprintSlug || '').toLowerCase();

                // Try to find matching user skill
                var userSkill = userSkillMap[nameLower] || userSkillMap[slugLower];

                // Fuzzy fallback: check if any user skill name is very similar
                if (!userSkill) {
                    for (var key in userSkillMap) {
                        if (crosswalkDice(nameLower, key) >= 0.8) {
                            userSkill = userSkillMap[key];
                            break;
                        }
                    }
                }

                if (userSkill) {
                    var userScore = levelScores[userSkill.level] || 50;
                    var occScore = el.level || 50;
                    matchedNames[userSkill.name.toLowerCase()] = true;

                    if (userScore >= occScore - 10) {
                        matched.push({
                            name: el.name,
                            userLevel: userSkill.level,
                            occupationLevel: el.blueprintLevel,
                            category: el.category || el._type,
                            importance: el.importance
                        });
                    } else {
                        belowLevel.push({
                            name: el.name,
                            userLevel: userSkill.level,
                            occupationLevel: el.blueprintLevel,
                            category: el.category || el._type,
                            importance: el.importance
                        });
                    }
                } else {
                    gaps.push({
                        name: el.name,
                        blueprintSlug: el.blueprintSlug,
                        occupationLevel: el.blueprintLevel,
                        category: el.category || el._type,
                        importance: el.importance,
                        elementId: el.elementId
                    });
                }
            });

            // Surplus: user skills not in the occupation profile
            var surplus = (userSkills || []).filter(function(s) {
                return !matchedNames[s.name.toLowerCase()];
            }).map(function(s) {
                return { name: s.name, level: s.level, category: s.category };
            });

            // Sort gaps by importance (highest first)
            gaps.sort(function(a, b) { return (b.importance || 0) - (a.importance || 0); });

            return {
                occupation: profile.title,
                soc: socCode,
                matched: matched,
                gaps: gaps,
                belowLevel: belowLevel,
                surplus: surplus,
                matchPercent: Math.round((matched.length / Math.max(occElements.length, 1)) * 100)
            };
        }

        /**
         * Merge skills from a new source into existing skills.
         * Deduplicates by name (fuzzy), keeps higher level, unions evidence and roles.
         *
         * Each skill gains a `sources` array tracking provenance:
         *   e.g., ["json-import:2026-02-23", "linkedin-csv:2026-02-23"]
         *
         * Returns: { merged[], added[], upgraded[], unchanged[] }
         */
        function mergeSkillSources(existingSkills, newSkills, sourceName) {
            var dateStr = new Date().toISOString().substring(0, 10);
            var sourceTag = (sourceName || 'unknown') + ':' + dateStr;

            var levelRank = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Novice': 1 };

            // Build index of existing skills by normalized name
            var existingIndex = {};
            var mergedSkills = (existingSkills || []).map(function(s) {
                var copy = Object.assign({}, s);
                if (!copy.sources) copy.sources = [];
                existingIndex[s.name.toLowerCase()] = copy;
                return copy;
            });

            var added = [];
            var upgraded = [];
            var unchanged = [];

            (newSkills || []).forEach(function(newSkill) {
                var nameLower = newSkill.name.toLowerCase();

                // Try exact name match first
                var existing = existingIndex[nameLower];

                // Fuzzy fallback
                if (!existing) {
                    for (var key in existingIndex) {
                        if (crosswalkDice(nameLower, key) >= 0.85) {
                            existing = existingIndex[key];
                            break;
                        }
                    }
                }

                if (existing) {
                    var existRank = levelRank[existing.level] || 2;
                    var newRank = levelRank[newSkill.level] || 2;

                    // Add source provenance
                    if (existing.sources.indexOf(sourceTag) === -1) {
                        existing.sources.push(sourceTag);
                    }

                    // Upgrade level if new source reports higher
                    if (newRank > existRank) {
                        existing.level = newSkill.level;
                        upgraded.push({ name: existing.name, from: existing.level, to: newSkill.level });
                    } else {
                        unchanged.push({ name: existing.name });
                    }

                    // Union roles
                    if (newSkill.roles && newSkill.roles.length > 0) {
                        if (!existing.roles) existing.roles = [];
                        newSkill.roles.forEach(function(r) {
                            if (existing.roles.indexOf(r) === -1) existing.roles.push(r);
                        });
                    }

                    // Union evidence
                    if (newSkill.evidence && newSkill.evidence.length > 0) {
                        if (!existing.evidence) existing.evidence = [];
                        newSkill.evidence.forEach(function(e) {
                            var desc = (e.description || '').toLowerCase();
                            var alreadyHas = existing.evidence.some(function(ex) {
                                return (ex.description || '').toLowerCase() === desc;
                            });
                            if (!alreadyHas) existing.evidence.push(e);
                        });
                    }
                } else {
                    // New skill — add with provenance
                    var copy = Object.assign({}, newSkill);
                    copy.sources = [sourceTag];
                    mergedSkills.push(copy);
                    existingIndex[nameLower] = copy;
                    added.push({ name: newSkill.name, level: newSkill.level });
                }
            });

            return {
                merged: mergedSkills,
                added: added,
                upgraded: upgraded,
                unchanged: unchanged,
                summary: added.length + ' added, ' + upgraded.length + ' upgraded, ' + unchanged.length + ' unchanged'
            };
        }

        // Expose crosswalk functions globally
        window.resolveTitle = resolveTitle;
        window.getOccupationProfile = getOccupationProfile;
        window.suggestMissingSkills = suggestMissingSkills;
        window.mergeSkillSources = mergeSkillSources;
        window.crosswalkNormalizeTitle = crosswalkNormalizeTitle;

        // ===== SKILL REGISTRY UTILITIES =====
        
        // Register a skill in the searchable library index (deduped by name)
        function registerInSkillLibrary(skillName, category) {
            if (!skillLibraryIndex) return;
            if (!skillLibraryIndex.index) skillLibraryIndex.index = [];
            var lower = skillName.toLowerCase();
            var exists = skillLibraryIndex.index.some(function(s) {
                return (s.n || s.name || '').toLowerCase() === lower;
            });
            if (!exists) {
                skillLibraryIndex.index.push({ n: skillName, c: category || 'Custom', source: 'custom' });
                if (skillLibraryIndex.totalSkills) skillLibraryIndex.totalSkills++;
                console.log('📚 Registered in skill library:', skillName);
            }
        }
        window.registerInSkillLibrary = registerInSkillLibrary;
        
        // ===== COMPREHENSIVE SKILL SYNONYMS =====
        // Bidirectional: abbreviation ↔ full name, plus common variants
        var SKILL_SYNONYMS = {
            // Recruiting & HR
            'ats': ['applicant tracking system', 'applicant tracking systems', 'applicant tracking'],
            'applicant tracking system': ['ats'],
            'hris': ['human resources information system', 'hr information system', 'hcm'],
            'hcm': ['human capital management', 'hris'],
            'deib': ['diversity equity inclusion belonging', 'dei', 'diversity recruiting'],
            'dei': ['diversity equity inclusion', 'deib', 'diversity recruiting'],
            // Business & Strategy
            'crm': ['customer relationship management', 'salesforce', 'hubspot crm'],
            'erp': ['enterprise resource planning', 'sap', 'oracle erp'],
            'kpi': ['key performance indicator', 'key performance indicators', 'metrics'],
            'kpis': ['key performance indicators', 'kpi', 'metrics'],
            'roi': ['return on investment'],
            'p&l': ['profit and loss', 'p&l management', 'financial management'],
            'gtm': ['go-to-market', 'go to market', 'gtm strategy'],
            'go-to-market': ['gtm', 'gtm strategy'],
            'okr': ['objectives and key results', 'okrs'],
            'okrs': ['objectives and key results', 'okr'],
            'b2b': ['business-to-business', 'business to business'],
            'b2c': ['business-to-consumer', 'business to consumer'],
            'saas': ['software as a service', 'cloud software'],
            // Technical
            'ml': ['machine learning'],
            'ai': ['artificial intelligence'],
            'nlp': ['natural language processing'],
            'ci/cd': ['continuous integration', 'continuous deployment', 'continuous integration/continuous deployment'],
            'devops': ['development operations', 'dev ops'],
            'seo': ['search engine optimization'],
            'sem': ['search engine marketing', 'paid search'],
            'ux': ['user experience', 'ux design'],
            'ui': ['user interface', 'ui design'],
            'qa': ['quality assurance', 'testing'],
            'api': ['application programming interface', 'api design', 'api development'],
            'sdk': ['software development kit'],
            'sql': ['structured query language', 'database querying'],
            'aws': ['amazon web services'],
            'gcp': ['google cloud platform'],
            // Project Management
            'pmp': ['project management professional', 'project management'],
            'scrum': ['scrum methodology', 'agile scrum'],
            'jira': ['jira project management', 'atlassian jira'],
            // Communication & Leadership
            'executive presence': ['leadership presence', 'gravitas'],
            'storytelling': ['narrative', 'business storytelling', 'data storytelling'],
            'stakeholder management': ['stakeholder engagement', 'stakeholder relations'],
            'change management': ['organizational change', 'change leadership', 'transformation'],
            'cross-functional collaboration': ['cross functional collaboration', 'cross-team collaboration', 'interdepartmental collaboration'],
            // Common variations (singular/plural, hyphenation)
            'problem solving': ['problem-solving'],
            'decision making': ['decision-making'],
            'team leadership': ['team management', 'people management', 'people leadership'],
            'people management': ['team management', 'team leadership', 'direct reports management'],
            'data analysis': ['data analytics', 'analytics', 'data-driven decision making'],
            'strategic planning': ['strategy development', 'strategic thinking', 'business strategy'],
            'talent acquisition': ['recruiting', 'recruitment', 'talent management'],
            'full-cycle recruiting': ['full cycle recruiting', 'full lifecycle recruiting', 'end-to-end recruiting'],
            'boolean search': ['boolean sourcing', 'advanced sourcing', 'sourcing techniques'],
            'sourcing': ['talent sourcing', 'candidate sourcing'],
            'offer negotiation': ['compensation negotiation', 'salary negotiation'],
            'employer branding': ['employer brand', 'employment branding', 'talent branding'],
            'workforce planning': ['headcount planning', 'capacity planning', 'workforce strategy'],
            'employee engagement': ['engagement strategy', 'employee experience'],
            'performance management': ['performance review', 'performance evaluation', 'performance coaching'],
            'succession planning': ['talent pipeline planning', 'leadership pipeline'],
            'compensation': ['compensation and benefits', 'total rewards', 'comp and ben'],
            'vendor management': ['vendor relations', 'supplier management', 'third-party management'],
            'process improvement': ['continuous improvement', 'lean', 'six sigma', 'process optimization'],
            'digital transformation': ['digital strategy', 'digitalization'],
            'market research': ['market analysis', 'competitive intelligence', 'market intelligence'],
            'business development': ['biz dev', 'business growth', 'partnership development'],
            'account management': ['account management', 'client management', 'key account management'],
            'financial analysis': ['financial modeling', 'financial planning', 'fp&a'],
            'fp&a': ['financial planning and analysis', 'financial analysis'],
            'content marketing': ['content strategy', 'content creation'],
            'demand generation': ['demand gen', 'lead generation', 'pipeline generation'],
            'marketing automation': ['martech', 'marketing technology'],
            'product management': ['product strategy', 'product development', 'product ownership'],
            'user research': ['ux research', 'customer research', 'user testing']
        };
        
        // Build a fast lookup: lowercased name → array of synonym lowercased names
        var _synonymLookup = {};
        Object.keys(SKILL_SYNONYMS).forEach(function(key) {
            var lower = key.toLowerCase();
            if (!_synonymLookup[lower]) _synonymLookup[lower] = [];
            SKILL_SYNONYMS[key].forEach(function(syn) {
                var synLower = syn.toLowerCase();
                _synonymLookup[lower].push(synLower);
                // Bidirectional: also map synonym back to key
                if (!_synonymLookup[synLower]) _synonymLookup[synLower] = [];
                if (_synonymLookup[synLower].indexOf(lower) === -1) _synonymLookup[synLower].push(lower);
            });
        });
        
        // Get all known synonyms for a skill name (lowercased)
        function getSkillSynonyms(skillNameLower) {
            return _synonymLookup[skillNameLower] || [];
        }
        
        // ===== ROLE-TO-SKILL MAPPING =====
        // Expected skills for common roles with typical proficiency levels
        var ROLE_SKILL_MAP = {
            'recruiter': [
                { name: 'Applicant Tracking System', level: 'Proficient' }, { name: 'Full-Cycle Recruiting', level: 'Proficient' },
                { name: 'Boolean Search', level: 'Proficient' }, { name: 'Sourcing', level: 'Expert' },
                { name: 'Candidate Experience', level: 'Proficient' }, { name: 'Interviewing', level: 'Expert' },
                { name: 'Offer Negotiation', level: 'Proficient' }, { name: 'Employer Branding', level: 'Competent' },
                { name: 'Diversity Recruiting', level: 'Competent' }, { name: 'Talent Pipeline', level: 'Proficient' },
                { name: 'Screening', level: 'Expert' }, { name: 'Stakeholder Management', level: 'Proficient' },
                { name: 'Recruitment Marketing', level: 'Competent' }, { name: 'Workforce Planning', level: 'Competent' }
            ],
            'talent acquisition': [
                { name: 'Applicant Tracking System', level: 'Expert' }, { name: 'Full-Cycle Recruiting', level: 'Expert' },
                { name: 'Sourcing', level: 'Expert' }, { name: 'Boolean Search', level: 'Proficient' },
                { name: 'Employer Branding', level: 'Proficient' }, { name: 'Workforce Planning', level: 'Proficient' },
                { name: 'Diversity Recruiting', level: 'Proficient' }, { name: 'Talent Pipeline', level: 'Expert' },
                { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Data Analysis', level: 'Competent' },
                { name: 'Recruitment Marketing', level: 'Proficient' }, { name: 'Vendor Management', level: 'Competent' }
            ],
            'product manager': [
                { name: 'Product Management', level: 'Expert' }, { name: 'Roadmap', level: 'Expert' },
                { name: 'A/B Testing', level: 'Proficient' }, { name: 'User Research', level: 'Proficient' },
                { name: 'Data Analysis', level: 'Proficient' }, { name: 'Stakeholder Management', level: 'Expert' },
                { name: 'Go-to-Market', level: 'Proficient' }, { name: 'Agile', level: 'Expert' },
                { name: 'Strategic Planning', level: 'Proficient' }, { name: 'Cross-Functional Collaboration', level: 'Expert' },
                { name: 'JIRA', level: 'Proficient' }, { name: 'SQL', level: 'Competent' }
            ],
            'software engineer': [
                { name: 'System Design', level: 'Proficient' }, { name: 'API Design', level: 'Proficient' },
                { name: 'CI/CD', level: 'Proficient' }, { name: 'Git', level: 'Expert' },
                { name: 'Code Review', level: 'Proficient' }, { name: 'Testing', level: 'Proficient' },
                { name: 'Agile', level: 'Proficient' }, { name: 'Problem Solving', level: 'Expert' },
                { name: 'Technical Writing', level: 'Competent' }, { name: 'Cloud Computing', level: 'Competent' }
            ],
            'data analyst': [
                { name: 'SQL', level: 'Expert' }, { name: 'Excel', level: 'Expert' },
                { name: 'Data Analysis', level: 'Expert' }, { name: 'Tableau', level: 'Proficient' },
                { name: 'Python', level: 'Competent' }, { name: 'Reporting', level: 'Expert' },
                { name: 'Business Intelligence', level: 'Proficient' }, { name: 'Dashboards', level: 'Proficient' },
                { name: 'Forecasting', level: 'Competent' }, { name: 'Presentation', level: 'Proficient' }
            ],
            'marketing manager': [
                { name: 'Content Marketing', level: 'Expert' }, { name: 'SEO', level: 'Proficient' },
                { name: 'Social Media', level: 'Expert' }, { name: 'Email Marketing', level: 'Proficient' },
                { name: 'Brand Strategy', level: 'Expert' }, { name: 'Marketing Automation', level: 'Proficient' },
                { name: 'Data Analysis', level: 'Competent' }, { name: 'CRM', level: 'Proficient' },
                { name: 'Demand Generation', level: 'Proficient' }, { name: 'Budgeting', level: 'Proficient' }
            ],
            'hr': [
                { name: 'Human Resources', level: 'Expert' }, { name: 'Employee Relations', level: 'Proficient' },
                { name: 'Performance Management', level: 'Proficient' }, { name: 'Compensation', level: 'Proficient' },
                { name: 'HRIS', level: 'Proficient' }, { name: 'Compliance', level: 'Proficient' },
                { name: 'Succession Planning', level: 'Competent' }, { name: 'Employee Engagement', level: 'Proficient' },
                { name: 'Training and Development', level: 'Competent' }, { name: 'Change Management', level: 'Competent' }
            ],
            'strategy': [
                { name: 'Strategic Planning', level: 'Expert' }, { name: 'Business Strategy', level: 'Expert' },
                { name: 'Competitive Analysis', level: 'Expert' }, { name: 'Market Analysis', level: 'Expert' },
                { name: 'Financial Analysis', level: 'Proficient' }, { name: 'Stakeholder Management', level: 'Expert' },
                { name: 'Change Management', level: 'Proficient' }, { name: 'Presentation', level: 'Expert' },
                { name: 'Data Analysis', level: 'Proficient' }, { name: 'Innovation', level: 'Expert' }
            ],
            'sales': [
                { name: 'Sales Strategy', level: 'Expert' }, { name: 'Pipeline Management', level: 'Expert' },
                { name: 'CRM', level: 'Expert' }, { name: 'Negotiation', level: 'Expert' },
                { name: 'Account Management', level: 'Proficient' }, { name: 'Client Relations', level: 'Expert' },
                { name: 'Revenue Growth', level: 'Proficient' }, { name: 'Presentation', level: 'Proficient' },
                { name: 'Forecasting', level: 'Proficient' }, { name: 'Business Development', level: 'Proficient' }
            ],
            'project manager': [
                { name: 'Project Management', level: 'Expert' }, { name: 'Agile', level: 'Expert' },
                { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Risk Management', level: 'Proficient' },
                { name: 'Budgeting', level: 'Proficient' }, { name: 'JIRA', level: 'Expert' },
                { name: 'Change Management', level: 'Proficient' }, { name: 'Process Improvement', level: 'Proficient' },
                { name: 'Cross-Functional Collaboration', level: 'Expert' }, { name: 'Communication', level: 'Expert' }
            ],
            'ux designer': [
                { name: 'UX Design', level: 'Expert' }, { name: 'User Research', level: 'Expert' },
                { name: 'Wireframing', level: 'Expert' }, { name: 'Prototyping', level: 'Expert' },
                { name: 'Usability Testing', level: 'Proficient' }, { name: 'Design Systems', level: 'Proficient' },
                { name: 'Figma', level: 'Expert' }, { name: 'Accessibility', level: 'Proficient' },
                { name: 'Information Architecture', level: 'Proficient' }, { name: 'Interaction Design', level: 'Expert' }
            ],
            'customer success': [
                { name: 'Customer Success', level: 'Expert' }, { name: 'Account Management', level: 'Expert' },
                { name: 'CRM', level: 'Proficient' }, { name: 'Client Relations', level: 'Expert' },
                { name: 'Onboarding', level: 'Proficient' }, { name: 'Data Analysis', level: 'Competent' },
                { name: 'Presentation', level: 'Proficient' }, { name: 'Negotiation', level: 'Proficient' },
                { name: 'Process Improvement', level: 'Competent' }, { name: 'Cross-Functional Collaboration', level: 'Proficient' }
            ],
            'operations': [
                { name: 'Process Improvement', level: 'Expert' }, { name: 'Project Management', level: 'Proficient' },
                { name: 'Data Analysis', level: 'Proficient' }, { name: 'Budgeting', level: 'Proficient' },
                { name: 'Vendor Management', level: 'Expert' }, { name: 'Risk Management', level: 'Proficient' },
                { name: 'Compliance', level: 'Proficient' }, { name: 'Strategic Planning', level: 'Proficient' },
                { name: 'Change Management', level: 'Proficient' }, { name: 'Reporting', level: 'Expert' }
            ],
            'executive': [
                { name: 'Strategic Planning', level: 'Mastery' }, { name: 'Executive Presence', level: 'Expert' },
                { name: 'Stakeholder Management', level: 'Mastery' }, { name: 'Change Management', level: 'Expert' },
                { name: 'P&L Management', level: 'Expert' }, { name: 'Board Relations', level: 'Proficient' },
                { name: 'Cross-Functional Collaboration', level: 'Expert' }, { name: 'Innovation', level: 'Expert' },
                { name: 'Talent Development', level: 'Expert' }, { name: 'Business Strategy', level: 'Mastery' }
            ],
            'futurist': [
                { name: 'Strategic Planning', level: 'Mastery' }, { name: 'Innovation', level: 'Mastery' },
                { name: 'Thought Leadership', level: 'Expert' }, { name: 'Market Research', level: 'Expert' },
                { name: 'Data Analysis', level: 'Proficient' }, { name: 'Public Speaking', level: 'Expert' },
                { name: 'Storytelling', level: 'Expert' }, { name: 'Digital Transformation', level: 'Expert' },
                { name: 'Competitive Analysis', level: 'Expert' }, { name: 'Presentation', level: 'Expert' }
            ],
            'content': [
                { name: 'Content Marketing', level: 'Expert' }, { name: 'Copywriting', level: 'Expert' },
                { name: 'SEO', level: 'Proficient' }, { name: 'Storytelling', level: 'Expert' },
                { name: 'Social Media', level: 'Proficient' }, { name: 'Brand Strategy', level: 'Proficient' },
                { name: 'Data Analysis', level: 'Competent' }, { name: 'Email Marketing', level: 'Proficient' },
                { name: 'Content Marketing', level: 'Expert' }, { name: 'Technical Writing', level: 'Competent' }
            ],
            'general manager': [
                { name: 'P&L Management', level: 'Expert' }, { name: 'Strategic Planning', level: 'Expert' },
                { name: 'Team Leadership', level: 'Expert' }, { name: 'Budgeting', level: 'Expert' },
                { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Cross-Functional Collaboration', level: 'Expert' },
                { name: 'Business Development', level: 'Proficient' }, { name: 'Change Management', level: 'Proficient' },
                { name: 'Data Analysis', level: 'Proficient' }, { name: 'Vendor Management', level: 'Proficient' }
            ]
        };
        
        // Get suggested skills for a user based on their roles
        function getRoleSuggestions() {
            var userRoles = userData.roles || [];
            var userSkillNames = new Set((skillsData.skills || []).map(function(s) { return s.name.toLowerCase(); }));
            // Also build synonym-aware set
            var userSkillSynonyms = new Set();
            userSkillNames.forEach(function(n) {
                userSkillSynonyms.add(n);
                getSkillSynonyms(n).forEach(function(syn) { userSkillSynonyms.add(syn); });
            });
            
            var suggestions = [];
            var seen = new Set();
            
            // Role-name-to-map-key matching with keyword fallbacks
            var ROLE_KEYWORDS = {
                'recruiter': ['recruit', 'sourcing', 'talent acquisition'],
                'talent acquisition': ['talent acquisition', 'ta ', 'recruiting lead', 'head of recruiting'],
                'product manager': ['product', 'pm'],
                'software engineer': ['engineer', 'developer', 'programmer', 'coder'],
                'data analyst': ['data analyst', 'analytics', 'business analyst'],
                'marketing manager': ['marketing', 'growth', 'demand gen'],
                'hr': ['human resource', 'people operations', 'people ops', 'hrbp'],
                'strategy': ['strateg', 'futur', 'advisory', 'consulting'],
                'sales': ['sales', 'revenue', 'business development', 'account executive'],
                'project manager': ['project manager', 'program manager', 'delivery manager'],
                'ux designer': ['ux', 'design', 'user experience'],
                'customer success': ['customer success', 'client success', 'csm'],
                'operations': ['operations', 'ops', 'supply chain'],
                'executive': ['executive', 'vp ', 'vice president', 'chief', 'c-suite', 'general manager', 'gm'],
                'futurist': ['futurist', 'thought leader', 'evangelist'],
                'content': ['content', 'copywrite', 'editorial'],
                'general manager': ['general manager', 'gm', 'country manager', 'regional manager']
            };
            
            userRoles.forEach(function(role) {
                var roleName = role.name.toLowerCase();
                
                // Try exact/partial match first
                var mapKey = Object.keys(ROLE_SKILL_MAP).find(function(k) {
                    return roleName.indexOf(k) !== -1 || k.indexOf(roleName) !== -1;
                });
                
                // Try keyword fallback
                if (!mapKey) {
                    mapKey = Object.keys(ROLE_KEYWORDS).find(function(k) {
                        return ROLE_KEYWORDS[k].some(function(kw) { return roleName.indexOf(kw) !== -1; });
                    });
                }
                
                if (!mapKey || !ROLE_SKILL_MAP[mapKey]) return;
                
                ROLE_SKILL_MAP[mapKey].forEach(function(suggested) {
                    var lower = suggested.name.toLowerCase();
                    // Check both direct name AND synonyms to avoid suggesting skills the user already has under a different name
                    if (!userSkillSynonyms.has(lower) && !seen.has(lower)) {
                        seen.add(lower);
                        suggestions.push({
                            name: suggested.name,
                            level: suggested.level,
                            reason: role.name,
                            roleId: role.id
                        });
                    }
                });
            });
            
            return suggestions;
        }
        
        // ===== MATCH CALCULATION =====
        
        function matchJobToProfile(parsed) {
            var rawSkills = parsed.skills || [];
            // Normalize: support both string arrays and object arrays
            var jobSkills = rawSkills.map(function(s) {
                if (typeof s === 'string') return { name: s, requirement: 'Required' };
                return s;
            }).filter(function(s) { return s && s.name; });
            var userSkills = skillsData.skills || [];
            
            // Build lookup of user's skills (lowercase → skill object)
            // Include synonym variants for fuzzy matching
            var userMap = {};
            var userNameIndex = []; // for word-overlap search
            userSkills.forEach(function(s) {
                var lower = s.name.toLowerCase();
                userMap[lower] = s;
                userNameIndex.push({ lower: lower, skill: s, words: lower.split(/[\s\-\/&]+/).filter(function(w) { return w.length > 2; }) });
                // Also add simplified versions (strip extra spaces, ampersands)
                var simplified = lower.replace(/\s*&\s*/g, ' ').replace(/\s+/g, ' ').trim();
                if (simplified !== lower) userMap[simplified] = s;
                // Register all known synonyms
                var synonyms = getSkillSynonyms(lower);
                synonyms.forEach(function(syn) {
                    if (!userMap[syn]) userMap[syn] = s;
                });
            });
            
            var matched = [];
            var gaps = [];
            var matchedUserSkills = new Set();
            var totalWeight = 0;
            var earnedWeight = 0;
            
            jobSkills.forEach(function(jobSkill) {
                // Backward compat: support old 'level' field as 'requirement'
                var requirement = jobSkill.requirement || jobSkill.level || 'Required';
                var reqWeight = requirement === 'Required' ? 3 : requirement === 'Preferred' ? 2 : 1;
                totalWeight += reqWeight;
                
                // Job's demanded proficiency (default Proficient if not specified)
                var jobProf = proficiencyValue(jobSkill.proficiency || 'Proficient');
                
                var jLower = jobSkill.name.toLowerCase();
                var jWords = jLower.split(/[\s\-\/&]+/).filter(function(w) { return w.length > 2; });
                var found = null;
                var nameMatchQuality = 0;
                
                // 1. Exact match
                if (userMap[jLower]) {
                    found = userMap[jLower];
                    nameMatchQuality = 1.0;
                }
                
                // 1b. Synonym match: check all synonyms of the job skill
                if (!found) {
                    var jobSynonyms = getSkillSynonyms(jLower);
                    for (var si = 0; si < jobSynonyms.length; si++) {
                        if (userMap[jobSynonyms[si]]) {
                            found = userMap[jobSynonyms[si]];
                            nameMatchQuality = 0.95; // near-exact via synonym
                            break;
                        }
                    }
                }
                
                // 2. Substring containment (one contains the other)
                if (!found) {
                    for (var key in userMap) {
                        if (key.length > 3 && (jLower.indexOf(key) !== -1 || key.indexOf(jLower) !== -1)) {
                            found = userMap[key];
                            nameMatchQuality = 0.85;
                            break;
                        }
                    }
                }
                
                // 3. Word overlap: 50%+ of words match
                if (!found && jWords.length > 0) {
                    var bestOverlap = 0;
                    var bestSkill = null;
                    userNameIndex.forEach(function(entry) {
                        var overlap = 0;
                        jWords.forEach(function(jw) {
                            if (entry.words.some(function(uw) { return uw === jw || (uw.length > 4 && (uw.indexOf(jw) !== -1 || jw.indexOf(uw) !== -1)); })) overlap++;
                        });
                        var score = overlap / Math.max(jWords.length, 1);
                        if (score > bestOverlap && score >= 0.5) {
                            bestOverlap = score;
                            bestSkill = entry.skill;
                        }
                    });
                    if (bestSkill) {
                        found = bestSkill;
                        nameMatchQuality = bestOverlap * 0.75;
                    }
                }
                
                if (found) {
                    // Proficiency comparison
                    var userProf = proficiencyValue(found.level);
                    var profMatch;
                    if (userProf >= jobProf) {
                        profMatch = 1.0; // Meets or exceeds requirement
                    } else {
                        profMatch = userProf / jobProf; // Partial credit (e.g., Competent/Expert = 0.5)
                    }
                    
                    var skillCredit = reqWeight * nameMatchQuality * profMatch;
                    earnedWeight += skillCredit;
                    
                    var profGap = userProf < jobProf;
                    matched.push({
                        jobSkill: jobSkill.name,
                        userSkill: found.name,
                        userLevel: found.level,
                        jobProficiency: jobSkill.proficiency || 'Proficient',
                        requirement: requirement,
                        category: jobSkill.category,
                        nameMatch: nameMatchQuality,
                        profMatch: profMatch,
                        profGap: profGap
                    });
                    matchedUserSkills.add(found.name.toLowerCase());
                } else {
                    gaps.push({
                        name: jobSkill.name,
                        requirement: requirement,
                        proficiency: jobSkill.proficiency || 'Proficient',
                        category: jobSkill.category
                    });
                }
            });
            
            // Surplus: user skills not needed by job
            var surplus = [];
            userSkills.forEach(function(s) {
                if (!matchedUserSkills.has(s.name.toLowerCase())) {
                    surplus.push({ name: s.name, level: s.level, category: s.category });
                }
            });
            
            var score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
            
            return {
                score: Math.min(score, 100),
                matched: matched,
                gaps: gaps,
                surplus: surplus,
                totalJobSkills: jobSkills.length,
                totalUserSkills: userSkills.length
            };
        }
        
        // ===== RE-SCORE ALL SAVED JOBS =====
        // Called whenever profile skills change (add, edit, remove, proficiency change)
        function rescoreAllJobs() {
            if (!userData.savedJobs || userData.savedJobs.length === 0) return;
            
            var updated = 0;
            userData.savedJobs.forEach(function(job) {
                var oldScore = job.matchData ? job.matchData.score : 0;
                if (job.parsedSkills && job.parsedSkills.length > 0) {
                    job.matchData = matchJobToProfile({ skills: job.parsedSkills, roles: job.parsedRoles || [] });
                }
                var quick = quickScoreJob(job.title, job.rawText || '', job.parsedSkills || []);
                if (job.matchData) {
                    job.matchData.score = quick.score;
                } else {
                    job.matchData = { score: quick.score, matched: quick.matched, gaps: quick.gaps, surplus: [] };
                }
                if (!job.companyValues) job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
                if (job.matchData.score !== oldScore) updated++;
            });
            
            if (updated > 0) {
                saveUserData();
                if (fbUser) debouncedSave();
                showToast(updated + ' job match score' + (updated > 1 ? 's' : '') + ' updated.', 'info', 3000);
            }
        }
        window.rescoreAllJobs = rescoreAllJobs;
        
        function rescoreOneJob(idx) {
            var job = (userData.savedJobs || [])[idx];
            if (!job) {
                showToast('Job not found.', 'warning');
                return;
            }
            var oldScore = job.matchData ? job.matchData.score : 0;
            if (job.parsedSkills && job.parsedSkills.length > 0) {
                job.matchData = matchJobToProfile({ skills: job.parsedSkills, roles: job.parsedRoles || [] });
            }
            var quick = quickScoreJob(job.title, job.rawText || '', job.parsedSkills || []);
            if (job.matchData) {
                job.matchData.score = quick.score;
            } else {
                job.matchData = { score: quick.score, matched: quick.matched, gaps: quick.gaps, surplus: [] };
            }
            if (!job.companyValues) job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
            saveUserData();
            if (fbUser) debouncedSave();
            showJobDetail(idx);
            var delta = job.matchData.score - oldScore;
            var deltaStr = delta > 0 ? ' (+' + delta + ')' : delta < 0 ? ' (' + delta + ')' : '';
            showToast('Match rescored: ' + job.matchData.score + '%' + deltaStr, 'success', 3000);
        }
        window.rescoreOneJob = rescoreOneJob;
        
        // ===== QUICK-ADD GAP SKILL FROM JOB DETAIL =====
        function quickAddGapSkill(skillName, suggestedLevel, jobIdx) {
            if (readOnlyGuard()) return;
            
            // Check if already in profile
            if (userData.skills.some(function(s) { return s.name.toLowerCase() === skillName.toLowerCase(); })) {
                showToast('"' + skillName + '" is already in your profile.', 'info');
                // Still rescore in case something changed
                rescoreAllJobs();
                showJobDetail(jobIdx);
                return;
            }
            
            // Show inline proficiency picker
            var modal = document.getElementById('exportModal');
            var mc = modal.querySelector('.modal-content');
            var levels = ['Novice', 'Competent', 'Proficient', 'Expert', 'Mastery'];
            var sugIdx = levels.indexOf(suggestedLevel);
            if (sugIdx === -1) sugIdx = 2;
            
            mc.innerHTML = '<div class="modal-header">'
                + '<div class="modal-header-left"><h2 class="modal-title">Add Skill: ' + skillName + '</h2></div>'
                + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button></div>'
                + '<div class="modal-body" style="padding:24px;">'
                + '<p style="color:var(--text-secondary); margin-bottom:16px;">This job expects <strong>' + suggestedLevel + '</strong> proficiency. What\'s your actual level?</p>'
                + '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">'
                + levels.map(function(lvl, i) {
                    var isSelected = i === sugIdx;
                    var barWidth = ((i + 1) / 5 * 100);
                    var barColor = i < sugIdx ? '#f59e0b' : i === sugIdx ? '#10b981' : '#60a5fa';
                    return '<label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; cursor:pointer; '
                        + 'border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + '; '
                        + 'background:' + (isSelected ? 'var(--accent-glow)' : 'transparent') + ';">'
                        + '<input type="radio" name="gapSkillLevel" value="' + lvl + '"' + (isSelected ? ' checked' : '') + ' style="margin:0;">'
                        + '<div style="flex:1;">'
                        + '<div style="font-weight:600; font-size:0.92em;">' + lvl + '</div>'
                        + '<div style="height:4px; width:100%; background:var(--border); border-radius:2px; margin-top:4px;">'
                        + '<div style="height:100%; width:' + barWidth + '%; background:' + barColor + '; border-radius:2px;"></div></div>'
                        + '</div></label>';
                }).join('')
                + '</div>'
                + '<p style="font-size:0.82em; color:var(--text-muted); margin-bottom:16px;">The skill will be added to your profile and all job matches will be rescored automatically.</p>'
                + '<div style="display:flex; gap:10px; justify-content:flex-end;">'
                + '<button onclick="closeExportModal()" style="padding:10px 20px; background:rgba(255,255,255,0.1); border:1px solid var(--border); border-radius:6px; cursor:pointer; color:var(--text-primary);">Cancel</button>'
                + '<button onclick="confirmQuickAddGapSkill(\'' + escapeHtml(skillName).replace(/'/g, "\\'") + '\', ' + jobIdx + ')" style="'
                + 'padding:10px 20px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Add to Profile</button>'
                + '</div></div>';
            
            history.pushState({ modal: true }, ''); modal.classList.add('active');
        }
        window.quickAddGapSkill = quickAddGapSkill;
        
        function confirmQuickAddGapSkill(skillName, jobIdx) {
            if (readOnlyGuard()) return;
            var level = 'Proficient';
            var checked = document.querySelector('input[name="gapSkillLevel"]:checked');
            if (checked) level = checked.value;
            
            // Add to profile
            var firstRole = (userData.roles && userData.roles[0]) ? userData.roles[0].id : 'general';
            var newSkill = {
                name: skillName,
                category: 'unique',
                level: level,
                roles: [firstRole],
                key: false,
                addedFrom: 'job-gap'
            };
            userData.skills.push(newSkill);
            skillsData.skills.push(newSkill);
            
            // Register in library
            registerInSkillLibrary(skillName, 'unique');
            
            saveUserData();
            if (fbUser) debouncedSave();
            rescoreAllJobs();
            
            closeExportModal();
            showJobDetail(jobIdx);
            showToast('Added "' + skillName + '" at ' + level + '. Match scores updated.', 'success', 4000);
        }
        window.confirmQuickAddGapSkill = confirmQuickAddGapSkill;
        
        // ===== QUICK-ADD ROLE SUGGESTION =====
        function quickAddSuggested(skillName, level, roleId) {
            if (readOnlyGuard()) return;
            if (userData.skills.some(function(s) { return s.name.toLowerCase() === skillName.toLowerCase(); })) {
                showToast('"' + skillName + '" is already in your profile.', 'info');
                return;
            }
            var newSkill = { name: skillName, category: 'unique', level: level, roles: [roleId], key: false, addedFrom: 'role-suggestion' };
            userData.skills.push(newSkill);
            skillsData.skills.push(newSkill);
            registerInSkillLibrary(skillName, 'unique');
            saveUserData();
            rescoreAllJobs();
            // Re-render card view to update suggestions
            window.cardViewInitialized = false;
            initCardView();
            window.cardViewInitialized = true;
            showToast('Added "' + skillName + '" at ' + level + '.', 'success', 3000);
        }
        window.quickAddSuggested = quickAddSuggested;

        // ===== JOB DETAIL VIEW =====
        
        function showJobDetail(idx) {
            var job = (userData.savedJobs || [])[idx];
            if (!job) return;
            
            var match = job.matchData || {};
            var matchPct = match.score || 0;
            var matchColor = matchPct >= 70 ? '#10b981' : matchPct >= 45 ? '#f59e0b' : '#6b7280';
            var matched = match.matched || [];
            var gaps = match.gaps || [];
            var surplus = match.surplus || [];
            
            var el = document.getElementById('jobsSubTabContent');
            if (!el) return;
            
            var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
                + '<button onclick="renderJobsSubTab()" style="background:none; border:none; color:var(--accent); '
                + 'cursor:pointer; font-size:0.88em; padding:0;">\u2190 Back to Pipeline</button>'
                + '<div style="display:flex; gap:8px; align-items:center;">';
            
            var isSampleJob = job.sample === true;
            if (isSampleJob && !fbIsAdmin) {
                html += '<span style="font-size:0.78em; color:var(--text-muted); font-style:italic;">\uD83D\uDD12 Demo job (read-only)</span>';
            } else {
                if (isSampleJob) html += '<span style="font-size:0.72em; color:var(--text-muted); font-style:italic; margin-right:4px;">\uD83D\uDD12 Demo</span>';
                html += '<button onclick="editJobInfo(' + idx + ')" style="background:none; border:1px solid var(--border); '
                    + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u270E Edit Info</button>'
                    + '<button onclick="rescoreOneJob(' + idx + ')" style="background:none; border:1px solid var(--border); '
                    + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u21BB Refresh Match</button>'
                    + '<button onclick="reanalyzeJob(' + idx + ')" style="background:none; border:1px solid var(--border); '
                    + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u21BB Re-analyze</button>'
                    + '<button onclick="removeJob(' + idx + ')" style="background:none; border:1px solid rgba(239,68,68,0.3); '
                    + 'color:#ef4444; padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u2715 Delete</button>';
            }
            html += '</div></div>';
            
            // Header
            html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:16px;">'
                + '<div>'
                + '<h2 style="font-size:1.5em; font-weight:700; color:var(--text-primary); margin:0;">' + (job.title || 'Untitled') + '</h2>'
                + '<div style="color:var(--text-muted); margin-top:4px;">' + (job.company || '') 
                + (job.sourceUrl ? ' \u00B7 <a href="' + sanitizeUrl(job.sourceUrl) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">View original</a>' : '') + '</div>'
                + '</div>'
                + '<div style="text-align:center; padding:12px 24px; border-radius:12px; '
                + 'background:' + matchColor + '15; border:2px solid ' + matchColor + '40;">'
                + '<div style="font-size:2em; font-weight:700; color:' + matchColor + ';">' + matchPct + '%</div>'
                + '<div style="font-size:0.78em; color:var(--text-muted);">Overall Match</div>'
                + '</div></div>';
            
            // Network Overlay CTA (prominent, above the fold)
            html += '<div class="jd-cta-box">'
                + '<div class="jd-cta-buttons">'
                + '<button onclick="activateJobOverlay(' + idx + ')" style="'
                + 'background:var(--accent); color:#fff; border:none; padding:10px 20px; border-radius:8px; '
                + 'cursor:pointer; font-weight:600; font-size:0.9em; display:flex; align-items:center; gap:8px; white-space:nowrap;">'
                + bpIcon('network',16) + ' Compare Skills</button>'
                + '<button onclick="activateValuesOverlay(' + idx + ')" style="'
                + 'background:transparent; color:#f59e0b; border:1px solid rgba(245,158,11,0.4); padding:10px 20px; border-radius:8px; '
                + 'cursor:pointer; font-weight:600; font-size:0.9em; display:flex; align-items:center; gap:8px; white-space:nowrap;">'
                + bpIcon('values',16) + ' Values Fit</button>'
                + '<button onclick="launchScoutingReport()" style="'
