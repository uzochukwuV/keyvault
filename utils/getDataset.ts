import { config } from "@/config";
import { WarmStorageService, Synapse } from "@filoz/synapse-sdk";

// Returns the providerId and the dataset with the most used storage for the client
export const getDataset = async (synapse: Synapse, address: string) => {
  const warmStorageAddress = synapse.getWarmStorageAddress();
  const pdpVerifierAddress = synapse.getPDPVerifierAddress();
  
  if (!warmStorageAddress) {
    throw new Error(`No warm storage address configured for network: ${synapse.getNetwork()}`);
  }
  
  if (!pdpVerifierAddress) {
    throw new Error(`No PDP verifier address configured for network: ${synapse.getNetwork()}`);
  }
  
  const warmStorageService = await WarmStorageService.create(
    synapse.getProvider(),
    warmStorageAddress
  );
  let providerId;
  let mostUtilizedDataset;
  // Fetch all datasets for the client
  const allDatasets = await warmStorageService.getClientDataSetsWithDetails(
    address
  );

  // Filter datasets based on CDN usage
  const datasetsWithCDN = allDatasets.filter((dataset) => dataset.withCDN);
  const datasetsWithoutCDN = allDatasets.filter((dataset) => !dataset.withCDN);

  // Select datasets based on config
  const datasets = config.withCDN ? datasetsWithCDN : datasetsWithoutCDN;

  try {
    // Find the dataset with the highest currentRootCount
    mostUtilizedDataset = datasets.reduce((max, dataset) => {
      return dataset.currentPieceCount > max.currentPieceCount ? dataset : max;
    }, datasets[0]);
    if (mostUtilizedDataset) {
      [providerId] = await warmStorageService.getApprovedProviderIds(
        // mostUtilizedDataset.payee
      );
    }
  } catch (error) {
    console.error("Error getting providerId", error);
  }
  return { providerId, dataset: mostUtilizedDataset };
};
