document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    let sessionHistory = [];
    const gaugeCircumference = 534; // 2 * Math.PI * 85 (approx)

    // Initial default patient registry
    let patientRegistry = JSON.parse(localStorage.getItem("patient_registry")) || [
        {
            id: "PT-2026-104",
            name: "Robert Jenkins",
            age: 45,
            gender: "Male",
            phone: "+1 (555) 234-5678",
            blood: "O+",
            symptoms: "Chronic fatigue, elevated ALT in routine screening, mild upper abdominal discomfort.",
            registeredAt: "2026-09-02"
        },
        {
            id: "PT-2026-105",
            name: "Maria Garcia",
            age: 58,
            gender: "Female",
            phone: "+1 (555) 987-6543",
            blood: "A+",
            symptoms: "Scleral icterus (mild jaundice), elevated alkaline phosphatase, history of gallstones.",
            registeredAt: "2026-09-02"
        },
        {
            id: "PT-2026-106",
            name: "David Patel",
            age: 36,
            gender: "Male",
            phone: "+1 (555) 456-7890",
            blood: "B+",
            symptoms: "Routine annual physical examination. No acute hepatic complaints.",
            registeredAt: "2026-09-02"
        }
    ];

    // Current active patient being evaluated
    let activePatient = patientRegistry[0] || {
        id: "PT-2026-104",
        name: "Robert Jenkins",
        age: 45,
        gender: "Male"
    };

    // Current Doctor session
    let doctorSession = JSON.parse(localStorage.getItem("doctor_session")) || null;

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    // Auth & Doctor Elements
    const loginScreen = document.getElementById("doctor-login-screen");
    const loginForm = document.getElementById("doctor-login-form");
    const loginEmailInput = document.getElementById("login-email");
    const loginPasswordInput = document.getElementById("login-password");
    const loginErrorMsg = document.getElementById("login-error-msg");
    const quickDemoBtn = document.getElementById("quick-demo-btn");
    const displayDoctorName = document.getElementById("display-doctor-name");
    const displayDoctorDept = document.getElementById("display-doctor-dept");
    const navLogout = document.getElementById("nav-logout");

    // Navigation items
    const navItems = {
        patients: document.getElementById("nav-patients"),
        dashboard: document.getElementById("nav-dashboard"),
        history: document.getElementById("nav-history"),
        about: document.getElementById("nav-about")
    };
    
    // Page sections
    const sections = {
        patients: document.getElementById("section-patients"),
        dashboard: document.getElementById("section-dashboard"),
        history: document.getElementById("section-history"),
        about: document.getElementById("section-about")
    };

    // Patient Registry Elements
    const patientRegForm = document.getElementById("patient-registration-form");
    const regPatientName = document.getElementById("reg-patient-name");
    const regPatientId = document.getElementById("reg-patient-id");
    const regPatientAge = document.getElementById("reg-patient-age");
    const regPatientGender = document.getElementById("reg-patient-gender");
    const regPatientPhone = document.getElementById("reg-patient-phone");
    const regPatientBlood = document.getElementById("reg-patient-blood");
    const regPatientSymptoms = document.getElementById("reg-patient-symptoms");
    const btnGenerateMrn = document.getElementById("btn-generate-mrn");
    const patientCardsContainer = document.getElementById("patient-cards-container");
    const patientSearchInput = document.getElementById("patient-search-input");
    const patientCountBadge = document.getElementById("patient-count-badge");

    // Active Patient Banner & Switch button
    const activePatientHeading = document.getElementById("active-patient-heading");
    const btnSwitchPatient = document.getElementById("btn-switch-patient");
    const inputPatientName = document.getElementById("input-patient-name");
    const inputPatientId = document.getElementById("input-patient-id");
    const inputAge = document.getElementById("input-age");
    const inputGender = document.getElementById("input-gender");

    // Form inputs and synchronized sliders
    const form = document.getElementById("screening-form");
    const paramPairs = [
        { input: document.getElementById("input-total-bilirubin"), range: document.getElementById("range-total-bilirubin") },
        { input: document.getElementById("input-alkaline-phosphatase"), range: document.getElementById("range-alkaline-phosphatase") },
        { input: document.getElementById("input-alt"), range: document.getElementById("range-alt") },
        { input: document.getElementById("input-ast"), range: document.getElementById("range-ast") },
        { input: document.getElementById("input-total-proteins"), range: document.getElementById("range-total-proteins") },
        { input: document.getElementById("input-albumin"), range: document.getElementById("range-albumin") },
        { input: document.getElementById("input-ag-ratio"), range: document.getElementById("range-ag-ratio") }
    ];

    // Results UI
    const gaugeFill = document.getElementById("gauge-fill");
    const riskPercent = document.getElementById("risk-percent");
    const statusIndicator = document.getElementById("status-indicator");
    const statusIcon = document.getElementById("status-icon");
    const statusText = document.getElementById("status-text");
    const statusDesc = document.getElementById("status-desc");
    const explainContainer = document.getElementById("explain-container");

    // Sidebar & Info labels
    const modelNameLabel = document.getElementById("model-name-label");
    const modelAccuracyLabel = document.getElementById("model-accuracy-label");
    const aboutAcc = document.getElementById("about-acc");
    const aboutRec = document.getElementById("about-rec");
    const aboutSpec = document.getElementById("about-spec");
    const aboutAuc = document.getElementById("about-auc");

    // History Table
    const historyTbody = document.getElementById("history-tbody");

    // Modal elements
    const detailModal = document.getElementById("detail-modal");
    const closeModalBtn = document.getElementById("close-modal");
    const modalBodyContent = document.getElementById("modal-body-content");

    // -------------------------------------------------------------------------
    // Doctor Authentication & Session Management
    // -------------------------------------------------------------------------
    const checkAuthStatus = () => {
        if (!doctorSession) {
            loginScreen.classList.remove("hidden");
        } else {
            loginScreen.classList.add("hidden");
            displayDoctorName.textContent = doctorSession.username || "Dr. Sarah Mitchell, MD";
            displayDoctorDept.textContent = doctorSession.department || "Hepatology & Gastroenterology";
        }
    };

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginErrorMsg.classList.add("hidden");

        const username = loginEmailInput.value.trim();
        const password = loginPasswordInput.value.trim();
        const submitBtn = document.getElementById("login-submit-btn");
        const origText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const sessionData = await res.json();
                doctorSession = sessionData;
                localStorage.setItem("doctor_session", JSON.stringify(sessionData));
                checkAuthStatus();
            } else {
                loginErrorMsg.classList.remove("hidden");
            }
        } catch (err) {
            console.error("Login request failed:", err);
            // Fallback for offline/demo
            if (username && password) {
                const fallbackDoc = {
                    username: username.includes("@") ? "Dr. Sarah Mitchell, MD" : `Dr. ${username}`,
                    department: "Hepatology & Gastroenterology",
                    hospital: "Apex Memorial Clinical Center"
                };
                doctorSession = fallbackDoc;
                localStorage.setItem("doctor_session", JSON.stringify(fallbackDoc));
                checkAuthStatus();
            } else {
                loginErrorMsg.classList.remove("hidden");
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
        }
    });

    quickDemoBtn.addEventListener("click", () => {
        loginEmailInput.value = "doctor@clinical.org";
        loginPasswordInput.value = "admin";
        loginForm.dispatchEvent(new Event("submit"));
    });

    navLogout.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to sign out of the clinical portal?")) {
            doctorSession = null;
            localStorage.removeItem("doctor_session");
            checkAuthStatus();
        }
    });

    checkAuthStatus();

    // -------------------------------------------------------------------------
    // Event Listeners: Navigation
    // -------------------------------------------------------------------------
    const switchSection = (targetId) => {
        Object.keys(sections).forEach(key => {
            if (key === targetId) {
                sections[key].classList.remove("hidden");
                navItems[key].classList.add("active");
            } else {
                sections[key].classList.add("hidden");
                navItems[key].classList.remove("active");
            }
        });
    };

    navItems.patients.addEventListener("click", (e) => { e.preventDefault(); switchSection("patients"); });
    navItems.dashboard.addEventListener("click", (e) => { e.preventDefault(); switchSection("dashboard"); });
    navItems.history.addEventListener("click", (e) => { e.preventDefault(); switchSection("history"); });
    navItems.about.addEventListener("click", (e) => { e.preventDefault(); switchSection("about"); });

    if (btnSwitchPatient) {
        btnSwitchPatient.addEventListener("click", () => {
            switchSection("patients");
        });
    }

    // -------------------------------------------------------------------------
    // Event Listeners: 2-Way Sync between Manual Inputs & Range Sliders
    // -------------------------------------------------------------------------
    paramPairs.forEach(({ input, range }) => {
        if (input && range) {
            // Slider dragged -> update manual number input
            range.addEventListener("input", () => {
                input.value = range.value;
            });

            // Manual number typed -> update slider position smoothly
            input.addEventListener("input", () => {
                const val = parseFloat(input.value);
                if (!isNaN(val)) {
                    const min = parseFloat(range.min);
                    const max = parseFloat(range.max);
                    range.value = Math.min(Math.max(val, min), max);
                }
            });
        }
    });

    // -------------------------------------------------------------------------
    // Patient Registry Management
    // -------------------------------------------------------------------------
    const saveRegistry = () => {
        localStorage.setItem("patient_registry", JSON.stringify(patientRegistry));
        renderPatientCards(patientSearchInput ? patientSearchInput.value : "");
    };

    const generateMRN = () => {
        const rand = Math.floor(100 + Math.random() * 900);
        return `PT-2026-${rand}`;
    };

    if (btnGenerateMrn) {
        btnGenerateMrn.addEventListener("click", () => {
            regPatientId.value = generateMRN();
        });
    }

    const renderPatientCards = (filterText = "") => {
        if (!patientCardsContainer) return;

        const term = filterText.toLowerCase().trim();
        const filtered = patientRegistry.filter(p => 
            p.name.toLowerCase().includes(term) || 
            p.id.toLowerCase().includes(term) ||
            (p.symptoms && p.symptoms.toLowerCase().includes(term))
        );

        if (patientCountBadge) {
            patientCountBadge.textContent = `${patientRegistry.length} Patients`;
        }

        if (filtered.length === 0) {
            patientCardsContainer.innerHTML = `
                <div class="empty-state" style="padding: 24px;">
                    <i class="fa-solid fa-user-slash"></i>
                    <p>No patients found matching "${filterText}".</p>
                </div>
            `;
            return;
        }

        patientCardsContainer.innerHTML = "";
        filtered.forEach(patient => {
            const card = document.createElement("div");
            card.className = "patient-card-item";

            card.innerHTML = `
                <div class="patient-card-header">
                    <div class="patient-card-title">
                        <i class="fa-solid fa-hospital-user" style="color: var(--primary)"></i>
                        <h4>${patient.name}</h4>
                        <span class="patient-mrn-tag">${patient.id}</span>
                    </div>
                </div>
                <div class="patient-card-meta">
                    <span><i class="fa-solid fa-cake-candles"></i> ${patient.age} Yrs</span>
                    <span><i class="fa-solid fa-venus-mars"></i> ${patient.gender}</span>
                    ${patient.blood ? `<span><i class="fa-solid fa-droplet"></i> ${patient.blood}</span>` : ""}
                    ${patient.phone ? `<span><i class="fa-solid fa-phone"></i> ${patient.phone}</span>` : ""}
                </div>
                ${patient.symptoms ? `<div class="patient-card-symptoms">${patient.symptoms}</div>` : ""}
                <div class="patient-card-actions">
                    <button type="button" class="delete-patient-btn" data-id="${patient.id}" title="Remove Patient Record">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <button type="button" class="eval-patient-btn" data-id="${patient.id}">
                        <i class="fa-solid fa-stethoscope"></i> Evaluate LFT
                    </button>
                </div>
            `;

            // Evaluate patient button listener
            card.querySelector(".eval-patient-btn").addEventListener("click", () => {
                selectPatientForEvaluation(patient);
            });

            // Delete patient listener
            card.querySelector(".delete-patient-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Remove patient record for ${patient.name} (${patient.id})?`)) {
                    patientRegistry = patientRegistry.filter(p => p.id !== patient.id);
                    saveRegistry();
                }
            });

            patientCardsContainer.appendChild(card);
        });
    };

    const selectPatientForEvaluation = (patient) => {
        activePatient = patient;
        
        // Update Screening form fields
        if (inputPatientName) inputPatientName.value = patient.name;
        if (inputPatientId) inputPatientId.value = patient.id;
        if (inputAge) inputAge.value = patient.age;
        if (inputGender) inputGender.value = patient.gender;

        // Update active patient banner
        if (activePatientHeading) {
            activePatientHeading.textContent = `${patient.name} (MRN: ${patient.id}) — ${patient.age} Yrs, ${patient.gender}`;
        }

        // Switch directly to screening dashboard
        switchSection("dashboard");
    };

    // Patient registration form submission
    if (patientRegForm) {
        patientRegForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const newPatient = {
                id: regPatientId.value.trim() || generateMRN(),
                name: regPatientName.value.trim(),
                age: parseInt(regPatientAge.value),
                gender: regPatientGender.value,
                phone: regPatientPhone.value.trim(),
                blood: regPatientBlood.value,
                symptoms: regPatientSymptoms.value.trim(),
                registeredAt: new Date().toISOString().split("T")[0]
            };

            // Prevent duplicate MRN
            patientRegistry = patientRegistry.filter(p => p.id !== newPatient.id);
            patientRegistry.unshift(newPatient);
            saveRegistry();

            // Reset form
            patientRegForm.reset();
            regPatientId.value = generateMRN();

            // Prompt doctor to evaluate
            if (confirm(`Patient "${newPatient.name}" registered successfully! Start liver screening evaluation now?`)) {
                selectPatientForEvaluation(newPatient);
            }
        });
    }

    if (patientSearchInput) {
        patientSearchInput.addEventListener("input", (e) => {
            renderPatientCards(e.target.value);
        });
    }

    // Initialize MRN and Patient Directory
    if (regPatientId && !regPatientId.value) {
        regPatientId.value = generateMRN();
    }
    renderPatientCards();
    selectPatientForEvaluation(activePatient);

    // -------------------------------------------------------------------------
    // API Integration: Fetch Model Details
    // -------------------------------------------------------------------------
    const loadModelDetails = async () => {
        try {
            const res = await fetch("/api/info");
            if (res.ok) {
                const info = await res.json();
                const mName = info.model_name || "Classifier";
                const metrics = info.metrics || {};
                
                modelNameLabel.textContent = mName.replace("_", " ");
                const accPercent = ((metrics.accuracy || 0.697) * 100).toFixed(1) + "%";
                modelAccuracyLabel.textContent = `Accuracy: ${accPercent}`;
                
                // Update Clinical Guide metrics dynamically
                aboutAcc.textContent = accPercent;
                aboutRec.textContent = ((metrics.recall || 0.712) * 100).toFixed(1) + "%";
                aboutSpec.textContent = ((metrics.specificity || 0.660) * 100).toFixed(1) + "%";
                aboutAuc.textContent = (metrics.auc || 0.778).toFixed(3);
            }
        } catch (e) {
            console.error("Failed to load model details:", e);
            modelNameLabel.textContent = "RandomForest Classifier";
            modelAccuracyLabel.textContent = "Accuracy: 69.7%";
        }
    };
    loadModelDetails();

    // -------------------------------------------------------------------------
    // Assessment Form Submit Action
    // -------------------------------------------------------------------------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Disable form button temporarily to show loading
        const btn = form.querySelector("button[type='submit']");
        const origBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Profile...`;

        // Parse form parameters
        const formData = new FormData(form);
        const data = {
            patient_name: formData.get("patient_name") || activePatient.name || "Anonymous Patient",
            patient_id: formData.get("patient_id") || activePatient.id || "PT-UNKNOWN",
            Age: parseInt(formData.get("Age")),
            Gender: formData.get("Gender"),
            Total_Bilirubin: parseFloat(formData.get("Total_Bilirubin")),
            Alkaline_Phosphotase: parseInt(formData.get("Alkaline_Phosphotase")),
            Alamine_Aminotransferase: parseInt(formData.get("Alamine_Aminotransferase")),
            Aspartate_Aminotransferase: parseInt(formData.get("Aspartate_Aminotransferase")),
            Total_Protiens: parseFloat(formData.get("Total_Protiens")),
            Albumin: parseFloat(formData.get("Albumin")),
            Albumin_and_Globulin_Ratio: parseFloat(formData.get("Albumin_and_Globulin_Ratio"))
        };

        // Update active patient banner heading
        if (activePatientHeading) {
            activePatientHeading.textContent = `${data.patient_name} (MRN: ${data.patient_id}) — ${data.Age} Yrs, ${data.Gender}`;
        }

        try {
            // 1. Fetch prediction risk probability
            const predictRes = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!predictRes.ok) throw new Error("Prediction API Error");
            const result = await resToJson(predictRes);

            // 2. Fetch explanation factors
            const explainRes = await fetch("/api/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!explainRes.ok) throw new Error("Explanation API Error");
            const explanation = await resToJson(explainRes);

            // 3. Update Results Dashboard UI
            updateDashboardUI(result, explanation);

            // 4. Save and Add to session history
            addToHistory(data, result, explanation);

        } catch (error) {
            console.error("Clinical evaluation failed:", error);
            alert("Error: Unable to complete patient evaluation. Please ensure backend is running.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = origBtnText;
        }
    });

    const resToJson = async (response) => {
        const text = await response.text();
        return JSON.parse(text);
    };

    // -------------------------------------------------------------------------
    // Update Dashboard UI Elements
    // -------------------------------------------------------------------------
    const updateDashboardUI = (result, explanation) => {
        const prob = result.risk_probability;
        const percent = Math.round(prob * 100);
        
        // Animate circular gauge
        riskPercent.textContent = `${percent}%`;
        const strokeOffset = gaugeCircumference * (1 - prob);
        gaugeFill.style.strokeDashoffset = strokeOffset;

        // Reset indicator classes
        statusIndicator.className = "status-indicator";
        statusIcon.className = "fa-solid";
        
        // Define statuses, icon tags, text and descriptions
        if (result.risk_category === "Low") {
            statusIndicator.classList.add("status-low");
            statusIcon.classList.add("fa-circle-check");
            statusText.textContent = "Low Risk Profile";
            gaugeFill.style.stroke = "var(--success)";
            statusDesc.textContent = "The biochemistry markers fall within low-risk ranges. Regular health check-ups and monitoring are recommended.";
        } else if (result.risk_category === "Moderate") {
            statusIndicator.classList.add("status-moderate");
            statusIcon.classList.add("fa-circle-exclamation");
            statusText.textContent = "Moderate Risk Profile";
            gaugeFill.style.stroke = "var(--warning)";
            statusDesc.textContent = "Borders or minor enzyme elevations detected. Advise clinician review of dietary factors, metabolic health, or lifestyle adjustments.";
        } else {
            statusIndicator.classList.add("status-high");
            statusIcon.classList.add("fa-triangle-exclamation");
            statusText.textContent = "High Risk Detected";
            gaugeFill.style.stroke = "var(--danger)";
            statusDesc.textContent = "Elevated hepatic biomarkers (jaundice/cellular injury indicators) detected. Immediate clinical workup and consultation with a hepatologist are advised.";
        }

        // Render explanation (SHAP bar contributions)
        renderExplanations(explanation.contributions);
    };

    // -------------------------------------------------------------------------
    // Render Explainable AI Horizontal Bars
    // -------------------------------------------------------------------------
    const renderExplanations = (contributions) => {
        explainContainer.innerHTML = "";
        
        // Filter out dummy/gender variables that don't apply to reduce clutter
        const filtered = contributions.filter(item => {
            if (item.feature === 'Gender_Female' && item.value === 0) return false;
            if (item.feature === 'Gender_Male' && item.value === 0) return false;
            return true;
        });

        // Limit to top 6 factors with highest contribution magnitude
        const topFactors = filtered.slice(0, 6);

        topFactors.forEach(item => {
            const row = document.createElement("div");
            row.className = "xai-bar-row";
            
            // Format percentage representation (e.g. +12.5% or -3.1%)
            const absPct = (Math.abs(item.contribution) * 100).toFixed(1);
            const sign = item.contribution > 0 ? "+" : "-";
            const dirClass = item.contribution > 0 ? "increase" : "decrease";
            
            // Format display values
            let displayVal = item.value;
            if (item.feature.startsWith("Gender")) {
                displayVal = item.feature === "Gender_Female" ? "Female" : "Male";
            }

            row.innerHTML = `
                <div class="xai-bar-label">
                    <span class="xai-feature-name">${item.label}</span>
                    <span class="xai-feature-val">${displayVal} <span class="xai-bar-percentage ${dirClass}">${sign}${absPct}%</span></span>
                </div>
                <div class="xai-track">
                    <div class="xai-bar ${dirClass}" style="width: 0%"></div>
                </div>
            `;
            
            explainContainer.appendChild(row);
            
            // Animate bar expansion in micro-task
            setTimeout(() => {
                const bar = row.querySelector(".xai-bar");
                const barWidth = Math.min((Math.abs(item.contribution) / 0.5) * 100, 100);
                bar.style.width = `${Math.max(barWidth, 5)}%`;
            }, 50);
        });
    };

    // -------------------------------------------------------------------------
    // Session History Management
    // -------------------------------------------------------------------------
    const addToHistory = (inputs, result, explanation) => {
        const record = {
            id: 'eval_' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            doctor: doctorSession ? doctorSession.username : "Dr. Sarah Mitchell, MD",
            inputs: inputs,
            result: result,
            explanation: explanation
        };
        
        sessionHistory.unshift(record);
        renderHistoryTable();
    };

    const renderHistoryTable = () => {
        if (sessionHistory.length === 0) {
            historyTbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-table-state">No assessments conducted in this session yet.</td>
                </tr>
            `;
            return;
        }

        historyTbody.innerHTML = "";
        sessionHistory.forEach(record => {
            const tr = document.createElement("tr");
            const inp = record.inputs;
            const res = record.result;
            
            const probPct = Math.round(res.risk_probability * 100) + "%";

            tr.innerHTML = `
                <td>${record.timestamp}</td>
                <td><strong>${inp.patient_name || "Patient"}</strong> <br><small style="color:var(--text-muted)">${inp.patient_id || ""}</small></td>
                <td>${inp.Age} Y, ${inp.Gender}</td>
                <td>${inp.Total_Bilirubin.toFixed(1)}</td>
                <td>${inp.Alkaline_Phosphotase}</td>
                <td>${inp.Alamine_Aminotransferase} / ${inp.Aspartate_Aminotransferase}</td>
                <td>${inp.Albumin_and_Globulin_Ratio ? inp.Albumin_and_Globulin_Ratio.toFixed(2) : "N/A"}</td>
                <td><strong>${probPct}</strong></td>
                <td><span class="history-status ${res.risk_category}">${res.risk_category}</span></td>
                <td>
                    <button class="action-btn" data-id="${record.id}">
                        <i class="fa-solid fa-file-medical"></i> Report
                    </button>
                </td>
            `;

            // Action button listener
            tr.querySelector(".action-btn").addEventListener("click", () => {
                openDetailsModal(record);
            });

            historyTbody.appendChild(tr);
        });
    };

    // -------------------------------------------------------------------------
    // Modal Management (Detailed Report View)
    // -------------------------------------------------------------------------
    const openDetailsModal = (record) => {
        const inp = record.inputs;
        const res = record.result;
        const explain = record.explanation;

        const probPercent = Math.round(res.risk_probability * 100) + "%";

        // Generate feature breakdown HTML
        let factorRowsHtml = "";
        explain.contributions.forEach(item => {
            if (item.feature === 'Gender_Female' && item.value === 0) return "";
            if (item.feature === 'Gender_Male' && item.value === 0) return "";
            
            const pct = (item.contribution * 100).toFixed(1);
            const sign = item.contribution > 0 ? "+" : "";
            const textClass = item.contribution > 0 ? "increase" : "decrease";

            factorRowsHtml += `
                <div class="modal-summary-box">
                    <h4>${item.label}</h4>
                    <p>${item.value} <span class="xai-bar-percentage ${textClass}">(${sign}${pct}% Risk contribution)</span></p>
                </div>
            `;
        });

        modalBodyContent.innerHTML = `
            <div class="modal-grid">
                <div class="modal-summary-box">
                    <h4>Patient Profile</h4>
                    <p style="font-size: 15px; color: #ffffff;">${inp.patient_name || "Patient"} <span style="font-size: 12px; color: var(--primary-light)">(${inp.patient_id || "N/A"})</span></p>
                    <small style="color: var(--text-secondary);">${inp.Age} Years, ${inp.Gender}</small>
                </div>
                <div class="modal-summary-box">
                    <h4>Evaluating Clinician</h4>
                    <p style="font-size: 14px;">${record.doctor || "Dr. Sarah Mitchell, MD"}</p>
                    <small style="color: var(--text-secondary);">${record.timestamp}</small>
                </div>
                <div class="modal-summary-box" style="grid-column: span 2; border-color: rgba(255, 255, 255, 0.15)">
                    <h4>Screening Results</h4>
                    <p style="font-size: 18px; color: ${res.risk_category === 'High' ? 'var(--danger)' : res.risk_category === 'Moderate' ? 'var(--warning)' : 'var(--success)'}">
                        ${probPercent} Probability — <strong>${res.risk_category} Risk Class</strong>
                    </p>
                </div>
            </div>
            
            <h3 style="font-size: 14px; font-family: var(--font-heading); margin-top: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">Biochemical Parameter Impact Analysis</h3>
            <div class="modal-grid" style="margin-top: 8px;">
                ${factorRowsHtml}
            </div>

            <p style="font-size: 10px; color: var(--text-muted); line-height: 1.4; margin-top: 10px; text-align: justify;">
                * This evaluation report summarizes key local deviations from model training standards in the Indian Liver Patient Dataset. It is optimized for clinical decision support. Values represent the isolated change in overall liver disease probability calculated using perturbation methods.
            </p>
        `;

        detailModal.classList.remove("hidden");
    };

    closeModalBtn.addEventListener("click", () => {
        detailModal.classList.add("hidden");
    });

    // Close modal when clicking outside contents
    window.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.classList.add("hidden");
        }
    });
});
