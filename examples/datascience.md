# Skill: Data Science & ML (Python, Pandas & PyTorch)

> This file represents project-level coding standards for dataset analysis, data engineering pipelines, and ML modeling. Apply these rules to research and pipeline tasks.

## Technology Stack
- **Language:** Python 3.10+
- **Data Wrangling:** Pandas, NumPy
- **Machine Learning:** Scikit-Learn, XGBoost
- **Deep Learning:** PyTorch
- **Visuals:** Matplotlib, Seaborn

## Code Structure & Conventions
- **Naming:** Follow PEP 8 style guide (snake_case for variables/functions, PascalCase for classes).
- **Environment:** Maintain clean local dependencies using `conda` environments or `poetry` lockfiles.
- **Type Hints:** Declare input and output types on all function signatures to prevent runtime schema bugs:
  ```python
  import pandas as pd

  def process_features(df: pd.DataFrame) -> pd.DataFrame:
      # Feature engineering logic
      return df
  ```

## Data Engineering & Pandas Standards
- **Chained Assignments:** Avoid setting values on slices to prevent `SettingWithCopyWarning`. Use `.loc[row, col]` explicitly.
- **Vectorization:** Re-write looping logic using vectorized pandas/numpy functions. Avoid row-by-row iteration (`.iterrows()`) on large datasets.
- **Reproducibility:** Fix random states globally (`np.random.seed`, torch seed, and model parameters like `random_state=42`) to guarantee identical training iterations.

## Notebook vs Pipeline Code
- **Notebooks:** Use Jupyter notebooks primarily for initial exploratory data analysis (EDA), plotting, and experiment validation.
- **Production Scripts:** Refactor stable models, preprocessing functions, and custom classes into structured python packages (`.py` files) before pipeline deployment.

---

*This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant.*
