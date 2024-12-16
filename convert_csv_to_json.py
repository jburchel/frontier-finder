import pandas as pd
import json

# Convert UPGs CSV to JSON
upgs_df = pd.read_csv('data/existing_upgs_updated.csv')
upgs_json = upgs_df.to_dict(orient='records')
with open('static_version/js/upg_data.json', 'w') as f:
    json.dump(upgs_json, f, indent=2)

# Convert UUPGs CSV to JSON
uupgs_df = pd.read_csv('data/updated_uupg.csv')
uupgs_json = uupgs_df.to_dict(orient='records')
with open('static_version/js/uupg_data.json', 'w') as f:
    json.dump(uupgs_json, f, indent=2)
