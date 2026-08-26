<div align="center">
  <h1>🩺 Liver Disease Prediction System</h1>
  <p>A clinical web application and API for screening and risk assessment of chronic liver disease.</p>
</div>

---

## 📖 Overview

The **Liver Disease Prediction System** leverages Machine Learning to predict the probability of liver disease in patients based on their diagnostic data (such as age, gender, bilirubin levels, and liver enzyme counts). 

To ensure clinical trust, the system features **Explainable AI (XAI)** using SHAP (SHapley Additive exPlanations), providing transparent, feature-level explanations for *why* the model made a specific prediction.

## ✨ Key Features

- ⚡ **FastAPI Backend**: Built on a high-performance, asynchronous REST API architecture.
- 🧠 **Machine Learning Engine**: Powered by a robust Scikit-Learn/XGBoost classification model.
- 🔍 **Explainable AI (XAI)**: SHAP integration for local feature contributions and interpretability.
- 📊 **Interactive Dashboard**: A clean, responsive frontend interface for seamless patient data entry and risk visualization.
- 🔐 **Clinical Authentication**: Built-in mock authentication endpoints for secure clinical access.

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.8 or higher installed on your machine.

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone <your-repository-url>
cd "Liver Disease Prediction System"
```

### 2. Install Dependencies
Install the required Python packages:
```bash
pip install -r requirements.txt
```

### 3. Train the Model
*Note: If `model.joblib` is already present, you can skip this step.*
```bash
python train_model.py
```

### 4. Run the Server
Start the local FastAPI development server:
```bash
python run.py
```
*(Alternatively, run `uvicorn app:app --reload --host 127.0.0.1 --port 8000`)*

### 5. Access the Application
- **Frontend Dashboard**: Open `http://127.0.0.1:8000/` in your browser.
- **Swagger API Docs**: Open `http://127.0.0.1:8000/docs` to interact with the API endpoints directly.

---

## ☁️ Deployment Guide (Render)

Deploying this application to [Render](https://render.com/) is straightforward via the **Web Service** option.

1. **Push your code** to a GitHub repository.
2. Log into the **Render Dashboard** and click **New +** > **Web Service**.
3. **Connect** your GitHub repository.
4. Configure the Web Service with the following settings:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**. 

Once the build finishes, your Liver Disease Prediction System will be live!

---

## 📁 Project Structure

```text
├── app.py                     # Main FastAPI application and routing logic
├── train_model.py             # Machine Learning training pipeline script
├── run.py                     # Local development server runner
├── requirements.txt           # Python dependencies and versions
├── indian_liver_patient.csv   # Training dataset
├── static/                    # Frontend assets (HTML, CSS, JS)
└── README.md                  # Project documentation
```
