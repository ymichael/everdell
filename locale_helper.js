// Made by ChatGPT. To copy missing keys from ru-RU to pt-BR run it like this:
// 
// node locale_helper.js public/locales/{ru-RU,pt-BR}/common.json

const fs = require('fs');
const path = require('path');

// Get arguments from the command line
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node script.js <path_to_file1.json> <path_to_file2.json>');
  process.exit(1);
}

const [filePath1, filePath2] = args.map(arg => path.resolve(arg));

// Helper function to load a JSON file
function loadJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading JSON file at ${filePath}:`, error);
    process.exit(1);
  }
}

// Helper function to save a JSON file
function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`File saved successfully at ${filePath}`);
  } catch (error) {
    console.error(`Error saving JSON file at ${filePath}:`, error);
  }
}

// Main function to add missing keys
function addMissingKeys() {
  const json1 = loadJSON(filePath1);
  const json2 = loadJSON(filePath2);

  const keys1 = Object.keys(json1);
  let modified = false;

  keys1.forEach((key) => {
    if (!(key in json2)) {
      json2[key] = key; // Set the key's name as its own value
      modified = true;
      console.log(`Added missing key: ${key}`);
    }
  });

  if (modified) {
    saveJSON(filePath2, json2);
  } else {
    console.log('No missing keys were found.');
  }
}

addMissingKeys();
