"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

// Sanctioned countries and regions based on your research
const SANCTIONED_COUNTRIES = [
  "AF", // Afghanistan
  "BY", // Belarus
  "CU", // Cuba
  "IR", // Iran
  "MM", // Myanmar (Burma)
  "KP", // North Korea
  "RU", // Russia
  "SY", // Syria
  "VE", // Venezuela
  "SO", // Somalia (cautionary)
  "LY", // Libya (cautionary)
];

// Sanctioned regions (these would need special handling based on IP ranges)
const SANCTIONED_REGIONS = [
  "Crimea",
  "Donetsk",
  "Kherson",
  "Luhansk",
  "Zaporizhzhia",
  "Transnistria",
];

// Context for access control
const AccessControlContext = createContext({
  isBlocked: false,
  isLoading: true,
  userCountry: null,
  userRegion: null,
  error: null,
  blockReason: null,
});

// Combined approach: try server-side first (to avoid CORS), fallback to external
const getLocationFromIP = async () => {
  // Try internal proxy endpoint first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("/api/geolocation", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return {
        code: data.code,
        country: data.country,
        region: data.region,
        city: data.city,
        ip: data.ip,
      };
    }
  } catch (err) {
    // fall through to external services
  }
};

export const GeolocationProvider = ({
  children,
  onBlocked,
  customBlockedComponent,
}: any) => {
  const [state, setState] = useState<any>({
    isBlocked: false,
    isLoading: true,
    userCountry: null,
    userRegion: null,
    error: null,
    blockReason: null,
  });

  const checkAccess = async () => {
    try {
      setState((prev: any) => ({ ...prev, isLoading: true, error: null }));

      const location = await getLocationFromIP();

      let isBlocked = false;
      let blockReason: string | null = "";

      // Check if country is sanctioned
      if (
        location?.code &&
        SANCTIONED_COUNTRIES.includes(location.code.toUpperCase())
      ) {
        isBlocked = true;
        blockReason = `Access restricted from ${location.country} due to sanctions compliance`;
      }

      // Check for sanctioned regions (this is simplified - you'd need more sophisticated region detection)
      if (location?.region) {
        const regionLower = location.region.toLowerCase();
        const matchedRegion = SANCTIONED_REGIONS.find((region) =>
          regionLower.includes(region.toLowerCase())
        );

        if (matchedRegion) {
          isBlocked = true;
          blockReason = `Access restricted from ${matchedRegion} region due to sanctions compliance`;
        }
      }

      setState((prev: any) => ({
        isBlocked,
        isLoading: false,
        userCountry: location?.country,
        userRegion: location?.region,
        error: null,
        blockReason,
      }));

      // Call onBlocked callback if access is blocked
      if (isBlocked && onBlocked) {
        onBlocked({
          country: location?.country,
          region: location?.region,
          reason: blockReason,
        });
      }
    } catch (error) {
      console.error("Access control check failed:", error);
      setState((prev: any) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : ("Unknown error" as any),
        isBlocked: false,
      }));
      return;
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const contextValue = {
    ...state,
    retryCheck: checkAccess,
  };

  // If blocked, show custom component or default blocked message
  if (state.isBlocked) {
    if (customBlockedComponent) {
      return customBlockedComponent;
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 mb-6">
            {state.blockReason ||
              "Access to this service is not available in your region."}
          </p>
          <div className="text-sm text-gray-500">
            <p>
              Location: {state.userCountry}{" "}
              {state.userRegion && `- ${state.userRegion}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  // Render children if access is allowed
  return (
    <AccessControlContext.Provider value={contextValue}>
      {children}
    </AccessControlContext.Provider>
  );
};

// Hook to use the access control context
export const useAccessControl = () => {
  const context = useContext(AccessControlContext);
  if (!context) {
    throw new Error(
      "useAccessControl must be used within an AccessControlProvider"
    );
  }
  return context;
};
