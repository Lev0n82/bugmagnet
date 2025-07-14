const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

async function main() {
  const credential = new DefaultAzureCredential();
  const keyVaultName = "dev-qa-automation-app";
  const url = "https://" + keyVaultName + ".vault.azure.net";
  const client = new SecretClient(url, credential);

  // Create a secret
  const secretName = "uft";
  const result = await client.setSecret(secretName, "");
  console.log("result: ", result);

  // Read the secret we created
  const secret = await client.getSecret(secretName);
  console.log("secret: ", secret);

  // Update the secret with different attributes
  const updatedSecret = await client.updateSecretProperties(secretName, result.properties.version, {
    enabled: false
  });
  console.log("updated secret: ", updatedSecret);

  // Delete the secret
  await client.beginDeleteSecret(secretName);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
