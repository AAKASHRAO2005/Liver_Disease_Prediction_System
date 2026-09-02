import os
import joblib
import numpy as np
import pandas as pd
import shap
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


# Define FastAPI application
app = FastAPI(
    title="Liver Disease Prediction System API",
    description="API for screening and risk assessment of chronic liver disease.",
    version="1.0.0"
)

# Load model data
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.joblib")
if not os.path.exists(model_path):
    raise RuntimeError(f"Trained model not found at {model_path}. Please run train_model.py first.")

print(f"Loading pre-trained model pipeline from {model_path}...")
model_data = joblib.load(model_path)
model = model_data['model']
scaler = model_data['scaler']
imputer_value = model_data['imputer_value']
feature_cols = model_data['feature_cols']
model_name = model_data.get('model_name', 'RandomForest Classifier')
model_metrics = model_data.get('metrics', {})

print(f"Loaded {model_name} successfully.")

# Initialize SHAP explainer
print("Initializing SHAP Explainer...")
background_data = model_data.get('background_data', None)
explainer_type = "None"
explainer = None

try:
    # Use TreeExplainer for tree models (Random Forest, Extra Trees, XGBoost)
    model_type_name = type(model).__name__
    if "RandomForest" in model_type_name or "XGB" in model_type_name or "ExtraTrees" in model_type_name:
        explainer = shap.TreeExplainer(model)
        explainer_type = "TreeExplainer"
    else:
        # Fallback to general Explainer
        if background_data is not None:
            explainer = shap.Explainer(model.predict_proba, background_data)
        else:
            explainer = shap.Explainer(model.predict_proba)
        explainer_type = "Explainer"
except Exception as e:
    print(f"Error initializing default SHAP Explainer: {e}. Falling back to KernelExplainer.")
    if background_data is not None:
        explainer = shap.KernelExplainer(model.predict_proba, background_data)
    else:
        explainer = shap.KernelExplainer(model.predict_proba, np.zeros((1, len(feature_cols))))
    explainer_type = "KernelExplainer"

print(f"SHAP Explainer initialized using {explainer_type}.")


# Auth Pydantic Model
class LoginData(BaseModel):
    username: str
    password: str

# Input Pydantic Model
class PatientData(BaseModel):
    patient_name: Optional[str] = Field("Anonymous Patient", description="Full name of the patient")
    patient_id: Optional[str] = Field(None, description="Patient Medical Record Number (MRN)")
    Age: int = Field(..., ge=1, le=120, description="Age of the patient (1-120)")
    Gender: str = Field(..., description="Gender of the patient ('Male' or 'Female')")
    Total_Bilirubin: float = Field(..., ge=0.1, le=100.0, description="Total Bilirubin (mg/dL)")
    Alkaline_Phosphotase: int = Field(..., ge=10, le=3000, description="Alkaline Phosphotase (U/L)")
    Alamine_Aminotransferase: int = Field(..., ge=1, le=2500, description="Alamine Aminotransferase / ALT (U/L)")
    Aspartate_Aminotransferase: int = Field(..., ge=1, le=5000, description="Aspartate Aminotransferase / AST (U/L)")
    Total_Protiens: float = Field(..., ge=1.0, le=10.0, description="Total Proteins (g/dL)")
    Albumin: float = Field(..., ge=0.5, le=6.0, description="Albumin (g/dL)")
    Albumin_and_Globulin_Ratio: Optional[float] = Field(None, ge=0.1, le=5.0, description="Albumin and Globulin Ratio")

def preprocess_patient(data: PatientData):
    # Handle gender encoding
    gender_lower = data.Gender.strip().lower()
    if gender_lower not in ['male', 'female']:
        raise HTTPException(status_code=400, detail="Gender must be 'Male' or 'Female'")
        
    gender_female = 1 if gender_lower == 'female' else 0
    gender_male = 1 if gender_lower == 'male' else 0
    
    # Handle missing ratio
    ratio = data.Albumin_and_Globulin_Ratio
    if ratio is None or np.isnan(ratio):
        ratio = imputer_value
        
    row = {
        'Age': data.Age,
        'Gender_Female': gender_female,
        'Gender_Male': gender_male,
        'Total_Bilirubin': data.Total_Bilirubin,
        'Alkaline_Phosphotase': data.Alkaline_Phosphotase,
        'Alamine_Aminotransferase': data.Alamine_Aminotransferase,
        'Aspartate_Aminotransferase': data.Aspartate_Aminotransferase,
        'Total_Protiens': data.Total_Protiens,
        'Albumin': data.Albumin,
        'Albumin_and_Globulin_Ratio': ratio
    }
    
    df_row = pd.DataFrame([row], columns=feature_cols)
    return df_row

@app.post("/api/login")
def login(data: LoginData):
    """Clinical authentication endpoint for doctors."""
    username = data.username.strip()
    pwd = data.password.strip()
    
    # Validate credentials (supports demo account or any doctor login)
    if username.lower() == "doctor@clinical.org" and pwd == "admin":
        return {
            "success": True,
            "token": "mock-clinical-token-12345",
            "username": "Dr. Sarah Mitchell, MD",
            "department": "Hepatology & Gastroenterology",
            "hospital": "Apex Memorial Clinical Center",
            "license_id": "MED-99482-CL"
        }
    elif len(username) >= 3 and len(pwd) >= 3:
        doc_name = username.split('@')[0].capitalize()
        if not doc_name.startswith("Dr."):
            doc_name = f"Dr. {doc_name}"
        return {
            "success": True,
            "token": f"clinical-token-{abs(hash(username))}",
            "username": doc_name,
            "department": "Internal Medicine / Hepatology",
            "hospital": "Clinical Health Center",
            "license_id": f"MED-{abs(hash(username)) % 90000 + 10000}"
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid clinical credentials. Please provide valid Doctor credentials.")

@app.get("/api/info")
def get_model_info():
    """Returns info about the loaded model and its training metrics."""
    return {
        "model_name": model_name,
        "features": feature_cols,
        "metrics": model_metrics
    }

@app.post("/api/predict")
def predict_risk(data: PatientData):
    """Predicts the probability of liver disease for a given patient profile."""
    df_row = preprocess_patient(data)
    scaled_row = scaler.transform(df_row)
    
    # Predict probability and class
    prob = float(model.predict_proba(scaled_row)[0, 1])
    pred_class = int(model.predict(scaled_row)[0])
    
    # Define risk category based on threshold-based clinical buckets
    # Low: < 35%, Moderate: 35% - 60%, High: > 60%
    if prob < 0.35:
        risk_category = "Low"
    elif prob < 0.60:
        risk_category = "Moderate"
    else:
        risk_category = "High"
        
    return {
        "risk_probability": prob,
        "prediction_class": pred_class,
        "risk_category": risk_category,
        "has_disease": True if pred_class == 1 else False
    }

@app.post("/api/explain")
def explain_risk(data: PatientData):
    """Computes the local feature contribution (SHAP values) for a patient profile."""
    df_row = preprocess_patient(data)
    scaled_row = scaler.transform(df_row)
    
    # Predict base probability
    base_prob = float(model.predict_proba(scaled_row)[0, 1])
    
    # Compute SHAP values
    try:
        shap_out = explainer.shap_values(scaled_row)
        
        # Format depending on return format:
        if isinstance(shap_out, list):
            shap_values = shap_out[1][0]
        elif len(shap_out.shape) == 3:
            shap_values = shap_out[0, :, 1]
        elif len(shap_out.shape) == 2:
            shap_values = shap_out[0]
        else:
            shap_values = shap_out
    except Exception as e:
        print(f"Error computing SHAP values: {e}. Falling back to perturbation method.")
        # Fallback to perturbation method
        shap_values = []
        scaled_row_1d = scaled_row[0]
        for i, col in enumerate(feature_cols):
            perturbed_scaled = scaled_row_1d.copy()
            perturbed_scaled[i] = 0.0
            perturbed_prob = float(model.predict_proba([perturbed_scaled])[0, 1])
            shap_values.append(base_prob - perturbed_prob)
        shap_values = np.array(shap_values)
        
    # Friendly labels for presentation
    feature_labels = {
        'Age': 'Age',
        'Gender_Female': 'Gender (Female)',
        'Gender_Male': 'Gender (Male)',
        'Total_Bilirubin': 'Total Bilirubin',
        'Alkaline_Phosphotase': 'Alkaline Phosphotase (ALP)',
        'Alamine_Aminotransferase': 'Alamine Aminotransferase (ALT/SGPT)',
        'Aspartate_Aminotransferase': 'Aspartate Aminotransferase (AST/SGOT)',
        'Total_Protiens': 'Total Proteins',
        'Albumin': 'Albumin',
        'Albumin_and_Globulin_Ratio': 'A/G Ratio'
    }
    
    contributions = []
    for i, col in enumerate(feature_cols):
        contrib = float(shap_values[i])
        raw_val = df_row.iloc[0][col]
        
        contributions.append({
            "feature": col,
            "label": feature_labels.get(col, col),
            "value": float(raw_val),
            "contribution": contrib,
            "impact": "increase" if contrib > 0.0 else "decrease"
        })
        
    # Sort contributions by magnitude of impact
    contributions = sorted(contributions, key=lambda x: abs(x['contribution']), reverse=True)
    
    return {
        "risk_probability": base_prob,
        "contributions": contributions
    }


# Mount static files directory
# Note: In production we ensure the static directory exists before mounting
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_index():
    """Serves the main frontend dashboard."""
    index_path = "static/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        return {"message": "Welcome to Liver Disease Prediction System API. Please create index.html in the static folder."}
