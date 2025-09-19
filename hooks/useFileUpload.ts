import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Synapse } from "@filoz/synapse-sdk";
import { useEthersSigner } from "@/hooks/useEthers";
import { useConfetti } from "@/hooks/useConfetti";
import { useAccount } from "wagmi";
import { preflightCheck } from "@/utils/preflightCheck";
import { getDataset } from "@/utils/getDataset";
import { config } from "@/config";

export type UploadedInfo = {
  fileName?: string;
  fileSize?: number;
  pieceCid?: string;
  txHash?: string;
};

/**
 * Hook to upload a file to the Filecoin network using Synapse.
 */
export const useFileUpload = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [uploadedInfo, setUploadedInfo] = useState<UploadedInfo | null>(null);

  const signer = useEthersSigner();
  const { triggerConfetti } = useConfetti();
  const { address, chainId } = useAccount();
  const mutation = useMutation({
    mutationKey: ["file-upload", address, chainId],
    mutationFn: async (file: File) => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");
      setProgress(0);
      setUploadedInfo(null);
      setStatus("🔄 Initializing file upload to Filecoin...");

      // 1) Convert File → ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      // 2) Convert ArrayBuffer → Uint8Array
      const uint8ArrayBytes = new Uint8Array(arrayBuffer);

      // 3) Create Synapse instance
      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
        withCDN: config.withCDN,
      });

      // 4) Get dataset
      const { providerId } = await getDataset(synapse, address);
      // 5) Check if we have a dataset
      const datasetExists = !!providerId;
      // Include proofset creation fee if no proofset exists
      const includeDatasetCreationFee = !datasetExists;

      // 6) Check if we have enough USDFC to cover the storage costs and deposit if not
      setStatus("💰 Checking USDFC balance and storage allowances...");
      setProgress(5);
      await preflightCheck(
        file,
        synapse,
        includeDatasetCreationFee,
        setStatus,
        setProgress
      );

      setStatus("🔗 Setting up storage service and dataset...");
      setProgress(25);

      // 7) Validate provider before creating storage service
      if (providerId) {
       
        const provider = await synapse.getProviderInfo(providerId);
        if (!provider || !provider.registeredAt) {
          throw new Error(`Storage provider ${providerId} is not available or inactive`);
        }
        setStatus(`✅ Validated storage provider: ${provider.serviceProvider || 'Unknown'}`);
      }

      // 8) Create storage service with enhanced error handling
      const storageService = await synapse.createStorage({
        providerId: 2,
        forceCreateDataSet: true,
        // dataSetId: 25,
        uploadBatchSize: 5,
        callbacks: {
          
          onDataSetResolved: (info) => {
            console.log("Dataset resolved:", info);
            setStatus("🔗 Existing dataset found and resolved");
            setProgress(30);
          },
          onDataSetCreationStarted: (transactionResponse, statusUrl) => {
            console.log("Dataset creation started:", transactionResponse);
            console.log("Dataset creation status URL:", statusUrl);
            setStatus(`🏗️ Creating new dataset on blockchain... (tx: ${transactionResponse?.hash?.slice(0, 8)}...)`);
            setProgress(35);
          },
          // onDataSetCreationError: (error) => {
          //   console.error("Dataset creation failed:", error);
          //   throw new Error(`Dataset creation failed: ${error.message || 'Unknown error'}`);
          // },
          onDataSetCreationProgress: (status) => {

            console.log("Dataset creation progress:", status);
            if (status.transactionSuccess) {
              setStatus(`⛓️ Dataset transaction confirmed on chain`);
              setProgress(45);
            }
            if (status.serverConfirmed) {
              setStatus(
                `🎉 Dataset ready! (${Math.round(status.elapsedMs / 1000)}s)`
              );
              setProgress(50);
            }
          },
          onProviderSelected: (provider) => {
            console.log("Storage provider selected:", provider);
            setStatus(`🏪 Storage provider selected`);
          },
        },
      });

      setStatus("📁 Uploading file to storage provider...");
      setProgress(55);
      // 8) Upload file to storage provider
      const { pieceCid } = await storageService.upload(uint8ArrayBytes, {
        onUploadComplete: (piece) => {
          setStatus(
            `📊 File uploaded! Signing msg to add pieces to the dataset`
          );
          setUploadedInfo((prev) => ({
            ...prev,
            fileName: file.name,
            fileSize: file.size,
            pieceCid: piece.toV1().toString(),
          }));


          
          setProgress(80);
        },
        onPieceAdded: (transactionResponse) => {
          setStatus(
            `🔄 Waiting for transaction to be confirmed on chain${
              transactionResponse ? `(txHash: ${transactionResponse.hash})` : ""
            }`
          );
          if (transactionResponse) {
            console.log("Transaction response:", transactionResponse);
            setUploadedInfo((prev) => ({
              ...prev,
              txHash: transactionResponse?.hash,
            }));
          }
        },
        onPieceConfirmed: (pieceIds) => {
          setStatus("🌳 Data pieces added to dataset successfully");
          setProgress(90);
        },
      });

      setProgress(95);
      setUploadedInfo((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: file.size,
        pieceCid: pieceCid.toV1().toString(),
      }));
    },
    onSuccess: () => {
      setStatus("🎉 File successfully stored on Filecoin!");
      setProgress(100);
      triggerConfetti();
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      setStatus(`❌ Upload failed: ${error.message || "Please try again"}`);
      setProgress(0);
    },
  });

  const handleReset = () => {
    setProgress(0);
    setUploadedInfo(null);
    setStatus("");
  };

  return {
    uploadFileMutation: mutation,
    progress,
    uploadedInfo,
    handleReset,
    status,
  };
};
