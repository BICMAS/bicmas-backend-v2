"use strict";

var _ScormCloudService = require("../services/ScormCloudService.js");
// src/scripts/setup-scorm-vault.js

async function setupVault() {
  try {
    const client = _ScormCloudService.ScormCloudService.init();
    const response = await client.post('/applications/configuration', {
      settingId: "LaunchAuthType",
      value: "vault"
    });
    console.log('Success! LaunchAuthType set to vault.');
    console.log('Response:', response.data);

    // Optional: verify current config
    const config = await client.get('/applications/configuration');
    console.log('Current config:', config.data);
  } catch (error) {
    console.error('Failed to set Vault mode:', error.response?.data || error.message);
  }
}
setupVault();