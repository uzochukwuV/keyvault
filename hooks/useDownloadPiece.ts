import { useMutation } from "@tanstack/react-query";
import { Synapse } from "@filoz/synapse-sdk";
import { useEthersSigner } from "@/hooks/useEthers";
import { useAccount } from "wagmi";
import { config } from "@/config";

/**
 * Hook to download a piece from the Filecoin network using Synapse.
 */
export const useDownloadPiece = (commp: string, filename: string) => {
  const signer = useEthersSigner();
  const { address, chainId } = useAccount();
  const mutation = useMutation({
    mutationKey: ["download-piece", address, commp, filename],
    mutationFn: async () => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");

      // 1) Create Synapse instance
      const synapse = await Synapse.create({
        provider: signer.provider,
        withCDN: config.withCDN,
      });

      // 2) Download file
      const uint8ArrayBytes = await synapse.storage.download(commp);

      const file = new File([uint8ArrayBytes as BlobPart], filename);

      // Download file to browser
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      return file;
    },
    onSuccess: () => {
      console.log("File downloaded", filename);
    },
    onError: (error) => {
      console.error("Error downloading piece", error);
    },
  });

  return {
    downloadMutation: mutation,
  };
};
