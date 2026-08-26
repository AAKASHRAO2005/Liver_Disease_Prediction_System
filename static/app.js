document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    let sessionHistory = [];
    const gaugeCircumference = 534; // 2 * Math.PI * 85 (approx)

    // -------------------------------------------------------------------------
    // DOM Elements
    // -------------------------------------------------------------------------
    // Navigation items
    const navItems = {
        dashboard: document.getElementById("nav-dashboard"),
        history: document.getElementById("nav-history"),
        about: document.getElementById("nav-about")
    };
    
    // Page sections
    const sections = {
        dashboard: document.getElementById("section-dashboard"),
        history: document.getElementById("section-history"),
        about: document.getElementById("section-about")
    };

    // Form inputs and bubbles
    const form = document.getElementById("screening-form");
    const inputs = [
        { el: document.getElementById("input-total-bilirubin"), bubble: document.getElementById("val-total-bilirubin"), suffix: " mg/dL" },
        { el: document.getElementById("input-alkaline-phosphatase"), bubble: document.getElementById("val-alkaline-phosphatase"), suffix: " U/L" },
        { el: document.getElementById("input-alt"), bubble: document.getElementById("val-alt"), suffix: " U/L" },
        { el: document.getElementById("input-ast"), bubble: document.getElementById("val-ast"), suffix: " U/L" },
        { el: document.getElementById("input-total-proteins"), bubble: document.getElementById("val-total-proteins"), suffix: " g/dL" },
        { el: document.getElementById("input-albumin"), bubble: document.getElementById("val-albumin"), suffix: " g/dL" },
        { el: document.getElementById("input-ag-ratio"), bubble: document.getElementById("val-ag-ratio"), suffix: "" }
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

    navItems.dashboard.addEventListener("click", (e) => { e.preventDefault(); switchSection("dashboard"); });
    navItems.history.addEventListener("click", (e) => { e.preventDefault(); switchSection("history"); });
    navItems.about.addEventListener("click", (e) => { e.preventDefault(); switchSection("about"); });

    // -------------------------------------------------------------------------
    // Event Listeners: Range Sliders (Value Bubbles)
    // -------------------------------------------------------------------------
    inputs.forEach(input => {
        if (input.el && input.bubble) {
            const updateBubble = () => {
                input.bubble.textContent = input.el.value + input.suffix;
            };
            input.el.addEventListener("input", updateBubble);
            updateBubble(); // Init on load
        }
    });

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
        // We keep age, bilirubin, enzymes, proteins, A/G ratio, and the active gender column.
        const filtered = contributions.filter(item => {
            if (item.feature === 'Gender_Female' && item.value === 0) return false;
            if (item.feature === 'Gender_Male' && item.value === 0) return false;
            return true;
        });

        // Limit to top 5 factors with highest contribution magnitude
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
                // Limit width relative to a max contribution of 50%
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
            id: 'patient_' + Date.now(),
            timestamp: new Date().toLocaleTimeString(),
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
                <td>${inp.Age}</td>
                <td>${inp.Gender}</td>
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
            const desc = item.contribution > 0 ? "Elevated Risk Impact" : "Protective/Low-risk Impact";

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
                    <h4>Patient Demographics</h4>
                    <p>${inp.Age} Years, ${inp.Gender}</p>
                </div>
                <div class="modal-summary-box">
                    <h4>Evaluation Time</h4>
                    <p>${record.timestamp}</p>
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
