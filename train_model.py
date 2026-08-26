import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, StackingClassifier, ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, recall_score, precision_score, f1_score, roc_auc_score, confusion_matrix
from xgboost import XGBClassifier
from imblearn.combine import SMOTEENN
import joblib


def train():
    # 1. Load data
    data_path = r"e:\Liver Disease Prediction System\indian_liver_patient.csv"
    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)

    # 2. Preprocess missing values: Median Imputation by class (Dataset column: 1 or 2)
    medians_by_class = df.groupby('Dataset')['Albumin_and_Globulin_Ratio'].median()
    df['Albumin_and_Globulin_Ratio'] = df.apply(
        lambda row: medians_by_class[row['Dataset']] if pd.isnull(row['Albumin_and_Globulin_Ratio']) else row['Albumin_and_Globulin_Ratio'],
        axis=1
    )
    overall_median = df['Albumin_and_Globulin_Ratio'].median()


    # 3. Categorical encoding for Gender
    df['Gender_Female'] = (df['Gender'] == 'Female').astype(int)
    df['Gender_Male'] = (df['Gender'] == 'Male').astype(int)

    # 4. Map Dataset targets to binary format (1: Liver Disease, 2: Healthy) -> (1: Liver Disease, 0: Healthy)
    y = df['Dataset'].map({1: 1, 2: 0})

    # 5. Feature columns
    feature_cols = [
        'Age', 'Gender_Female', 'Gender_Male', 'Total_Bilirubin', 
        'Alkaline_Phosphotase', 'Alamine_Aminotransferase', 
        'Aspartate_Aminotransferase', 'Total_Protiens', 'Albumin', 
        'Albumin_and_Globulin_Ratio'
    ]
    X = df[feature_cols]

    # 6. Train-test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    # We will test multiple setups to see which one performs best on the validation set.
    models_to_test = {}

    # Define base scalers and datasets
    # Dataset 1: Standard scaling + SMOTE-ENN
    smote_enn = SMOTEENN(random_state=42)
    X_train_sm, y_train_sm = smote_enn.fit_resample(X_train, y_train)
    
    scaler_sm = StandardScaler()
    X_train_sm_scaled = scaler_sm.fit_transform(X_train_sm)
    X_test_sm_scaled = scaler_sm.transform(X_test)

    # Dataset 2: Standard scaling (No SMOTE)
    scaler_no_sm = StandardScaler()
    X_train_scaled = scaler_no_sm.fit_transform(X_train)
    X_test_scaled = scaler_no_sm.transform(X_test)

    # We will train different configurations:
    # 1. Random Forest with SMOTE-ENN
    rf_sm = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42)
    rf_sm.fit(X_train_sm_scaled, y_train_sm)
    models_to_test['RF_SMOTE_ENN'] = (rf_sm, scaler_sm, X_test_sm_scaled)

    # 2. XGBoost with SMOTE-ENN
    xgb_sm = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42, eval_metric='logloss')
    xgb_sm.fit(X_train_sm_scaled, y_train_sm)
    models_to_test['XGB_SMOTE_ENN'] = (xgb_sm, scaler_sm, X_test_sm_scaled)

    # 3. RF without SMOTE (using class_weight='balanced')
    rf_bal = RandomForestClassifier(n_estimators=200, max_depth=6, class_weight='balanced', random_state=42)
    rf_bal.fit(X_train_scaled, y_train)
    models_to_test['RF_Balanced'] = (rf_bal, scaler_no_sm, X_test_scaled)

    # 4. XGBoost without SMOTE (using scale_pos_weight for imbalance)
    ratio = (y_train == 0).sum() / (y_train == 1).sum() # ratio of negative to positive
    xgb_bal = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, scale_pos_weight=ratio, random_state=42, eval_metric='logloss')
    xgb_bal.fit(X_train_scaled, y_train)
    models_to_test['XGB_Balanced'] = (xgb_bal, scaler_no_sm, X_test_scaled)

    # 5. Stacking with SMOTE-ENN
    estimators = [
        ('rf', RandomForestClassifier(n_estimators=150, max_depth=6, random_state=42)),
        ('xgb', XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42, eval_metric='logloss'))
    ]
    stack_sm = StackingClassifier(estimators=estimators, final_estimator=LogisticRegression(random_state=42))
    stack_sm.fit(X_train_sm_scaled, y_train_sm)
    models_to_test['Stack_SMOTE_ENN'] = (stack_sm, scaler_sm, X_test_sm_scaled)

    # Evaluate all models
    best_score = -1
    best_model_name = None
    best_model = None
    best_scaler = None
    best_metrics = {}

    print("\n--- Model Comparison Results ---")
    for name, (model, scaler, X_t_scaled) in models_to_test.items():
        y_pred = model.predict(X_t_scaled)
        y_prob = model.predict_proba(X_t_scaled)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        spec = tn / (tn + fp)

        print(f"\nModel: {name}")
        print(f"  Accuracy:    {acc:.4f}")
        print(f"  Recall (Sens):{rec:.4f}  (TP: {tp}, FN: {fn})")
        print(f"  Specificity: {spec:.4f}  (TN: {tn}, FP: {fp})")
        print(f"  F1-Score:    {f1:.4f}")
        print(f"  AUC-ROC:     {auc:.4f}")

        # Choose best model based on F1-Score + AUC-ROC
        score = (f1 + auc) / 2
        if score > best_score:
            best_score = score
            best_model_name = name
            best_model = model
            best_scaler = scaler
            best_metrics = {
                'accuracy': acc,
                'recall': rec,
                'specificity': spec,
                'precision': prec,
                'f1': f1,
                'auc': auc
            }

    print(f"\n>>> Selected Best Model: {best_model_name} with compound score: {best_score:.4f} <<<")
    
    # Save the selected model
    model_data = {
        'model': best_model,
        'scaler': best_scaler,
        'imputer_value': overall_median,
        'feature_cols': feature_cols,
        'metrics': best_metrics,
        'model_name': best_model_name,
        'background_data': X_train_sm_scaled[:100] if 'SMOTE_ENN' in best_model_name else X_train_scaled[:100]
    }
    
    output_path = r"e:\Liver Disease Prediction System\model.joblib"
    joblib.dump(model_data, output_path)
    print(f"Saved best model pipeline to: {output_path}")

if __name__ == "__main__":
    train()
