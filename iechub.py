import json
import csv

# Load the JSON file
with open("stations.json", "r", encoding="utf-8") as f:
    station_map = json.load(f)  # {"1": "station 1", "2": "station 2", ...}

# Reverse the dictionary to match names to IDs
name_to_id = {v: k for k, v in station_map.items()}  # {"station 1": "1", "station 2": "2", ...}

# Open the CSV file and process it
input_csv = "stations.csv"  # Change this to your actual CSV file
output_csv = "stations_with_ids.csv"

with open(input_csv, "r", encoding="utf-8") as infile, open(output_csv, "w", encoding="utf-8", newline="") as outfile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames + ["iechub_id"]  # Add the new 'id' column
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)

    writer.writeheader()
    for row in reader:
        station_name = row["name"].strip()
        row["iechub_id"] = name_to_id.get(station_name, "")  # Assign ID or leave blank
        writer.writerow(row)

print(f"Updated CSV saved as {output_csv}")