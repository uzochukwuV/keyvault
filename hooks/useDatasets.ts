import { WarmStorageService } from "@filoz/synapse-sdk/warm-storage";
import { useEthersSigner } from "@/hooks/useEthers";
import { useQuery } from "@tanstack/react-query";
import { EnhancedDataSetInfo, Synapse, PDPServer } from "@filoz/synapse-sdk";
import { useAccount } from "wagmi";
import { DataSet } from "@/types";

/**
 * Hook to fetch and manage datasets
 * @returns Query result containing datasets and their details
 */
export const useDatasets = () => {
  const signer = useEthersSigner();
  const { address } = useAccount();

  return useQuery({
    enabled: !!address,
    queryKey: ["datasets", address],
    queryFn: async () => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");

      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
      });

      // Initialize Pandora service
      const warmStorageService = await WarmStorageService.create(
        synapse.getProvider(),
        synapse.getWarmStorageAddress(),
        // synapse.getPDPVerifierAddress()
      );

      // Fetch providers and datasets in parallel
      const [providers, datasets] = await Promise.all([
        warmStorageService.getApprovedProviderIds(),
        warmStorageService.getClientDataSetsWithDetails(address),
      ]);
      console.log(providers, datasets)

      const providerInfo = await Promise.all(providers.map(async (p)=>{
        return await synapse.getProviderInfo(p); 
      }))
      // Create a map of provider URLs for quick lookup
      const providerUrlMap = new Map(
        (await providerInfo).map(( provider) => [
          provider.serviceProvider.toLowerCase(),
          provider.id,
        ])
      );

      console.log(providerUrlMap)
      console.log("holla u all 1")

      // Fetch dataset details in parallel with proper error handling
      const datasetDetailsPromises = datasets.map(
        async (dataset: EnhancedDataSetInfo) => {
          console.log(dataset)
          console.log("holla u all 2")
          // const serviceURL = providerUrlMap.get(dataset.serviceProvider.toLowerCase());
          console.log("holla u all 3")
          // console.log(serviceURL)
          // Find the full provider details
          const provider = providerInfo.find(
            (p) =>
              p.serviceProvider.toLowerCase() === dataset.payee.toLowerCase()
          );
          console.log("holla u all 4")
          console.log(provider)
          try {
            console.log("holla u all")
            const pdpServer = new PDPServer(null,  "https://calibnet.pspsps.io/");
            const data = await pdpServer.getDataSet(
              dataset.pdpVerifierDataSetId
            );
            console.log(data)
            return {
              ...dataset,
              provider: provider,
              data,
            } as DataSet;
          } catch (error) {
            console.error(
              "Error getting dataset data for dataset : ",
              dataset.pdpVerifierDataSetId,
              error
            );
            return {
              ...dataset,
            } as DataSet;
          }
        }
      );

      const datasetDataResults = await Promise.all(datasetDetailsPromises);

      // Combine datasets with their details
      const datasetsWithDetails = datasets.map((dataset) => {
        const dataResult = datasetDataResults.find(
          (result) =>
            result.pdpVerifierDataSetId === dataset.pdpVerifierDataSetId
        );
        return dataResult;
      });
      return { datasets: datasetsWithDetails };
    },
    retry: false,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};
