
az group create --name "rg-aigenius-dev" --location "eastus2" 

az deployment group create --resource-group "rg-aigenius-dev" --template-file bicep/main.bicep --parameters "bicep/main.parameters.json"
